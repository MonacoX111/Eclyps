alter table results
add column if not exists label text;

alter table results
add column if not exists placement integer;

alter table results enable row level security;

drop policy if exists "Allow public read" on results;

create policy "Allow public read"
on results
for select
to anon
using (true);
