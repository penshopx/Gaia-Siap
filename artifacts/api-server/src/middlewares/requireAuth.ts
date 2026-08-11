import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

/**
 * Middleware that requires a valid Clerk session.
 * Returns 401 { error: "Unauthorized" } if no authenticated session is found.
 * On success, attaches req.userId for downstream handlers.
 *
 * Applied to all API routes except /healthz (see routes/index.ts).
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  // Clerk v5: sessionClaims.sub holds the user ID; userId is the direct shorthand.
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  // Attach for downstream use without patching global Express types
  (req as Request & { userId: string }).userId = userId;
  next();
}
