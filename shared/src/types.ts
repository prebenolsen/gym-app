/**
 * Core data models for GymApp
 */

import type { MuscleGroup } from './exerciseCatalog';

export interface Program {
  id: string;
  name: string;
  user_id: string;
  order: number;
  is_favorite_program: boolean;
  created_at: string;
}

export interface Workout {
  id: string;
  program_id: string;
  name: string;
  user_id: string;
  order: number;
  created_at: string;
}

export interface Exercise {
  id: string;
  workout_id: string;
  name: string;
  sets: number;
  rest_seconds: number;
  custom_muscle_groups?: MuscleGroup[] | null;
  is_custom?: boolean;
  user_id: string;
  order: number;
  created_at: string;
}

export type WorkoutSessionStatus = 'active' | 'cancelled' | 'finished';

export interface WorkoutSession {
  id: string;
  workout_id: string;
  user_id: string;
  status: WorkoutSessionStatus;
  current_exercise_index: number;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface WorkoutSessionSet {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
  is_deleted: boolean;
  saved_at: string;
  created_at: string;
}

/**
 * API Request/Response types
 */

export interface CreateProgramRequest {
  name?: string;
}

export interface UpdateProgramRequest {
  name: string;
}

export interface CreateWorkoutRequest {
  program_id?: string;
  name?: string;
}

export interface UpdateWorkoutRequest {
  name: string;
}

export interface StartWorkoutSessionRequest {
  workout_id: string;
}

export interface SaveWorkoutSetRequest {
  exercise_id: string;
  set_number: number;
  weight: string | number;
  reps: number;
}

export interface CreateExerciseRequest {
  workout_id?: string;
  name: string;
  sets?: number;
  rest_seconds?: number;
  custom_muscle_groups?: MuscleGroup[] | null;
  is_custom?: boolean;
}

export interface UpdateExerciseRequest {
  name?: string;
  sets?: number;
  rest_seconds?: number;
  custom_muscle_groups?: MuscleGroup[] | null;
}

export interface ReorderRequest {
  order: number[];
}

/**
 * Stats for homepage
 */
export interface WorkoutStats {
  total_programs: number;
  total_workouts: number;
  total_exercises: number;
}

/**
 * History and performance tracking
 */
export interface WorkoutSessionDetail {
  session: WorkoutSession;
  sets: (WorkoutSessionSet & { exercise_name: string })[];
}

export interface WorkoutHistoryByDate {
  id: string;
  workout_id: string;
  workout_name: string;
  started_at: string;
  ended_at: string | null;
  status: WorkoutSessionStatus;
}

export interface ExerciseLastPerformance {
  exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
}

/**
 * Exercise Progress Tracking
 */
export interface ExerciseHistorySummary {
  exercise_id: string;
  exercise_name: string;
  times_done: number;
  last_date: string;
  personal_best: number;
}

export interface ExerciseProgressEntry {
  date: string;
  session_id?: string;
  max_weight: number;
  total_volume: number;
  sets: number;
  total_reps: number;
}

export interface ExerciseProgressHistory {
  exercise_id: string;
  exercise_name: string;
  history: ExerciseProgressEntry[];
}

// ─────────────────────────────────────────────────────────────
// Weight Tracker
// ─────────────────────────────────────────────────────────────

export type WeightTrackerGender = 'male' | 'female';
export type WeightTrackerGoal = 'lose' | 'gain' | 'track';
export type WeightTrackerBmrFormula = 'mifflin_st_jeor' | 'harris_benedict' | 'katch_mcardle';
export type WeightTrackerActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extremely_active';

export interface WeightTrackerProfile {
  id: string;
  user_id: string;
  gender: WeightTrackerGender | null;
  age: number | null;
  birthdate: string | null;
  height_cm: number | null;
  default_weight_kg: number | null;
  bmr_formula: WeightTrackerBmrFormula;
  activity_level: WeightTrackerActivityLevel | null;
  show_weight: boolean;
  show_steps: boolean;
  show_calories: boolean;
  onboarding_complete: boolean;
  active_goal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeightTrackerGoalProject {
  id: string;
  user_id: string;
  goal_type: WeightTrackerGoal;
  weekly_target_kg: number | null;
  started_on: string;
  ended_on: string | null;
  start_weight_kg: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeightTrackerEntry {
  id: string;
  user_id: string;
  goal_id: string;
  entry_date: string;
  weight_kg: number | null;
  steps: number | null;
  calories: number | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertWeightTrackerProfileRequest {
  gender?: WeightTrackerGender | null;
  age?: number | null;
  birthdate?: string | null;
  height_cm?: number | null;
  default_weight_kg?: number | null;
  bmr_formula?: WeightTrackerBmrFormula;
  activity_level?: WeightTrackerActivityLevel | null;
  show_weight?: boolean;
  show_steps?: boolean;
  show_calories?: boolean;
  onboarding_complete?: boolean;
  active_goal_id?: string | null;
}

export interface CreateWeightTrackerGoalProjectRequest {
  goal_type: WeightTrackerGoal;
  weekly_target_kg?: number | null;
  started_on: string;
  start_weight_kg?: number | null;
}

// ─────────────────────────────────────────────────────────────
// Weight Tracker Custom Metrics
// ─────────────────────────────────────────────────────────────

export type WeightTrackerCustomMetricType = 'boolean' | 'integer' | 'decimal';

export interface WeightTrackerCustomMetric {
  id: string;
  user_id: string;
  name: string;
  type: WeightTrackerCustomMetricType;
  order: number;
  created_at: string;
}

export interface WeightTrackerCustomMetricValue {
  id: string;
  user_id: string;
  goal_id: string;
  entry_date: string;
  metric_id: string;
  value_boolean: boolean | null;
  value_integer: number | null;
  value_decimal: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWeightTrackerCustomMetricRequest {
  name: string;
  type: WeightTrackerCustomMetricType;
}

export interface UpsertCustomMetricValueRequest {
  goal_id: string;
  entry_date: string;
  metric_id: string;
  value_boolean?: boolean | null;
  value_integer?: number | null;
  value_decimal?: number | null;
}

export interface UpsertWeightTrackerEntryRequest {
  goal_id?: string;
  entry_date: string;
  weight_kg?: number | null;
  steps?: number | null;
  calories?: number | null;
}
