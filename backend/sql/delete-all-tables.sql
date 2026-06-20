-- Drop all tables completely.
-- Run this to wipe the schema, then recreate everything with launch-schema-optimization.sql.
-- Tables are dropped in child-first order to respect foreign key constraints.
-- CASCADE is included as a safety net for any remaining dependent objects.

drop table if exists gymapp_exercise_notes                         cascade;
drop table if exists gymapp_workout_session_sets                   cascade;
drop table if exists gymapp_workout_sessions                       cascade;
drop table if exists gymapp_exercises                              cascade;
drop table if exists gymapp_workouts                               cascade;
drop table if exists gymapp_programs                               cascade;
drop table if exists gymapp_weight_tracker_custom_metric_values    cascade;
drop table if exists gymapp_weight_tracker_entries                 cascade;
drop table if exists gymapp_weight_tracker_custom_metrics          cascade;
drop table if exists gymapp_weight_tracker_profile                 cascade;
drop table if exists gymapp_weight_tracker_goals                   cascade;