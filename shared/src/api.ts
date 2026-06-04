/**
 * Shared API client for web and mobile apps
 */

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

type TokenProvider = () => string | null | Promise<string | null>;
type ApiErrorKind = 'network' | 'auth' | 'api';
type ApiRequestError = Error & {
  kind?: ApiErrorKind;
  status?: number;
  details?: unknown;
  url?: string;
  method?: string;
};

class ApiClient {
  baseURL: string;
  private getToken?: TokenProvider;

  constructor(baseURL: string, getToken?: TokenProvider) {
    this.baseURL = baseURL;
    this.getToken = getToken;
  }

  private async request<T>(method: string, path: string, data?: unknown): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const token = await this.getToken?.();
    if (token) {
      (options.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    } else if (this.getToken) {
      console.info(`API request without auth token: ${method} ${path}`);
    }

    if (data) {
      options.body = JSON.stringify(data);
    }

    let response: Response;
    try {
      response = await fetch(url, options);
    } catch (cause) {
      const networkError = new Error(
        `Network request failed for ${method} ${path}. ` +
          'In Android USB debug mode, verify adb reverse is active for ports 3000 and 8081.',
      ) as ApiRequestError;
      networkError.kind = 'network';
      networkError.url = url;
      networkError.method = method;
      networkError.details = cause;
      throw networkError;
    }

    const responseText = await response.text();
    let parsedBody: unknown = null;

    if (responseText) {
      try {
        parsedBody = JSON.parse(responseText);
      } catch {
        parsedBody = responseText;
      }
    }

    if (!response.ok) {
      const isAuthError = response.status === 401 || response.status === 403;
      const fallbackMessage = isAuthError
        ? `Authentication failed: ${response.status} ${response.statusText}`
        : `API Error: ${response.status} ${response.statusText}`;
      const error = new Error(
        (parsedBody as { error?: string } | null)?.error || fallbackMessage,
      ) as ApiRequestError;
      error.kind = isAuthError ? 'auth' : 'api';
      error.status = response.status;
      error.details = parsedBody;
      error.url = url;
      error.method = method;
      throw error;
    }

    return parsedBody as T;
  }

  /* === PROGRAMS === */

  async getPrograms(): Promise<Program[]> {
    return this.request('GET', '/programs');
  }

  async createProgram(req?: CreateProgramRequest): Promise<Program> {
    return this.request('POST', '/programs', {
      name: req?.name || 'Program 01',
    });
  }

  async updateProgram(id: string, req: UpdateProgramRequest): Promise<Program> {
    return this.request('PUT', `/programs/${id}`, req);
  }

  async favoriteProgramId(id: string, isFavorite: boolean): Promise<Program> {
    return this.request('PATCH', `/programs/${id}/favorite`, { is_favorite: isFavorite });
  }

  async deleteProgram(id: string): Promise<void> {
    return this.request('DELETE', `/programs/${id}`);
  }

  async deleteAccount(): Promise<void> {
    return this.request('DELETE', '/account');
  }

