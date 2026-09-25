-- Fix: admins could not activate or deactivate accounts ("permission denied for schema private").
--
-- 20260925091145 created the private schema and granted it only to `authenticated`.
-- 20260925094712 added the profiles trigger private.protect_profile_admin_fields(), which calls
-- private.current_user_role(). The admin routes (/api/admin/account-status) update profiles with the
-- service role, which had no access to the private schema, so every status change failed.
--
-- The service role already bypasses RLS and can change any row. This only lets it reach the check.
-- The private schema stays hidden from the API, and teachers still cannot change their own role or status.

grant usage on schema private to service_role;
grant execute on function private.current_user_role() to service_role;
