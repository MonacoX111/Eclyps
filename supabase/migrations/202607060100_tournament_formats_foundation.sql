-- Tournament formats foundation.
-- Keeps the existing tournaments.format column as match-series format (BO1/BO3/etc.)
-- and adds tournament_format for the competition structure.

alter table tournaments
add column if not exists tournament_format text not null default 'single_elimination',
add column if not exists format_config jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.tournaments'::regclass
      and conname = 'tournaments_tournament_format_check'
  ) then
    alter table tournaments
    add constraint tournaments_tournament_format_check
    check (
      tournament_format in (
        'single_elimination',
        'double_elimination',
        'round_robin',
        'swiss',
        'groups_then_playoffs',
        'battle_royale',
        'free_for_all'
      )
    ) not valid;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_bracket_type_check'
  ) then
    alter table matches drop constraint matches_bracket_type_check;
  end if;

  alter table matches
  add constraint matches_bracket_type_check
  check (
    bracket_type is null
    or bracket_type in (
      'single_elimination',
      'double_elimination',
      'round_robin',
      'swiss',
      'groups_then_playoffs',
      'battle_royale',
      'free_for_all'
    )
  ) not valid;
end $$;

create index if not exists tournaments_tournament_format_idx
on tournaments (tournament_format);
