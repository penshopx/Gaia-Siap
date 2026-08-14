---
name: Gustafta service areas
description: Context about the two Gustafta service areas Gaia SIAP integrates with
---

Gaia SIAP is deployed within two Gustafta service areas:

- **klinik-konsultasi** (consultation clinic)
- **ruang proyek** (project room)

**Why:** Both are generic/flexible in nature — they are not domain-restricted (not only medical, not only software). Any type of business problem, project, or workflow can be handled through either service area.

**How to apply:** No category filtering or domain-specific logic is needed in Gaia SIAP. The `callAiService()` integration with Gustafta's `/api/v1/ai/assist` endpoint works for both service areas without special configuration. The app's case categories can remain open/flexible.
