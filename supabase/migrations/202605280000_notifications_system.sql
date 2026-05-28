-- Additive migration for Task 16: In-App Notifications System MVP.

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null
    references user_profiles(id)
    on delete cascade,
  player_id uuid
    references players(id)
    on delete cascade,
  team_id uuid
    references teams(id)
    on delete cascade,
  tournament_id uuid
    references tournaments(id)
    on delete cascade,
  match_id uuid
    references matches(id)
    on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table notifications enable row level security;

-- Create indexes for performance and rapid filtering
create index if not exists notifications_user_profile_id_idx on notifications(user_profile_id);
create index if not exists notifications_read_at_idx on notifications(read_at);

-- Drop existing policies if they exist to prevent conflicts
drop policy if exists "Users can read their own notifications" on notifications;
drop policy if exists "Users can update their own notifications" on notifications;

-- 1. Select Policy: Users can only select notifications targeted directly at their user profile
create policy "Users can read their own notifications"
on notifications
for select
to authenticated
using (
  exists (
    select 1 from user_profiles u
    where u.auth_user_id = auth.uid()
      and u.id = notifications.user_profile_id
  )
);

-- 2. Update Policy: Users can update notifications matching their user profile
create policy "Users can update their own notifications"
on notifications
for update
to authenticated
using (
  exists (
    select 1 from user_profiles u
    where u.auth_user_id = auth.uid()
      and u.id = notifications.user_profile_id
  )
)
with check (
  exists (
    select 1 from user_profiles u
    where u.auth_user_id = auth.uid()
      and u.id = notifications.user_profile_id
  )
);

-- Revoke all table level insert, update, delete from public/authenticated to prevent abuse
revoke all on notifications from public, anon, authenticated;

-- Grant SELECT on notifications to authenticated users
grant select on notifications to authenticated;

-- Grant UPDATE ONLY on the read_at column to authenticated users.
-- This ensures no user can ever modify title, message, type, or user_profile_id via client REST API.
grant update (read_at) on notifications to authenticated;

-- Allow full administrative control to the service_role
grant all on notifications to service_role;
