import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/0001_create_debts.sql",
  import.meta.url,
);

test("migration keeps RLS, grants, and all owner policies", async () => {
  const sql = (await readFile(migrationUrl, "utf8"))
    .replaceAll(/\s+/g, " ")
    .toLowerCase();

  assert.match(sql, /alter table public\.debts enable row level security/);
  assert.match(sql, /for select to authenticated using/);
  assert.match(sql, /for insert to authenticated with check/);
  assert.match(sql, /for update to authenticated using .* with check/);
  assert.match(sql, /for delete to authenticated using/);
  assert.equal((sql.match(/auth\.uid\(\)/g) ?? []).length, 5);
  assert.match(
    sql,
    /grant select, insert, update, delete on table public\.debts to authenticated/,
  );
  assert.doesNotMatch(sql, /to anon/);
  assert.doesNotMatch(sql, /service_role/);
});
