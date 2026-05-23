-- Safe additive conditional CHECK constraint for tournament_registrations.
-- Ensures that player_id is never set for 'team' registrations, and team_id is never set for 'player' registrations.
-- This enforces database integrity while safely allowing nulls for legacy unlinked signups.

do $$
begin
  -- First drop the constraint if it exists to replace it safely
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.tournament_registrations'::regclass
      and conname = 'tournament_registrations_type_conditional_check'
  ) then
    alter table tournament_registrations
    drop constraint tournament_registrations_type_conditional_check;
  end if;

  alter table tournament_registrations
  add constraint tournament_registrations_type_conditional_check
  check (
    (registration_type = 'player' and team_id is null)
    or
    (registration_type = 'team' and player_id is null)
    or
    (registration_type is null)
  );
end $$;
