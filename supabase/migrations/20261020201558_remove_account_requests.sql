-- Account requests are retired. Direct admin-created Auth accounts and audit history remain.
-- RESTRICT (the default) stops the migration if any unexpected external dependency exists.
drop table if exists public.account_requests;
drop type if exists public.account_request_status;
