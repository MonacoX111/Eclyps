-- Allow tournaments to be created before their event date is confirmed.
-- Existing dated tournaments keep their current event_date values.

alter table if exists tournaments
alter column event_date drop not null;
