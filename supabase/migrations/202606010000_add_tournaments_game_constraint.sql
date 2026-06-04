-- Normalize existing game values to match the supported case-sensitive game names exactly
UPDATE tournaments
SET game = CASE 
  WHEN trim(lower(game)) IN ('cs2', 'counter-strike 2', 'counterstrike 2', 'cs 2') THEN 'CS 2'
  WHEN trim(lower(game)) = 'valorant' THEN 'Valorant'
  WHEN trim(lower(game)) IN ('dota2', 'dota 2', 'dota') THEN 'Dota2'
  WHEN trim(lower(game)) IN ('clash royale', 'clashroyale') THEN 'Clash Royale'
  WHEN trim(lower(game)) = 'fortnite' THEN 'Fortnite'
  WHEN trim(lower(game)) IN ('fc', 'ea sports fc', 'ea fc', 'fifa') THEN 'FC'
  ELSE 'Other'
END;

-- Add check constraint to the tournaments table for the supported games
ALTER TABLE tournaments
ADD CONSTRAINT tournaments_game_check
CHECK (game IN ('CS 2', 'Valorant', 'Dota2', 'Clash Royale', 'Fortnite', 'FC', 'Other'));
