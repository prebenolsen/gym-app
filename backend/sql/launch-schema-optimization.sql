-- Create all tables from scratch.
-- Run this in Supabase SQL editor on a fresh (empty) database.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Shared trigger helpers
-- ─────────────────────────────────────────────────────────────
create or replace function weak_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Table: weak_programs
-- Critical #1: order uniqueness is DEFERRABLE to support reorder swaps.
-- Important #7: user_id is uuid.
-- ─────────────────────────────────────────────────────────────
create table weak_programs (
  id                   uuid        primary key default gen_random_uuid(),
  name                 text        not null,
  user_id              uuid        not null,
  "order"              integer     not null default 1,
  is_favorite_program  boolean     not null default false,
  created_at           timestamptz not null default now(),
  constraint weak_programs_user_order_unique unique (user_id, "order") deferrable initially deferred
);

-- ─────────────────────────────────────────────────────────────
-- Table: weak_workouts
-- Critical #1: order uniqueness is DEFERRABLE to support reorder swaps.
-- Nice-to-have #10: last_session_at denormalized for fast recent workout queries.
-- Important #7: user_id is uuid.
-- ─────────────────────────────────────────────────────────────
create table weak_workouts (
  id               uuid        primary key default gen_random_uuid(),
  program_id       uuid        not null references weak_programs(id) on delete cascade,
  name             text        not null,
  user_id          uuid        not null,
  "order"           integer     not null default 1,
  last_session_at  timestamptz null,
  created_at       timestamptz not null default now(),
  constraint weak_workouts_program_order_unique unique (program_id, "order") deferrable initially deferred
);

