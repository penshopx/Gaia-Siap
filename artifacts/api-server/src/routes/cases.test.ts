/**
 * Integration tests: case ownership enforcement
 *
 * Uses the real database and a mocked Clerk auth layer.
 * Each test seeds its own rows and cleans them up afterwards, so these
 * can run alongside live data without interference.
 *
 * The tests would FAIL if:
 *  - The userId WHERE predicate were removed from GET/PATCH/DELETE
 *  - POST stopped tagging the new case with req.userId
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import request from "supertest";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Mocks — auth layer only; real DB is used throughout
// ---------------------------------------------------------------------------

/** Controlled by individual tests via setUser() */
const currentUserId = { value: "test-user-default" };

vi.mock("@clerk/express", () => ({
  clerkMiddleware:
    () =>
    (_req: unknown, _res: unknown, next: () => void) =>
      next(),
  getAuth: () => ({ userId: currentUserId.value }),
}));

vi.mock("@clerk/shared/keys", () => ({
  publishableKeyFromHost: () => "pk_test_fake",
}));

// Suppress pino worker-thread transport in test output
vi.mock("pino", () => ({
  default: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    child: () => ({
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    }),
  }),
}));

vi.mock("pino-http", () => ({
  default:
    () =>
    (req: { log: unknown }, _res: unknown, next: () => void) => {
      req.log = {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      };
      next();
    },
}));

vi.mock("http-proxy-middleware", () => ({
  createProxyMiddleware:
    () =>
    (_req: unknown, _res: unknown, next: () => void) =>
      next(),
}));

// ---------------------------------------------------------------------------
// Import app + real DB after mocks are registered
// ---------------------------------------------------------------------------

import { db, casesTable, workflowStepsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const { default: app } = await import("../app.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Unique per test-run so rows are identifiable and cleanable */
const OWNER_ID = `test-owner-${randomUUID()}`;
const OTHER_ID = `test-other-${randomUUID()}`;

function setUser(id: string) {
  currentUserId.value = id;
}

/** IDs of rows created during a test — cleaned up in afterEach */
let createdCaseIds: string[] = [];

async function seedCase(userId: string): Promise<string> {
  const id = randomUUID();
  await db.insert(casesTable).values({
    id,
    userId,
    title: "Test Case",
    status: "draft",
    priority: "normal",
  });
  // Seed minimal workflow steps so POST-route helpers don't break
  await db.insert(workflowStepsTable).values({
    id: randomUUID(),
    caseId: id,
    stepNumber: 1,
    title: "Step 1",
    status: "active",
  });
  createdCaseIds.push(id);
  return id;
}

afterEach(async () => {
  // Delete workflow steps first (FK constraint)
  for (const id of createdCaseIds) {
    await db.delete(workflowStepsTable).where(eq(workflowStepsTable.caseId, id));
    await db.delete(casesTable).where(eq(casesTable.id, id));
  }
  createdCaseIds = [];
});

afterAll(async () => {
  // Release the DB pool so the process can exit cleanly
  const { pool } = await import("@workspace/db");
  await pool.end();
});

// ---------------------------------------------------------------------------
// POST /api/cases — creator's userId must be stored
// ---------------------------------------------------------------------------

describe("POST /api/cases", () => {
  beforeEach(() => setUser(OWNER_ID));

  it("tags the new case with the authenticated user's userId", async () => {
    const res = await request(app)
      .post("/api/cases")
      .send({ title: "Brand new case" })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
    const caseId: string = res.body.id;
    createdCaseIds.push(caseId);

    // Verify the row in the database carries the authenticated userId
    const [row] = await db
      .select()
      .from(casesTable)
      .where(eq(casesTable.id, caseId));

    expect(row).toBeDefined();
    expect(row.userId).toBe(OWNER_ID);
  });
});

// ---------------------------------------------------------------------------
// GET /api/cases/:id
// ---------------------------------------------------------------------------

describe("GET /api/cases/:id", () => {
  let caseId: string;

  beforeEach(async () => {
    caseId = await seedCase(OWNER_ID);
  });

  it("returns 200 when the authenticated user owns the case", async () => {
    setUser(OWNER_ID);
    const res = await request(app).get(`/api/cases/${caseId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(caseId);
  });

  it("returns 404 when a different user tries to read the case", async () => {
    setUser(OTHER_ID);
    const res = await request(app).get(`/api/cases/${caseId}`);
    // 404, not 401 — ownership must not leak via status code
    expect(res.status).toBe(404);
  });

  it("returns 404 (not 401) to avoid signalling that the case exists", async () => {
    setUser(OTHER_ID);
    const res = await request(app).get(`/api/cases/${caseId}`);
    expect(res.status).not.toBe(401);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/cases/:id
// ---------------------------------------------------------------------------

describe("PATCH /api/cases/:id", () => {
  let caseId: string;

  beforeEach(async () => {
    caseId = await seedCase(OWNER_ID);
  });

  it("returns 200 when the authenticated user owns the case", async () => {
    setUser(OWNER_ID);
    const res = await request(app)
      .patch(`/api/cases/${caseId}`)
      .send({ title: "Updated title" })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Updated title");
  });

  it("returns 404 and leaves the record unchanged when a different user patches", async () => {
    setUser(OTHER_ID);
    const res = await request(app)
      .patch(`/api/cases/${caseId}`)
      .send({ title: "Hijacked title" })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(404);

    // The database row must be completely unchanged
    const [row] = await db
      .select()
      .from(casesTable)
      .where(eq(casesTable.id, caseId));

    expect(row.title).toBe("Test Case");
    expect(row.userId).toBe(OWNER_ID);
  });

  it("returns 404 (not 401) for cross-user access", async () => {
    setUser(OTHER_ID);
    const res = await request(app)
      .patch(`/api/cases/${caseId}`)
      .send({ title: "Hijacked" })
      .set("Content-Type", "application/json");
    expect(res.status).not.toBe(401);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/cases/:id
// ---------------------------------------------------------------------------

describe("DELETE /api/cases/:id", () => {
  let caseId: string;

  beforeEach(async () => {
    caseId = await seedCase(OWNER_ID);
  });

  it("returns 204 when the authenticated user deletes their own case", async () => {
    setUser(OWNER_ID);
    const res = await request(app).delete(`/api/cases/${caseId}`);
    expect(res.status).toBe(204);

    // Confirm the row is gone
    const rows = await db
      .select()
      .from(casesTable)
      .where(eq(casesTable.id, caseId));
    expect(rows).toHaveLength(0);

    // Remove from cleanup list — already deleted
    createdCaseIds = createdCaseIds.filter((id) => id !== caseId);
  });

  it("returns 404 and does not delete the record when a different user tries", async () => {
    setUser(OTHER_ID);
    const res = await request(app).delete(`/api/cases/${caseId}`);
    expect(res.status).toBe(404);

    // The row must still exist
    const rows = await db
      .select()
      .from(casesTable)
      .where(eq(casesTable.id, caseId));
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(OWNER_ID);
  });

  it("returns 404 (not 401) for cross-user access", async () => {
    setUser(OTHER_ID);
    const res = await request(app).delete(`/api/cases/${caseId}`);
    expect(res.status).not.toBe(401);
    expect(res.status).toBe(404);
  });
});
