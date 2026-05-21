-- Task 13/20: tournament registration lifecycle.
-- Registrations stay separate from participants until an admin approves them.

create table if not exists tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null
    references tournaments(id)
    on delete cascade,
  participant_type text not null,
  display_name text not null,
  contact_email text,
  contact_handle text,
  region text,
  status text not null default 'pending',
  participant_id uuid
    references participants(id)
    on delete set null,
  source_team_id uuid
    references teams(id)
    on delete set null,
  source_player_id uuid
    references players(id)
    on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_registrations_type_check
    check (participant_type in ('team', 'player')),
  constraint tournament_registrations_status_check
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  constraint tournament_registrations_display_name_not_empty
    check (length(trim(display_name)) > 0),
  constraint tournament_registrations_source_matches_type
    check (
      (participant_type = 'team' and source_player_id is null)
      or
      (participant_type = 'player' and source_team_id is null)
    )
);

create index if not exists tournament_registrations_tournament_status_idx
on tournament_registrations (tournament_id, status, created_at);

create index if not exists tournament_registrations_participant_idx
on tournament_registrations (participant_id);

create unique index if not exists tournament_registrations_active_name_idx
on tournament_registrations (tournament_id, participant_type, lower(display_name))
where status in ('pending', 'approved');

create unique index if not exists tournament_registrations_active_team_source_idx
on tournament_registrations (tournament_id, source_team_id)
where source_team_id is not null
  and status in ('pending', 'approved');

create unique index if not exists tournament_registrations_active_player_source_idx
on tournament_registrations (tournament_id, source_player_id)
where source_player_id is not null
  and status in ('pending', 'approved');

alter table tournament_registrations enable row level security;
