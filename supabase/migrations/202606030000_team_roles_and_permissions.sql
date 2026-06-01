-- Safe additive database migration for Team Roles & Permissions.

-- 1. Drop existing role check constraints dynamically
do $$
declare
    r record;
begin
    for r in 
        select conname 
        from pg_constraint 
        where conrelid = 'public.team_members'::regclass 
          and contype = 'c' 
          and pg_get_constraintdef(oid) like '%role%'
    loop
        execute 'alter table public.team_members drop constraint if exists ' || quote_ident(r.conname);
    end loop;
end $$;

-- 2. Backfill any legacy roles safely to ensure data consistency
update team_members
set role = case
  when role = 'player' then 'member'
  when role = 'sub' then 'substitute'
  else role
end;

-- 3. Add the new standardized role check constraint
alter table team_members
add constraint team_members_role_check
check (role in ('owner', 'captain', 'member', 'substitute'));

-- Ensure RLS is active (already active, but good standard practice)
alter table team_members enable row level security;
