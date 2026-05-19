create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  name text not null,
  nickname text,
  seed integer,
  wins integer default 0,
  losses integer default 0,
  created_at timestamp default now()
);

alter table matches
add column if not exists participant_type text default 'team';

alter table results
add column if not exists participant_type text default 'team';

alter table players enable row level security;

drop policy if exists "Allow public read" on players;

create policy "Allow public read"
on players
for select
to anon
using (true);
