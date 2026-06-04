-- Drop all tables completely.
-- Run this to wipe the schema, then recreate everything with launch-schema-optimization.sql.
-- Tables are dropped in child-first order to respect foreign key constraints.
-- CASCADE is included as a safety net for any remaining dependent objects.

drop table if exists exercise_notes                         cascade;
drop table if exists workout_session_sets                   cascade;
drop table if exists workout_sessions                       cascade;
drop table if exists exercises                              cascade;
drop table if exists workouts                               cascade;
drop table if exists programs                               cascade;
drop table if exists weight_tracker_custom_metric_values    cascade;
drop table if exists weight_tracker_entries                 cascade;
drop table if exists weight_tracker_custom_metrics          cascade;
drop table if exists weight_tracker_profile                 cascade;
drop table if exists weight_tracker_goals                   cascade;