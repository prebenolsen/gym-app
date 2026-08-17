/**
 * Shared API client for web and mobile apps.
 *
 * Talks directly to Supabase with the anon key. Row Level Security on the
 * `weak_*` tables is what scopes every row to the signed-in user: each policy is
 * `auth.uid() = user_id` for both USING and WITH CHECK, so a query cannot reach
 * another user's data even though the key ships in the client bundle. The
 * `.eq('user_id', ...)` filters below are therefore redundant for security --
 * they are kept because they let Postgres use the per-user indexes, and they
 * fail loudly rather than silently returning nothing if a policy is ever wrong.
 *
 * There is no application server. The one operation that cannot run with the
 * anon key is deleting the auth user, which is done through the
 * `weak_delete_account()` security-definer function (see
 * backend/sql/launch-schema-optimization.sql).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  Program,
  Workout,
  Exercise,
  WorkoutSession,
  WorkoutSessionSet,
  CreateProgramRequest,
  UpdateProgramRequest,
  CreateWorkoutRequest,
  UpdateWorkoutRequest,
  CreateExerciseRequest,
  UpdateExerciseRequest,
  SaveWorkoutSetRequest,
  WorkoutStats,
  WorkoutSessionDetail,
  WorkoutHistoryByDate,
  ExerciseLastPerformance,
  ExerciseHistorySummary,
  ExerciseProgressHistory,
  WeightTrackerProfile,
  WeightTrackerGoalProject,
  WeightTrackerEntry,
  WeightTrackerCustomMetric,
  WeightTrackerCustomMetricValue,
  UpsertWeightTrackerProfileRequest,
  UpsertWeightTrackerEntryRequest,
  CreateWeightTrackerGoalProjectRequest,
  CreateWeightTrackerCustomMetricRequest,
  UpsertCustomMetricValueRequest,
} from './types';

type ApiErrorKind = 'network' | 'auth' | 'api';

type ApiRequestError = Error & {
  kind?: ApiErrorKind;
  status?: number;
  details?: unknown;
};

/** Tables owned by this app, in child-first order for cascading deletes. */
const USER_DATA_TABLES = [
  'weak_workout_session_sets',
  'weak_workout_sessions',
  'weak_exercise_notes',
  'weak_exercises',
  'weak_workouts',
  'weak_programs',
  'weak_weight_tracker_custom_metric_values',
  'weak_weight_tracker_entries',
  'weak_weight_tracker_custom_metrics',
  'weak_weight_tracker_goals',
  'weak_weight_tracker_profile',
] as const;

const VALID_MUSCLE_GROUPS = new Set([
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
  'Core / Abs',
]);

const apiError = (
  message: string,
  kind: ApiErrorKind = 'api',
  status?: number,
  details?: unknown,
): ApiRequestError => {
  const error = new Error(message) as ApiRequestError;
  error.kind = kind;
  if (status !== undefined) error.status = status;
  if (details !== undefined) error.details = details;
  return error;
};

/** Turns a PostgrestError into the same error shape the HTTP client used to throw. */
const throwPostgrest = (error: unknown): never => {
  const candidate = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  const parts = [candidate?.message, candidate?.details, candidate?.hint]
    .filter((part): part is string => typeof part === 'string' && part.length > 0);

  // Postgres 42501 = insufficient_privilege, which from the client means RLS
  // rejected the row. Surface it as auth so the app signs the user out.
  const isRlsDenial = candidate?.code === '42501';

  throw apiError(
    parts.join(' | ') || 'Supabase request failed',
    isRlsDenial ? 'auth' : 'api',
    isRlsDenial ? 403 : undefined,
    error,
  );
};

const normalizeWeightToDotDecimal = (input: string | number): number => {
  if (typeof input === 'number') {
    if (Number.isNaN(input)) {
      throw apiError('Invalid weight value');
    }
    return input;
  }

  const parsed = Number(input.replace(/[,-]/g, '.').trim());
  if (Number.isNaN(parsed)) {
    throw apiError('Invalid weight value');
  }
  return parsed;
};

const daysAgoDate = (days: number): string => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff.toISOString().split('T')[0];
};

class ApiClient {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Id of the signed-in user, from the locally cached session (no network call).
   * Throws an auth-kind error when there is no session, which is what the root
   * error boundary keys off to send the user back to sign-in.
   */
  private async requireUserId(): Promise<string> {
    const { data, error } = await this.client.auth.getSession();
    if (error) {
      throw apiError(error.message, 'auth', 401, error);
    }

    const userId = data.session?.user?.id;
    if (!userId) {
      throw apiError('Not signed in', 'auth', 401);
    }
    return userId;
  }

  /** Highest existing `order` in a scope, so the next row goes on the end. */
  private async nextOrder(
    table: string,
    filters: Record<string, string>,
  ): Promise<number> {
    let query = this.client.from(table).select('order');
    for (const [column, value] of Object.entries(filters)) {
      query = query.eq(column, value);
    }

    const { data, error } = await query.order('order', { ascending: false }).limit(1);
    if (error) throwPostgrest(error);

    return ((data && (data[0] as { order?: number })?.order) || 0) + 1;
  }

