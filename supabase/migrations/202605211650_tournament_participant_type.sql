-- Task 13/20 fix: make each tournament declare the participant type it accepts.

alter table tournaments
add column if not exists participant_type text;

update tournaments
set participant_type = inferred.participant_type
from (
  select
    tournaments.id,
    case
      when count(participants.id) filter (where participants.participant_type = 'team')
        > count(participants.id) filter (where participants.participant_type = 'player')
      then 'team'
      else 'player'
    end as participant_type
  from tournaments
  left join participants
    on participants.tournament_id = tournaments.id
  group by tournaments.id
) as inferred
where tournaments.id = inferred.id
  and tournaments.participant_type is null;

alter table tournaments
alter column participant_type set default 'player';

update tournaments
set participant_type = 'player'
where participant_type is null
   or participant_type not in ('team', 'player');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.tournaments'::regclass
      and conname = 'tournaments_participant_type_check'
  ) then
    alter table tournaments
    add constraint tournaments_participant_type_check
    check (participant_type in ('team', 'player')) not valid;
  end if;
end $$;