  async createProgramWithWorkouts(template: {
    name: string;
    workouts: {
      name: string;
      exercises: { name: string; sets: number; rest_seconds: number }[];
    }[];
  }): Promise<void> {
    try {
      // Step 1: Create the program
      const newProgram = await this.createProgram({ name: template.name });

      // Step 2: For each workout in the template
      for (const workout of template.workouts) {
        const newWorkout = await this.createWorkout(newProgram.id, {
          name: workout.name,
        });

        // Step 3: For each exercise in this workout
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
    return this.request('GET', `/programs/${programId}/workouts`);
  }

  async createWorkout(programId: string, req?: CreateWorkoutRequest): Promise<Workout> {
    return this.request('POST', `/programs/${programId}/workouts`, {
      program_id: programId,
      name: req?.name || 'Workout 01',
    });
  }

  async updateWorkout(id: string, req: UpdateWorkoutRequest): Promise<Workout> {
    return this.request('PUT', `/workouts/${id}`, req);
  }

  async deleteWorkout(id: string): Promise<void> {
    return this.request('DELETE', `/workouts/${id}`);
  }

  async createWorkoutWithExercises(
    programId: string,
    template: {
      name: string;
      exercises: { name: string; sets: number; rest_seconds: number }[];
    },
  ): Promise<void> {
    try {
      // Step 1: Create the workout
      const newWorkout = await this.createWorkout(programId, { name: template.name });

      // Step 2: Create all exercises for the workout
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
    return this.request('PATCH', `/programs/${programId}/workouts/reorder`, {
      items: orderData,
    });
  }

  /* === EXERCISES === */

  async getExercises(workoutId: string): Promise<Exercise[]> {
    return this.request('GET', `/workouts/${workoutId}/exercises`);
  }

  async createExercise(workoutId: string, req: CreateExerciseRequest): Promise<Exercise> {
    return this.request('POST', `/workouts/${workoutId}/exercises`, {
      workout_id: workoutId,
      name: req.name,
      sets: req.sets || 4,
      rest_seconds: req.rest_seconds || 120,
      custom_muscle_groups: req.custom_muscle_groups ?? null,
      is_custom: req.is_custom ?? false,
    });
  }

  async updateExercise(id: string, req: UpdateExerciseRequest): Promise<Exercise> {
    return this.request('PUT', `/exercises/${id}`, req);
  }

  async deleteExercise(id: string): Promise<void> {
    return this.request('DELETE', `/exercises/${id}`);
  }

  async reorderExercises(
    workoutId: string,
    orderData: { id: string; order: number }[],
  ): Promise<void> {
    return this.request('PATCH', `/workouts/${workoutId}/exercises/reorder`, {
      items: orderData,
    });
  }

  /* === WORKOUT SESSIONS === */

  async getActiveSession(): Promise<WorkoutSession | null> {
    return this.request('GET', '/workout-sessions/active');
  }

  async startWorkoutSession(workoutId: string): Promise<WorkoutSession> {
    return this.request('POST', '/workout-sessions/start', {
      workout_id: workoutId,
    });
  }

  async cancelWorkoutSession(sessionId: string): Promise<void> {
    return this.request('POST', `/workout-sessions/${sessionId}/cancel`);
  }

  async finishWorkoutSession(sessionId: string): Promise<void> {
    return this.request('POST', `/workout-sessions/${sessionId}/finish`);
  }

  async updateCurrentExerciseIndex(
    sessionId: string,
    currentExerciseIndex: number,
  ): Promise<WorkoutSession> {
    return this.request('PATCH', `/workout-sessions/${sessionId}/current-exercise`, {
      current_exercise_index: currentExerciseIndex,
    });
  }

  async getSessionSets(
    sessionId: string,
    exerciseId: string,
  ): Promise<WorkoutSessionSet[]> {
    const encodedExerciseId = encodeURIComponent(exerciseId);
    return this.request(
      'GET',
      `/workout-sessions/${sessionId}/sets?exerciseId=${encodedExerciseId}`,
    );
  }

  async saveWorkoutSet(
    sessionId: string,
    payload: SaveWorkoutSetRequest,
  ): Promise<WorkoutSessionSet> {
    return this.request('POST', `/workout-sessions/${sessionId}/sets`, payload);
  }

  /* === HISTORY === */

  async getDatesWithWorkouts(startDate?: string, endDate?: string): Promise<string[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return this.request(
      'GET',
      `/workouts/history/dates-with-workouts${params.size > 0 ? `?${params}` : ''}`,
    );
  }

  async getWorkoutsByDate(date: string): Promise<WorkoutHistoryByDate[]> {
    return this.request('GET', `/workouts/history/by-date?date=${date}`);
  }

  async getWorkoutsByMonth(month: string): Promise<WorkoutHistoryByDate[]> {
    return this.request('GET', `/workouts/history/by-month?month=${month}`);
  }

  async getSessionDetails(sessionId: string): Promise<WorkoutSessionDetail> {
    return this.request('GET', `/workout-sessions/${sessionId}/details`);
  }

  async getLastWorkoutPerformance(
    workoutId: string,
  ): Promise<{ session_id: string | null; sets: ExerciseLastPerformance[] }> {
    return this.request('GET', `/workouts/${workoutId}/last-performance`);
  }

  /* === STATS === */

  async getStats(): Promise<WorkoutStats> {
    return this.request('GET', '/stats');
  }

  async getWorkouts7Days(): Promise<{ count: number }> {
    return this.request('GET', '/stats/workouts-7-days');
  }

  async getExerciseHistory(): Promise<ExerciseHistorySummary[]> {
    return this.request('GET', '/exercises/history');
  }

  async getExerciseProgress(
    exerciseId: string,
    days?: number,
  ): Promise<ExerciseProgressHistory> {
    const path = days
      ? `/exercises/${exerciseId}/progress?days=${days}`
      : `/exercises/${exerciseId}/progress`;
    return this.request('GET', path);
  }

  async getWorkoutSessions(): Promise<WorkoutSession[]> {
    return this.request('GET', '/workout-sessions');
  }

  async getExerciseNotes(exerciseId: string): Promise<string | null> {
    return this.request('GET', `/exercises/${exerciseId}/notes`);
  }

  async saveExerciseNotes(exerciseId: string, notes: string): Promise<void> {
    return this.request('PATCH', `/exercises/${exerciseId}/notes`, { notes });
  }

  /* === WEIGHT TRACKER === */

  async getWeightTrackerProfile(): Promise<WeightTrackerProfile | null> {
    return this.request('GET', '/weight-tracker/profile');
  }

  async upsertWeightTrackerProfile(
    req: UpsertWeightTrackerProfileRequest,
  ): Promise<WeightTrackerProfile> {
    return this.request('POST', '/weight-tracker/profile', req);
  }

  async getWeightTrackerGoals(): Promise<WeightTrackerGoalProject[]> {
    return this.request('GET', '/weight-tracker/goals');
  }

  async createWeightTrackerGoal(
    req: CreateWeightTrackerGoalProjectRequest,
  ): Promise<WeightTrackerGoalProject> {
    return this.request('POST', '/weight-tracker/goals', req);
  }

  async activateWeightTrackerGoal(goalId: string): Promise<WeightTrackerGoalProject> {
    return this.request('POST', `/weight-tracker/goals/${encodeURIComponent(goalId)}/activate`);
  }

  async deleteWeightTrackerGoal(goalId: string): Promise<void> {
    return this.request('DELETE', `/weight-tracker/goals/${encodeURIComponent(goalId)}`);
  }

  async getWeightTrackerEntries(days?: number, goalId?: string): Promise<WeightTrackerEntry[]> {
    const params = new URLSearchParams();
    if (days) params.append('days', String(days));
    if (goalId) params.append('goalId', goalId);
    const path = params.size > 0
      ? `/weight-tracker/entries?${params.toString()}`
      : '/weight-tracker/entries';
    return this.request('GET', path);
  }

  async upsertWeightTrackerEntry(
    req: UpsertWeightTrackerEntryRequest,
  ): Promise<WeightTrackerEntry> {
    return this.request('POST', '/weight-tracker/entries', req);
  }

  async deleteWeightTrackerEntry(entryDate: string, goalId?: string): Promise<void> {
    const encodedDate = encodeURIComponent(entryDate);
    const path = goalId
      ? `/weight-tracker/entries/${encodedDate}?goalId=${encodeURIComponent(goalId)}`
      : `/weight-tracker/entries/${encodedDate}`;
    return this.request('DELETE', path);
  }

  async resetWeightTracker(): Promise<void> {
    return this.request('DELETE', '/weight-tracker/reset');
  }

  async getCustomMetrics(): Promise<WeightTrackerCustomMetric[]> {
    return this.request('GET', '/weight-tracker/custom-metrics');
  }

  async createCustomMetric(
    req: CreateWeightTrackerCustomMetricRequest,
  ): Promise<WeightTrackerCustomMetric> {
    return this.request('POST', '/weight-tracker/custom-metrics', req);
  }

  async deleteCustomMetric(id: string): Promise<void> {
    return this.request('DELETE', `/weight-tracker/custom-metrics/${encodeURIComponent(id)}`);
  }

  async getCustomMetricValues(days?: number, goalId?: string): Promise<WeightTrackerCustomMetricValue[]> {
    const params = new URLSearchParams();
    if (days) params.append('days', String(days));
    if (goalId) params.append('goalId', goalId);
    const path = params.size > 0
      ? `/weight-tracker/custom-metric-values?${params.toString()}`
      : '/weight-tracker/custom-metric-values';
    return this.request('GET', path);
  }

  async upsertCustomMetricValue(
    req: UpsertCustomMetricValueRequest,
  ): Promise<WeightTrackerCustomMetricValue> {
    return this.request('POST', '/weight-tracker/custom-metric-values', req);
  }
}

export default ApiClient;
