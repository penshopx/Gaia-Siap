---
name: Gaia SIAP Architecture
description: Key decisions and constraints for the Gaia SIAP standalone app
---

Gaia SIAP is a standalone B2B SaaS app (NOT part of Gaia Store or DP Store).

**Why:** The spec explicitly requires Gaia SIAP to remain its own product; Gaia Store is only a channel to sell it.

**How to apply:** Never merge Gaia SIAP code into other workspace artifacts. Keep it at artifacts/gaia-siap with previewPath "/".

**AI abstraction:** `callAiService()` in `artifacts/api-server/src/routes/ai.ts` is the single integration point for AI. Phase 0 = mock. Phase 1 = replace with real Gustafta call using GUSTAFTA_API_URL + GUSTAFTA_API_KEY env vars. Never hardcode model calls outside this function.

**Workflow engine:** 4 default steps auto-created on case creation. Status transitions: draft→intake (on first intake submit) →processing (on workflow advance past step 1) →review (on last step) →completed (all steps done). DB enums: case_status, step_status, case_priority.

**Auth:** Public landing at "/" works without auth. Auth not yet implemented — planned for Phase 1 (Clerk or Replit Auth).

**DB enums registered:** case_status, step_status, case_priority — don't rename without migration.
