-- Task 13/20: allow one source player/team profile to join many tournaments.
-- Participants are tournament-specific entries, so source profile uniqueness must
-- be scoped to a tournament instead of being global.

drop index if exists participants_source_team_idx;
drop index if exists participants_source_player_idx;

create unique index if not exists participants_tournament_source_team_idx
on participants (tournament_id, source_team_id)
where source_team_id is not null;

create unique index if not exists participants_tournament_source_player_idx
on participants (tournament_id, source_player_id)
where source_player_id is not null;
