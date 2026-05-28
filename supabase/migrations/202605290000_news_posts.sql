-- Additive migration for the Eclyps public News & Articles system.

create extension if not exists pgcrypto;

create table if not exists news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text,
  content text not null,
  cover_image_url text,
  status text not null default 'draft',
  category text,
  author_name text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_posts_status_check
    check (status in ('draft', 'published', 'archived'))
);

create index if not exists news_posts_status_idx on news_posts(status);
create index if not exists news_posts_published_at_idx on news_posts(published_at);
create index if not exists news_posts_slug_idx on news_posts(slug);

create or replace function set_news_posts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists news_posts_set_updated_at on news_posts;
create trigger news_posts_set_updated_at
before update on news_posts
for each row
execute function set_news_posts_updated_at();

alter table news_posts enable row level security;

drop policy if exists "Published news posts are public" on news_posts;
drop policy if exists "Authenticated users cannot manage news posts" on news_posts;

create policy "Published news posts are public"
on news_posts
for select
to anon, authenticated
using (status = 'published');

revoke all on news_posts from public, anon, authenticated;
grant select on news_posts to anon, authenticated;
grant all on news_posts to service_role;
