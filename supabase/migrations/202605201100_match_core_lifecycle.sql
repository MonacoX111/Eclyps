-- Feature Roadmap 2/20: match core lifecycle.
--
-- Additive integrity checks only. Legacy text participant fields remain.

create index if not exists matches_tournament_status_idx
on matches (tournament_id, status);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_winner_is_participant'
  ) then

    alter table matches
    add constraint matches_winner_is_participant
    check (
      winner_participant_id is null
      or winner_participant_id = participant_1_id
      or winner_participant_id = participant_2_id
    ) not valid;

  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_open_matches_have_no_winner'
  ) then

    alter table matches
    add constraint matches_open_matches_have_no_winner
    check (
      status = 'finished'
      or winner_participant_id is null
    ) not valid;

  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_finished_scores_required'
  ) then

    alter table matches
    add constraint matches_finished_scores_required
    check (
      status <> 'finished'
      or (score1 is not null and score2 is not null)
    ) not valid;

  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_finished_winner_consistent'
  ) then

    alter table matches
    add constraint matches_finished_winner_consistent
    check (
      status <> 'finished'
      or (
        winner_participant_id is not null
        and (
          (score1 = score2 and winner_participant_id in (participant_1_id, participant_2_id))
          or (score1 > score2 and winner_participant_id = participant_1_id)
          or (score2 > score1 and winner_participant_id = participant_2_id)
        )
      )
    ) not valid;

  end if;
end $$;
