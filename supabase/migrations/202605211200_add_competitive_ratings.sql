alter table teams
add column if not exists rating integer not null default 1000,
add column if not exists rating_matches_played integer not null default 0,
add column if not exists rank_position integer;

alter table players
add column if not exists rating integer not null default 1000,
add column if not exists rating_matches_played integer not null default 0,
add column if not exists rank_position integer;

create index if not exists teams_tournament_rating_idx
on teams (tournament_id, rating desc);

create index if not exists players_tournament_rating_idx
on players (tournament_id, rating desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.teams'::regclass
      and conname = 'teams_rating_positive'
  ) then
    alter table teams
    add constraint teams_rating_positive
    check (rating > 0) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.teams'::regclass
      and conname = 'teams_rating_matches_played_non_negative'
  ) then
    alter table teams
    add constraint teams_rating_matches_played_non_negative
    check (rating_matches_played >= 0) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.players'::regclass
      and conname = 'players_rating_positive'
  ) then
    alter table players
    add constraint players_rating_positive
    check (rating > 0) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.players'::regclass
      and conname = 'players_rating_matches_played_non_negative'
  ) then
    alter table players
    add constraint players_rating_matches_played_non_negative
    check (rating_matches_played >= 0) not valid;
  end if;
end $$;
