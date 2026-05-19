alter table tournaments
add column if not exists prize_pool text,
add column if not exists arena_title text,
add column if not exists arena_description text,
add column if not exists arena_tags text[];

alter table teams
add column if not exists wins integer default 0,
add column if not exists losses integer default 0;
