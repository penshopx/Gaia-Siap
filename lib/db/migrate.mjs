/**
 * Versioned SQL migration runner for Gaia SIAP.
 *
 * Applies every *.sql file in lib/db/migrations/ in lexicographic order.
 * Tracks applied migrations in a `_db_migrations` table so re-runs are safe.
 *
 * Usage:
 *   pnpm --filter @workspace/db run migrate
 *
 * Each SQL file is applied atomically; if it fails the whole file rolls back
 * and the process exits non-zero.
 */
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Client } = pg;

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable must be set.");
  process.exit(1);
}

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "migrations",
);

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// Create tracking table if it does not exist
await client.query(`
  CREATE TABLE IF NOT EXISTS "_db_migrations" (
    "name"       text PRIMARY KEY,
    "applied_at" timestamptz NOT NULL DEFAULT now()
  )
`);

// Collect and sort migration files
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.log("No migration files found.");
  await client.end();
  process.exit(0);
}

let applied = 0;

for (const file of files) {
  const { rows } = await client.query(
    `SELECT 1 FROM "_db_migrations" WHERE name = $1`,
    [file],
  );

  if (rows.length > 0) {
    console.log(`  skip  ${file} (already applied)`);
    continue;
  }

  const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

  console.log(`  apply ${file} …`);
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query(
      `INSERT INTO "_db_migrations" (name) VALUES ($1)`,
      [file],
    );
    await client.query("COMMIT");
    console.log(`  done  ${file}`);
    applied++;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`  FAIL  ${file}:`, err.message);
    await client.end();
    process.exit(1);
  }
}

console.log(`\nMigrations complete. ${applied} applied, ${files.length - applied} skipped.`);
await client.end();
