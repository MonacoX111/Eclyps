-- Feature Roadmap 1/20: normalized participant foundation.
--
-- Additive migration only.
-- Existing text participant fields remain for backward compatibility.

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),

  tournament_id uuid not null
    references tournaments(id)
    on delete cascade,

  participant_type text not null,

  display_name text not null,

  seed integer,

  logo_url text,
  avatar_url text,

  source_team_id uuid
    references teams(id)
    on delete set null,

  source_player_id uuid
    references players(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint participants_type_check
    check (participant_type in ('team', 'player')),

  constraint participants_seed_positive
    check (seed is null or seed > 0),

  constraint participants_display_name_not_empty
    check (length(trim(display_name)) > 0),

  constraint participants_source_matches_type
    check (
      (participant_type = 'team' and source_player_id is null)
      or
      (participant_type = 'player' and source_team_id is null)
    )
);

create unique index if not exists participants_source_team_idx
on participants (source_team_id);

create unique index if not exists participants_source_player_idx
on participants (source_player_id);

create index if not exists participants_tournament_type_seed_idx
on participants (tournament_id, participant_type, seed);

create index if not exists participants_tournament_display_name_idx
on participants (tournament_id, display_name);

alter table participants enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'participants'
      and policyname = 'Allow public read'
  ) then

    create policy "Allow public read"
    on participants
    for select
    to anon
    using (true);

  end if;
end $$;

insert into participants (
  tournament_id,
  participant_type,
  display_name,
  seed,
  source_team_id,
  created_at,
  updated_at
)
select
  teams.tournament_id,
  'team',
  teams.name,
  teams.seed,
  teams.id,
  now(),
  now()
from teams
where teams.name is not null
on conflict (source_team_id)
do update set
  tournament_id = excluded.tournament_id,
  display_name = excluded.display_name,
  seed = excluded.seed,
  updated_at = now();

insert into participants (
  tournament_id,
  participant_type,
  display_name,
  seed,
  source_player_id,
  created_at,
  updated_at
)
select
  players.tournament_id,
  'player',
  coalesce(nullif(trim(players.nickname), ''), players.name),
  players.seed,
  players.id,
  now(),
  now()
from players
where players.name is not null
on conflict (source_player_id)
do update set
  tournament_id = excluded.tournament_id,
  display_name = excluded.display_name,
  seed = excluded.seed,
  updated_at = now();

alter table matches
add column if not exists participant_1_id uuid
  references participants(id)
  on delete set null,

add column if not exists participant_2_id uuid
  references participants(id)
  on delete set null,

add column if not exists winner_participant_id uuid
  references participants(id)
  on delete set null,

add column if not exists bracket_round text,

add column if not exists bracket_position integer,

add column if not exists next_match_id uuid
  references matches(id)
  on delete set null,

add column if not exists next_match_slot integer,

add column if not exists stats jsonb
  not null
  default '{}'::jsonb;

create index if not exists matches_participant_1_idx
on matches (participant_1_id);

create index if not exists matches_participant_2_idx
on matches (participant_2_id);

create index if not exists matches_winner_participant_idx
on matches (winner_participant_id);

create index if not exists matches_bracket_position_idx
on matches (
  tournament_id,
  bracket_round,
  bracket_position
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_next_match_slot_check'
  ) then

    alter table matches
    add constraint matches_next_match_slot_check
    check (
      next_match_slot is null
      or next_match_slot in (1, 2)
    ) not valid;

  end if;
end $$;

update matches
set participant_1_id = participants.id
from participants
where matches.participant_1_id is null
  and participants.tournament_id = matches.tournament_id
  and participants.participant_type = matches.participant_type
  and lower(participants.display_name) = lower(matches.team1);

update matches
set participant_2_id = participants.id
from participants
where matches.participant_2_id is null
  and participants.tournament_id = matches.tournament_id
  and participants.participant_type = matches.participant_type
  and lower(participants.display_name) = lower(matches.team2);

update matches
set winner_participant_id =
  case
    when status = 'finished'
      and score1 is not null
      and score2 is not null
      and score1 > score2
    then participant_1_id

    when status = 'finished'
      and score1 is not null
      and score2 is not null
      and score2 > score1
    then participant_2_id

    else winner_participant_id
  end
where winner_participant_id is null;

alter table results
add column if not exists participant_id uuid
  references participants(id)
  on delete set null;

create index if not exists results_participant_idx
on results (participant_id);

update results
set participant_id = participants.id
from participants
where results.participant_id is null
  and participants.tournament_id = results.tournament_id
  and participants.participant_type = results.participant_type
  and lower(participants.display_name) = lower(results.team);