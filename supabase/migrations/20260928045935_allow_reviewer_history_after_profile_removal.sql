-- reviewed_by uses ON DELETE SET NULL so historical decisions survive if an
-- administrator profile is later removed. The review timestamp still proves a
-- non-pending request completed the review transition.
alter table public.account_requests
drop constraint account_requests_review_state;

alter table public.account_requests
add constraint account_requests_review_state check (
  (status = 'pending' and reviewed_at is null and reviewed_by is null)
  or (status in ('approved', 'rejected') and reviewed_at is not null)
);
