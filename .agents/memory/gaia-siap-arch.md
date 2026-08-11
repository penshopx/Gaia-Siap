---
name: Gaia SIAP Architecture
description: Key decisions and constraints for the Gaia SIAP standalone app
---

Gaia SIAP is a standalone B2B SaaS app (NOT part of Gaia Store or DP Store).

**Why:** The spec explicitly requires Gaia SIAP to remain its own product; Gaia Store is only a channel to sell it.

**How to apply:** Never merge Gaia SIAP code into other workspace artifacts. Keep it at artifacts/gaia-siap with previewPath "/".

**AI abstraction:** `callAiService()` in `artifacts/api-server/src/routes/ai.ts` is the single integration point for AI. Phase 0 = mock. Phase 1 = replace with real Gustafta call. Never hardcode model calls outside this function.

**Gustafta API contract (verified 2026-08-11):**
- Endpoint: `POST https://gustafta.my.id/api/v1/ai/assist`
- Auth: `Authorization: Bearer $GUSTAFTA_API_KEY` (secret saved in Replit)
- Request body: `{ "prompt": string }` (minimum; context fields TBD)
- Response: `{ "response": string, "suggestions": string[] }` — EXACT match to callAiService() output interface, no adapter needed
- Infrastructure: Google Cloud (Google Frontend) + Express backend, HTTP/2
- Verified: HTTP 200, authentication accepted, AI processing works

**Workflow engine:** 4 default steps auto-created on case creation. Status transitions: draft→intake (on first intake submit) →processing (on workflow advance past step 1) →review (on last step) →completed (all steps done). DB enums: case_status, step_status, case_priority.

**Auth (Phase 1C — complete):** Clerk provisioned (app_3Hkby6FLOu2aDNoHvsVkfESPavi). Backend: `@clerk/express` clerkMiddleware + requireAuth in `routes/index.ts`. Frontend: ClerkProvider in App.tsx with `/sign-in/*?` and `/sign-up/*?` routes. `/healthz` is the only public API endpoint. All other routes return 401 `{ error: "Unauthorized" }` for unauthenticated requests. Cookie-based — never use Bearer token or setAuthTokenGetter on the web client.

**DB enums registered:** case_status, step_status, case_priority — don't rename without migration.
