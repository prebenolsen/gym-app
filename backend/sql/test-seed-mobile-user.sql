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
  uid text := current_setting('app.seed_uid', true);
  do_reset boolean := coalesce(current_setting('app.seed_reset', true), 'false') = 'true';
begin
  if uid is null or uid = '' then
    raise exception 'app.seed_uid is not set';
  end if;

  if not do_reset then
    return;
  end if;

  -- Delete in child-first order for clean reseeding of this one user.
  delete from exercise_notes where user_id = uid;
  delete from workout_session_sets where user_id = uid;
  delete from workout_sessions where user_id = uid;
  delete from exercises where user_id = uid;
  delete from workouts where user_id = uid;
  delete from programs where user_id = uid;
end $$;

with new_program as (
  insert into programs (name, user_id, "order", is_favorite_program)
  values ('Push Pull Legs', current_setting('app.seed_uid'), 1, true)
  returning id
),
new_workouts as (
  insert into workouts (program_id, name, user_id, "order")
  select id, 'Push', current_setting('app.seed_uid'), 1 from new_program
  union all
  select id, 'Pull', current_setting('app.seed_uid'), 2 from new_program
  union all
  select id, 'Legs', current_setting('app.seed_uid'), 3 from new_program
  returning id, name
)
insert into exercises (workout_id, name, sets, rest_seconds, user_id, "order")
select w.id, ex.name, ex.sets, ex.rest, current_setting('app.seed_uid'), ex.ordering
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

do $$
declare
  uid text := current_setting('app.seed_uid', true);
  total_sessions constant int := 52;

  session_id uuid;
  w record;
  ex record;
  session_num int;
  day_offset int;

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
  if uid is null or uid = '' then
    raise exception 'app.seed_uid is not set';
  end if;

  for session_num in 0..(total_sessions - 1) loop
    select * into w
    from workouts
    where user_id = uid
    order by "order"
    offset (session_num % 3) limit 1;

    day_offset := (total_sessions - 1 - session_num) * 2;

    insert into workout_sessions (workout_id, user_id, status, started_at)
    values (
      w.id,
      uid,
      'finished',
      now() - day_offset * interval '1 day' - (floor(random() * 4))::int * interval '1 hour'
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
      select * from exercises where workout_id = w.id order by "order"
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

        insert into workout_session_sets
          (session_id, exercise_id, user_id, set_number, weight, reps)
        values
          (session_id, ex.id, uid, set_num, cur_weight, reps_actual);
      end loop;
    end loop;
  end loop;
end $$;

commit;
