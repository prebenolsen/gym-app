-- Test data helper for one user.
-- Usage:
-- 1) Change app.seed_uid below to the target Supabase auth user id.
-- 2) Set app.seed_reset to true if you want to delete existing data for that user.
-- 3) Run the full script.

begin;

select set_config('app.seed_uid', '70414ff9-b11a-4199-89b7-9bae27211a8c', false);
select set_config('app.seed_reset', 'true', false);

do $$
declare
  uid_raw text := nullif(trim(current_setting('app.seed_uid', true)), '');
  uid uuid;
  do_reset boolean := coalesce(current_setting('app.seed_reset', true), 'false') = 'true';
begin
  if uid_raw is null then
    raise exception 'app.seed_uid is not set';
  end if;

  begin
    uid := uid_raw::uuid;
  exception when invalid_text_representation then
    raise exception 'app.seed_uid must be a valid UUID';
  end;

  if not do_reset then
    return;
  end if;

  -- Delete in child-first order for clean reseeding of this one user.
  delete from gymapp_exercise_notes where user_id = uid;
  delete from gymapp_weight_tracker_custom_metric_values where user_id = uid;
  delete from gymapp_weight_tracker_custom_metrics where user_id = uid;
  delete from gymapp_weight_tracker_entries where user_id = uid;
  delete from gymapp_weight_tracker_profile where user_id = uid;
  delete from gymapp_weight_tracker_goals where user_id = uid;
  delete from gymapp_workout_session_sets where user_id = uid;
  delete from gymapp_workout_sessions where user_id = uid;
  delete from gymapp_exercises where user_id = uid;
  delete from gymapp_workouts where user_id = uid;
  delete from gymapp_programs where user_id = uid;
end $$;

with new_program as (
  insert into gymapp_programs (name, user_id, "order", is_favorite_program)
  values ('Push Pull Legs', current_setting('app.seed_uid')::uuid, 1, true)
  returning id
),
new_workouts as (
  insert into gymapp_workouts (program_id, name, user_id, "order")
  select id, 'Push', current_setting('app.seed_uid')::uuid, 1 from new_program
  union all
  select id, 'Pull', current_setting('app.seed_uid')::uuid, 2 from new_program
  union all
  select id, 'Legs', current_setting('app.seed_uid')::uuid, 3 from new_program
  returning id, name
)
insert into gymapp_exercises (workout_id, name, sets, rest_seconds, user_id, "order")
select w.id, ex.name, ex.sets, ex.rest, current_setting('app.seed_uid')::uuid, ex.ordering
from new_workouts w,
lateral (
  values
    ('Push', 'Barbell Bench Press', 4, 120, 1),
    ('Push', 'Dumbbell Shoulder Press', 3, 90, 2),
    ('Push', 'Triceps Pushdown', 3, 60, 3),
    ('Pull', 'Pull-Up', 4, 120, 1),
    ('Pull', 'Barbell Row', 3, 90, 2),
    ('Pull', 'Dumbbell Curl', 3, 60, 3),
    ('Legs', 'Barbell Back Squat', 4, 120, 1),
    ('Legs', 'Romanian Deadlift', 3, 90, 2),
    ('Legs', 'Walking Lunge', 3, 60, 3)
) as ex(w_name, name, sets, rest, ordering)
where w.name = ex.w_name;

insert into gymapp_weight_tracker_goals (
  user_id,
  goal_type,
  weekly_target_kg,
  started_on,
  ended_on,
  start_weight_kg,
  is_active
)
values (
  current_setting('app.seed_uid')::uuid,
  'lose',
  0.50,
  date '2026-04-12',
  null,
  82.7,
  true
)
on conflict (user_id) where is_active = true
do update set
  goal_type = excluded.goal_type,
  weekly_target_kg = excluded.weekly_target_kg,
  started_on = excluded.started_on,
  ended_on = excluded.ended_on,
  start_weight_kg = excluded.start_weight_kg,
  updated_at = now();

insert into gymapp_weight_tracker_profile (user_id, onboarding_complete)
values (
  current_setting('app.seed_uid')::uuid,
  true
)
on conflict (user_id)
do update set
  onboarding_complete = excluded.onboarding_complete,
  updated_at = now();

