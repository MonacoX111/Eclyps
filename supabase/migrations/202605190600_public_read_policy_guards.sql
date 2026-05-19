-- 6/30: ensure public reads can use the anon Supabase client.
--
-- Public-facing data loaders must not use the service-role client. These
-- idempotent policy guards make the required anon SELECT policies explicit
-- across baseline installs and older projects that picked up migrations in a
-- different order.

alter table tournaments enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table matches enable row level security;
alter table results enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tournaments'
      and policyname = 'Allow public read'
  ) then
    create policy "Allow public read"
    on tournaments
    for select
    to anon
    using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teams'
      and policyname = 'Allow public read'
  ) then
    create policy "Allow public read"
    on teams
    for select
    to anon
    using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'players'
      and policyname = 'Allow public read'
  ) then
    create policy "Allow public read"
    on players
    for select
    to anon
    using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'matches'
      and policyname = 'Allow public read'
  ) then
    create policy "Allow public read"
    on matches
    for select
    to anon
    using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'results'
      and policyname = 'Allow public read'
  ) then
    create policy "Allow public read"
    on results
    for select
    to anon
    using (true);
  end if;
end $$;
