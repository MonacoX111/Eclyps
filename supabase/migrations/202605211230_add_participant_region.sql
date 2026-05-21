alter table participants
add column if not exists region text;

update participants
set region = players.region
from players
where participants.participant_type = 'player'
  and participants.source_player_id = players.id
  and players.region is not null
  and length(trim(players.region)) > 0;
