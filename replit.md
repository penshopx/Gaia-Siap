# Gaia SIAP

Aplikasi standalone untuk workflow/intake/execution orchestration yang membantu pengguna dari kebutuhan/problem → intake → proses/workflow → AI assistance → output/action. Dirancang untuk B2B Indonesia.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — jalankan API server (port 8080, proxied ke /api)
- `pnpm --filter @workspace/gaia-siap run dev` — jalankan frontend (proxied ke /)
- `pnpm run typecheck` — full typecheck seluruh package
- `pnpm run build` — typecheck + build semua package
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks dan Zod schemas dari OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, Wouter routing, TanStack Query, Framer Motion
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (dari OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth untuk semua API contracts
- `lib/db/src/schema/` — Drizzle schema: cases.ts, intakes.ts, workflow_steps.ts, results.ts
- `artifacts/api-server/src/routes/` — Express routes: cases, intake, workflow, results, ai, dashboard
- `artifacts/gaia-siap/src/` — React frontend

## Routes

| Route | Keterangan |
|-------|------------|
| `/` | Landing page publik |
| `/mulai` | Form buat kasus baru |
| `/dashboard` | Dashboard utama |
| `/case/:id` | Detail kasus |
| `/case/:id/intake` | Form masukan kasus |
| `/case/:id/workflow` | Alur kerja / stepper |
| `/case/:id/result` | Hasil & rekomendasi |

## Database Schema

- `cases` — kasus/session utama (status: draft→intake→processing→review→completed)
- `intakes` — data masukan per kasus (fields: jsonb)
- `workflow_steps` — langkah alur kerja (stepNumber 1-4, status: pending/active/completed/blocked)
- `case_results` — output dan rekomendasi

## AI Abstraction

- Route: `POST /api/ai/assist`
- Service: `artifacts/api-server/src/routes/ai.ts` → `callAiService()`
- Phase 0: mock response
- Phase 1: ganti `callAiService()` dengan real Gustafta API call (env: `GUSTAFTA_API_URL`, `GUSTAFTA_API_KEY`)

## Architecture decisions

- **Standalone app**: Gaia SIAP adalah produk tersendiri, bukan bagian dari Gaia Store atau DP Store
- **AI abstraction layer**: `callAiService()` dipisahkan dari business logic agar mudah diganti dengan Gustafta
- **Workflow steps auto-created**: saat kasus dibuat, 4 langkah default otomatis terbuat
- **Status auto-advance**: status kasus otomatis berubah saat intake disubmit / workflow dimajukan
- **Public landing**: halaman `/` bisa dibuka tanpa login; auth belum diimplementasi (Phase 1)

## Product

Gaia SIAP membantu bisnis Indonesia mengubah masalah nyata menjadi tindakan terstruktur melalui alur: Masalah → Masukan → Proses → Hasil. Dirancang sebagai B2B SaaS tool yang terasa seperti konsultan berpengalaman.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Jangan gunakan `type: integer` di openapi.yaml (gunakan `type: number`) — Orval generates `zod.int()` yang tidak ada di zod v3
- Setelah ubah schema di `lib/db/`, jalankan `pnpm run typecheck:libs` sebelum typecheck artifact
- Enums PostgreSQL (`case_status`, `step_status`, `case_priority`) sudah terdaftar di DB — jangan ubah tanpa migration
- `AiAssistResponse` adalah nama yang di-generate Orval — jangan pakai nama itu di components/schemas

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Phase 1 roadmap: tambah auth (Clerk/Replit Auth), real AI integration (Gustafta), multi-tenant, advanced workflow engine
