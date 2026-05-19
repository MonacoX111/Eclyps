-- Baseline schema for the current Eclyps app.
-- This migration is intentionally additive and non-destructive so existing
-- projects can keep their data while new projects can be created from scratch.
-- Participant columns such as matches.team1/team2 and results.team remain text
-- because the current app stores schedule/result participant names directly.

create extension if not exists pgcrypto;

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text,
  display_name text,
  game text not null,
  event_date date not null,
  format text,
  team_count integer not null,
  match_days integer not null default 1,
  status text not null default 'upcoming',
  prize_pool text,
  arena_title text,
  arena_description text,
  arena_tags text[] default array[]::text[],
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournaments_team_count_positive check (team_count > 0),
  constraint tournaments_match_days_positive check (match_days > 0),
  constraint tournaments_status_check check (status in ('upcoming', 'live', 'finished'))
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name text not null,
  seed integer not null,
  wins integer not null default 0,
  losses integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_seed_positive check (seed > 0),
  constraint teams_wins_non_negative check (wins >= 0),
  constraint teams_losses_non_negative check (losses >= 0)
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name text not null,
  nickname text,
  seed integer,
  wins integer not null default 0,
  losses integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint players_seed_positive check (seed is null or seed > 0),
  constraint players_wins_non_negative check (wins >= 0),
  constraint players_losses_non_negative check (losses >= 0)
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  round text,
  match_order integer not null,
  team1 text not null,
  team2 text not null,
  score1 integer,
  score2 integer,
  status text not null default 'upcoming',
  participant_type text not null default 'team',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_match_order_positive check (match_order > 0),
  constraint matches_scores_non_negative check (
    (score1 is null or score1 >= 0) and
    (score2 is null or score2 >= 0)
  ),
  constraint matches_status_check check (status in ('upcoming', 'live', 'finished')),
  constraint matches_participant_type_check check (participant_type in ('team', 'player')),
  constraint matches_distinct_participants check (lower(team1) <> lower(team2))
);

create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  team text not null,
  placement integer not null,
  label text,
  mvp text,
  scoreline text,
  note text,
  participant_type text not null default 'team',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint results_placement_positive check (placement > 0),
  constraint results_participant_type_check check (participant_type in ('team', 'player'))
);

create table if not exists admin_sessions (
  id uuid primary key default gen_random_uuid(),
  session_hash text not null unique,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create table if not exists admin_login_attempts (
  identifier text primary key,
  attempt_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  last_attempt_at timestamptz not null default now(),
  constraint admin_login_attempts_count_non_negative check (attempt_count >= 0)
);

-- Common homepage/admin read indexes.
create index if not exists tournaments_active_created_at_idx
on tournaments (is_active, created_at);

create index if not exists tournaments_created_at_idx
on tournaments (created_at desc);

-- This enforces the app's single-active-tournament assumption without
-- affecting inactive historical tournaments.
create unique index if not exists tournaments_single_active_idx
on tournaments (is_active)
where is_active is true;

create index if not exists teams_tournament_seed_idx
on teams (tournament_id, seed);

create index if not exists players_tournament_seed_idx
on players (tournament_id, seed);

create index if not exists matches_tournament_order_idx
on matches (tournament_id, match_order);

create index if not exists results_tournament_placement_idx
on results (tournament_id, placement);

create index if not exists admin_sessions_active_idx
on admin_sessions (session_hash, expires_at)
where revoked_at is null;

create index if not exists admin_sessions_expires_at_idx
on admin_sessions (expires_at);

create index if not exists admin_login_attempts_locked_until_idx
on admin_login_attempts (locked_until);

alter table tournaments enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table matches enable row level security;
alter table results enable row level security;
alter table admin_sessions enable row level security;
alter table admin_login_attempts enable row level security;

-- Public pages read tournament data through the anon client. Writes are
-- performed only by server-side admin actions with the Supabase service role.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tournaments'
      and policyname = 'Allow public read'
  ) then
    create policy "Allow public read"
    on tournaments
    for select
    to anon
    using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teams'
      and policyname = 'Allow public read'
  ) then
    create policy "Allow public read"
    on teams
    for select
    to anon
    using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'players'
      and policyname = 'Allow public read'
  ) then
    create policy "Allow public read"
    on players
    for select
    to anon
    using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'matches'
      and policyname = 'Allow public read'
  ) then
    create policy "Allow public read"
    on matches
    for select
    to anon
    using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'results'
      and policyname = 'Allow public read'
  ) then
    create policy "Allow public read"
    on results
    for select
    to anon
    using (true);
  end if;
end $$;
