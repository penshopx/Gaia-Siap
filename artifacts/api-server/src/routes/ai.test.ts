/**
 * Unit tests: callAiService() retry / timeout behaviour
 *
 * Tests the exported callAiService() directly (no HTTP stack) so fake timers
 * interact cleanly with the AbortController inside gustaftaAttempt().
 *
 * The tests would FAIL if:
 *  - The retry loop were removed (5xx / network errors would not be retried)
 *  - 4xx errors (other than 429) started being retried
 *  - AbortController / AbortSignal were removed from gustaftaAttempt()
 *  - The timeout timer no longer called controller.abort()
 *  - A successful second attempt raised instead of resolving
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Environment — must be set before any module is imported
// ---------------------------------------------------------------------------

process.env.GUSTAFTA_API_KEY = "test-key";
process.env.GUSTAFTA_API_URL = "http://gustafta-test.invalid/ai/assist";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// @workspace/db is imported by app.ts → routes; mock to avoid real DB init
vi.mock("@workspace/db", () => ({
  db: { select: vi.fn() },
  casesTable: {},
  intakesTable: {},
}));

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  eq: (col: unknown, val: unknown) => ({ col, val }),
}));

vi.mock("@clerk/express", () => ({
  clerkMiddleware:
    () =>
    (_req: unknown, _res: unknown, next: () => void) =>
      next(),
  getAuth: () => ({ userId: "test-user" }),
}));

vi.mock("@clerk/shared/keys", () => ({
  publishableKeyFromHost: () => "pk_test_fake",
}));

vi.mock("pino", () => ({
  default: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    child: () => ({ info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }),
  }),
}));

vi.mock("pino-http", () => ({
  default:
    () =>
    (req: { log: unknown }, _res: unknown, next: () => void) => {
      req.log = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
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
// Stub global fetch — tests control behaviour via fetchMock
// ---------------------------------------------------------------------------

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
vi.stubGlobal("fetch", fetchMock);

// ---------------------------------------------------------------------------
// Import callAiService after all mocks are in place
// ---------------------------------------------------------------------------

const { callAiService } = await import("./ai.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal Response-shaped object for the fetch mock. */
function fakeResponse(status: number, body: Record<string, unknown> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

/** Standard callAiService params used across tests. */
const BASE_PARAMS = { caseId: "c1", prompt: "Summarise this case" };

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  fetchMock.mockReset();
});

afterEach(() => {
  // Restore real timers if a test used fake ones
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("callAiService — retry / timeout behaviour", () => {
  // ── 5xx retry ─────────────────────────────────────────────────────────────

  it("retries a 5xx response up to 2 times then throws (3 total fetch calls)", async () => {
    fetchMock.mockResolvedValue(fakeResponse(503));

    await expect(callAiService(BASE_PARAMS)).rejects.toThrow(/503/);

    // Original attempt + 2 retries = 3 total
    expect(fetchMock).toHaveBeenCalledTimes(3);
  }, 10_000 /* real backoff: 500 ms + 1 000 ms */);

  // ── 4xx no-retry ──────────────────────────────────────────────────────────

  it("does NOT retry a 4xx response — exactly one fetch call", async () => {
    fetchMock.mockResolvedValue(fakeResponse(403, { error: "Forbidden" }));

    await expect(callAiService(BASE_PARAMS)).rejects.toThrow(/403/);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // ── Real AbortSignal / timeout test ───────────────────────────────────────

  it(
    "aborts the in-flight request via AbortSignal after the timeout fires and retries",
    async () => {
      vi.useFakeTimers();

      let abortCount = 0;

      // fetch stays pending until the AbortSignal fires — this is the key
      // difference from injecting a pre-rejected promise: we verify that
      // gustaftaAttempt() actually passes a live AbortSignal to fetch and
      // that the timeout setTimeout calls controller.abort().
      fetchMock.mockImplementation((_url, init) => {
        return new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) {
            reject(new Error("No AbortSignal provided — test expects one"));
            return;
          }
          signal.addEventListener("abort", () => {
            abortCount++;
            reject(Object.assign(new Error("The operation was aborted"), { name: "AbortError" }));
          });
        });
      });

      // Start the call — it will not resolve until timers are advanced.
      // Attach the rejection handler BEFORE advancing timers so the promise
      // rejection is not left unhandled between runAllTimersAsync() returning
      // and the assertion being set up (which triggers the Node.js
      // PromiseRejectionHandledWarning and makes vitest report an error).
      const promise = callAiService(BASE_PARAMS);
      const assertion = expect(promise).rejects.toThrow();

      // Drain all pending timers + microtasks (3 × GUSTAFTA_TIMEOUT_MS aborts
      // and 2 × RETRY_BACKOFF_MS sleeps).  runAllTimersAsync flushes timers
      // recursively until none remain, interleaving microtask checkpoints.
      await vi.runAllTimersAsync();

      await assertion;

      // Every attempt must have been aborted via the signal
      expect(abortCount).toBe(3);
      // Total fetch calls: original + 2 retries
      expect(fetchMock).toHaveBeenCalledTimes(3);
      // Verify each call received an AbortSignal
      for (const call of fetchMock.mock.calls) {
        expect(call[1]?.signal).toBeDefined();
      }
    },
  );

  // ── Generic (non-abort) network error ─────────────────────────────────────

  it("retries a generic network error (non-AbortError) — 3 total fetch calls", async () => {
    // A plain network failure that is not an AbortError; gustaftaAttempt()
    // still tags it retryable so the loop retries it.
    const networkErr = new Error("ECONNREFUSED");
    fetchMock.mockRejectedValue(networkErr);

    await expect(callAiService(BASE_PARAMS)).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(3);
  }, 10_000);

  // ── Successful second attempt ─────────────────────────────────────────────

  it("resolves with AI response when the second attempt succeeds after a 5xx first", async () => {
    fetchMock
      .mockResolvedValueOnce(fakeResponse(503))
      .mockResolvedValueOnce(
        fakeResponse(200, { response: "Here is your summary", suggestions: ["Step A", "Step B"] }),
      );

    const result = await callAiService(BASE_PARAMS);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.response).toBe("Here is your summary");
    expect(result.suggestions).toEqual(["Step A", "Step B"]);
  }, 5_000);

  // ── 429 rate-limit retry ──────────────────────────────────────────────────

  it("retries a 429 rate-limit response (treated same as 5xx) — 3 total fetch calls", async () => {
    fetchMock.mockResolvedValue(fakeResponse(429));

    await expect(callAiService(BASE_PARAMS)).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(3);
  }, 10_000);
});
