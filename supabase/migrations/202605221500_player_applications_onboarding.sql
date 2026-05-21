-- Task 14/20 architecture fix: separate Discord users, player applications,
-- and tournament registrations.

alter table user_profiles
add column if not exists onboarding_seen_at timestamptz;

create table if not exists player_applications (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null
    references user_profiles(id)
    on delete cascade,
  requested_nickname text not null,
  requested_region text,
  status text not null default 'pending',
  reviewed_at timestamptz,
  created_player_id uuid
    references players(id)
    on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_applications_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint player_applications_requested_nickname_not_empty
    check (length(trim(requested_nickname)) > 0)
);

create index if not exists player_applications_user_profile_created_idx
on player_applications (user_profile_id, created_at desc);

create index if not exists player_applications_status_created_idx
on player_applications (status, created_at desc);

create unique index if not exists player_applications_one_pending_per_user_idx
on player_applications (user_profile_id)
where status = 'pending';

alter table player_applications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'player_applications'
      and policyname = 'Users can read their own player applications'
  ) then
    create policy "Users can read their own player applications"
    on player_applications
    for select
    to authenticated
    using (
      exists (
        select 1
        from user_profiles
        where user_profiles.id = player_applications.user_profile_id
          and user_profiles.auth_user_id = auth.uid()
      )
    );
  end if;
end $$;

insert into player_applications (
  user_profile_id,
  requested_nickname,
  requested_region,
  status,
  reviewed_at,
  created_player_id,
  created_at,
  updated_at
)
select distinct on (players.owner_user_id)
  players.owner_user_id,
  coalesce(nullif(trim(players.nickname), ''), players.name),
  players.region,
  'approved',
  coalesce(players.created_at, now()),
  players.id,
  coalesce(players.created_at, now()),
  now()
from players
where players.owner_user_id is not null
  and players.name is not null
  and not exists (
    select 1
    from player_applications
    where player_applications.user_profile_id = players.owner_user_id
      and player_applications.status = 'approved'
  )
order by players.owner_user_id, players.created_at asc;
