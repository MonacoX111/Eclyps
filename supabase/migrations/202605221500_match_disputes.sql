create table if not exists match_disputes (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete set null,
  match_id uuid not null references matches(id) on delete cascade,
  reporter_user_profile_id uuid not null references user_profiles(id) on delete cascade,
  reporter_participant_id uuid references participants(id) on delete set null,
  reporter_player_id uuid references players(id) on delete set null,
  reporter_team_id uuid references teams(id) on delete set null,
  participant_type text not null check (participant_type in ('team', 'player')),
  dispute_type text not null check (
    dispute_type in (
      'no_show',
      'wrong_result',
      'cheating',
      'connection_issue',
      'rule_violation',
      'other'
    )
  ),
  title text not null check (length(trim(title)) > 0),
  description text not null check (length(trim(description)) > 0),
  evidence_url text,
  status text not null default 'open' check (
    status in ('open', 'under_review', 'resolved', 'rejected')
  ),
  admin_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists match_disputes_tournament_id_idx
on match_disputes (tournament_id);

create index if not exists match_disputes_match_id_idx
on match_disputes (match_id);

create index if not exists match_disputes_status_idx
on match_disputes (status);

create index if not exists match_disputes_reporter_user_profile_id_idx
on match_disputes (reporter_user_profile_id);

create unique index if not exists match_disputes_active_reporter_match_idx
on match_disputes (match_id, reporter_user_profile_id)
where status in ('open', 'under_review');

alter table match_disputes enable row level security;

grant select, insert, update, delete on table match_disputes to service_role;
