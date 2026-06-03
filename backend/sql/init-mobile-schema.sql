-- Initial schema for the mobile app + backend API.
-- Run this in Supabase SQL editor before starting backend/mobile for the first time.

create extension if not exists pgcrypto;

create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id text not null,
  "order" integer not null default 1,
  is_favorite_program boolean not null default false,
  created_at timestamptz not null default now(),
  constraint programs_user_order_unique unique (user_id, "order")
);

create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  name text not null,
  user_id text not null,
  "order" integer not null default 1,
  created_at timestamptz not null default now(),
  constraint workouts_program_order_unique unique (program_id, "order")
);

create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  name text not null,
  sets integer not null default 1,
  rest_seconds integer not null default 120,
  custom_muscle_group text null,
  custom_muscle_groups text[] null,
  is_custom boolean not null default false,
  user_id text not null,
  "order" integer not null default 1,
  created_at timestamptz not null default now(),
  constraint exercises_workout_order_unique unique (workout_id, "order")
);

create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  user_id text not null,
  status text not null default 'active' check (status in ('active', 'cancelled', 'finished')),
  current_exercise_index integer not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists workout_session_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workout_sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  set_number integer not null,
  weight numeric not null,
  reps integer not null,
  is_deleted boolean not null default false,
  user_id text not null,
  saved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint workout_session_sets_unique unique (session_id, exercise_id, set_number)
);

create table if not exists exercise_notes (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references exercises(id) on delete cascade,
  user_id text not null,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint exercise_notes_unique unique (exercise_id, user_id)
);

create index if not exists idx_programs_user_id on programs(user_id);
create index if not exists idx_workouts_program_id on workouts(program_id);
create index if not exists idx_workouts_user_id on workouts(user_id);
create index if not exists idx_exercises_workout_id on exercises(workout_id);
create index if not exists idx_exercises_user_id on exercises(user_id);
create index if not exists idx_sessions_user_status on workout_sessions(user_id, status);
create index if not exists idx_sessions_started_at on workout_sessions(started_at);
create index if not exists idx_session_sets_session on workout_session_sets(session_id);
create index if not exists idx_session_sets_exercise on workout_session_sets(exercise_id);
create index if not exists idx_session_sets_user on workout_session_sets(user_id);
create index if not exists idx_notes_exercise_user on exercise_notes(exercise_id, user_id);
