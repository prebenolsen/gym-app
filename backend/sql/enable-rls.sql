alter table programs enable row level security;
alter table workouts enable row level security;
alter table exercises enable row level security;
alter table workout_sessions enable row level security;
alter table workout_session_sets enable row level security;

drop policy if exists users_own_programs on programs;
create policy users_own_programs on programs
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

drop policy if exists users_own_workouts on workouts;
create policy users_own_workouts on workouts
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

drop policy if exists users_own_exercises on exercises;
create policy users_own_exercises on exercises
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

drop policy if exists users_own_sessions on workout_sessions;
create policy users_own_sessions on workout_sessions
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

drop policy if exists users_own_session_sets on workout_session_sets;
create policy users_own_session_sets on workout_session_sets
  for all
  using (
    session_id in (
      select id from workout_sessions where auth.uid()::text = user_id
    )
  )
  with check (
    session_id in (
      select id from workout_sessions where auth.uid()::text = user_id
    )
  );