-- ─────────────────────────────────────────────────────────────
-- Table: weak_exercises
-- Critical #1: order uniqueness is DEFERRABLE to support reorder swaps.
-- Nice-to-have #8: remove legacy custom_muscle_group singular column.
-- Important #7: user_id is uuid.
-- ─────────────────────────────────────────────────────────────
create table weak_exercises (
  id                    uuid        primary key default gen_random_uuid(),
  workout_id            uuid        not null references weak_workouts(id) on delete cascade,
  name                  text        not null,
  sets                  integer     not null default 1,
  rest_seconds          integer     not null default 120,
  custom_muscle_groups  text[]      null,
  is_custom             boolean     not null default false,
  user_id               uuid        not null,
  "order"               integer     not null default 1,
  created_at            timestamptz not null default now(),
  constraint weak_exercises_workout_order_unique unique (workout_id, "order") deferrable initially deferred,
  constraint weak_exercises_custom_muscle_groups_check check (
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

-- ─────────────────────────────────────────────────────────────
-- Table: weak_workout_sessions
-- Critical #2: explicit index for workout_id added later.
-- Nice-to-have #9: updated_at column and trigger.
-- Important #7: user_id is uuid.
-- ─────────────────────────────────────────────────────────────
create table weak_workout_sessions (
  id                      uuid        primary key default gen_random_uuid(),
  workout_id              uuid        not null references weak_workouts(id) on delete cascade,
  user_id                 uuid        not null,
  status                  text        not null default 'active'
                                        check (status in ('active', 'cancelled', 'finished')),
  current_exercise_index  integer     not null default 0,
  started_at              timestamptz not null default now(),
  ended_at                timestamptz null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger weak_workout_sessions_updated_at
  before update on weak_workout_sessions
  for each row execute function weak_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Table: weak_workout_session_sets
-- Critical #3: composite index added later.
-- Important #4: active-row partial index added later.
-- Important #7: user_id is uuid.
-- ─────────────────────────────────────────────────────────────
create table weak_workout_session_sets (
  id          uuid        primary key default gen_random_uuid(),
  session_id  uuid        not null references weak_workout_sessions(id) on delete cascade,
  exercise_id uuid        not null references weak_exercises(id) on delete cascade,
  set_number  integer     not null,
  weight      numeric     not null,
  reps        integer     not null,
  is_deleted  boolean     not null default false,
  user_id     uuid        not null,
  saved_at    timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  constraint weak_workout_session_sets_unique unique (session_id, exercise_id, set_number)
);

-- ─────────────────────────────────────────────────────────────
-- Table: weak_exercise_notes
-- Important #7: user_id is uuid.
-- ─────────────────────────────────────────────────────────────
create table weak_exercise_notes (
  id          uuid        primary key default gen_random_uuid(),
  exercise_id uuid        not null references weak_exercises(id) on delete cascade,
  user_id     uuid        not null,
  notes       text        not null default '',
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  constraint weak_exercise_notes_unique unique (exercise_id, user_id)
);

-- ─────────────────────────────────────────────────────────────
-- Table: weak_weight_tracker_profile (one row per user)
-- Important #6: active_goal_id removed (derive from goals where is_active=true).
-- Important #7: user_id is uuid.
-- ─────────────────────────────────────────────────────────────
create table weak_weight_tracker_profile (
  id                  uuid         primary key default gen_random_uuid(),
  user_id             uuid         not null,
  gender              text         null check (gender in ('male', 'female')),
  age                 integer      null check (age is null or (age >= 10 and age < 150)),
  height_cm           numeric(5,1) null check (height_cm is null or (height_cm > 0 and height_cm < 300)),
  default_weight_kg   numeric(6,2) null check (default_weight_kg is null or default_weight_kg > 0),
  bmr_formula         text         not null default 'mifflin_st_jeor'
                                     check (bmr_formula in ('mifflin_st_jeor', 'harris_benedict', 'katch_mcardle')),
  activity_level      text         null
                                     check (activity_level in (
                                       'sedentary', 'lightly_active', 'moderately_active',
                                       'very_active', 'extremely_active'
                                     )),
  show_weight         boolean      not null default true,
  show_steps          boolean      not null default true,
  show_calories       boolean      not null default true,
  onboarding_complete boolean      not null default false,
  birthdate           date         null,
  created_at          timestamptz  not null default now(),
  updated_at          timestamptz  not null default now(),
  constraint weak_weight_tracker_profile_user_unique unique (user_id)
);

-- ─────────────────────────────────────────────────────────────
-- Table: weak_weight_tracker_goals (goal projects per user)
-- Important #7: user_id is uuid.
-- ─────────────────────────────────────────────────────────────
create table weak_weight_tracker_goals (
  id               uuid         primary key default gen_random_uuid(),
  user_id          uuid         not null,
  goal_type        text         not null default 'track' check (goal_type in ('lose', 'gain', 'track')),
  weekly_target_kg decimal(4,2) null check (weekly_target_kg is null or weekly_target_kg > 0),
  started_on       date         not null,
  ended_on         date         null,
  start_weight_kg  numeric(6,2) null check (start_weight_kg is null or start_weight_kg > 0),
  is_active        boolean      not null default true,
  created_at       timestamptz  not null default now(),
  updated_at       timestamptz  not null default now()
);

-- Ensure one active goal per user.
create unique index weak_weight_tracker_goals_one_active_per_user
  on weak_weight_tracker_goals (user_id)
  where is_active = true;

-- ─────────────────────────────────────────────────────────────
-- Table: weak_weight_tracker_entries
-- Important #5: additional date-centric index added later.
-- Important #7: user_id is uuid.
-- ─────────────────────────────────────────────────────────────
create table weak_weight_tracker_entries (
  id               uuid         primary key default gen_random_uuid(),
  user_id          uuid         not null,
  goal_id          uuid         not null references weak_weight_tracker_goals(id) on delete cascade,
  entry_date       date         not null,
  weight_kg        numeric(6,2) null check (weight_kg is null or weight_kg > 0),
  steps            integer      null check (steps is null or steps >= 0),
  calories         integer      null check (calories is null or calories >= 0),
  created_at       timestamptz  not null default now(),
  updated_at       timestamptz  not null default now(),
  constraint weak_weight_tracker_entries_user_goal_date_unique unique (user_id, goal_id, entry_date)
);

-- ─────────────────────────────────────────────────────────────
-- Table: weak_weight_tracker_custom_metrics
-- Important #7: user_id is uuid.
-- ─────────────────────────────────────────────────────────────
create table weak_weight_tracker_custom_metrics (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null,
  name       text        not null,
  type       text        not null check (type in ('boolean', 'integer', 'decimal')),
  "order"    integer     not null default 1,
  created_at timestamptz not null default now(),
  constraint weak_weight_tracker_custom_metrics_user_name_unique unique (user_id, name)
);

-- ─────────────────────────────────────────────────────────────
-- Table: weak_weight_tracker_custom_metric_values
-- Important #7: user_id is uuid.
-- ─────────────────────────────────────────────────────────────
create table weak_weight_tracker_custom_metric_values (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null,
  goal_id       uuid        not null references weak_weight_tracker_goals(id) on delete cascade,
  entry_date    date        not null,
  metric_id     uuid        not null references weak_weight_tracker_custom_metrics(id) on delete cascade,
  value_boolean boolean     null,
  value_integer integer     null,
  value_decimal numeric     null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint weak_weight_tracker_custom_metric_values_unique unique (user_id, goal_id, entry_date, metric_id)
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────
create index idx_weak_programs_user_id                on weak_programs(user_id);
create index idx_weak_workouts_program_id             on weak_workouts(program_id);
create index idx_weak_workouts_user_id                on weak_workouts(user_id);
create index idx_weak_workouts_last_session_at        on weak_workouts(last_session_at desc nulls last);
create index idx_weak_exercises_workout_id            on weak_exercises(workout_id);
create index idx_weak_exercises_user_id               on weak_exercises(user_id);
create index idx_weak_sessions_user_status            on weak_workout_sessions(user_id, status);
create index idx_weak_sessions_started_at             on weak_workout_sessions(started_at);
create index idx_weak_sessions_workout_id             on weak_workout_sessions(workout_id);
create index idx_weak_session_sets_session            on weak_workout_session_sets(session_id);
create index idx_weak_session_sets_exercise           on weak_workout_session_sets(exercise_id);
create index idx_weak_session_sets_user               on weak_workout_session_sets(user_id);
create index idx_weak_session_sets_session_exercise   on weak_workout_session_sets(session_id, exercise_id, set_number);
create index idx_weak_session_sets_active             on weak_workout_session_sets(session_id, exercise_id, set_number)
  where is_deleted = false;
create index idx_weak_notes_exercise_user             on weak_exercise_notes(exercise_id, user_id);
create index idx_weak_wt_profile_user                 on weak_weight_tracker_profile(user_id);
create index idx_weak_wt_goals_user_date              on weak_weight_tracker_goals(user_id, started_on desc);
create index idx_weak_wt_entries_user_goal_date       on weak_weight_tracker_entries(user_id, goal_id, entry_date desc);
create index idx_weak_wt_entries_date                 on weak_weight_tracker_entries(entry_date desc) include (user_id, weight_kg);
create index idx_weak_wt_custom_metrics_user          on weak_weight_tracker_custom_metrics(user_id);
create index idx_weak_wt_custom_values_user_goal      on weak_weight_tracker_custom_metric_values(user_id, goal_id, entry_date desc);
create index idx_weak_wt_custom_values_metric         on weak_weight_tracker_custom_metric_values(metric_id);

-- ─────────────────────────────────────────────────────────────
-- Triggers
-- ─────────────────────────────────────────────────────────────
create or replace function weak_sync_workout_last_session()
returns trigger language plpgsql as $$
begin
  update weak_workouts
  set last_session_at = new.started_at
  where id = new.workout_id
    and (last_session_at is null or last_session_at < new.started_at);
  return new;
end;
$$;

create trigger trg_weak_sync_workout_last_session
  after insert on weak_workout_sessions
  for each row execute function weak_sync_workout_last_session();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table weak_programs                            enable row level security;
alter table weak_workouts                            enable row level security;
alter table weak_exercises                           enable row level security;
alter table weak_workout_sessions                    enable row level security;
alter table weak_workout_session_sets                enable row level security;
alter table weak_exercise_notes                      enable row level security;
alter table weak_weight_tracker_profile              enable row level security;
alter table weak_weight_tracker_entries              enable row level security;
alter table weak_weight_tracker_goals                enable row level security;
alter table weak_weight_tracker_custom_metrics       enable row level security;
alter table weak_weight_tracker_custom_metric_values enable row level security;

create policy weak_users_own_programs on weak_programs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy weak_users_own_workouts on weak_workouts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy weak_users_own_exercises on weak_exercises
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy weak_users_own_sessions on weak_workout_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy weak_users_own_session_sets on weak_workout_session_sets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy weak_users_own_notes on weak_exercise_notes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy weak_weight_tracker_profile_user_isolation on weak_weight_tracker_profile
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy weak_weight_tracker_goals_user_isolation on weak_weight_tracker_goals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy weak_weight_tracker_entries_user_isolation on weak_weight_tracker_entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy weak_weight_tracker_custom_metrics_user_isolation on weak_weight_tracker_custom_metrics
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy weak_weight_tracker_custom_metric_values_user_isolation on weak_weight_tracker_custom_metric_values
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- Future planning note (#11)
-- ─────────────────────────────────────────────────────────────
-- weak_workout_session_sets is a high-write table.
-- For scale (tens of millions of rows), plan a dedicated migration to RANGE partition by saved_at.
-- Example:
--   CREATE TABLE weak_workout_session_sets (...) PARTITION BY RANGE (saved_at);
--   CREATE TABLE weak_workout_session_sets_2026_01 PARTITION OF weak_workout_session_sets
--     FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
