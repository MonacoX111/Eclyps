-- Add game_mode column to tournaments table
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS game_mode text;

-- Backfill existing tournaments safely based on their game and participant_type
UPDATE tournaments
SET game_mode = CASE
  WHEN trim(lower(game)) IN ('cs2', 'counter-strike 2', 'cs 2') AND participant_type = 'player' THEN '1v1'
  WHEN trim(lower(game)) IN ('cs2', 'counter-strike 2', 'cs 2') AND participant_type = 'team' THEN '5v5'
  WHEN trim(lower(game)) = 'valorant' THEN '5v5'
  WHEN trim(lower(game)) IN ('dota2', 'dota 2', 'dota') THEN '5v5'
  WHEN trim(lower(game)) IN ('clash royale', 'clashroyale') THEN '1v1'
  WHEN trim(lower(game)) = 'fortnite' THEN '1v1'
  WHEN trim(lower(game)) IN ('fc', 'ea sports fc', 'ea fc') THEN '1v1'
  ELSE '5v5'
END
WHERE game_mode IS NULL;
