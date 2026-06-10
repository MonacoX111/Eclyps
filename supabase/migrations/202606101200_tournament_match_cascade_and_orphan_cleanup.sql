-- Ensure deleting a tournament removes its tournament-scoped public data.
-- Also clean up legacy rows that were left behind before the cascade existed.

update matches
set next_match_id = null
where tournament_id is not null
  and not exists (
    select 1
    from tournaments
    where tournaments.id = matches.tournament_id
  );

delete from match_disputes
where tournament_id is not null
  and not exists (
    select 1
    from tournaments
    where tournaments.id = match_disputes.tournament_id
  );

delete from match_disputes
using matches
where match_disputes.match_id = matches.id
  and matches.tournament_id is not null
  and not exists (
    select 1
    from tournaments
    where tournaments.id = matches.tournament_id
  );

delete from results
where tournament_id is not null
  and not exists (
    select 1
    from tournaments
    where tournaments.id = results.tournament_id
  );

delete from matches
where tournament_id is not null
  and not exists (
    select 1
    from tournaments
    where tournaments.id = matches.tournament_id
  );

alter table matches
drop constraint if exists matches_tournament_id_fkey;

alter table matches
add constraint matches_tournament_id_fkey
foreign key (tournament_id)
references tournaments(id)
on delete cascade;

alter table results
drop constraint if exists results_tournament_id_fkey;

alter table results
add constraint results_tournament_id_fkey
foreign key (tournament_id)
references tournaments(id)
on delete cascade;
