import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

function tomlSection(source, sectionName) {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`^\\[${escaped}\\]\\s*$([\\s\\S]*?)(?=^\\[|\\Z)`, "m"));
  assert.ok(match, `Missing [${sectionName}] section`);
  return match[1];
}

function handleNewUserDefinition(source, label) {
  const match = source.match(
    /create or replace function public\.handle_new_user\(\)[\s\S]*?\n\$\$;/i
  );
  assert.ok(match, `Missing handle_new_user() in ${label}`);
  return match[0];
}

test("public signup is disabled without disabling email/password authentication", () => {
  const config = read("supabase/config.toml");
  assert.match(tomlSection(config, "auth"), /^enable_signup\s*=\s*false\s*$/m);
  assert.match(tomlSection(config, "auth.email"), /^enable_signup\s*=\s*true\s*$/m);
});

test("the hardened trigger ignores role metadata and creates invited teachers", () => {
  const migrationNames = fs
    .readdirSync(path.join(root, "supabase/migrations"))
    .filter((name) => name.endsWith("_harden_new_user_profile_defaults.sql"));
  assert.equal(migrationNames.length, 1, "Expected exactly one new-user hardening migration");

  for (const [label, source] of [
    [migrationNames[0], read(path.join("supabase/migrations", migrationNames[0]))],
    ["supabase/schema.sql", read("supabase/schema.sql")]
  ]) {
    const definition = handleNewUserDefinition(source, label);
    assert.doesNotMatch(definition, /raw_user_meta_data\s*->>\s*'role'/i);
    assert.match(definition, /raw_user_meta_data\s*->>\s*'name'/i);
    assert.match(definition, /set search_path\s*=\s*''/i);
    assert.match(definition, /'teacher'::public\.user_role/i);
    assert.match(definition, /'invited'::public\.profile_status/i);
    assert.doesNotMatch(definition, /'active'/i);
    assert.match(definition, /on conflict \(id\) do update/i);
    const conflictUpdate = definition.slice(definition.search(/on conflict \(id\) do update/i));
    assert.doesNotMatch(conflictUpdate, /\brole\s*=/i);
    assert.doesNotMatch(conflictUpdate, /\bstatus\s*=/i);
    assert.match(
      source,
      /revoke execute on function public\.handle_new_user\(\) from public, anon, authenticated;/i
    );
  }
});

test("the standalone schema keeps invited profiles outside authorization and protects admin fields", () => {
  const schema = read("supabase/schema.sql");
  const roleHelper = schema.match(
    /create or replace function public\.current_user_role\(\)[\s\S]*?\n\$\$;/i
  );
  assert.ok(roleHelper, "Missing current_user_role() in supabase/schema.sql");
  assert.match(roleHelper[0], /and status\s*=\s*'active'/i);

  const guard = schema.match(
    /create or replace function public\.protect_profile_admin_fields\(\)[\s\S]*?\n\$\$;/i
  );
  assert.ok(guard, "Missing profile authorization-field guard in supabase/schema.sql");
  for (const field of ["email", "role", "status", "created_at"]) {
    assert.match(guard[0], new RegExp(`new\\.${field} is distinct from old\\.${field}`, "i"));
  }
  assert.match(
    schema,
    /create trigger protect_profile_admin_fields[\s\S]*?before update on public\.profiles/i
  );
  assert.match(
    schema,
    /revoke execute on function public\.protect_profile_admin_fields\(\) from public, anon, authenticated;/i
  );
});

test("the guarded admin route sends display metadata only, then assigns the trusted role", () => {
  const route = read("src/app/api/admin/create-teacher/route.ts");
  const guardIndex = route.indexOf("await requireActiveAdmin()");
  const createUserIndex = route.indexOf("auth.admin.createUser");
  assert.notEqual(guardIndex, -1, "Missing active-admin guard");
  assert.notEqual(createUserIndex, -1, "Missing Auth Admin createUser call");
  assert.ok(guardIndex < createUserIndex, "Auth user creation must happen after the active-admin guard");

  const createCall = route.match(/auth\.admin\.createUser\(\{[\s\S]*?\n\s*\}\);/);
  assert.ok(createCall, "Missing guarded Auth Admin createUser call");
  assert.match(createCall[0], /user_metadata:\s*\{\s*name\s*\}/);
  assert.doesNotMatch(createCall[0], /user_metadata:[^\n]*role/);

  const profileUpsert = route.match(/\.from\("profiles"\)[\s\S]*?\.upsert\(\{[\s\S]*?\n\s*\}\)/);
  assert.ok(profileUpsert, "Missing guarded profile upsert");
  assert.match(profileUpsert[0], /\brole,/);
  assert.match(profileUpsert[0], /status:\s*"active"/);

  const profileFailureIndex = route.indexOf("if (profileError || !profile)");
  const auditIndex = route.indexOf('from("audit_logs")');
  assert.notEqual(profileFailureIndex, -1, "Missing failed profile-promotion branch");
  assert.ok(auditIndex > profileFailureIndex, "Missing post-provisioning audit boundary");
  const cleanupBranch = route.slice(profileFailureIndex, auditIndex);
  assert.match(cleanupBranch, /from\("profiles"\)\.delete\(\)\.eq\("id", created\.user\.id\)/);
  assert.match(cleanupBranch, /auth\.admin\.deleteUser\(created\.user\.id\)/);
});
