-- Feature Roadmap 6/20: bracket lock system.
--
-- Keep the existing bracket metadata and update the lifecycle states used by
-- admin lock controls.

alter table matches
drop constraint if exists matches_bracket_status_check;

alter table matches
add constraint matches_bracket_status_check
check (
  bracket_status is null
  or bracket_status in ('template', 'locked', 'active', 'finished')
) not valid;

update matches
set bracket_status = 'finished'
where bracket_status = 'completed';

create index if not exists matches_bracket_status_idx
on matches (bracket_id, bracket_status);
