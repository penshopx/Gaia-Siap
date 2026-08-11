---
name: Gaia SIAP Architecture
description: Key decisions and constraints for the Gaia SIAP standalone app
---

Gaia SIAP is a standalone B2B SaaS app (NOT part of Gaia Store or DP Store).

**Why:** The spec explicitly requires Gaia SIAP to remain its own product; Gaia Store is only a channel to sell it.

**How to apply:** Never merge Gaia SIAP code into other workspace artifacts. Keep it at artifacts/gaia-siap with previewPath "/".

**AI abstraction:** `callAiService()` in `artifacts/api-server/src/routes/ai.ts` is the single integration point for AI. Never hardcode model calls outside this function.

**Gustafta API contract (verified 2026-08-11):**
- Endpoint: `POST https://gustafta.my.id/api/v1/ai/assist`
- Auth: `Authorization: Bearer $GUSTAFTA_API_KEY` (secret in Replit)
- Request: `{ "prompt": string }`, Response: `{ "response": string, "suggestions": string[] }`
- Infrastructure: Google Cloud + Express backend, HTTP/2

**Workflow engine:** 4 default steps auto-created on case creation. Status transitions: draft→intake→processing→review→completed. DB enums: case_status, step_status, case_priority — don't rename without migration.

**Auth:** Replit-managed Clerk. Backend: `@clerk/express` clerkMiddleware + requireAuth. `/healthz` is the only public API endpoint — all other routes return 401 for unauthenticated requests. Cookie-based — never use Bearer token or `setAuthTokenGetter` on the web client.

**Multi-tenancy:** `user_id` (NOT NULL) and `org_id` (nullable) on `cases` table. Every case insert must include `userId` from `req.userId` (set by requireAuth). All CRUD queries on cases and sub-resources (intake, workflow, results, ai, dashboard) must filter by `eq(casesTable.userId, userId)`. Index `cases_user_id_updated_at_idx` on `(user_id, updated_at DESC)` supports scoped paginated listings.

**Migration strategy:** `lib/db/migrations/0001_add_user_id_to_cases.sql` is the versioned migration. It adds columns as nullable, backfills pre-auth rows with sentinel `'migrated_before_auth'`, enforces NOT NULL, and creates the index. Run with `pnpm --filter @workspace/db run migrate` before starting the server in deployment.

**Clerk appearance:** shadcn theme, `cssLayerName: "clerk"`. `index.css` must have `@layer theme, base, clerk, components, utilities;` BEFORE `@import 'tailwindcss'`. `vite.config.ts` must use `tailwindcss({ optimize: false })` to prevent lightningcss from reordering `@layer` imports in prod builds.

**`publishableKeyFromHost`** comes from `'@clerk/react/internal'` — a subpath export of `@clerk/react`, not a separate package.

**Rate limiting:** `express-rate-limit` on the API server. AI endpoint: 20 req/15 min. General: 100 req/15 min. `/healthz` is skipped.
