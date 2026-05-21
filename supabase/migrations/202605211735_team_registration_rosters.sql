-- Task 13/20: team tournament registration rosters.
-- Team profiles remain reusable across tournaments; roster entries are scoped to
-- a specific tournament registration and later linked to approved profiles.

create table if not exists tournament_registration_roster_entries (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null
    references tournament_registrations(id)
    on delete cascade,
  tournament_id uuid not null
    references tournaments(id)
    on delete cascade,
  team_participant_id uuid
    references participants(id)
    on delete set null,
  source_player_id uuid
    references players(id)
    on delete set null,
  nickname text not null,
  roster_role text not null,
  roster_order integer not null,
  is_captain boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_registration_roster_nickname_not_empty
    check (length(trim(nickname)) > 0),
  constraint tournament_registration_roster_role_check
    check (roster_role in ('main', 'substitute')),
  constraint tournament_registration_roster_order_positive
    check (roster_order > 0)
);

create index if not exists tournament_registration_roster_registration_idx
on tournament_registration_roster_entries (registration_id, roster_order);

create index if not exists tournament_registration_roster_tournament_idx
on tournament_registration_roster_entries (tournament_id, team_participant_id);

create unique index if not exists tournament_registration_roster_unique_nickname_idx
on tournament_registration_roster_entries (registration_id, lower(nickname));

create unique index if not exists tournament_registration_roster_single_captain_idx
on tournament_registration_roster_entries (registration_id)
where is_captain is true;

alter table tournament_registration_roster_entries enable row level security;
