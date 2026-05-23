-- Security Hardening Database Migration for Eelyps Platform.
-- Implements Phase 7B: Security Hardening Fixes.

-- 1. Secure approve_tournament_registration RPC Stored Function
-- Revoke all execute permissions from the public API roles
revoke execute on function approve_tournament_registration(uuid) from public, anon, authenticated;

-- Explicitly grant execution privileges to the service_role key (bypassing REST/anon access)
grant execute on function approve_tournament_registration(uuid) to service_role;

-- 2. Harden team_members RLS Policies
-- Drop the overly permissive using(true) write policy
drop policy if exists "Members can manage their roles" on team_members;

-- Implement secure, recursion-free write policy restricting direct REST mutations
-- Only the team owner (resolved via players table user_id) can modify team roster memberships.
-- Service role client automatically bypasses RLS for administrative actions.
create policy "Captains can manage team members"
on team_members
for all
to authenticated
using (
  exists (
    select 1 from teams t
    join players p on p.id = t.owner_player_id
    where t.id = team_members.team_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from teams t
    join players p on p.id = t.owner_player_id
    where t.id = team_members.team_id
      and p.user_id = auth.uid()
  )
);
