-- Web Push subscriptions for browser notifications (new DM alerts, etc.)
-- All writes go through server actions with the service role key; RLS blocks direct client access.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_profile_id);

alter table public.push_subscriptions enable row level security;

-- No policies on purpose: only the service role (server actions) may read/write.
