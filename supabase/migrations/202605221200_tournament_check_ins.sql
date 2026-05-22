alter table tournaments
add column if not exists check_in_opens_at timestamptz,
add column if not exists check_in_closes_at timestamptz;

alter table tournament_registrations
add column if not exists check_in_status text not null default 'not_checked_in',
add column if not exists checked_in_at timestamptz,
add column if not exists checked_in_by_user_profile_id uuid references user_profiles(id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.tournament_registrations'::regclass
      and conname = 'tournament_registrations_check_in_status_check'
  ) then
    alter table tournament_registrations
    add constraint tournament_registrations_check_in_status_check
    check (check_in_status in ('not_checked_in', 'checked_in'));
  end if;
end $$;

create index if not exists tournament_registrations_check_in_idx
on tournament_registrations (tournament_id, status, check_in_status);

create index if not exists tournaments_check_in_window_idx
on tournaments (check_in_opens_at, check_in_closes_at);