with active_goal as (
  select id
  from gymapp_weight_tracker_goals
  where user_id = current_setting('app.seed_uid')::uuid and is_active = true
  order by started_on desc, created_at desc
  limit 1
)
insert into gymapp_weight_tracker_entries (user_id, goal_id, entry_date, weight_kg, steps)
select current_setting('app.seed_uid')::uuid, g.id, v.entry_date, v.weight_kg, v.steps
from active_goal g
cross join (
  values
    (date '2026-04-12', 82.7, 4400),
    (date '2026-04-13', 82.7, 6200),
    (date '2026-04-14', 82.4, 7800),
    (date '2026-04-15', 81.9, 7600),
    (date '2026-04-16', 81.4, 8300),
    (date '2026-04-17', 82.0, 6200),
    (date '2026-04-18', 81.7, 7100),
    (date '2026-04-19', 82.0, 9000),
    (date '2026-04-20', 82.0, 15000),
    (date '2026-04-21', 81.5, 12000),
    (date '2026-04-22', 81.4, 14000),
    (date '2026-04-23', 81.4, 13800),
    (date '2026-04-24', 80.5, 10000),
    (date '2026-04-25', 80.5, 9200),
    (date '2026-04-26', 80.5, 2600),
    (date '2026-04-27', 81.5, 13000),
    (date '2026-04-28', 81.5, 11800),
    (date '2026-04-29', 81.5, 5800),
    (date '2026-04-30', 81.5, 5200),
    (date '2026-05-01', 81.9, 6200),
    (date '2026-05-02', 81.9, 8000),
    (date '2026-05-03', 81.9, 900),
    (date '2026-05-04', 81.9, 11000),
    (date '2026-05-05', 82.3, 13500),
    (date '2026-05-06', 81.9, 16300),
    (date '2026-05-07', 81.1, 6000),
    (date '2026-05-08', 81.1, 8100),
    (date '2026-05-09', 80.6, 4000),
    (date '2026-05-10', 81.1, 7700),
    (date '2026-05-11', 81.6, 23000),
    (date '2026-05-12', 81.1, 10000),
    (date '2026-05-13', 80.3, 4000),
    (date '2026-05-14', 80.6, 3000),
    (date '2026-05-15', 80.9, 10400),
    (date '2026-05-16', 80.6, 7600),
    (date '2026-05-17', 80.6, 900),
    (date '2026-05-18', 80.6, 6500),
    (date '2026-05-19', 82.3, 12000),
    (date '2026-05-20', 81.1, 9200),
    (date '2026-05-21', 80.5, 9000),
    (date '2026-05-22', 80.5, 8700),
    (date '2026-05-23', 80.8, 7000),
    (date '2026-05-24', 80.8, 6100),
    (date '2026-05-25', 80.4, 5500),
    (date '2026-05-26', 80.4, 14600),
    (date '2026-05-27', 80.0, 16400),
    (date '2026-05-28', 80.0, 13200),
    (date '2026-05-29', 80.0, 12200),
    (date '2026-05-30', 80.5, 7100),
    (date '2026-05-31', 80.3, 8800),
    (date '2026-06-01', 79.7, 5400),
    (date '2026-06-02', 79.2, 9600),
    (date '2026-06-03', 79.8, 7300)
) as v(entry_date, weight_kg, steps)
on conflict (user_id, goal_id, entry_date)
do update set
  weight_kg = excluded.weight_kg,
  steps = excluded.steps,
  updated_at = now();

with upsert_metric as (
  insert into gymapp_weight_tracker_custom_metrics (user_id, name, type, "order")
  values (current_setting('app.seed_uid')::uuid, 'Good day', 'boolean', 1)
  on conflict (user_id, name)
  do update set
    type = excluded.type,
    "order" = excluded."order"
  returning id
)
insert into gymapp_weight_tracker_custom_metric_values (user_id, goal_id, entry_date, metric_id, value_boolean)
select
  current_setting('app.seed_uid')::uuid,
  (
    select id
    from gymapp_weight_tracker_goals
    where user_id = current_setting('app.seed_uid')::uuid and is_active = true
    order by started_on desc, created_at desc
    limit 1
  ),
  v.entry_date,
  m.id,
  v.value_boolean