  /**
   * Applies an ordered list of `order` values one row at a time, matching what
   * the previous server implementation did. The unique (scope, order)
   * constraints are DEFERRABLE, so a caller must still send a permutation that
   * does not collide mid-sequence.
   */
  private async applyOrder(
    table: string,
    scopeColumn: string,
    scopeId: string,
    items: { id: string; order: number }[],
    notFoundMessage: string,
  ): Promise<void> {
    const userId = await this.requireUserId();

    for (const item of items) {
      if (!item || typeof item.id !== 'string' || typeof item.order !== 'number') {
        throw apiError('Each item must include id (string) and order (number)', 'api', 400);
      }

      const { data, error } = await this.client
        .from(table)
        .update({ order: item.order })
        .eq('id', item.id)
        .eq(scopeColumn, scopeId)
        .eq('user_id', userId)
        .select('id');

      if (error) throwPostgrest(error);
      if (!data || data.length === 0) {
        throw apiError(notFoundMessage, 'api', 404);
      }
    }
  }

  /** Id of the user's active goal, or null when they have none yet. */
  private async resolveActiveGoalId(userId: string): Promise<string | null> {
    const { data, error } = await this.client
      .from('weak_weight_tracker_goals')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throwPostgrest(error);
    return (data as { id?: string } | null)?.id ?? null;
  }

  /** Maps ids to a column value in one round trip, for enriching result rows. */
  private async lookupNames(
    table: string,
    ids: string[],
    userId: string,
  ): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();

    const { data, error } = await this.client
      .from(table)
      .select('id, name')
      .in('id', ids)
      .eq('user_id', userId);

    if (error) throwPostgrest(error);

