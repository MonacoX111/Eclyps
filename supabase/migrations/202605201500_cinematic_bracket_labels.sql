-- Feature Roadmap 8/20: dynamic cinematic public bracket labels.
--
-- Additive tournament-level copy fields for public bracket presentation.
-- Nullable by design so existing tournaments keep application defaults.

alter table tournaments
add column if not exists bracket_title text,
add column if not exists bracket_subtitle text,
add column if not exists bracket_stage_label text,
add column if not exists bracket_participant_label text,
add column if not exists bracket_arena_label text;
