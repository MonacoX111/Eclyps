-- Friends + Direct Messages
-- friendships: requester/addressee are user_profiles.id
-- direct_messages: 1:1 messages between user_profiles, keyed by sorted pair

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.user_profiles(id) on delete cascade,
  addressee_id uuid not null references public.user_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_unique_pair unique (requester_id, addressee_id)
);

create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);
create index if not exists friendships_status_idx on public.friendships (status);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_key text not null,
  sender_id uuid not null references public.user_profiles(id) on delete cascade,
  recipient_id uuid not null references public.user_profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint direct_messages_no_self check (sender_id <> recipient_id)
);

create index if not exists direct_messages_conversation_idx on public.direct_messages (conversation_key, created_at);
create index if not exists direct_messages_recipient_idx on public.direct_messages (recipient_id, read_at);

-- Helper to build a stable conversation key from two user_profile ids
create or replace function public.dm_conversation_key(a uuid, b uuid)
returns text
language sql
immutable
as $$
  select case when a < b then a::text || ':' || b::text
              else b::text || ':' || a::text end
$$;

-- RLS: reads restricted to involved users; all writes go through server actions (service role bypasses RLS).
alter table public.friendships enable row level security;
alter table public.direct_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='friendships'
      and policyname='Users can read their own friendships'
  ) then
    create policy "Users can read their own friendships"
      on public.friendships for select
      using (
        exists (select 1 from public.user_profiles up
                where up.auth_user_id = auth.uid()
                  and up.id in (friendships.requester_id, friendships.addressee_id))
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='direct_messages'
      and policyname='Users can read their own messages'
  ) then
    create policy "Users can read their own messages"
      on public.direct_messages for select
      using (
        exists (select 1 from public.user_profiles up
                where up.auth_user_id = auth.uid()
                  and up.id in (direct_messages.sender_id, direct_messages.recipient_id))
      );
  end if;
end $$;

-- Realtime
do $$
begin
  begin
    alter publication supabase_realtime add table public.friendships;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.direct_messages;
  exception when duplicate_object then null;
  end;
end $$;
