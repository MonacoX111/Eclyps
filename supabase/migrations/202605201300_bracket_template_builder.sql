-- Feature Roadmap 4/20: bracket template builder.
--
-- Additive bracket metadata plus a safe nullable transition for legacy text
-- participant slots so empty bracket templates can exist.

alter table matches
alter column team1 drop not null,
alter column team2 drop not null;

alter table matches
add column if not exists bracket_id uuid,

add column if not exists bracket_type text,

add column if not exists bracket_status text,

add column if not exists round_order integer,

add column if not exists slot1_label text,

add column if not exists slot2_label text;

create index if not exists matches_bracket_id_idx
on matches (bracket_id);

create index if not exists matches_tournament_bracket_round_idx
on matches (
  tournament_id,
  bracket_id,
  round_order,
  bracket_position
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_bracket_type_check'
  ) then

    alter table matches
    add constraint matches_bracket_type_check
    check (
      bracket_type is null
      or bracket_type in ('single_elimination')
    ) not valid;

  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_bracket_status_check'
  ) then

    alter table matches
    add constraint matches_bracket_status_check
    check (
      bracket_status is null
      or bracket_status in ('template', 'active', 'completed')
    ) not valid;

  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_round_order_positive'
  ) then

    alter table matches
    add constraint matches_round_order_positive
    check (round_order is null or round_order > 0) not valid;

  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_bracket_position_positive'
  ) then

    alter table matches
    add constraint matches_bracket_position_positive
    check (bracket_position is null or bracket_position > 0) not valid;

  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_bracket_metadata_complete'
  ) then

    alter table matches
    add constraint matches_bracket_metadata_complete
    check (
      bracket_id is null
      or (
        bracket_type is not null
        and bracket_status is not null
        and round_order is not null
        and bracket_round is not null
        and bracket_position is not null
      )
    ) not valid;

  end if;
end $$;
