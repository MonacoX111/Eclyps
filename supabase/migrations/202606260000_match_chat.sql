-- Match Chat (Task #6): two channels per match.
--   channel = 'participants'  -> only match participants may post (enforced in server action)
--   channel = 'all'           -> any authenticated user may post (enforced in server action)
-- Reading is PUBLIC for both channels (spectators included) so realtime works for everyone.
-- All writes/deletes go through server actions using the service_role key (never the client).

create table if not exists match_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null
    references matches(id)
    on delete cascade,
  author_profile_id uuid
    references user_profiles(id)
    on delete set null,
  channel text not null default 'all'
    check (channel in ('participants', 'all')),
  kind text not null default 'user'
    check (kind in ('user', 'system')),
  body text not null
    check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

-- Indexes for fast per-match, per-channel, chronological reads
create index if not exists match_messages_match_channel_created_idx
  on match_messages(match_id, channel, created_at);
create index if not exists match_messages_author_idx
  on match_messages(author_profile_id);

-- Enable Row Level Security
alter table match_messages enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Anyone can read match messages" on match_messages;

-- Read policy: public read for everyone (anon + authenticated).
create policy "Anyone can read match messages"
on match_messages
for select
to anon, authenticated
using (true);

-- Lock down all direct writes from the client. Inserts/updates/deletes only
-- happen through trusted server actions running with the service_role key,
-- which independently verify participant status / admin session.
revoke all on match_messages from public, anon, authenticated;

-- Grant SELECT so the browser (anon key) can read + receive realtime events.
grant select on match_messages to anon, authenticated;

-- Full administrative control to service_role (server actions).
grant all on match_messages to service_role;

-- Add table to the realtime publication so INSERT/DELETE stream to clients.
alter publication supabase_realtime add table match_messages;
