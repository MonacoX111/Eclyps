-- Safe additive database migration for Team Join Requests.

create table if not exists team_join_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  requester_player_id uuid not null references players(id) on delete cascade,
  requester_user_profile_id uuid not null references user_profiles(id) on delete cascade,
  status text not null default 'pending',
  message text null,
  created_at timestamptz not null default now(),
  responded_at timestamptz null,
  reviewed_by_player_id uuid references players(id) on delete set null,
  constraint team_join_requests_status_check
    check (status in ('pending', 'approved', 'rejected', 'cancelled', 'expired'))
);

alter table team_join_requests enable row level security;

create index if not exists team_join_requests_team_id_idx
on team_join_requests(team_id);

create index if not exists team_join_requests_requester_player_id_idx
on team_join_requests(requester_player_id);

create index if not exists team_join_requests_requester_user_profile_id_idx
on team_join_requests(requester_user_profile_id);

create index if not exists team_join_requests_status_idx
on team_join_requests(status);

create unique index if not exists team_join_requests_active_unique_idx
on team_join_requests(team_id, requester_player_id)
where status = 'pending';

drop policy if exists "Users can read relevant team join requests" on team_join_requests;
drop policy if exists "Users can create own team join requests" on team_join_requests;
drop policy if exists "Users can update relevant team join requests" on team_join_requests;

create policy "Users can read relevant team join requests"
on team_join_requests
for select
to authenticated
using (
  exists (
    select 1
    from user_profiles u
    where u.id = team_join_requests.requester_user_profile_id
      and u.auth_user_id = auth.uid()
  )
  or
  exists (
    select 1
    from teams t
    left join team_members tm
      on tm.team_id = t.id
      and tm.role = 'captain'
    left join players p_owner
      on p_owner.id = t.owner_player_id
    left join user_profiles u_team_owner
      on u_team_owner.id = t.owner_user_id
    left join user_profiles u_owner
      on u_owner.id = p_owner.owner_user_id
    left join players p_cap
      on p_cap.id = tm.player_id
    left join user_profiles u_cap
      on u_cap.id = p_cap.owner_user_id
    where t.id = team_join_requests.team_id
      and (
        p_owner.user_id = auth.uid()
        or u_team_owner.auth_user_id = auth.uid()
        or u_owner.auth_user_id = auth.uid()
        or p_cap.user_id = auth.uid()
        or u_cap.auth_user_id = auth.uid()
      )
  )
);

create policy "Users can create own team join requests"
on team_join_requests
for insert
to authenticated
with check (
  exists (
    select 1
    from user_profiles u
    where u.id = team_join_requests.requester_user_profile_id
      and u.auth_user_id = auth.uid()
  )
  and
  exists (
    select 1
    from players p
    left join user_profiles u on u.id = p.owner_user_id
    where p.id = team_join_requests.requester_player_id
      and p.status = 'approved'
      and (
        p.user_id = auth.uid()
        or u.auth_user_id = auth.uid()
      )
  )
);

create policy "Users can update relevant team join requests"
on team_join_requests
for update
to authenticated
using (
  status = 'pending'
  and
  (
    exists (
      select 1
      from user_profiles u
      where u.id = team_join_requests.requester_user_profile_id
        and u.auth_user_id = auth.uid()
    )
    or
    exists (
      select 1
      from teams t
      left join team_members tm
        on tm.team_id = t.id
        and tm.role = 'captain'
      left join players p_owner
        on p_owner.id = t.owner_player_id
      left join user_profiles u_team_owner
        on u_team_owner.id = t.owner_user_id
      left join user_profiles u_owner
        on u_owner.id = p_owner.owner_user_id
      left join players p_cap
        on p_cap.id = tm.player_id
      left join user_profiles u_cap
        on u_cap.id = p_cap.owner_user_id
      where t.id = team_join_requests.team_id
        and (
          p_owner.user_id = auth.uid()
          or u_team_owner.auth_user_id = auth.uid()
          or u_owner.auth_user_id = auth.uid()
          or p_cap.user_id = auth.uid()
          or u_cap.auth_user_id = auth.uid()
        )
    )
  )
)
with check (
  status in ('approved', 'rejected', 'cancelled', 'expired')
);

revoke all on team_join_requests from public, anon, authenticated;
grant select, insert, update on team_join_requests to authenticated;
grant all on team_join_requests to service_role;
