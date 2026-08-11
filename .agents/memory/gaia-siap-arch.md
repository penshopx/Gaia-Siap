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

**Auth:** Public landing at "/" works without auth. Auth not yet implemented — planned for Phase 1 (Clerk or Replit Auth).

**DB enums registered:** case_status, step_status, case_priority — don't rename without migration.
