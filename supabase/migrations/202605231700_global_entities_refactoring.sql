-- Safe additive database refactoring for Global Players and Global Teams.
-- Drops no columns and preserves all existing tournament-scoped data.

-- 1. Alter players table to ensure tournament_id is nullable (already nullable, but explicit)
alter table players alter column tournament_id drop not null;

-- 2. Add safe columns to players table
alter table players add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table players add column if not exists display_name text;
alter table players add column if not exists real_name text;
alter table players add column if not exists avatar_url text;
alter table players add column if not exists status text check (status in ('pending', 'approved', 'rejected')) default 'approved';

-- Ensure user_id is unique so one auth user can have only one global player profile
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.players'::regclass
      and conname = 'players_user_id_key'
  ) then
    alter table players add constraint players_user_id_key unique (user_id);
  end if;
end $$;

-- Migrate existing players display_name and status
update players
set display_name = coalesce(display_name, nickname, name),
    status = coalesce(status, 'approved')
where display_name is null or status is null;

-- 3. Alter teams table to drop not null on tournament_id
alter table teams alter column tournament_id drop not null;

-- 4. Add safe columns to teams table
alter table teams add column if not exists slug text;
alter table teams add column if not exists logo_url text;
alter table teams add column if not exists owner_player_id uuid references players(id) on delete set null;
alter table teams add column if not exists status text check (status in ('pending', 'approved', 'rejected')) default 'approved';

-- Populate existing teams slug and status
update teams
set slug = coalesce(slug, lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))),
    status = coalesce(status, 'approved')
where slug is null or status is null;

-- Try to link owner_player_id for existing teams based on owner_user_id (which is a user_profiles id)
update teams t
set owner_player_id = (
  select p.id
  from players p
  where p.owner_user_id = t.owner_user_id
  limit 1
)
where t.owner_player_id is null and t.owner_user_id is not null;

-- 5. Create team_members table
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  role text not null check (role in ('captain', 'member')),
  joined_at timestamptz not null default now(),
  constraint team_members_team_id_player_id_key unique (team_id, player_id)
);

-- Seed team_members with captains from existing teams
insert into team_members (team_id, player_id, role)
select t.id, p.id, 'captain'
from teams t
join players p on p.owner_user_id = t.captain_user_id or p.owner_user_id = t.owner_user_id
on conflict (team_id, player_id) do nothing;

-- 6. Extend tournament_registrations with new global fields
alter table tournament_registrations add column if not exists registration_type text check (registration_type in ('player', 'team'));
alter table tournament_registrations add column if not exists player_id uuid references players(id) on delete set null;
alter table tournament_registrations add column if not exists team_id uuid references teams(id) on delete set null;

-- Populate registrations
update tournament_registrations
set registration_type = coalesce(registration_type, participant_type),
    player_id = coalesce(player_id, source_player_id),
    team_id = coalesce(team_id, source_team_id)
where registration_type is null or player_id is null or team_id is null;

-- Enable RLS and public reads
alter table team_members enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'team_members'
      and policyname = 'Allow public read'
  ) then
    create policy "Allow public read"
    on team_members
    for select
    to anon, authenticated
    using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'team_members'
      and policyname = 'Members can manage their roles'
  ) then
    create policy "Members can manage their roles"
    on team_members
    for all
    to authenticated
    using (true);
  end if;
end $$;