    return new Map(
      ((data || []) as { id: string; name: string }[]).map((row) => [row.id, row.name]),
    );
  }

  /* === PROGRAMS === */

  async getPrograms(): Promise<Program[]> {
    const userId = await this.requireUserId();
    const { data, error } = await this.client
      .from('weak_programs')
      .select('*')
      .eq('user_id', userId)
      .order('order', { ascending: true });

    if (error) throwPostgrest(error);
    return (data || []) as Program[];
  }

  async createProgram(req?: CreateProgramRequest): Promise<Program> {
    const userId = await this.requireUserId();
    const nextOrder = await this.nextOrder('weak_programs', { user_id: userId });

    const { count, error: countError } = await this.client
      .from('weak_programs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) throwPostgrest(countError);

    const { data, error } = await this.client
      .from('weak_programs')
      .insert([
        {
          name: req?.name || 'Program 01',
          user_id: userId,
          order: nextOrder,
          // The first program a user creates becomes their favourite.
          is_favorite_program: (count || 0) === 0,
        },
      ])
      .select()
      .single();

    if (error) throwPostgrest(error);
    return data as Program;
  }

  async updateProgram(id: string, req: UpdateProgramRequest): Promise<Program> {
    const userId = await this.requireUserId();
    const { data, error } = await this.client
      .from('weak_programs')
      .update({ name: req.name })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throwPostgrest(error);
    return data as Program;
  }

  async favoriteProgramId(id: string, isFavorite: boolean): Promise<Program> {
    const userId = await this.requireUserId();
    const { data, error } = await this.client
      .from('weak_programs')
      .update({ is_favorite_program: isFavorite })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throwPostgrest(error);
    return data as Program;
  }

  async deleteProgram(id: string): Promise<void> {
    const userId = await this.requireUserId();
    const { data, error } = await this.client
      .from('weak_programs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (error) throwPostgrest(error);
    if (!data || data.length === 0) {
      throw apiError('Program not found', 'api', 404);
    }
    // Child records are removed by FK cascades.
  }

  /** Wipes every row this app owns for the user, child tables first. */
  private async deleteAllUserData(userId: string): Promise<void> {
    for (const table of USER_DATA_TABLES) {
      const { error } = await this.client.from(table).delete().eq('user_id', userId);
      if (error) throwPostgrest(error);
    }
  }

  async deleteAccount(): Promise<void> {
    await this.requireUserId();

    // Deleting the auth user needs privileges the anon key does not have. The
    // security-definer function removes this user's rows and their auth user in
    // one transaction, so there is nothing to clean up here first.
    const { error } = await this.client.rpc('weak_delete_account');
    if (error) throwPostgrest(error);

    await this.client.auth.signOut();
  }

  async resetAccount(): Promise<void> {
    const userId = await this.requireUserId();
    await this.deleteAllUserData(userId);
  }

  async createProgramWithWorkouts(template: {
    name: string;
    workouts: {
      name: string;
      exercises: { name: string; sets: number; rest_seconds: number }[];
    }[];
  }): Promise<void> {
    try {
      const newProgram = await this.createProgram({ name: template.name });

      for (const workout of template.workouts) {
        const newWorkout = await this.createWorkout(newProgram.id, { name: workout.name });

        for (const exercise of workout.exercises) {
          await this.createExercise(newWorkout.id, {
            name: exercise.name,
            sets: exercise.sets,
            rest_seconds: exercise.rest_seconds,
          });
        }
      }
    } catch (err) {
      console.error('Failed to import program template:', err);
      throw err;
    }
  }

  /* === WORKOUTS === */

  async getWorkouts(programId: string): Promise<Workout[]> {
    const userId = await this.requireUserId();
    const { data, error } = await this.client
      .from('weak_workouts')
      .select('*')
      .eq('program_id', programId)
      .eq('user_id', userId)
      .order('order', { ascending: true });

    if (error) throwPostgrest(error);
    return (data || []) as Workout[];
  }

  async createWorkout(programId: string, req?: CreateWorkoutRequest): Promise<Workout> {
    const userId = await this.requireUserId();
    const nextOrder = await this.nextOrder('weak_workouts', { program_id: programId });

    const { data, error } = await this.client
      .from('weak_workouts')
      .insert([
        {
          program_id: programId,
          name: req?.name || 'Workout 01',
          user_id: userId,
          order: nextOrder,
        },
      ])
      .select()
      .single();

    if (error) throwPostgrest(error);
    return data as Workout;
  }

  async updateWorkout(id: string, req: UpdateWorkoutRequest): Promise<Workout> {
    const userId = await this.requireUserId();
    const { data, error } = await this.client
      .from('weak_workouts')
      .update({ name: req.name })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throwPostgrest(error);
    return data as Workout;
  }

  async deleteWorkout(id: string): Promise<void> {
    const userId = await this.requireUserId();
    const { data, error } = await this.client
      .from('weak_workouts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (error) throwPostgrest(error);
    if (!data || data.length === 0) {
      throw apiError('Workout not found', 'api', 404);
    }
  }

  async createWorkoutWithExercises(
    programId: string,
    template: {
      name: string;
      exercises: { name: string; sets: number; rest_seconds: number }[];
    },
  ): Promise<void> {
    try {
      const newWorkout = await this.createWorkout(programId, { name: template.name });

      for (const exercise of template.exercises) {
        await this.createExercise(newWorkout.id, {
          name: exercise.name,
          sets: exercise.sets,
          rest_seconds: exercise.rest_seconds,
        });
      }
    } catch (err) {
      console.error('Failed to import workout template:', err);
      throw err;
    }
  }

  async reorderWorkouts(
    programId: string,
    orderData: { id: string; order: number }[],
  ): Promise<void> {
    if (!Array.isArray(orderData)) {
      throw apiError('items must be an array', 'api', 400);
    }
    await this.applyOrder(
      'weak_workouts',
      'program_id',
      programId,
      orderData,
      'Workout not found in this program',
    );
  }

  /* === EXERCISES === */

  async getExercises(workoutId: string): Promise<Exercise[]> {
    const userId = await this.requireUserId();
    const { data, error } = await this.client
      .from('weak_exercises')
      .select('*')
      .eq('workout_id', workoutId)
      .eq('user_id', userId)
      .order('order', { ascending: true });

    if (error) throwPostgrest(error);
    return (data || []) as Exercise[];
  }

  async createExercise(workoutId: string, req: CreateExerciseRequest): Promise<Exercise> {
    const userId = await this.requireUserId();

    if (!req.name || typeof req.name !== 'string') {
      throw apiError('Exercise name is required', 'api', 400);
    }

    const customMuscleGroups = req.custom_muscle_groups ?? null;
    if (
      customMuscleGroups !== null &&
      (!Array.isArray(customMuscleGroups) ||
        customMuscleGroups.some((group) => !VALID_MUSCLE_GROUPS.has(group)))
    ) {
      throw apiError('Invalid muscle group selection', 'api', 400);
    }

    const isCustom = req.is_custom ?? false;
    const resolvedCustomMuscleGroups =
      isCustom && Array.isArray(customMuscleGroups) && customMuscleGroups.length > 0
        ? [...new Set(customMuscleGroups)]
        : null;

    const nextOrder = await this.nextOrder('weak_exercises', { workout_id: workoutId });

    const { data, error } = await this.client
      .from('weak_exercises')
      .insert([
        {
          workout_id: workoutId,
          name: req.name,
          sets: req.sets || 4,
          rest_seconds: req.rest_seconds || 120,
          custom_muscle_groups: resolvedCustomMuscleGroups,
          is_custom: isCustom,
          user_id: userId,
          order: nextOrder,
        },
      ])
      .select()
      .single();

    if (error) throwPostgrest(error);
    return data as Exercise;
  }

  async updateExercise(id: string, req: UpdateExerciseRequest): Promise<Exercise> {
    const userId = await this.requireUserId();

    // Tests the value, not key presence: over HTTP an undefined field simply
    // vanished, but a caller can now hand us `{ custom_muscle_groups: undefined }`
    // and that should not read as an attempt to change it.
    if (req.custom_muscle_groups !== undefined) {
      throw apiError(
        'Custom muscle groups can only be set when creating an exercise',
        'api',
        400,
      );
    }

    const updates: Record<string, unknown> = {};
    if ('name' in req) updates.name = req.name;
    if ('sets' in req) updates.sets = req.sets;
    if ('rest_seconds' in req) updates.rest_seconds = req.rest_seconds;

    const { data, error } = await this.client
      .from('weak_exercises')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throwPostgrest(error);
    return data as Exercise;
  }

  async deleteExercise(id: string): Promise<void> {
    const userId = await this.requireUserId();
    const { error } = await this.client
      .from('weak_exercises')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throwPostgrest(error);
  }

  async reorderExercises(
    workoutId: string,
    orderData: { id: string; order: number }[],
  ): Promise<void> {
    if (!Array.isArray(orderData)) {
      throw apiError('items must be an array', 'api', 400);
    }
    await this.applyOrder(
      'weak_exercises',
      'workout_id',
      workoutId,
      orderData,
      'Exercise not found in this workout',
    );
  }

  /* === WORKOUT SESSIONS === */

  async getActiveSession(): Promise<WorkoutSession | null> {
    const userId = await this.requireUserId();
    const { data, error } = await this.client
      .from('weak_workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throwPostgrest(error);
    return (data as WorkoutSession | null) ?? null;
  }

  async startWorkoutSession(workoutId: string): Promise<WorkoutSession> {
    const userId = await this.requireUserId();

    if (!workoutId) {
      throw apiError('workout_id is required', 'api', 400);
    }

    const activeSession = await this.getActiveSession();
    if (activeSession) {
      // WorkoutDetailScreen keys off status 409 to offer resume-or-replace.
      throw apiError('An active workout session already exists', 'api', 409, {
        activeSession,
      });
    }

    const { data, error } = await this.client
      .from('weak_workout_sessions')
      .insert([
        {
          workout_id: workoutId,
          user_id: userId,
          status: 'active',
          current_exercise_index: 0,
          started_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throwPostgrest(error);
    return data as WorkoutSession;
  }

  async cancelWorkoutSession(sessionId: string): Promise<void> {
    const userId = await this.requireUserId();

    const { error } = await this.client
      .from('weak_workout_sessions')
      .update({ status: 'cancelled', ended_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throwPostgrest(error);

    const { error: setsError } = await this.client
      .from('weak_workout_session_sets')
      .update({ is_deleted: true })
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    if (setsError) throwPostgrest(setsError);
  }

  async finishWorkoutSession(sessionId: string): Promise<void> {
    const userId = await this.requireUserId();
    const { error } = await this.client
      .from('weak_workout_sessions')
      .update({ status: 'finished', ended_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .select()
      .single();

    if (error) throwPostgrest(error);
  }

  async updateCurrentExerciseIndex(
    sessionId: string,
    currentExerciseIndex: number,
  ): Promise<WorkoutSession> {
    const userId = await this.requireUserId();
    const { data, error } = await this.client
      .from('weak_workout_sessions')
      .update({ current_exercise_index: currentExerciseIndex })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .select()
      .single();

    if (error) throwPostgrest(error);
    return data as WorkoutSession;
  }

  async getSessionSets(sessionId: string, exerciseId: string): Promise<WorkoutSessionSet[]> {
    const userId = await this.requireUserId();

    if (!exerciseId) {
      throw apiError('exerciseId is required', 'api', 400);
    }

    const { data, error } = await this.client
      .from('weak_workout_session_sets')
      .select('*')
      .eq('session_id', sessionId)
      .eq('exercise_id', exerciseId)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('set_number', { ascending: true });

    if (error) throwPostgrest(error);
    return (data || []) as WorkoutSessionSet[];
  }

  async saveWorkoutSet(
    sessionId: string,
    payload: SaveWorkoutSetRequest,
  ): Promise<WorkoutSessionSet> {
    const userId = await this.requireUserId();

    if (
      !payload.exercise_id ||
      typeof payload.set_number !== 'number' ||
      typeof payload.reps !== 'number'
    ) {
      throw apiError('exercise_id, set_number and reps are required', 'api', 400);
    }

    const { data, error } = await this.client
      .from('weak_workout_session_sets')
      .upsert(
        [
          {
            session_id: sessionId,
            exercise_id: payload.exercise_id,
            set_number: payload.set_number,
            weight: normalizeWeightToDotDecimal(payload.weight),
            reps: payload.reps,
            is_deleted: false,
            user_id: userId,
            saved_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'session_id,exercise_id,set_number' },
      )
      .select()
      .single();

    if (error) throwPostgrest(error);
    return data as WorkoutSessionSet;
  }

  /* === HISTORY === */

  async getDatesWithWorkouts(startDate?: string, endDate?: string): Promise<string[]> {
    const userId = await this.requireUserId();

    let query = this.client
      .from('weak_workout_sessions')
      .select('started_at, ended_at')
      .eq('user_id', userId)
      .eq('status', 'finished');

    if (startDate) query = query.gte('started_at', `${startDate}T00:00:00`);
    if (endDate) query = query.lte('started_at', `${endDate}T23:59:59`);

    const { data, error } = await query;
    if (error) throwPostgrest(error);

    const dates = new Set<string>();
    ((data || []) as { started_at: string }[]).forEach((session) => {
      dates.add(session.started_at.split('T')[0]);
    });

    return Array.from(dates).sort();
  }

  /** Shared by the by-date and by-month history views. */
  private async finishedSessionsBetween(
    userId: string,
    fromDateTime: string,
    toDateTime: string,
  ): Promise<WorkoutHistoryByDate[]> {
    const { data: sessions, error } = await this.client
      .from('weak_workout_sessions')
      .select('id, workout_id, started_at, ended_at, status')
      .eq('user_id', userId)
      .eq('status', 'finished')
      .gte('started_at', fromDateTime)
      .lte('started_at', toDateTime)
      .order('started_at', { ascending: false });

    if (error) throwPostgrest(error);

    const rows = (sessions || []) as Omit<WorkoutHistoryByDate, 'workout_name'>[];
    const workoutIds = [
      ...new Set(
        rows
          .map((session) => session.workout_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    ];

    const namesById = await this.lookupNames('weak_workouts', workoutIds, userId);

    return rows.map((session) => ({
      ...session,
      workout_name: namesById.get(session.workout_id) || 'Unknown',
    }));
  }

  async getWorkoutsByDate(date: string): Promise<WorkoutHistoryByDate[]> {
    const userId = await this.requireUserId();

    if (!date || typeof date !== 'string') {
      throw apiError('date parameter required (YYYY-MM-DD)', 'api', 400);
    }

    return this.finishedSessionsBetween(userId, `${date}T00:00:00`, `${date}T23:59:59`);
  }

  async getWorkoutsByMonth(month: string): Promise<WorkoutHistoryByDate[]> {
    const userId = await this.requireUserId();

    if (!month || typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
      throw apiError('month parameter required (YYYY-MM)', 'api', 400);
    }

    const [yearStr, monthStr] = month.split('-');
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;

    const startOfMonth = new Date(Date.UTC(year, monthIndex, 1));
    const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0));

    return this.finishedSessionsBetween(
      userId,
      startOfMonth.toISOString().slice(0, 19),
      `${endOfMonth.toISOString().slice(0, 10)}T23:59:59`,
    );
  }

  async getSessionDetails(sessionId: string): Promise<WorkoutSessionDetail> {
    const userId = await this.requireUserId();

    const { data: session, error: sessionError } = await this.client
      .from('weak_workout_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError) throwPostgrest(sessionError);
    if (!session) {
      throw apiError('Session not found', 'api', 404);
    }

    const { data: sets, error: setsError } = await this.client
      .from('weak_workout_session_sets')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('set_number', { ascending: true });

    if (setsError) throwPostgrest(setsError);

    const rows = (sets || []) as WorkoutSessionSet[];
    const exerciseIds = [
      ...new Set(
        rows
          .map((set) => set.exercise_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    ];

    const namesById = await this.lookupNames('weak_exercises', exerciseIds, userId);

    return {
      session: session as WorkoutSession,
      sets: rows.map((set) => ({
        ...set,
        exercise_name: namesById.get(set.exercise_id) || 'Unknown',
      })),
    };
  }

  async getLastWorkoutPerformance(
    workoutId: string,
  ): Promise<{ session_id: string | null; sets: ExerciseLastPerformance[] }> {
    const userId = await this.requireUserId();

    const { data: finishedSessions, error: sessionError } = await this.client
      .from('weak_workout_sessions')
      .select('id, ended_at, started_at')
      .eq('workout_id', workoutId)
      .eq('user_id', userId)
      .eq('status', 'finished')
      .order('ended_at', { ascending: false, nullsFirst: false })
      .order('started_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(200);

    if (sessionError) throwPostgrest(sessionError);

    const sessions = (finishedSessions || []) as { id: string }[];
    if (sessions.length === 0) {
      return { session_id: null, sets: [] };
    }

    const sessionRankById = new Map<string, number>();
    sessions.forEach((session, index) => sessionRankById.set(session.id, index));

    const { data: sets, error: setsError } = await this.client
      .from('weak_workout_session_sets')
      .select('session_id, exercise_id, set_number, weight, reps, created_at, saved_at')
      .in(
        'session_id',
        sessions.map((session) => session.id),
      )
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('saved_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false });

    if (setsError) throwPostgrest(setsError);

    type SetRow = {
      session_id: string;
      exercise_id: string;
      set_number: number;
      weight: number;
      reps: number;
      created_at: string | null;
      saved_at: string | null;
    };

    // Most recent session first, then newest save, keeping only the first row
    // seen per exercise+set so each slot shows its latest recorded value.
    const resolvedSets = [...((sets || []) as SetRow[])]
      .sort((a, b) => {
        const aRank = sessionRankById.get(a.session_id) ?? Number.MAX_SAFE_INTEGER;
        const bRank = sessionRankById.get(b.session_id) ?? Number.MAX_SAFE_INTEGER;
        if (aRank !== bRank) return aRank - bRank;

        const aSavedAt = a.saved_at ? new Date(a.saved_at).getTime() : Number.MIN_SAFE_INTEGER;
        const bSavedAt = b.saved_at ? new Date(b.saved_at).getTime() : Number.MIN_SAFE_INTEGER;
        if (aSavedAt !== bSavedAt) return bSavedAt - aSavedAt;

        const aCreatedAt = a.created_at
          ? new Date(a.created_at).getTime()
          : Number.MIN_SAFE_INTEGER;
        const bCreatedAt = b.created_at
          ? new Date(b.created_at).getTime()
          : Number.MIN_SAFE_INTEGER;
        return bCreatedAt - aCreatedAt;
      })
      .reduce<ExerciseLastPerformance[]>((acc, set) => {
        const exists = acc.some(
          (entry) => entry.exercise_id === set.exercise_id && entry.set_number === set.set_number,
        );
        if (!exists) {
          acc.push({
            exercise_id: set.exercise_id,
            set_number: set.set_number,
            weight: set.weight,
            reps: set.reps,
          });
        }
        return acc;
      }, [])
      .sort((a, b) => {
        if (a.exercise_id !== b.exercise_id) {
          return a.exercise_id.localeCompare(b.exercise_id);
        }
        return a.set_number - b.set_number;
      });

    return { session_id: sessions[0].id, sets: resolvedSets };
  }

  /* === STATS === */

  async getStats(): Promise<WorkoutStats> {
    const userId = await this.requireUserId();

    const countRows = async (table: string): Promise<number> => {
      const { count, error } = await this.client
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) throwPostgrest(error);
      return count || 0;
    };

    const [programs, workouts, exercises] = await Promise.all([
      countRows('weak_programs'),
      countRows('weak_workouts'),
      countRows('weak_exercises'),
    ]);

    return {
      total_programs: programs,
      total_workouts: workouts,
      total_exercises: exercises,
    };
  }

  async getWorkouts7Days(): Promise<{ count: number }> {
    const userId = await this.requireUserId();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count, error } = await this.client
      .from('weak_workout_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'finished')
      .gte('started_at', sevenDaysAgo.toISOString());

    if (error) throwPostgrest(error);
    return { count: count || 0 };
  }

  async getExerciseHistory(): Promise<ExerciseHistorySummary[]> {
    const userId = await this.requireUserId();

    const { data: sets, error } = await this.client
      .from('weak_workout_session_sets')
      .select('session_id, exercise_id, weight')
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (error) throwPostgrest(error);

    const { data: sessions, error: sessionsError } = await this.client
      .from('weak_workout_sessions')
      .select('id, started_at')
      .eq('user_id', userId)
      .eq('status', 'finished');

    if (sessionsError) throwPostgrest(sessionsError);

    const sessionById = new Map(
      ((sessions || []) as { id: string; started_at: string }[]).map((s) => [s.id, s]),
    );

    const perExercise = new Map<
      string,
      { maxWeight: number; lastDate: string; sessionIds: Set<string> }
    >();

    for (const set of (sets || []) as {
      session_id: string;
      exercise_id: string;
      weight: number;
    }[]) {
      const session = sessionById.get(set.session_id);
      if (!session) continue;

      let entry = perExercise.get(set.exercise_id);
      if (!entry) {
        entry = { maxWeight: 0, lastDate: session.started_at, sessionIds: new Set() };
        perExercise.set(set.exercise_id, entry);
      }

      entry.sessionIds.add(session.id);
      entry.maxWeight = Math.max(entry.maxWeight, set.weight);
      if (new Date(session.started_at) > new Date(entry.lastDate)) {
        entry.lastDate = session.started_at;
      }
    }

    // One batched name lookup; the server version queried per exercise, which
    // would be a round trip each from the browser.
    const namesById = await this.lookupNames(
      'weak_exercises',
      [...perExercise.keys()],
      userId,
    );

    return [...perExercise.entries()]
      .map(([exerciseId, stats]) => ({
        exercise_id: exerciseId,
        exercise_name: namesById.get(exerciseId) || 'Unknown',
        times_done: stats.sessionIds.size,
        last_date: stats.lastDate.split('T')[0],
        personal_best: stats.maxWeight,
      }))
      .sort((a, b) => new Date(b.last_date).getTime() - new Date(a.last_date).getTime());
  }

  async getExerciseProgress(
    exerciseId: string,
    days?: number,
  ): Promise<ExerciseProgressHistory> {
    const userId = await this.requireUserId();

    const daysNum = days ?? 90;
    if (Number.isNaN(daysNum) || daysNum < 1) {
      throw apiError('days parameter must be positive number', 'api', 400);
    }

    const lookback = new Date();
    lookback.setDate(lookback.getDate() - daysNum);

    const { data: sets, error: setsError } = await this.client
      .from('weak_workout_session_sets')
      .select('session_id, weight, reps, set_number')
      .eq('exercise_id', exerciseId)
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (setsError) throwPostgrest(setsError);

    type SetRow = { session_id: string; weight: number; reps: number };
    const setRows = (sets || []) as SetRow[];
    const sessionIds = [...new Set(setRows.map((set) => set.session_id))];

    const namesById = await this.lookupNames('weak_exercises', [exerciseId], userId);
    const exerciseName = namesById.get(exerciseId) || 'Unknown';

    if (sessionIds.length === 0) {
      return { exercise_id: exerciseId, exercise_name: exerciseName, history: [] };
    }

    const { data: sessions, error: sessionsError } = await this.client
      .from('weak_workout_sessions')
      .select('id, started_at')
      .eq('user_id', userId)
      .eq('status', 'finished')
      .in('id', sessionIds)
      .gte('started_at', lookback.toISOString());

    if (sessionsError) throwPostgrest(sessionsError);

    const sessionById = new Map(
      ((sessions || []) as { id: string; started_at: string }[]).map((s) => [s.id, s]),
    );

    // Grouped per calendar day, so several sets in one workout make one row.
    const dateStats = new Map<
      string,
      { date: string; maxWeight: number; totalVolume: number; sets: number; totalReps: number }
    >();

    for (const set of setRows) {
      const session = sessionById.get(set.session_id);
      if (!session) continue;

      const date = session.started_at.split('T')[0];
      let stats = dateStats.get(date);
      if (!stats) {
        stats = { date, maxWeight: 0, totalVolume: 0, sets: 0, totalReps: 0 };
        dateStats.set(date, stats);
      }

      stats.maxWeight = Math.max(stats.maxWeight, set.weight);
      stats.totalVolume += set.weight * set.reps;
      stats.sets += 1;
      stats.totalReps += set.reps;
    }

    const history = [...dateStats.values()]
      .map((stats) => ({
        date: stats.date,
        max_weight: stats.maxWeight,
        total_volume: stats.totalVolume,
        sets: stats.sets,
        total_reps: stats.totalReps,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { exercise_id: exerciseId, exercise_name: exerciseName, history };
  }

  async getWorkoutSessions(): Promise<WorkoutSession[]> {
    const userId = await this.requireUserId();
    const { data, error } = await this.client
      .from('weak_workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throwPostgrest(error);
    return (data || []) as WorkoutSession[];
  }

  async getExerciseNotes(exerciseId: string): Promise<string | null> {
    const userId = await this.requireUserId();
    const { data, error } = await this.client
      .from('weak_exercise_notes')
      .select('notes')
      .eq('exercise_id', exerciseId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throwPostgrest(error);
    return (data as { notes?: string } | null)?.notes || null;
  }

  async saveExerciseNotes(exerciseId: string, notes: string): Promise<void> {
    const userId = await this.requireUserId();

    if (typeof notes !== 'string') {
      throw apiError('notes must be a string', 'api', 400);
    }

    const { error } = await this.client
      .from('weak_exercise_notes')
      .upsert(
        [
          {
            exercise_id: exerciseId,
            user_id: userId,
            notes,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'exercise_id,user_id' },
      )
      .select()
      .single();

    if (error) throwPostgrest(error);
  }

  /* === WEIGHT TRACKER === */

  async getWeightTrackerProfile(): Promise<WeightTrackerProfile | null> {
    const userId = await this.requireUserId();
    const { data, error } = await this.client
      .from('weak_weight_tracker_profile')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throwPostgrest(error);
    return (data as WeightTrackerProfile | null) ?? null;
  }

  async upsertWeightTrackerProfile(
    req: UpsertWeightTrackerProfileRequest,
  ): Promise<WeightTrackerProfile> {
    const userId = await this.requireUserId();

    const ALLOWED = [
      'gender',
      'age',
      'birthdate',
      'height_cm',
      'default_weight_kg',
      'bmr_formula',
      'activity_level',
      'show_weight',
      'show_steps',
      'show_calories',
      'onboarding_complete',
    ] as const;

    const payload: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    for (const field of ALLOWED) {
      if (Object.prototype.hasOwnProperty.call(req, field)) {
        payload[field] = (req as Record<string, unknown>)[field];
      }
    }

    const { data, error } = await this.client
      .from('weak_weight_tracker_profile')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throwPostgrest(error);
    return data as WeightTrackerProfile;
  }

  async getWeightTrackerGoals(): Promise<WeightTrackerGoalProject[]> {
    const userId = await this.requireUserId();
    const { data, error } = await this.client
      .from('weak_weight_tracker_goals')
      .select('*')
      .eq('user_id', userId)
      .order('started_on', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throwPostgrest(error);
    return (data || []) as WeightTrackerGoalProject[];
  }

  async createWeightTrackerGoal(
    req: CreateWeightTrackerGoalProjectRequest,
  ): Promise<WeightTrackerGoalProject> {
    const userId = await this.requireUserId();

    const goalType = req.goal_type ?? 'track';
    if (!['lose', 'gain', 'track'].includes(goalType)) {
      throw apiError('goal_type must be lose, gain, or track', 'api', 400);
    }
    if (!req.started_on || typeof req.started_on !== 'string') {
      throw apiError('started_on is required', 'api', 400);
    }

    // Close the current goal first: a partial unique index allows only one
    // active goal per user.
    const { error: deactivateError } = await this.client
      .from('weak_weight_tracker_goals')
      .update({
        is_active: false,
        ended_on: req.started_on,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (deactivateError) throwPostgrest(deactivateError);

    const { data, error } = await this.client
      .from('weak_weight_tracker_goals')
      .insert({
        user_id: userId,
        goal_type: goalType,
        weekly_target_kg: req.weekly_target_kg ?? null,
        started_on: req.started_on,
        start_weight_kg: req.start_weight_kg ?? null,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throwPostgrest(error);
    return data as WeightTrackerGoalProject;
  }

  async activateWeightTrackerGoal(goalId: string): Promise<WeightTrackerGoalProject> {
    const userId = await this.requireUserId();

    const { data: targetGoal, error: targetError } = await this.client
      .from('weak_weight_tracker_goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();

    if (targetError) throwPostgrest(targetError);

    const today = new Date().toISOString().split('T')[0];

    const { error: deactivateError } = await this.client
      .from('weak_weight_tracker_goals')
      .update({ is_active: false, ended_on: today, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true)
      .neq('id', goalId);

    if (deactivateError) throwPostgrest(deactivateError);

    const { data: activatedGoal, error: activateError } = await this.client
      .from('weak_weight_tracker_goals')
      .update({ is_active: true, ended_on: null, updated_at: new Date().toISOString() })
      .eq('id', goalId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (activateError) throwPostgrest(activateError);
    return (activatedGoal ?? targetGoal) as WeightTrackerGoalProject;
  }

  async deleteWeightTrackerGoal(goalId: string): Promise<void> {
    const userId = await this.requireUserId();

    const { data: targetGoal, error: targetError } = await this.client
      .from('weak_weight_tracker_goals')
      .select('id')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();

    if (targetError) throwPostgrest(targetError);

    const { error } = await this.client
      .from('weak_weight_tracker_goals')
      .delete()
      .eq('id', (targetGoal as { id: string }).id)
      .eq('user_id', userId);

    if (error) throwPostgrest(error);
  }

  async getWeightTrackerEntries(days?: number, goalId?: string): Promise<WeightTrackerEntry[]> {
    const userId = await this.requireUserId();

    const resolvedGoalId = goalId ?? (await this.resolveActiveGoalId(userId));
    if (!resolvedGoalId) return [];

    const resolvedDays = !days || Number.isNaN(days) || days <= 0 ? 365 : days;

    const { data, error } = await this.client
      .from('weak_weight_tracker_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('goal_id', resolvedGoalId)
      .gte('entry_date', daysAgoDate(resolvedDays))
      .order('entry_date', { ascending: false });

    if (error) throwPostgrest(error);
    return (data || []) as WeightTrackerEntry[];
  }

  async upsertWeightTrackerEntry(
    req: UpsertWeightTrackerEntryRequest,
  ): Promise<WeightTrackerEntry> {
    const userId = await this.requireUserId();

    if (!req.entry_date || typeof req.entry_date !== 'string') {
      throw apiError('entry_date is required', 'api', 400);
    }

    const resolvedGoalId = req.goal_id || (await this.resolveActiveGoalId(userId));
    if (!resolvedGoalId) {
      throw apiError('No active goal found. Create a goal first.', 'api', 400);
    }

    const payload: Record<string, unknown> = {
      user_id: userId,
      goal_id: resolvedGoalId,
      entry_date: req.entry_date,
      updated_at: new Date().toISOString(),
    };

    if (req.weight_kg !== undefined) {
      payload.weight_kg =
        req.weight_kg === null || (req.weight_kg as unknown) === ''
          ? null
          : normalizeWeightToDotDecimal(req.weight_kg as string | number);
    }
    if (req.steps !== undefined) {
      payload.steps = (req.steps as unknown) === '' ? null : req.steps;
    }
    if (req.calories !== undefined) {
      payload.calories = (req.calories as unknown) === '' ? null : req.calories;
    }

    const { data, error } = await this.client
      .from('weak_weight_tracker_entries')
      .upsert(payload, { onConflict: 'user_id,goal_id,entry_date' })
      .select()
      .single();

    if (error) throwPostgrest(error);
    return data as WeightTrackerEntry;
  }

  async deleteWeightTrackerEntry(entryDate: string, goalId?: string): Promise<void> {
    const userId = await this.requireUserId();

    const resolvedGoalId = goalId ?? (await this.resolveActiveGoalId(userId));
    if (!resolvedGoalId) {
      throw apiError('No active goal found. Create a goal first.', 'api', 400);
    }

    const { error } = await this.client
      .from('weak_weight_tracker_entries')
      .delete()
      .eq('user_id', userId)
      .eq('goal_id', resolvedGoalId)
      .eq('entry_date', entryDate);

    if (error) throwPostgrest(error);
  }

  async resetWeightTracker(): Promise<void> {
    const userId = await this.requireUserId();

    // Child-first so foreign keys stay satisfied.
    const tables = [
      'weak_weight_tracker_custom_metric_values',
      'weak_weight_tracker_custom_metrics',
      'weak_weight_tracker_entries',
      'weak_weight_tracker_goals',
      'weak_weight_tracker_profile',
    ];

    for (const table of tables) {
      const { error } = await this.client.from(table).delete().eq('user_id', userId);
      if (error) throwPostgrest(error);
    }
  }

  async getCustomMetrics(): Promise<WeightTrackerCustomMetric[]> {
    const userId = await this.requireUserId();
    const { data, error } = await this.client
      .from('weak_weight_tracker_custom_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('order', { ascending: true });

    if (error) throwPostgrest(error);
    return (data || []) as WeightTrackerCustomMetric[];
  }

  async createCustomMetric(
    req: CreateWeightTrackerCustomMetricRequest,
  ): Promise<WeightTrackerCustomMetric> {
    const userId = await this.requireUserId();

    if (!req.name || typeof req.name !== 'string' || !req.name.trim()) {
      throw apiError('name is required', 'api', 400);
    }
    if (!['boolean', 'integer', 'decimal'].includes(req.type)) {
      throw apiError('type must be boolean, integer, or decimal', 'api', 400);
    }

    const { count, error: countError } = await this.client
      .from('weak_weight_tracker_custom_metrics')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) throwPostgrest(countError);
    if ((count ?? 0) >= 3) {
      throw apiError('Maximum 3 custom metrics allowed', 'api', 400);
    }

    const nextOrder = await this.nextOrder('weak_weight_tracker_custom_metrics', {
      user_id: userId,
    });

    const { data, error } = await this.client
      .from('weak_weight_tracker_custom_metrics')
      .insert({ user_id: userId, name: req.name.trim(), type: req.type, order: nextOrder })
      .select()
      .single();

    if (error) throwPostgrest(error);
    return data as WeightTrackerCustomMetric;
  }

  async deleteCustomMetric(id: string): Promise<void> {
    const userId = await this.requireUserId();
    const { error } = await this.client
      .from('weak_weight_tracker_custom_metrics')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throwPostgrest(error);
  }

  async getCustomMetricValues(
    days?: number,
    goalId?: string,
  ): Promise<WeightTrackerCustomMetricValue[]> {
    const userId = await this.requireUserId();

    const resolvedGoalId = goalId ?? (await this.resolveActiveGoalId(userId));
    if (!resolvedGoalId) return [];

    const resolvedDays = !days || Number.isNaN(days) || days <= 0 ? 365 : days;

    const { data, error } = await this.client
      .from('weak_weight_tracker_custom_metric_values')
      .select('*')
      .eq('user_id', userId)
      .eq('goal_id', resolvedGoalId)
      .gte('entry_date', daysAgoDate(resolvedDays))
      .order('entry_date', { ascending: false });

    if (error) throwPostgrest(error);
    return (data || []) as WeightTrackerCustomMetricValue[];
  }

  async upsertCustomMetricValue(
    req: UpsertCustomMetricValueRequest,
  ): Promise<WeightTrackerCustomMetricValue> {
    const userId = await this.requireUserId();

    if (!req.entry_date || typeof req.entry_date !== 'string') {
      throw apiError('entry_date is required', 'api', 400);
    }
    if (!req.metric_id || typeof req.metric_id !== 'string') {
      throw apiError('metric_id is required', 'api', 400);
    }

    const resolvedGoalId = req.goal_id || (await this.resolveActiveGoalId(userId));
    if (!resolvedGoalId) {
      throw apiError('No active goal found. Create a goal first.', 'api', 400);
    }

    const { data, error } = await this.client
      .from('weak_weight_tracker_custom_metric_values')
      .upsert(
        {
          user_id: userId,
          goal_id: resolvedGoalId,
          entry_date: req.entry_date,
          metric_id: req.metric_id,
          value_boolean: req.value_boolean ?? null,
          value_integer: req.value_integer ?? null,
          value_decimal: req.value_decimal ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,goal_id,entry_date,metric_id' },
      )
      .select()
      .single();

    if (error) throwPostgrest(error);
    return data as WeightTrackerCustomMetricValue;
  }
}

export default ApiClient;
