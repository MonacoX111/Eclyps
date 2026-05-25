-- Safe database migration to prevent tournament deletion cascade from removing global players and teams.
-- Replaces ON DELETE CASCADE constraints with ON DELETE SET NULL constraints.

ALTER TABLE players DROP CONSTRAINT IF EXISTS players_tournament_id_fkey;
ALTER TABLE players ADD CONSTRAINT players_tournament_id_fkey 
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE SET NULL;

ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_tournament_id_fkey;
ALTER TABLE teams ADD CONSTRAINT teams_tournament_id_fkey 
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE SET NULL;
