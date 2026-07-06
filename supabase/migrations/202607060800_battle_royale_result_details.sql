alter table results
add column if not exists lobby_round integer,
add column if not exists lobby_order integer,
add column if not exists kills integer,
add column if not exists points integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.results'::regclass
      and conname = 'results_lobby_round_positive'
  ) then
    alter table results
    add constraint results_lobby_round_positive
    check (lobby_round is null or lobby_round > 0) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.results'::regclass
      and conname = 'results_lobby_order_positive'
  ) then
    alter table results
    add constraint results_lobby_order_positive
    check (lobby_order is null or lobby_order > 0) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.results'::regclass
      and conname = 'results_kills_non_negative'
  ) then
    alter table results
    add constraint results_kills_non_negative
    check (kills is null or kills >= 0) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.results'::regclass
      and conname = 'results_points_non_negative'
  ) then
    alter table results
    add constraint results_points_non_negative
    check (points is null or points >= 0) not valid;
  end if;
end $$;

create index if not exists results_tournament_lobby_idx
on results (tournament_id, lobby_round, lobby_order);
