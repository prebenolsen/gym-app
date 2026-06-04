-- Weight Tracker schema
-- Run after init-mobile-schema.sql to add weight tracking tables

-- ─────────────────────────────────────────────────────────────
-- Table: weight_tracker_profile  (one row per user)
-- ─────────────────────────────────────────────────────────────
create table if not exists weight_tracker_profile (
  id              uuid         primary key default gen_random_uuid(),
  user_id         text         not null,
  gender          text         null check (gender in ('male', 'female')),
  age             integer      null check (age is null or (age >= 10 and age < 150)),
  height_cm       numeric(5,1) null check (height_cm is null or (height_cm > 0 and height_cm < 300)),
  default_weight_kg numeric(6,2) null check (default_weight_kg is null or default_weight_kg > 0),
  bmr_formula     text         not null default 'mifflin_st_jeor'
                                 check (bmr_formula in ('mifflin_st_jeor', 'harris_benedict', 'katch_mcardle')),
  activity_level  text         null
                                 check (activity_level in (
                                   'sedentary', 'lightly_active', 'moderately_active',
                                   'very_active', 'extremely_active'
                                 )),
  show_weight     boolean      not null default true,
  show_steps      boolean      not null default true,
  show_calories   boolean      not null default true,
  onboarding_complete boolean  not null default false,
  active_goal_id  uuid         null,
  birthdate       date         null,
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now(),
  constraint weight_tracker_profile_user_unique unique (user_id)
);

-- ─────────────────────────────────────────────────────────────
-- Table: weight_tracker_goals  (goal projects per user)
-- ─────────────────────────────────────────────────────────────
create table if not exists weight_tracker_goals (
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

create unique index if not exists weight_tracker_goals_one_active_per_user
  on weight_tracker_goals(user_id)
  where is_active = true;

alter table weight_tracker_profile
  drop constraint if exists weight_tracker_profile_active_goal_fk;

alter table weight_tracker_profile
  add constraint weight_tracker_profile_active_goal_fk
  foreign key (active_goal_id)
  references weight_tracker_goals(id)
  on delete set null;

-- ─────────────────────────────────────────────────────────────
-- Table: weight_tracker_entries  (one row per user per goal per day)
-- ─────────────────────────────────────────────────────────────
create table if not exists weight_tracker_entries (
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

create table if not exists weight_tracker_custom_metrics (
  id         uuid        primary key default gen_random_uuid(),
  user_id    text        not null,
  name       text        not null,
  type       text        not null check (type in ('boolean', 'integer', 'decimal')),
  "order"    integer     not null default 1,
  created_at timestamptz not null default now(),
  constraint weight_tracker_custom_metrics_user_name_unique unique (user_id, name)
);

create table if not exists weight_tracker_custom_metric_values (
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
-- Indexes
-- ─────────────────────────────────────────────────────────────
create index if not exists idx_wt_profile_user
  on weight_tracker_profile(user_id);

create index if not exists idx_wt_goals_user_date
  on weight_tracker_goals(user_id, started_on desc);

create index if not exists idx_wt_entries_user_goal_date
  on weight_tracker_entries(user_id, goal_id, entry_date desc);

create index if not exists idx_wt_custom_metrics_user
  on weight_tracker_custom_metrics(user_id);

create index if not exists idx_wt_custom_values_user_goal
  on weight_tracker_custom_metric_values(user_id, goal_id, entry_date desc);

create index if not exists idx_wt_custom_values_metric
  on weight_tracker_custom_metric_values(metric_id);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table weight_tracker_profile enable row level security;
alter table weight_tracker_goals enable row level security;
alter table weight_tracker_entries enable row level security;
alter table weight_tracker_custom_metrics enable row level security;
alter table weight_tracker_custom_metric_values enable row level security;

create policy weight_tracker_profile_user_isolation
  on weight_tracker_profile for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy weight_tracker_goals_user_isolation
  on weight_tracker_goals for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy weight_tracker_entries_user_isolation
  on weight_tracker_entries for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy weight_tracker_custom_metrics_user_isolation
  on weight_tracker_custom_metrics for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy weight_tracker_custom_metric_values_user_isolation
  on weight_tracker_custom_metric_values for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);
