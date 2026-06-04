-- Initial schema for the mobile app + backend API.
-- Run this in Supabase SQL editor for a fresh database.

create extension if not exists pgcrypto;

create table programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id text not null,
  "order" integer not null default 1,
  is_favorite_program boolean not null default false,
  created_at timestamptz not null default now(),
  constraint programs_user_order_unique unique (user_id, "order")
);

create table workouts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  name text not null,
  user_id text not null,
  "order" integer not null default 1,
  created_at timestamptz not null default now(),
  constraint workouts_program_order_unique unique (program_id, "order")
);

create table exercises (
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
  constraint exercises_workout_order_unique unique (workout_id, "order"),
  constraint exercises_custom_muscle_group_check check (
    custom_muscle_group is null or custom_muscle_group in (
      'Chest',
      'Back',
      'Shoulders',
      'Biceps',
      'Triceps',
      'Forearms',
      'Legs',
      'Hamstrings',
      'Glutes',
      'Calves',
      'Core / Abs'
    )
  ),
  constraint exercises_custom_muscle_groups_check check (
    custom_muscle_groups is null or
    custom_muscle_groups <@ array[
      'Chest',
      'Back',
      'Shoulders',
      'Biceps',
      'Triceps',
      'Forearms',
      'Legs',
      'Hamstrings',
      'Glutes',
      'Calves',
      'Core / Abs'
    ]::text[]
  )
);

create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  user_id text not null,
  status text not null default 'active' check (status in ('active', 'cancelled', 'finished')),
  current_exercise_index integer not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  created_at timestamptz not null default now()
);

create table workout_session_sets (
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

create table exercise_notes (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references exercises(id) on delete cascade,
  user_id text not null,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint exercise_notes_unique unique (exercise_id, user_id)
);

create index idx_programs_user_id on programs(user_id);
create index idx_workouts_program_id on workouts(program_id);
create index idx_workouts_user_id on workouts(user_id);
create index idx_exercises_workout_id on exercises(workout_id);
create index idx_exercises_user_id on exercises(user_id);
create index idx_sessions_user_status on workout_sessions(user_id, status);
create index idx_sessions_started_at on workout_sessions(started_at);
create index idx_session_sets_session on workout_session_sets(session_id);
create index idx_session_sets_exercise on workout_session_sets(exercise_id);
create index idx_session_sets_user on workout_session_sets(user_id);
create index idx_notes_exercise_user on exercise_notes(exercise_id, user_id);

alter table programs enable row level security;
alter table workouts enable row level security;
alter table exercises enable row level security;
alter table workout_sessions enable row level security;
alter table workout_session_sets enable row level security;
alter table exercise_notes enable row level security;

create policy users_own_programs on programs
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy users_own_workouts on workouts
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy users_own_exercises on exercises
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy users_own_sessions on workout_sessions
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy users_own_session_sets on workout_session_sets
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy users_own_notes on exercise_notes
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);
