/**
 * Unit tests: callAiService() retry / timeout behaviour + circuit breaker
 *
 * Tests the exported callAiService() directly (no HTTP stack) so fake timers
 * interact cleanly with the AbortController inside gustaftaAttempt().
 *
 * The retry tests would FAIL if:
 *  - The retry loop were removed (5xx / network errors would not be retried)
 *  - 4xx errors (other than 429) started being retried
 *  - AbortController / AbortSignal were removed from gustaftaAttempt()
 *  - The timeout timer no longer called controller.abort()
 *  - A successful second attempt raised instead of resolving
 *
 * The circuit-breaker tests would FAIL if:
 *  - CLOSED does not open after CB_FAILURE_THRESHOLD consecutive failures
 *  - An OPEN circuit does not fail fast (fetch is still called)
 *  - HALF_OPEN allows more than one concurrent probe to reach Gustafta
 *  - A successful probe does not transition the circuit back to CLOSED
 *  - A failed probe does not transition the circuit back to OPEN
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
// Import callAiService and circuit helpers after all mocks are in place
// ---------------------------------------------------------------------------

const {
  callAiService,
  circuit,
  resetCircuit,
  recordSuccess,
  recordFailure,
  CB_FAILURE_THRESHOLD,
} = await import("./ai.js");

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
  resetCircuit(); // start every test with a fresh CLOSED circuit
});

afterEach(() => {
  // Restore real timers if a test used fake ones
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Tests — retry / timeout behaviour
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
      // and the assertion being set up.
      const promise = callAiService(BASE_PARAMS);
      const assertion = expect(promise).rejects.toThrow();

      // Drain all pending timers + microtasks (3 × GUSTAFTA_TIMEOUT_MS aborts
      // and 2 × RETRY_BACKOFF_MS sleeps).
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

// ---------------------------------------------------------------------------
// Tests — circuit breaker
// ---------------------------------------------------------------------------

describe("callAiService — circuit breaker", () => {
  // ── CLOSED → OPEN ─────────────────────────────────────────────────────────

  it("opens the circuit after CB_FAILURE_THRESHOLD consecutive failures", async () => {
    // Each call below makes 3 fetch attempts (original + 2 retries).
    // We run enough calls to hit the threshold. Since threshold defaults to 5
    // and each failed callAiService increments consecutiveFailures once
    // (after exhausting retries), we need 5 failing calls.
    fetchMock.mockResolvedValue(fakeResponse(500));

    expect(circuit.state).toBe("CLOSED");

    for (let i = 0; i < CB_FAILURE_THRESHOLD; i++) {
      await expect(callAiService(BASE_PARAMS)).rejects.toThrow();
      fetchMock.mockReset();
      fetchMock.mockResolvedValue(fakeResponse(500));
    }

    expect(circuit.state).toBe("OPEN");
  }, 60_000);

  // ── OPEN fast-fail ────────────────────────────────────────────────────────

  it("rejects immediately without calling fetch when the circuit is OPEN", async () => {
    // Force the circuit open directly
    circuit.state = "OPEN";
    circuit.openedAt = Date.now(); // opened just now, cooldown not elapsed

    const err = await callAiService(BASE_PARAMS).catch((e: unknown) => e);

    expect((err as { circuitOpen?: boolean }).circuitOpen).toBe(true);
    expect((err as Error).message).toMatch(/temporarily unavailable/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // ── OPEN → HALF_OPEN after reset timeout ──────────────────────────────────

  it("transitions OPEN → HALF_OPEN → CLOSED when the probe succeeds", async () => {
    // Simulate a circuit that has been open long enough for the cooldown to expire
    circuit.state = "OPEN";
    circuit.openedAt = 0; // epoch — clearly past any reset timeout

    fetchMock.mockResolvedValueOnce(
      fakeResponse(200, { response: "Recovered", suggestions: [] }),
    );

    const result = await callAiService(BASE_PARAMS);

    expect(result.response).toBe("Recovered");
    expect(circuit.state).toBe("CLOSED");
    expect(circuit.consecutiveFailures).toBe(0);
    expect(circuit.probeInFlight).toBe(false);
    // Probe is a single attempt — no retries
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // ── HALF_OPEN probe failure → OPEN ────────────────────────────────────────

  it("transitions HALF_OPEN → OPEN when the probe fails", async () => {
    circuit.state = "OPEN";
    circuit.openedAt = 0; // cooldown elapsed

    fetchMock.mockResolvedValueOnce(fakeResponse(503));

    await expect(callAiService(BASE_PARAMS)).rejects.toThrow();

    expect(circuit.state).toBe("OPEN");
    expect(circuit.probeInFlight).toBe(false);
    // Probe is a single attempt — no retries
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // ── HALF_OPEN: only one concurrent probe ─────────────────────────────────

  it("HALF_OPEN: blocks concurrent callers while a probe is in flight", async () => {
    // Put the circuit in HALF_OPEN state (cooldown elapsed) with no probe yet
    circuit.state = "OPEN";
    circuit.openedAt = 0;

    // Keep the probe pending so we can observe the concurrent rejection
    let resolveProbe!: (r: Response) => void;
    fetchMock.mockImplementationOnce(
      () => new Promise<Response>((res) => { resolveProbe = res; }),
    );

    // Starting the probe call sets probeInFlight=true synchronously (before
    // the first await inside callAiService), so the second call below
    // immediately sees the flag and must reject without touching fetch.
    const probeCall = callAiService(BASE_PARAMS);

    // Second concurrent call — must fail fast with circuitOpen flag
    const concurrent = callAiService(BASE_PARAMS).catch((e: unknown) => e);
    const concurrentErr = await concurrent;

    expect((concurrentErr as { circuitOpen?: boolean }).circuitOpen).toBe(true);
    expect((concurrentErr as Error).message).toMatch(/temporarily unavailable/i);
    // Only the probe should have reached fetch
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Resolve the probe successfully
    resolveProbe(fakeResponse(200, { response: "ok", suggestions: [] }));
    await probeCall;

    expect(circuit.state).toBe("CLOSED");
    expect(circuit.probeInFlight).toBe(false);
  });

  // ── Success resets failure counter ────────────────────────────────────────

  it("resets consecutiveFailures to 0 after a successful call while CLOSED", async () => {
    // Simulate a few prior failures (below threshold)
    circuit.consecutiveFailures = 3;

    fetchMock.mockResolvedValueOnce(
      fakeResponse(200, { response: "All good", suggestions: [] }),
    );

    await callAiService(BASE_PARAMS);

    expect(circuit.consecutiveFailures).toBe(0);
    expect(circuit.state).toBe("CLOSED");
  });

  // ── Probe: non-retryable 4xx must reopen the circuit ─────────────────────

  it("HALF_OPEN: a probe that receives a 4xx reopens the circuit", async () => {
    circuit.state = "OPEN";
    circuit.openedAt = 0; // cooldown elapsed

    // 403 is non-retryable — previously was not recorded, leaving HALF_OPEN stuck
    fetchMock.mockResolvedValueOnce(fakeResponse(403, { error: "Forbidden" }));

    await expect(callAiService(BASE_PARAMS)).rejects.toThrow(/403/);

    expect(circuit.state).toBe("OPEN");
    expect(circuit.probeInFlight).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // ── Probe: JSON parse failure must reopen the circuit ─────────────────────

  it("HALF_OPEN: a probe that returns invalid JSON reopens the circuit", async () => {
    circuit.state = "OPEN";
    circuit.openedAt = 0;

    // Respond with HTTP 200 but a body that fails JSON.parse
    const badJsonResponse = {
      ok: true,
      status: 200,
      json: async () => { throw new SyntaxError("Unexpected token"); },
      text: async () => "not-json",
    } as unknown as Response;
    fetchMock.mockResolvedValueOnce(badJsonResponse);

    await expect(callAiService(BASE_PARAMS)).rejects.toThrow();

    expect(circuit.state).toBe("OPEN");
    expect(circuit.probeInFlight).toBe(false);
  });

  // ── Stale normal failure must not re-open a HALF_OPEN circuit ─────────────

  it("a non-probe failure while HALF_OPEN does not change circuit state", () => {
    circuit.state = "HALF_OPEN";
    circuit.probeInFlight = true; // probe is running

    // A stale normal request finishes with a failure — must be ignored
    recordFailure(false);

    expect(circuit.state).toBe("HALF_OPEN");
  });

  // ── Late success must not close an OPEN circuit ───────────────────────────

  it("a non-probe success does not close an OPEN circuit (late in-flight request)", () => {
    // Simulate a circuit that just opened
    circuit.state = "OPEN";
    circuit.openedAt = Date.now();
    circuit.consecutiveFailures = CB_FAILURE_THRESHOLD;

    // A slow call that was already in flight succeeds — it is not the probe
    recordSuccess(false);

    // Circuit must remain OPEN; the probe alone may close it
    expect(circuit.state).toBe("OPEN");
    expect(circuit.consecutiveFailures).toBe(CB_FAILURE_THRESHOLD);
  });

  // ── Late success must not close a HALF_OPEN circuit ──────────────────────

  it("a non-probe success does not close a HALF_OPEN circuit (late success during probe)", async () => {
    // Put circuit in OPEN state with expired cooldown so the first call
    // becomes the probe and sets probeInFlight=true
    circuit.state = "OPEN";
    circuit.openedAt = 0;

    // Keep the probe pending
    let resolveProbe!: (r: Response) => void;
    fetchMock.mockImplementationOnce(
      () => new Promise<Response>((res) => { resolveProbe = res; }),
    );

    // Start the probe — probeInFlight is set synchronously
    const probeCall = callAiService(BASE_PARAMS);

    // A stale normal request's success arrives while the probe is in flight.
    // It must not close the circuit.
    recordSuccess(false);
    expect(circuit.state).toBe("HALF_OPEN"); // unchanged

    // Now let the real probe succeed and close the circuit properly
    resolveProbe(fakeResponse(200, { response: "ok", suggestions: [] }));
    await probeCall;

    expect(circuit.state).toBe("CLOSED");
    expect(circuit.probeInFlight).toBe(false);
  });
});
