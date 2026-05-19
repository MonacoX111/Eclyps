-- Ensure server-side admin auth storage exists and is visible to the
-- service-role PostgREST API on projects with locked-down default grants.

create table if not exists admin_sessions (
  id uuid primary key default gen_random_uuid(),
  session_hash text not null unique,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index if not exists admin_sessions_active_idx
on admin_sessions (session_hash, expires_at)
where revoked_at is null;

create index if not exists admin_sessions_expires_at_idx
on admin_sessions (expires_at);

alter table admin_sessions enable row level security;

create table if not exists admin_login_attempts (
  identifier text primary key,
  attempt_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  last_attempt_at timestamptz not null default now(),
  constraint admin_login_attempts_count_non_negative check (attempt_count >= 0)
);

create index if not exists admin_login_attempts_locked_until_idx
on admin_login_attempts (locked_until);

create index if not exists admin_login_attempts_identifier_locked_until_idx
on admin_login_attempts (identifier, locked_until);

alter table admin_login_attempts enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on table admin_sessions to service_role;
grant select, insert, update, delete on table admin_login_attempts to service_role;
