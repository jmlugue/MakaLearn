import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { test } from "node:test";

const nodeRequire = createRequire(import.meta.url);
const { createClient } = nodeRequire("@supabase/supabase-js");

function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map(([, name, value]) => [name, value.replace(/^["']|["']$/g, "")])
  );
}

const env = { ...readEnvFile(".env.local"), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = env.TEST_ADMIN_EMAIL;
const adminPassword = env.TEST_ADMIN_PASSWORD;

for (const [name, value] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  TEST_ADMIN_EMAIL: adminEmail,
  TEST_ADMIN_PASSWORD: adminPassword
})) {
  if (!value) throw new Error(`Missing ${name} in .env.local or the process environment.`);
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const publicClient = createClient(url, publishableKey, clientOptions);
const serviceClient = createClient(url, serviceRoleKey, clientOptions);

async function findAuthUser(email) {
  const { data, error } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function findProfile(email) {
  const { data, error } = await serviceClient
    .from("profiles")
    .select("id,name,email,role,status")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

test("public signup is closed and trusted admin provisioning still works", async () => {
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const email = `makalearn-auth-test-${suffix}@example.com`;
  const password = `Temp-${randomUUID()}-9a!`;
  const temporaryUserIds = new Set();

  try {
    const signup = await publicClient.auth.signUp({
      email,
      password,
      options: { data: { name: "[TEST] Hostile signup", role: "admin" } }
    });
    if (signup.data.user?.id) temporaryUserIds.add(signup.data.user.id);

    assert.ok(signup.error, "Public signup unexpectedly succeeded");
    const signupFailure = `${signup.error.code ?? ""} ${signup.error.message}`;
    assert.equal(signup.error.status, 422, `Unexpected signup failure: ${signupFailure}`);
    assert.match(
      signupFailure,
      /signup_disabled|signups? (?:are )?not allowed/i,
      `Signup failed for an unrelated reason: ${signupFailure}`
    );
    assert.doesNotMatch(signupFailure, /email_provider_disabled/i);
    assert.equal(await findAuthUser(email), null, "Rejected signup still created an Auth user");
    assert.equal(await findProfile(email), null, "Rejected signup still created a profile");

    const created = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "[TEST] Provisioned account", role: "admin" }
    });
    assert.equal(created.error, null, created.error?.message);
    assert.ok(created.data.user, "Auth Admin creation returned no user");
    temporaryUserIds.add(created.data.user.id);

    const invitedProfile = await findProfile(email);
    assert.ok(invitedProfile, "The Auth trigger did not create a profile");
    assert.equal(invitedProfile.role, "teacher", "Hostile metadata assigned an admin role");
    assert.equal(invitedProfile.status, "invited", "The trigger activated an unprovisioned account");

    const adminClient = createClient(url, publishableKey, clientOptions);
    const signedIn = await adminClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
    assert.equal(signedIn.error, null, signedIn.error?.message);
    assert.ok(signedIn.data.user, "The active admin could not sign in");

    const { data: adminProfile, error: adminProfileError } = await adminClient
      .from("profiles")
      .select("role,status")
      .eq("id", signedIn.data.user.id)
      .single();
    assert.equal(adminProfileError, null, adminProfileError?.message);
    assert.deepEqual(adminProfile, { role: "admin", status: "active" });

    const { data: promoted, error: promoteError } = await adminClient
      .from("profiles")
      .upsert({
        id: created.data.user.id,
        name: "[TEST] Provisioned account",
        email,
        role: "admin",
        status: "active",
        updated_at: new Date().toISOString()
      })
      .select("id,role,status")
      .single();
    assert.equal(promoteError, null, promoteError?.message);
    assert.deepEqual(promoted, { id: created.data.user.id, role: "admin", status: "active" });
    await adminClient.auth.signOut();
  } finally {
    for (const userId of temporaryUserIds) {
      const { error } = await serviceClient.auth.admin.deleteUser(userId);
      if (error) throw new Error(`Temporary Auth user cleanup failed: ${error.message}`);
    }

    const remainingProfile = await findProfile(email);
    if (remainingProfile) {
      const { error } = await serviceClient.from("profiles").delete().eq("id", remainingProfile.id);
      if (error) throw new Error(`Temporary profile cleanup failed: ${error.message}`);
    }

    assert.equal(await findAuthUser(email), null, "Temporary Auth user remains after cleanup");
    assert.equal(await findProfile(email), null, "Temporary profile remains after cleanup");
  }
});
