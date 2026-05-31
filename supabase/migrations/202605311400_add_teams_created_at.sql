-- Safe database migration to add missing created_at column to teams table.
-- Ensures existing teams table has a created_at column if it was created without one.

ALTER TABLE teams ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
