import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

// Extend Express Request to carry the authenticated userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Middleware that requires a valid Clerk session.
 * Returns 401 { error: "Unauthorized" } if no authenticated session is found.
 * On success, attaches req.userId for downstream handlers.
 *
 * Applied to all API routes except /healthz (see routes/index.ts).
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  // Clerk v5: auth.userId is the direct shorthand for the authenticated user.
  const userId = auth?.userId ?? null;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
}