from upsert_metric m
cross join (
  values
    (date '2026-04-12', true),
    (date '2026-04-13', true),
    (date '2026-04-14', true),
    (date '2026-04-15', true),
    (date '2026-04-16', true),
    (date '2026-04-17', false),
    (date '2026-04-18', false),
    (date '2026-04-19', true),
    (date '2026-04-20', true),
    (date '2026-04-21', false),
    (date '2026-04-22', true),
    (date '2026-04-23', true),
    (date '2026-04-24', true),
    (date '2026-04-25', false),
    (date '2026-04-26', false),
    (date '2026-04-27', true),
    (date '2026-04-28', false),
    (date '2026-04-29', true),
    (date '2026-04-30', false),
    (date '2026-05-01', false),
    (date '2026-05-02', false),
    (date '2026-05-03', false),
    (date '2026-05-04', true),
    (date '2026-05-05', true),
    (date '2026-05-06', true),
    (date '2026-05-07', true),
    (date '2026-05-08', false),
    (date '2026-05-09', false),
    (date '2026-05-10', false),
    (date '2026-05-11', true),
    (date '2026-05-12', true),
    (date '2026-05-13', true),
    (date '2026-05-14', true),
    (date '2026-05-15', true),
    (date '2026-05-16', false),
    (date '2026-05-17', false),
    (date '2026-05-18', true),
    (date '2026-05-19', true),
    (date '2026-05-20', true),
    (date '2026-05-21', true),
    (date '2026-05-22', true),
    (date '2026-05-23', true),
    (date '2026-05-24', true),
    (date '2026-05-25', true),
    (date '2026-05-26', true),
    (date '2026-05-27', true),
    (date '2026-05-28', true),
    (date '2026-05-29', false),
    (date '2026-05-30', true),
    (date '2026-05-31', true),
    (date '2026-06-01', true),
    (date '2026-06-02', false),
    (date '2026-06-03', true)
) as v(entry_date, value_boolean)
on conflict (user_id, goal_id, entry_date, metric_id)
do update set
  value_boolean = excluded.value_boolean,
  value_integer = null,
  value_decimal = null,
  updated_at = now();

do $$
declare
  uid_raw text := nullif(trim(current_setting('app.seed_uid', true)), '');
  uid uuid;
  total_sessions constant int := 52;

  session_id uuid;
  w record;
  ex record;
  session_num int;
  day_offset int;
  session_started_at timestamptz;
  session_duration_mins int;

  bench_w numeric := 62.5;
  shoulder_w numeric := 30.0;
  tricep_w numeric := 20.0;

  pullup_w numeric := 5.0;
  row_w numeric := 52.5;
  curl_w numeric := 14.0;

  squat_w numeric := 72.5;
  rdl_w numeric := 62.5;
  lunge_w numeric := 20.0;

  micro_pos int;
  is_deload boolean;
  noise numeric;
  reps_base int;
  reps_actual int;
  set_count int;
  set_num int;
  cur_weight numeric;
