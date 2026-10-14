-- Composite indexes for hot client query paths (see docs/DB-PERFORMANCE.md)

create index workouts_plan_id_workout_date_idx on public.workouts (plan_id, workout_date);
drop index public.workouts_plan_id_idx;

create index friendships_addressee_status_created_idx on public.friendships (addressee_id, status, created_at);
create index friendships_requester_status_created_idx on public.friendships (requester_id, status, created_at);
drop index public.friendships_addressee_idx;
drop index public.friendships_requester_idx;

create index races_user_id_race_date_idx on public.races (user_id, race_date);
drop index public.races_user_id_idx;

create index shoes_user_id_created_idx on public.shoes (user_id, created_at);
drop index public.shoes_user_id_idx;
