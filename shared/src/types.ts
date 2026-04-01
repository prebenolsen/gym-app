/**
 * Core data models for the gym app
 */

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
}

export interface UpdateExerciseRequest {
  name?: string;
  sets?: number;
  rest_seconds?: number;
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
