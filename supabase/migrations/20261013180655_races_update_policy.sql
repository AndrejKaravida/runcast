drop policy if exists races_update_own on public.races;
create policy races_update_own on public.races
for update
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
