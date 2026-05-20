-- Feature Roadmap 3/20: match schedule system.
--
-- Additive only. Matches may remain unscheduled/TBA.

alter table matches
add column if not exists scheduled_at timestamptz,

add column if not exists timezone text,

add column if not exists schedule_note text;

create index if not exists matches_tournament_scheduled_at_idx
on matches (tournament_id, scheduled_at);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_timezone_not_empty'
  ) then

    alter table matches
    add constraint matches_timezone_not_empty
    check (timezone is null or length(trim(timezone)) > 0) not valid;

  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_schedule_note_not_empty'
  ) then

    alter table matches
    add constraint matches_schedule_note_not_empty
    check (schedule_note is null or length(trim(schedule_note)) > 0) not valid;

  end if;
end $$;
