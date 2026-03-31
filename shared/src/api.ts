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
} from './types';

class ApiClient {
  baseURL: string;
  userId: string = 'user_mock_mvp'; // Mock user for MVP

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    method: string,
    path: string,
    data?: unknown
  ): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
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
      const error = new Error(
        (parsedBody as { error?: string } | null)?.error ||
          `API Error: ${response.status} ${response.statusText}`
      ) as Error & { status?: number; details?: unknown };
      error.status = response.status;
      error.details = parsedBody;
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

  async deleteProgram(id: string): Promise<void> {
    return this.request('DELETE', `/programs/${id}`);
  }

  /* === WORKOUTS === */

  async getWorkouts(programId: string): Promise<Workout[]> {
    return this.request('GET', `/programs/${programId}/workouts`);
  }

  async createWorkout(
    programId: string,
    req?: CreateWorkoutRequest
  ): Promise<Workout> {
    return this.request('POST', `/programs/${programId}/workouts`, {
      program_id: programId,
      name: req?.name || 'Workout 01',
    });
  }

  async updateWorkout(id: string, req: UpdateWorkoutRequest): Promise<Workout> {
    return this.request('PUT', `/workouts/${id}`, req);
  }

  async toggleWorkoutFavorite(id: string): Promise<Workout> {
    return this.request('PATCH', `/workouts/${id}/favorite`);
  }

  async deleteWorkout(id: string): Promise<void> {
    return this.request('DELETE', `/workouts/${id}`);
  }

  async reorderWorkouts(
    programId: string,
    orderData: { id: string; order: number }[]
  ): Promise<void> {
    return this.request('PATCH', `/programs/${programId}/workouts/reorder`, {
      items: orderData,
    });
  }

  /* === EXERCISES === */

  async getExercises(workoutId: string): Promise<Exercise[]> {
    return this.request('GET', `/workouts/${workoutId}/exercises`);
  }

  async createExercise(
    workoutId: string,
    req: CreateExerciseRequest
  ): Promise<Exercise> {
    return this.request('POST', `/workouts/${workoutId}/exercises`, {
      workout_id: workoutId,
      name: req.name,
      sets: req.sets || 1,
      rest_seconds: req.rest_seconds || 120,
    });
  }

  async updateExercise(
    id: string,
    req: UpdateExerciseRequest
  ): Promise<Exercise> {
    return this.request('PUT', `/exercises/${id}`, req);
  }

  async deleteExercise(id: string): Promise<void> {
    return this.request('DELETE', `/exercises/${id}`);
  }

  async reorderExercises(
    workoutId: string,
    orderData: { id: string; order: number }[]
  ): Promise<void> {
    return this.request(
      'PATCH',
      `/workouts/${workoutId}/exercises/reorder`,
      {
        items: orderData,
      }
    );
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
    currentExerciseIndex: number
  ): Promise<WorkoutSession> {
    return this.request('PATCH', `/workout-sessions/${sessionId}/current-exercise`, {
      current_exercise_index: currentExerciseIndex,
    });
  }

  async getSessionSets(
    sessionId: string,
    exerciseId: string
  ): Promise<WorkoutSessionSet[]> {
    const encodedExerciseId = encodeURIComponent(exerciseId);
    return this.request(
      'GET',
      `/workout-sessions/${sessionId}/sets?exerciseId=${encodedExerciseId}`
    );
  }

  async saveWorkoutSet(
    sessionId: string,
    payload: SaveWorkoutSetRequest
  ): Promise<WorkoutSessionSet> {
    return this.request('POST', `/workout-sessions/${sessionId}/sets`, payload);
  }

  /* === HISTORY === */

  async getDatesWithWorkouts(
    startDate?: string,
    endDate?: string
  ): Promise<string[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return this.request(
      'GET',
      `/workouts/history/dates-with-workouts${params.size > 0 ? `?${params}` : ''}`
    );
  }

  async getWorkoutsByDate(date: string): Promise<WorkoutHistoryByDate[]> {
    return this.request('GET', `/workouts/history/by-date?date=${date}`);
  }

  async getSessionDetails(sessionId: string): Promise<WorkoutSessionDetail> {
    return this.request('GET', `/workout-sessions/${sessionId}/details`);
  }

  async getLastWorkoutPerformance(
    workoutId: string
  ): Promise<{ session_id: string | null; sets: ExerciseLastPerformance[] }> {
    return this.request('GET', `/workouts/${workoutId}/last-performance`);
  }

  /* === STATS === */

  async getStats(): Promise<WorkoutStats> {
    return this.request('GET', '/stats');
  }
}

export default ApiClient;
