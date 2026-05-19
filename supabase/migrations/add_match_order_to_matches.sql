alter table matches
add column if not exists match_order integer;

alter table matches enable row level security;

drop policy if exists "Allow public read" on matches;

create policy "Allow public read"
on matches
for select
to anon
using (true);
