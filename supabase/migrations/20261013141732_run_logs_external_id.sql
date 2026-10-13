alter table public.run_logs add column external_id text;

create unique index run_logs_user_external_uidx
  on public.run_logs (user_id, external_id) where external_id is not null;
