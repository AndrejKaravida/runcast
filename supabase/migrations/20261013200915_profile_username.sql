alter table public.profiles
  add column username text,
  add constraint profiles_username_format check (username is null or username ~ '^[a-z0-9_]{3,20}$');

create unique index profiles_username_lower_key on public.profiles (lower(username)) where username is not null;
