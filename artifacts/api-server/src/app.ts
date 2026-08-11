import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ── 1. Clerk proxy ────────────────────────────────────────────────────────────
// Must be mounted BEFORE body parsers — it streams raw bytes.
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// ── 2. Structured request logging ────────────────────────────────────────────
// Serializers intentionally omit headers and body — no secret leakage in logs.
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0], // strip query params to avoid token leakage
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ── 3. CORS ───────────────────────────────────────────────────────────────────
// credentials: true + origin: true — required for Clerk cookie-based auth.
// Reflects the request origin, so both dev (.replit.dev) and prod domains work.
app.use(cors({ credentials: true, origin: true }));

// ── 4. Body parsers ───────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── 5. Clerk middleware ───────────────────────────────────────────────────────
// Resolves auth state from the Clerk session cookie on every request.
// Routes that require a session call requireAuth middleware (see routes/index.ts).
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

// ── 6. Rate limiting ──────────────────────────────────────────────────────────
// AI endpoint is stricter because each call proxies out to Gustafta.
// Apply AI limiter first (more specific path), then the general limiter.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many AI requests, please try again later." },
  skip: (req) => req.path === "/healthz",
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  skip: (req) => req.path === "/healthz",
});

app.use("/api/ai", aiLimiter);
app.use("/api", generalLimiter);

// ── 7. Application routes ─────────────────────────────────────────────────────
app.use("/api", router);

// ── 8. Centralized error handler ─────────────────────────────────────────────
// Catches any error thrown by route handlers (Express 5 forwards async errors).
// In production, 5xx details are hidden to prevent information leakage.
// GUSTAFTA_API_KEY and CLERK_SECRET_KEY are never included in error messages
// (callAiService constructs messages from status codes / network errors only).
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const status =
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof (err as { status: unknown }).status === "number"
      ? (err as { status: number }).status
      : 500;

  const rawMessage =
    typeof err === "object" && err !== null && "message" in err
      ? String((err as { message: unknown }).message)
      : "Unknown error";

  (req as unknown as { log?: { error: (obj: unknown, msg: string) => void } }).log?.error(
    { err },
    "Unhandled error",
  );

  const isProd = process.env.NODE_ENV === "production";
  res.status(status).json({
    error: isProd && status >= 500 ? "Internal server error" : rawMessage,
  });
});

export default app;
