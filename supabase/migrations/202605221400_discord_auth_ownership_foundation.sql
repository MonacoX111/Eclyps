-- Task 14/20: Discord auth ownership foundation.
-- Adds durable user profiles linked to Supabase Auth users and ownership fields
-- for reusable player/team profiles and tournament registrations.

create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null
    references auth.users(id)
    on delete cascade,
  discord_id text not null,
  discord_username text not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_discord_id_not_empty
    check (length(trim(discord_id)) > 0),
  constraint user_profiles_discord_username_not_empty
    check (length(trim(discord_username)) > 0),
  constraint user_profiles_display_name_not_empty
    check (length(trim(display_name)) > 0)
);

create unique index if not exists user_profiles_auth_user_id_idx
on user_profiles (auth_user_id);

create unique index if not exists user_profiles_discord_id_idx
on user_profiles (discord_id);

alter table user_profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'Users can read their own profile'
  ) then
    create policy "Users can read their own profile"
    on user_profiles
    for select
    to authenticated
    using (auth.uid() = auth_user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'Users can update their own profile'
  ) then
    create policy "Users can update their own profile"
    on user_profiles
    for update
    to authenticated
    using (auth.uid() = auth_user_id)
    with check (auth.uid() = auth_user_id);
  end if;
end $$;

alter table players
add column if not exists owner_user_id uuid
  references user_profiles(id)
  on delete set null;

alter table teams
add column if not exists owner_user_id uuid
  references user_profiles(id)
  on delete set null;

alter table teams
add column if not exists captain_user_id uuid
  references user_profiles(id)
  on delete set null;

alter table tournament_registrations
add column if not exists user_profile_id uuid
  references user_profiles(id)
  on delete set null;

create index if not exists players_owner_user_id_idx
on players (owner_user_id);

create index if not exists teams_owner_user_id_idx
on teams (owner_user_id);

create index if not exists teams_captain_user_id_idx
on teams (captain_user_id);

create index if not exists tournament_registrations_user_profile_id_idx
on tournament_registrations (user_profile_id);
