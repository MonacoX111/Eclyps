-- Add last_seen for online status tracking
-- Green dot if last_seen within 5 minutes

alter table public.user_profiles
add column if not exists last_seen timestamptz;

create index if not exists user_profiles_last_seen_idx 
on public.user_profiles (last_seen);

-- Helper function to check if a user is online (last_seen within 5 minutes)
create or replace function public.is_user_online(last_seen_ts timestamptz)
returns boolean
language sql
immutable
as $$
  select last_seen_ts is not null 
    and last_seen_ts > (now() - interval '5 minutes')
$$;

-- RPC to update current user's last_seen timestamp
-- Called from client periodically or on activity
create or replace function public.update_my_last_seen()
returns void
language plpgsql
security definer
as $$
begin
  update public.user_profiles
  set last_seen = now()
  where auth_user_id = auth.uid();
end;
$$;

grant execute on function public.update_my_last_seen() to authenticated;
grant execute on function public.is_user_online(timestamptz) to authenticated, anon;
