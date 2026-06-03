-- Adds optional custom muscle-group mapping for manually created exercises.
-- Run this once in Supabase SQL editor.

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS custom_muscle_group TEXT NULL,
  ADD COLUMN IF NOT EXISTS custom_muscle_groups TEXT[] NULL,
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill new array column from old single-value column if needed.
UPDATE exercises
SET custom_muscle_groups = ARRAY[custom_muscle_group]
WHERE custom_muscle_group IS NOT NULL
  AND (custom_muscle_groups IS NULL OR array_length(custom_muscle_groups, 1) IS NULL);

-- Consistency checks for valid muscle groups.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'exercises_custom_muscle_group_check'
  ) THEN
    ALTER TABLE exercises
      ADD CONSTRAINT exercises_custom_muscle_group_check
      CHECK (
        custom_muscle_group IS NULL OR custom_muscle_group IN (
          'Chest',
          'Back',
          'Shoulders',
          'Biceps',
          'Triceps',
          'Legs',
          'Hamstrings / Glutes',
          'Calves',
          'Core / Abs'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'exercises_custom_muscle_groups_check'
  ) THEN
    ALTER TABLE exercises
      ADD CONSTRAINT exercises_custom_muscle_groups_check
      CHECK (
        custom_muscle_groups IS NULL OR
        custom_muscle_groups <@ ARRAY[
          'Chest',
          'Back',
          'Shoulders',
          'Biceps',
          'Triceps',
          'Legs',
          'Hamstrings / Glutes',
          'Calves',
          'Core / Abs'
        ]::text[]
      );
  END IF;
END $$;

-- Ensure exercises are user-scoped at DB level too.
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_own_exercises ON exercises;
CREATE POLICY users_own_exercises ON exercises
  FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);
