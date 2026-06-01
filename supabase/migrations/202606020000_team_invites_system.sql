-- Safe additive database migration for Team Invite System.

create table if not exists team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  inviter_player_id uuid references players(id) on delete set null,
  invited_player_id uuid not null references players(id) on delete cascade,
  invited_user_profile_id uuid not null references user_profiles(id) on delete cascade,
  status text not null default 'pending',
  message text null,
  created_at timestamptz not null default now(),
  responded_at timestamptz null,
  constraint team_invites_status_check check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired'))
);

-- Enable Row Level Security (RLS)
alter table team_invites enable row level security;

-- Create indexes for performance and rapid filtering
create index if not exists team_invites_invited_user_profile_id_idx on team_invites(invited_user_profile_id);
create index if not exists team_invites_team_id_idx on team_invites(team_id);
create index if not exists team_invites_status_idx on team_invites(status);

-- Create partial unique index to prevent duplicate pending invites to the same player in the same team
create unique index if not exists team_invites_active_unique_idx
on team_invites (team_id, invited_player_id)
where status = 'pending';

-- Drop existing policies if they exist to prevent conflicts
drop policy if exists "Users can read relevant team invites" on team_invites;
drop policy if exists "Owner/captain can insert team invites" on team_invites;
drop policy if exists "Users can update relevant team invites" on team_invites;

-- 1. Select Policy: Users can only read invites that involve them as the invited party, or if they own/captain the team.
create policy "Users can read relevant team invites"
on team_invites
for select
to authenticated
using (
  exists (
    select 1 from players p
    where p.id = team_invites.invited_player_id
      and p.user_id = auth.uid()
  )
  or
  exists (
    select 1 from user_profiles u
    where u.id = team_invites.invited_user_profile_id
      and u.auth_user_id = auth.uid()
  )
  or
  exists (
    select 1 from teams t
    left join team_members tm on tm.team_id = t.id and tm.role = 'captain'
    left join players p_owner on p_owner.id = t.owner_player_id
    left join players p_cap on p_cap.id = tm.player_id
    where t.id = team_invites.team_id
      and (
        p_owner.user_id = auth.uid() or
        p_cap.user_id = auth.uid()
      )
  )
);

-- 2. Insert Policy: Only owners/captains of the team can create invites
create policy "Owner/captain can insert team invites"
on team_invites
for insert
to authenticated
with check (
  exists (
    select 1 from teams t
    left join team_members tm on tm.team_id = t.id and tm.role = 'captain'
    left join players p_owner on p_owner.id = t.owner_player_id
    left join players p_cap on p_cap.id = tm.player_id
    where t.id = team_invites.team_id
      and (
        p_owner.user_id = auth.uid() or
        p_cap.user_id = auth.uid()
      )
  )
);

-- 3. Update Policy: The invited player/profile can update status to accept/decline, or the owner/captain can update status to cancel/expire
create policy "Users can update relevant team invites"
on team_invites
for update
to authenticated
using (
  (
    (
      exists (
        select 1 from players p
        where p.id = team_invites.invited_player_id
          and p.user_id = auth.uid()
      )
      or
      exists (
        select 1 from user_profiles u
        where u.id = team_invites.invited_user_profile_id
          and u.auth_user_id = auth.uid()
      )
    )
    and status = 'pending'
  )
  or
  (
    exists (
      select 1 from teams t
      left join team_members tm on tm.team_id = t.id and tm.role = 'captain'
      left join players p_owner on p_owner.id = t.owner_player_id
      left join players p_cap on p_cap.id = tm.player_id
      where t.id = team_invites.team_id
        and (
          p_owner.user_id = auth.uid() or
          p_cap.user_id = auth.uid()
        )
    )
    and status = 'pending'
  )
)
with check (
  status in ('accepted', 'declined', 'cancelled', 'expired')
);

-- Revoke all direct modification privileges to prevent client bypasses and enforce server-actions-only modifications
revoke all on team_invites from public, anon, authenticated;

-- Grant select, insert, update to authenticated users to satisfy RLS and logical controls
grant select, insert, update on team_invites to authenticated;

-- Allow full administrative control to the service_role client used in server actions
grant all on team_invites to service_role;
