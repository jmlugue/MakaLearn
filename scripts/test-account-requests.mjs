import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

function accountRequestMigration() {
  const names = fs
    .readdirSync(path.join(root, "supabase/migrations"))
    .filter((name) => name.endsWith("_account_request_approval.sql"));
  assert.equal(names.length, 1, "Expected exactly one account-request approval migration");
  return read(path.join("supabase/migrations", names[0]));
}

test("account requests are private, admin-reviewed rows", () => {
  const migration = accountRequestMigration();
  assert.match(migration, /create table public\.account_requests/i);
  assert.match(migration, /alter table public\.account_requests enable row level security/i);
  assert.match(migration, /revoke all on table public\.account_requests from anon, authenticated/i);
  assert.match(migration, /grant select, update on table public\.account_requests to authenticated/i);
  assert.doesNotMatch(migration, /grant\s+insert[^;]*\s+to\s+anon/i);
  assert.match(migration, /private\.current_user_role\(\)[\s\S]*?=\s*'admin'/i);
  assert.match(migration, /where status = 'pending'/i);
});

test("the public endpoint records a request without creating an Auth user", () => {
  const route = read("src/app/api/account-requests/route.ts");
  assert.match(route, /from\("account_requests"\)\.insert\(\{ name, email \}\)/);
  assert.doesNotMatch(route, /auth\.(signUp|admin\.createUser)/);
  assert.match(route, /profileResult\.data \|\| pendingResult\.data/);
  assert.match(route, /ACCEPTED_MESSAGE/);
});

test("approval is guarded and creates only an active teacher account", () => {
  const route = read("src/app/api/admin/account-requests/approve/route.ts");
  const guardIndex = route.indexOf("await requireActiveAdmin()");
  const createIndex = route.indexOf("auth.admin.createUser");
  assert.ok(guardIndex >= 0 && createIndex > guardIndex, "Auth creation must follow the active-admin guard");
  assert.match(route, /role:\s*"teacher"/);
  assert.match(route, /status:\s*"active"/);
  assert.match(route, /status:\s*"approved"/);
  assert.match(route, /auth\.admin\.deleteUser\(createdUserId\)/);

  const createCall = route.match(/auth\.admin\.createUser\(\{[\s\S]*?\n\s*\}\);/);
  assert.ok(createCall, "Missing Auth Admin createUser call");
  assert.doesNotMatch(createCall[0], /role/);
});

test("rejection never creates an Auth user", () => {
  const route = read("src/app/api/admin/account-requests/reject/route.ts");
  assert.match(route, /await requireActiveAdmin\(\)/);
  assert.match(route, /status:\s*"rejected"/);
  assert.doesNotMatch(route, /auth\.admin\.createUser|from\("profiles"\)\.insert/);
});

// The sign-in link and the Admin section are hidden for now (owner, Oct 3); the flow itself stays built.
// When they come back, assert the link is present and SHOW_ACCOUNT_REQUESTS is true instead.
test("the account request flow stays built while its sign-in link and Admin section are hidden", () => {
  assert.doesNotMatch(read("src/features/auth/login-panel.tsx"), /href="\/request-account"/);
  assert.match(read("src/app/request-account/page.tsx"), /AccountRequestPanel/);
  const accounts = read("src/features/admin/accounts-section.tsx");
  assert.match(accounts, /const SHOW_ACCOUNT_REQUESTS = false;/);
  assert.match(accounts, /Account requests/);
});
