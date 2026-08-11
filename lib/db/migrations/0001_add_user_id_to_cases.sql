-- Migration: Add user_id and org_id to cases table
-- Safe staged approach for existing deployments:
--   1. Add columns as nullable so the ALTER succeeds even with existing rows
--   2. Backfill rows that predate authentication with a sentinel value
--   3. Enforce NOT NULL once every row has a value
--   4. Add a covering index for user-scoped paginated listings
--
-- Idempotent: safe to run multiple times (IF NOT EXISTS / IF EXISTS guards).

-- Step 1: Add columns (nullable so existing rows are not immediately rejected)
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "org_id" text;

-- Step 2: Backfill any rows created before auth was introduced
--   'migrated_before_auth' is a sentinel that signals pre-auth data;
--   application code treats it as belonging to no real user, so scoped
--   queries will return nothing for such rows (safe — no data leak).
UPDATE "cases"
SET "user_id" = 'migrated_before_auth'
WHERE "user_id" IS NULL;

-- Step 3: Lock in NOT NULL now that every row has a value
ALTER TABLE "cases" ALTER COLUMN "user_id" SET NOT NULL;

-- Step 4: Index for user-scoped paginated listings
--   Supports: WHERE user_id = $1 ORDER BY updated_at DESC LIMIT n
CREATE INDEX IF NOT EXISTS "cases_user_id_updated_at_idx"
  ON "cases" ("user_id", "updated_at" DESC);
