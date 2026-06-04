-- Create all tables from scratch.
-- Run this in Supabase SQL editor on a fresh (empty) database.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Table: programs
-- ─────────────────────────────────────────────────────────────
create table programs (
  id                   uuid        primary key default gen_random_uuid(),
  name                 text        not null,
  user_id              text        not null,
  "order"              integer     not null default 1,
  is_favorite_program  boolean     not null default false,
  created_at           timestamptz not null default now(),
  constraint programs_user_order_unique unique (user_id, "order")
);

-- ─────────────────────────────────────────────────────────────
-- Table: workouts
-- ─────────────────────────────────────────────────────────────
create table workouts (
  id          uuid        primary key default gen_random_uuid(),
  program_id  uuid        not null references programs(id) on delete cascade,
  name        text        not null,
  user_id     text        not null,
  "order"     integer     not null default 1,
  created_at  timestamptz not null default now(),
  constraint workouts_program_order_unique unique (program_id, "order")
);

-- ─────────────────────────────────────────────────────────────
-- Table: exercises
-- ─────────────────────────────────────────────────────────────
create table exercises (
  id                    uuid        primary key default gen_random_uuid(),
  workout_id            uuid        not null references workouts(id) on delete cascade,
  name                  text        not null,
  sets                  integer     not null default 1,
  rest_seconds          integer     not null default 120,
  custom_muscle_group   text        null,
  custom_muscle_groups  text[]      null,
  is_custom             boolean     not null default false,
  user_id               text        not null,
  "order"               integer     not null default 1,
  created_at            timestamptz not null default now(),
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

-- ─────────────────────────────────────────────────────────────
-- Table: workout_sessions
-- ─────────────────────────────────────────────────────────────
create table workout_sessions (
  id                      uuid        primary key default gen_random_uuid(),
  workout_id              uuid        not null references workouts(id) on delete cascade,
  user_id                 text        not null,
  status                  text        not null default 'active'
                                        check (status in ('active', 'cancelled', 'finished')),
  current_exercise_index  integer     not null default 0,
  started_at              timestamptz not null default now(),
  ended_at                timestamptz null,
  created_at              timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Table: workout_session_sets
-- ─────────────────────────────────────────────────────────────
create table workout_session_sets (
  id          uuid        primary key default gen_random_uuid(),
  session_id  uuid        not null references workout_sessions(id) on delete cascade,
  exercise_id uuid        not null references exercises(id) on delete cascade,
  set_number  integer     not null,
  weight      numeric     not null,
  reps        integer     not null,
  is_deleted  boolean     not null default false,
  user_id     text        not null,
  saved_at    timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  constraint workout_session_sets_unique unique (session_id, exercise_id, set_number)
);

-- ─────────────────────────────────────────────────────────────
-- Table: exercise_notes
-- ─────────────────────────────────────────────────────────────
create table exercise_notes (
  id          uuid        primary key default gen_random_uuid(),
  exercise_id uuid        not null references exercises(id) on delete cascade,
  user_id     text        not null,
  notes       text        not null default '',
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  constraint exercise_notes_unique unique (exercise_id, user_id)
);

-- ─────────────────────────────────────────────────────────────
-- Table: weight_tracker_profile  (one row per user)
-- ─────────────────────────────────────────────────────────────
create table weight_tracker_profile (
  id                  uuid         primary key default gen_random_uuid(),
  user_id             text         not null,
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
  active_goal_id      uuid         null,
  birthdate           date         null,
  created_at          timestamptz  not null default now(),
  updated_at          timestamptz  not null default now(),
  constraint weight_tracker_profile_user_unique unique (user_id)
);

-- ─────────────────────────────────────────────────────────────
-- Table: weight_tracker_goals  (goal projects per user)
-- ─────────────────────────────────────────────────────────────
create table weight_tracker_goals (
  id               uuid         primary key default gen_random_uuid(),
  user_id          text         not null,
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
create unique index weight_tracker_goals_one_active_per_user
  on weight_tracker_goals (user_id)
  where is_active = true;

alter table weight_tracker_profile
  add constraint weight_tracker_profile_active_goal_fk
  foreign key (active_goal_id)
  references weight_tracker_goals(id)
  on delete set null;

-- ─────────────────────────────────────────────────────────────
create table weight_tracker_entries (
  id               uuid         primary key default gen_random_uuid(),
  user_id          text         not null,
  goal_id          uuid         not null references weight_tracker_goals(id) on delete cascade,
  entry_date       date         not null,
  weight_kg        numeric(6,2) null check (weight_kg is null or weight_kg > 0),
  steps            integer      null check (steps is null or steps >= 0),
  calories         integer      null check (calories is null or calories >= 0),
  created_at       timestamptz  not null default now(),
  updated_at       timestamptz  not null default now(),
  constraint weight_tracker_entries_user_goal_date_unique unique (user_id, goal_id, entry_date)
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────
create index idx_programs_user_id        on programs(user_id);
create index idx_workouts_program_id     on workouts(program_id);
create index idx_workouts_user_id        on workouts(user_id);
create index idx_exercises_workout_id    on exercises(workout_id);
create index idx_exercises_user_id       on exercises(user_id);
create index idx_sessions_user_status    on workout_sessions(user_id, status);
create index idx_sessions_started_at     on workout_sessions(started_at);
create index idx_session_sets_session    on workout_session_sets(session_id);
create index idx_session_sets_exercise   on workout_session_sets(exercise_id);
create index idx_session_sets_user       on workout_session_sets(user_id);
create index idx_notes_exercise_user     on exercise_notes(exercise_id, user_id);
create index idx_wt_profile_user         on weight_tracker_profile(user_id);
create index idx_wt_goals_user_date      on weight_tracker_goals(user_id, started_on desc);
create index idx_wt_entries_user_goal_date on weight_tracker_entries(user_id, goal_id, entry_date desc);

-- ─────────────────────────────────────────────────────────────
-- Table: weight_tracker_custom_metrics
-- ─────────────────────────────────────────────────────────────
create table weight_tracker_custom_metrics (
  id         uuid        primary key default gen_random_uuid(),
  user_id    text        not null,
  name       text        not null,
  type       text        not null check (type in ('boolean', 'integer', 'decimal')),
  "order"    integer     not null default 1,
  created_at timestamptz not null default now(),
  constraint weight_tracker_custom_metrics_user_name_unique unique (user_id, name)
);

-- ─────────────────────────────────────────────────────────────
-- Table: weight_tracker_custom_metric_values
-- ─────────────────────────────────────────────────────────────
create table weight_tracker_custom_metric_values (
  id            uuid        primary key default gen_random_uuid(),
  user_id       text        not null,
  goal_id       uuid        not null references weight_tracker_goals(id) on delete cascade,
  entry_date    date        not null,
  metric_id     uuid        not null references weight_tracker_custom_metrics(id) on delete cascade,
  value_boolean boolean     null,
  value_integer integer     null,
  value_decimal numeric     null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint weight_tracker_custom_metric_values_unique unique (user_id, goal_id, entry_date, metric_id)
);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table programs               enable row level security;
alter table workouts               enable row level security;
alter table exercises              enable row level security;
alter table workout_sessions       enable row level security;
alter table workout_session_sets   enable row level security;
alter table exercise_notes         enable row level security;
alter table weight_tracker_profile              enable row level security;
alter table weight_tracker_entries              enable row level security;
alter table weight_tracker_goals                enable row level security;
alter table weight_tracker_custom_metrics       enable row level security;
alter table weight_tracker_custom_metric_values enable row level security;

create policy users_own_programs on programs
  for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy users_own_workouts on workouts
  for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy users_own_exercises on exercises
  for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy users_own_sessions on workout_sessions
  for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy users_own_session_sets on workout_session_sets
  for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy users_own_notes on exercise_notes
  for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy weight_tracker_profile_user_isolation on weight_tracker_profile
  for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy weight_tracker_goals_user_isolation on weight_tracker_goals
  for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy weight_tracker_entries_user_isolation on weight_tracker_entries
  for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy weight_tracker_custom_metrics_user_isolation on weight_tracker_custom_metrics
  for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy weight_tracker_custom_metric_values_user_isolation on weight_tracker_custom_metric_values
  for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create index idx_wt_custom_metrics_user  on weight_tracker_custom_metrics(user_id);
create index idx_wt_custom_values_user_goal on weight_tracker_custom_metric_values(user_id, goal_id, entry_date desc);
create index idx_wt_custom_values_metric on weight_tracker_custom_metric_values(metric_id);
