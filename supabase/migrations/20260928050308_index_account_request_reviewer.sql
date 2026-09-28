-- Cover the reviewer foreign key for profile updates and deletes.
create index account_requests_reviewed_by_idx
on public.account_requests (reviewed_by)
where reviewed_by is not null;
