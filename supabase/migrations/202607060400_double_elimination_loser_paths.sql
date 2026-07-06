-- Double elimination needs a second propagation path for the match loser.
-- Winner advancement continues to use next_match_id / next_match_slot.

alter table matches
add column if not exists loser_next_match_id uuid references matches(id) on delete set null,
add column if not exists loser_next_match_slot integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_loser_next_match_slot_check'
  ) then
    alter table matches
    add constraint matches_loser_next_match_slot_check
    check (loser_next_match_slot is null or loser_next_match_slot in (1, 2)) not valid;
  end if;
end $$;

create index if not exists matches_loser_next_match_id_idx
on matches (loser_next_match_id);
