-- Allow public player cards to read Discord display metadata for approved
-- player profiles. Sensitive auth linkage stays server-side in mutations.

alter table user_profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'Allow public avatar read for player cards'
  ) then
    create policy "Allow public avatar read for player cards"
    on user_profiles
    for select
    to anon, authenticated
    using (
      exists (
        select 1
        from players
        where players.owner_user_id = user_profiles.id
      )
    );
  end if;
end $$;

grant select on user_profiles to anon, authenticated;
