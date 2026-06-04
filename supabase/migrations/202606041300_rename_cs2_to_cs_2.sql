-- Rename the displayed/canonical game value from CS2 to CS 2.
-- Keep input normalization in application code compatible with old CS2 values.

alter table tournaments
drop constraint if exists tournaments_game_check;

update tournaments
set game = 'CS 2'
where trim(lower(game)) in ('cs2', 'cs 2', 'counter-strike 2', 'counterstrike 2');

alter table tournaments
add constraint tournaments_game_check
check (game in ('CS 2', 'Valorant', 'Dota2', 'Clash Royale', 'Fortnite', 'FC', 'Other'));
