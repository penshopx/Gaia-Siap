---
name: OpenAPI Codegen Quirks (Orval + Zod v3)
description: Known pitfalls when writing OpenAPI specs for this monorepo's Orval + zod v3 codegen
---

**Rule: Use `type: number` not `type: integer` in openapi.yaml.**

**Why:** Orval maps `type: integer` → `zod.int()` which does not exist in zod v3 (only in zod v4). The codegen succeeds but `pnpm run typecheck:libs` fails with "Property 'int' does not exist on type...". This includes nullable integers — `type: ["integer", "null"]` also produces `zod.int().nullable()` which fails.

**How to apply:** Any time you write a spec field for a whole number (count, stepNumber, total, limit, offset), use `type: number` instead of `type: integer`.

---

**Rule: Component schema names must not collide with Orval's auto-generated Zod schema names.**

**Why:** Orval generates `<OperationIdPascal>Body` and `<OperationIdPascal>Response` Zod schemas in api.ts. If a component in openapi.yaml shares that name, `lib/api-zod/src/index.ts` barrel re-exports both and TypeScript throws TS2308 (already exported member).

**How to apply:** Name response components after the entity, not the operation. E.g. `AssistResponse` not `AiAssistResponse` (which collides with operationId `aiAssist` → `AiAssistResponse`).

---

**Rule: After adding new tables to lib/db/src/schema/, run `pnpm run typecheck:libs` before typechecking artifact packages.**

**Why:** Leaf packages like api-server import from @workspace/db. If lib declarations are stale, imports appear missing even though the code is correct.
