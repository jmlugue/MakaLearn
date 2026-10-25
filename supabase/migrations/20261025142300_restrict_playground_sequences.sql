-- Supabase default sequence grants are independent of table grants.
-- Only the server-owned quota and correction transactions need these sequences.
revoke all on sequence public.playground_check_requests_id_seq, public.playground_check_corrections_id_seq from public,anon,authenticated;
grant usage,select on sequence public.playground_check_requests_id_seq, public.playground_check_corrections_id_seq to service_role;