begin
  if uid_raw is null then
    raise exception 'app.seed_uid is not set';
  end if;

  begin
    uid := uid_raw::uuid;
  exception when invalid_text_representation then
    raise exception 'app.seed_uid must be a valid UUID';
  end;

  for session_num in 0..(total_sessions - 1) loop
    select * into w
    from gymapp_workouts
    where user_id = uid
    order by "order"
    offset (session_num % 3) limit 1;

    day_offset := (total_sessions - 1 - session_num) * 2;

    session_started_at := now() - day_offset * interval '1 day' - (floor(random() * 4))::int * interval '1 hour';
    session_duration_mins := 30 + (floor(random() * 16))::int;

    insert into gymapp_workout_sessions (workout_id, user_id, status, started_at, ended_at)
    values (
      w.id,
      uid,
      'finished',
      session_started_at,
      session_started_at + session_duration_mins * interval '1 minute'
    )
    returning id into session_id;

    micro_pos := session_num % 5;
    is_deload := (session_num % 18 = 17);
    noise := round((random() - 0.5)::numeric * 2.5 / 1.25) * 1.25;

    if w.name = 'Push' then
      if is_deload then
        bench_w := greatest(62.5, round((bench_w * 0.90) / 2.5) * 2.5);
        shoulder_w := greatest(30.0, round((shoulder_w * 0.90) / 2.5) * 2.5);
        tricep_w := greatest(20.0, round((tricep_w * 0.90) / 2.5) * 2.5);
      elsif micro_pos = 4 and random() < 0.35 then
        bench_w := greatest(62.5, bench_w - 2.5);
        shoulder_w := greatest(30.0, shoulder_w - 1.25);
        tricep_w := greatest(20.0, tricep_w - 1.25);
      else
        bench_w := least(100.0, bench_w + 1.25 + noise * 0.5);
        shoulder_w := least(55.0, shoulder_w + 0.75 + noise * 0.3);
        tricep_w := least(42.5, tricep_w + 0.75 + noise * 0.3);
        bench_w := round(bench_w / 1.25) * 1.25;
        shoulder_w := round(shoulder_w / 1.25) * 1.25;
        tricep_w := round(tricep_w / 1.25) * 1.25;
      end if;
    end if;

    if w.name = 'Pull' then
      if is_deload then
        pullup_w := greatest(0, round((pullup_w * 0.90) / 1.25) * 1.25);
        row_w := greatest(52.5, round((row_w * 0.90) / 2.5) * 2.5);
        curl_w := greatest(14.0, round((curl_w * 0.90) / 1.25) * 1.25);
      elsif micro_pos = 4 and random() < 0.35 then
        pullup_w := greatest(0, pullup_w - 1.25);
        row_w := greatest(52.5, row_w - 2.5);
        curl_w := greatest(14.0, curl_w - 1.25);
      else
        pullup_w := least(35.0, pullup_w + 1.25 + noise * 0.4);
        row_w := least(100.0, row_w + 1.25 + noise * 0.5);
        curl_w := least(26.0, curl_w + 0.5 + noise * 0.2);
        pullup_w := round(pullup_w / 1.25) * 1.25;
        row_w := round(row_w / 2.5) * 2.5;
        curl_w := round(curl_w / 1.25) * 1.25;
      end if;
    end if;

    if w.name = 'Legs' then
      if is_deload then
        squat_w := greatest(72.5, round((squat_w * 0.90) / 2.5) * 2.5);
        rdl_w := greatest(62.5, round((rdl_w * 0.90) / 2.5) * 2.5);
        lunge_w := greatest(20.0, round((lunge_w * 0.90) / 2.5) * 2.5);
      elsif micro_pos = 4 and random() < 0.35 then
        squat_w := greatest(72.5, squat_w - 2.5);
        rdl_w := greatest(62.5, rdl_w - 2.5);
        lunge_w := greatest(20.0, lunge_w - 1.25);
      else
        squat_w := least(130.0, squat_w + 1.5 + noise * 0.5);
        rdl_w := least(115.0, rdl_w + 1.25 + noise * 0.4);
        lunge_w := least(40.0, lunge_w + 0.75 + noise * 0.3);
        squat_w := round(squat_w / 2.5) * 2.5;
        rdl_w := round(rdl_w / 2.5) * 2.5;
        lunge_w := round(lunge_w / 1.25) * 1.25;
      end if;
    end if;

    for ex in
      select * from gymapp_exercises where workout_id = w.id order by "order"
    loop
      cur_weight := case ex.name
        when 'Barbell Bench Press' then bench_w
        when 'Dumbbell Shoulder Press' then shoulder_w
        when 'Triceps Pushdown' then tricep_w
        when 'Pull-Up' then pullup_w
        when 'Barbell Row' then row_w
        when 'Dumbbell Curl' then curl_w
        when 'Barbell Back Squat' then squat_w
        when 'Romanian Deadlift' then rdl_w
        when 'Walking Lunge' then lunge_w
        else 40
      end;

      reps_base := case ex.name
        when 'Barbell Bench Press' then 5
        when 'Dumbbell Shoulder Press' then 8
        when 'Triceps Pushdown' then 12
        when 'Pull-Up' then 6
        when 'Barbell Row' then 8
        when 'Dumbbell Curl' then 12
        when 'Barbell Back Squat' then 5
        when 'Romanian Deadlift' then 8
        when 'Walking Lunge' then 12
        else 10
      end;

      set_count := ex.sets;

      for set_num in 1..set_count loop
        reps_actual := reps_base
          + (floor(random() * 3))::int
          - (floor(random() * 2))::int
          - case when set_num = set_count and random() < 0.6 then 1 else 0 end;
        reps_actual := greatest(1, reps_actual);

        insert into gymapp_workout_session_sets
          (session_id, exercise_id, user_id, set_number, weight, reps)
        values
          (session_id, ex.id, uid, set_num, cur_weight, reps_actual);
      end loop;
    end loop;
  end loop;
end $$;

commit;

