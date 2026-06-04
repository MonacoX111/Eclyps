-- Add public match channel / broadcast metadata.
-- Values are nullable so existing matches and tournaments keep working.

alter table matches
add column if not exists broadcast_type text,
add column if not exists broadcast_url text,
add column if not exists broadcast_label text;

alter table tournaments
add column if not exists broadcast_type text,
add column if not exists broadcast_url text,
add column if not exists broadcast_label text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_broadcast_type_check'
  ) then
    alter table matches
    add constraint matches_broadcast_type_check
    check (
      broadcast_type is null
      or broadcast_type in ('twitch', 'youtube', 'kick', 'discord', 'other')
    ) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.tournaments'::regclass
      and conname = 'tournaments_broadcast_type_check'
  ) then
    alter table tournaments
    add constraint tournaments_broadcast_type_check
    check (
      broadcast_type is null
      or broadcast_type in ('twitch', 'youtube', 'kick', 'discord', 'other')
    ) not valid;
  end if;
end $$;
