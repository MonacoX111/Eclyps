-- Refresh player public read access for the global Registered Players list.
-- Older projects may have policies/grants that only let the app fall back to
-- participants; the homepage now reads approved player profiles directly.

alter table players enable row level security;

drop policy if exists "Allow public read" on players;

create policy "Allow public read"
on players
for select
to anon, authenticated
using (true);

grant select on players to anon, authenticated;
