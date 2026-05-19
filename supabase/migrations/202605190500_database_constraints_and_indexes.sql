-- 5/30: tighten database integrity and add query indexes.
--
-- This migration is additive. Check constraints are added NOT VALID so dirty
-- legacy rows do not block deployment, while new or updated rows must satisfy
-- the rules. The single-active-tournament index is conditional because unique
-- indexes cannot be marked NOT VALID.

-- Query indexes used by public pages, admin lists, and auth checks.
create index if not exists tournaments_is_active_idx
on tournaments (is_active);

create index if not exists tournaments_created_at_idx
on tournaments (created_at desc);

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

create index if not exists admin_login_attempts_identifier_locked_until_idx
on admin_login_attempts (identifier, locked_until);

-- Enforce the app invariant that only one tournament may be active, when the
-- existing data is clean enough to accept the unique partial index.
do $$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'tournaments_single_active_idx'
      and c.relkind = 'i'
  ) then
    if (select count(*) from tournaments where is_active is true) <= 1 then
      create unique index tournaments_single_active_idx
      on tournaments (is_active)
      where is_active is true;
    else
      raise notice 'Skipping tournaments_single_active_idx because multiple active tournaments already exist.';
    end if;
  end if;
end $$;

-- Tournaments.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tournaments'::regclass
      and conname in ('tournaments_team_count_positive', 'tournaments_team_count_non_negative')
  ) then
    alter table tournaments
    add constraint tournaments_team_count_non_negative
    check (team_count >= 0) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tournaments'::regclass
      and conname in ('tournaments_match_days_positive', 'tournaments_match_days_non_negative')
  ) then
    alter table tournaments
    add constraint tournaments_match_days_non_negative
    check (match_days >= 0) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tournaments'::regclass
      and conname = 'tournaments_status_check'
  ) then
    alter table tournaments
    add constraint tournaments_status_check
    check (status in ('upcoming', 'live', 'finished')) not valid;
  end if;
end $$;

-- Teams.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.teams'::regclass
      and conname = 'teams_seed_positive'
  ) then
    alter table teams
    add constraint teams_seed_positive
    check (seed > 0) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.teams'::regclass
      and conname = 'teams_wins_non_negative'
  ) then
    alter table teams
    add constraint teams_wins_non_negative
    check (wins >= 0) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.teams'::regclass
      and conname = 'teams_losses_non_negative'
  ) then
    alter table teams
    add constraint teams_losses_non_negative
    check (losses >= 0) not valid;
  end if;
end $$;

-- Players keep their current optional seed model.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.players'::regclass
      and conname = 'players_seed_positive'
  ) then
    alter table players
    add constraint players_seed_positive
    check (seed is null or seed > 0) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.players'::regclass
      and conname = 'players_wins_non_negative'
  ) then
    alter table players
    add constraint players_wins_non_negative
    check (wins >= 0) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.players'::regclass
      and conname = 'players_losses_non_negative'
  ) then
    alter table players
    add constraint players_losses_non_negative
    check (losses >= 0) not valid;
  end if;
end $$;

-- Matches keep text participants for now.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_match_order_positive'
  ) then
    alter table matches
    add constraint matches_match_order_positive
    check (match_order > 0) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_scores_non_negative'
  ) then
    alter table matches
    add constraint matches_scores_non_negative
    check (
      (score1 is null or score1 >= 0) and
      (score2 is null or score2 >= 0)
    ) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_status_check'
  ) then
    alter table matches
    add constraint matches_status_check
    check (status in ('upcoming', 'live', 'finished')) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_participant_type_check'
  ) then
    alter table matches
    add constraint matches_participant_type_check
    check (participant_type in ('team', 'player')) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_distinct_participants'
  ) then
    alter table matches
    add constraint matches_distinct_participants
    check (team1 is null or team2 is null or lower(team1) <> lower(team2)) not valid;
  end if;
end $$;

-- Results keep the text participant field for now.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.results'::regclass
      and conname = 'results_placement_positive'
  ) then
    alter table results
    add constraint results_placement_positive
    check (placement > 0) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.results'::regclass
      and conname = 'results_participant_type_check'
  ) then
    alter table results
    add constraint results_participant_type_check
    check (participant_type in ('team', 'player')) not valid;
  end if;
end $$;

-- Admin auth.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.admin_login_attempts'::regclass
      and conname = 'admin_login_attempts_count_non_negative'
  ) then
    alter table admin_login_attempts
    add constraint admin_login_attempts_count_non_negative
    check (attempt_count >= 0) not valid;
  end if;
end $$;
