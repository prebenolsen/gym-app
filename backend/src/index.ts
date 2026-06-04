import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

const normalizeWeightToDotDecimal = (input: string | number): number => {
  if (typeof input === 'number') {
    if (Number.isNaN(input)) {
      throw new Error('Invalid weight value');
    }
    return input;
  }

  const normalized = input.replace(/[,-]/g, '.').trim();
  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) {
    throw new Error('Invalid weight value');
  }
  return parsed;
};

const formatError = (err: unknown): string => {
  if (err instanceof Error) {
    return err.message;
  }

  if (err && typeof err === 'object') {
    const maybeError = err as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    const parts = [
      typeof maybeError.message === 'string' ? maybeError.message : '',
      typeof maybeError.details === 'string' ? maybeError.details : '',
      typeof maybeError.hint === 'string' ? maybeError.hint : '',
      typeof maybeError.code === 'string' ? `code=${maybeError.code}` : '',
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' | ');
    }

    return JSON.stringify(maybeError);
  }

  return String(err);
};

const extractBearerToken = (authHeader?: string): string | null => {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
};

const authenticateUser: express.RequestHandler = async (req, res, next) => {
  if (req.path === '/health') {
    next();
    return;
  }

  const token = extractBearerToken(req.header('authorization'));
  if (!token) {
    res.status(401).json({ error: 'Missing or invalid authorization token' });
    return;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid or expired authorization token' });
    return;
  }

  req.userId = data.user.id;
  next();
};

app.use(authenticateUser);

// === PROGRAMS ===

app.get('/programs', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('user_id', req.userId)
      .order('order', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.post('/programs', async (req, res) => {
  try {
    const { name = 'Program 01' } = req.body;

    // Get the next order number
    const { data: existing } = await supabase
      .from('programs')
      .select('order')
      .eq('user_id', req.userId)
      .order('order', { ascending: false })
      .limit(1);

    const nextOrder = ((existing && existing[0]?.order) || 0) + 1;

    // Check if this is the first program
    const { count: programCount } = await supabase
      .from('programs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.userId);

    const isFirstProgram = (programCount || 0) === 0;

    const { data, error } = await supabase
      .from('programs')
      .insert([
        {
          name,
          user_id: req.userId,
          order: nextOrder,
          is_favorite_program: isFirstProgram,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.put('/programs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const { data, error } = await supabase
      .from('programs')
      .update({ name })
      .eq('id', id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.patch('/programs/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_favorite } = req.body;

    if (typeof is_favorite !== 'boolean') {
      res.status(400).json({ error: 'is_favorite must be a boolean' });
      return;
    }

    const { data, error } = await supabase
      .from('programs')
      .update({ is_favorite_program: is_favorite })
      .eq('id', id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.delete('/programs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Ensure the caller owns the program before deleting.
    const { data: deletedProgram, error } = await supabase
      .from('programs')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId)
      .select('id');

    if (error) throw error;
    if (!deletedProgram || deletedProgram.length === 0) {
      res.status(404).json({ error: 'Program not found' });
      return;
    }

    // Child records are removed by FK cascades.
    res.status(204).send();
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

// === WORKOUTS ===

app.get('/programs/:programId/workouts', async (req, res) => {
  try {
    const { programId } = req.params;

    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('program_id', programId)
      .eq('user_id', req.userId)
      .order('order', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.post('/programs/:programId/workouts', async (req, res) => {
  try {
    const { programId } = req.params;
    const { name = 'Workout 01' } = req.body;

    // Get the next order number
    const { data: existing } = await supabase
      .from('workouts')
      .select('order')
      .eq('program_id', programId)
      .order('order', { ascending: false })
      .limit(1);

    const nextOrder = ((existing && existing[0]?.order) || 0) + 1;

    const { data, error } = await supabase
      .from('workouts')
      .insert([
        {
          program_id: programId,
          name,
          user_id: req.userId,
          order: nextOrder,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.put('/workouts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const { data, error } = await supabase
      .from('workouts')
      .update({ name })
      .eq('id', id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.delete('/workouts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Ensure the caller owns the workout before deleting.
    const { data: deletedWorkout, error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId)
      .select('id');

    if (error) throw error;
    if (!deletedWorkout || deletedWorkout.length === 0) {
      res.status(404).json({ error: 'Workout not found' });
      return;
    }

    // Child records are removed by FK cascades.
    res.status(204).send();
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.patch('/programs/:programId/workouts/reorder', async (req, res) => {
  try {
    const { programId } = req.params;
    const { items } = req.body;

    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'items must be an array' });
      return;
    }

    const { data: ownedProgram, error: ownedProgramError } = await supabase
      .from('programs')
      .select('id')
      .eq('id', programId)
      .eq('user_id', req.userId)
      .maybeSingle();

    if (ownedProgramError) throw ownedProgramError;
    if (!ownedProgram) {
      res.status(404).json({ error: 'Program not found' });
      return;
    }

    for (const item of items) {
      if (!item || typeof item.id !== 'string' || typeof item.order !== 'number') {
        res.status(400).json({ error: 'Each item must include id (string) and order (number)' });
        return;
      }

      const { data: updatedRows, error: updateError } = await supabase
        .from('workouts')
        .update({ order: item.order })
        .eq('id', item.id)
        .eq('program_id', programId)
        .eq('user_id', req.userId)
        .select('id');

      if (updateError) throw updateError;
      if (!updatedRows || updatedRows.length === 0) {
        res.status(404).json({ error: 'Workout not found in this program' });
        return;
      }
    }

    res.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

// === EXERCISES ===

app.get('/workouts/:workoutId/exercises', async (req, res) => {
  try {
    const { workoutId } = req.params;

    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('workout_id', workoutId)
      .eq('user_id', req.userId)
      .order('order', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.post('/workouts/:workoutId/exercises', async (req, res) => {
  try {
    const { workoutId } = req.params;
    const {
      name,
      sets = 4,
      rest_seconds = 120,
      custom_muscle_groups = null,
      is_custom = false,
    } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Exercise name is required' });
    }

    if (
      custom_muscle_groups !== null &&
      (!Array.isArray(custom_muscle_groups) ||
        custom_muscle_groups.some((group) => !VALID_MUSCLE_GROUPS.has(group)))
    ) {
      return res.status(400).json({ error: 'Invalid muscle group selection' });
    }

    const resolvedCustomMuscleGroups =
      is_custom && Array.isArray(custom_muscle_groups) && custom_muscle_groups.length > 0
        ? [...new Set(custom_muscle_groups)]
        : null;

    // Get the next order number
    const { data: existing } = await supabase
      .from('exercises')
      .select('order')
      .eq('workout_id', workoutId)
      .order('order', { ascending: false })
      .limit(1);

    const nextOrder = ((existing && existing[0]?.order) || 0) + 1;

    const { data, error } = await supabase
      .from('exercises')
      .insert([
        {
          workout_id: workoutId,
          name,
          sets,
          rest_seconds,
          custom_muscle_groups: resolvedCustomMuscleGroups,
          is_custom,
          user_id: req.userId,
          order: nextOrder,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.put('/exercises/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates: Record<string, unknown> = {};

    const { error: fetchError } = await supabase
      .from('exercises')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();

    if (fetchError) throw fetchError;

    if ('name' in req.body) updates.name = req.body.name;
    if ('sets' in req.body) updates.sets = req.body.sets;
    if ('rest_seconds' in req.body) updates.rest_seconds = req.body.rest_seconds;
    if ('custom_muscle_groups' in req.body || 'custom_muscle_group' in req.body) {
      return res.status(400).json({
        error: 'Custom muscle groups can only be set when creating an exercise',
      });
    }

    const { data, error } = await supabase
      .from('exercises')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.delete('/exercises/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.status(204).send();
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.patch('/workouts/:workoutId/exercises/reorder', async (req, res) => {
  try {
    const { workoutId } = req.params;
    const { items } = req.body;

    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'items must be an array' });
      return;
    }

    const { data: ownedWorkout, error: ownedWorkoutError } = await supabase
      .from('workouts')
      .select('id')
      .eq('id', workoutId)
      .eq('user_id', req.userId)
      .maybeSingle();

    if (ownedWorkoutError) throw ownedWorkoutError;
    if (!ownedWorkout) {
      res.status(404).json({ error: 'Workout not found' });
      return;
    }

    for (const item of items) {
      if (!item || typeof item.id !== 'string' || typeof item.order !== 'number') {
        res.status(400).json({ error: 'Each item must include id (string) and order (number)' });
        return;
      }

      const { data: updatedRows, error: updateError } = await supabase
        .from('exercises')
        .update({ order: item.order })
        .eq('id', item.id)
        .eq('workout_id', workoutId)
        .eq('user_id', req.userId)
        .select('id');

      if (updateError) throw updateError;
      if (!updatedRows || updatedRows.length === 0) {
        res.status(404).json({ error: 'Exercise not found in this workout' });
        return;
      }
    }

    res.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

// === WORKOUT SESSIONS ===

app.get('/workout-sessions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.get('/workout-sessions/active', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', req.userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    res.json(data || null);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.post('/workout-sessions/start', async (req, res) => {
  try {
    const { workout_id } = req.body;
    if (!workout_id) {
      res.status(400).json({ error: 'workout_id is required' });
      return;
    }

    const { data: activeSession, error: activeError } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', req.userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeError) throw activeError;

    if (activeSession) {
      res.status(409).json({
        error: 'An active workout session already exists',
        activeSession,
      });
      return;
    }

    const { data, error } = await supabase
      .from('workout_sessions')
      .insert([
        {
          workout_id,
          user_id: req.userId,
          status: 'active',
          current_exercise_index: 0,
          started_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.patch('/workout-sessions/:id/current-exercise', async (req, res) => {
  try {
    const { id } = req.params;
    const { current_exercise_index } = req.body;

    const { data, error } = await supabase
      .from('workout_sessions')
      .update({ current_exercise_index })
      .eq('id', id)
      .eq('user_id', req.userId)
      .eq('status', 'active')
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.post('/workout-sessions/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('workout_sessions')
      .update({ status: 'cancelled', ended_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', req.userId)
      .eq('status', 'active')
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('workout_session_sets')
      .update({ is_deleted: true })
      .eq('session_id', id)
      .eq('user_id', req.userId);

    res.json(data);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.post('/workout-sessions/:id/finish', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('workout_sessions')
      .update({ status: 'finished', ended_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', req.userId)
      .eq('status', 'active')
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.get('/workout-sessions/:id/sets', async (req, res) => {
  try {
    const { id } = req.params;
    const exerciseId = req.query.exerciseId as string;

    if (!exerciseId) {
      res.status(400).json({ error: 'exerciseId query param is required' });
      return;
    }

    const { data, error } = await supabase
      .from('workout_session_sets')
      .select('*')
      .eq('session_id', id)
      .eq('exercise_id', exerciseId)
      .eq('user_id', req.userId)
      .eq('is_deleted', false)
      .order('set_number', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.post('/workout-sessions/:id/sets', async (req, res) => {
  try {
    const { id } = req.params;
    const { exercise_id, set_number, weight, reps } = req.body;

    if (!exercise_id || typeof set_number !== 'number' || typeof reps !== 'number') {
      res.status(400).json({ error: 'exercise_id, set_number and reps are required' });
      return;
    }

    const normalizedWeight = normalizeWeightToDotDecimal(weight);

    const { data, error } = await supabase
      .from('workout_session_sets')
      .upsert(
        [
          {
            session_id: id,
            exercise_id,
            set_number,
            weight: normalizedWeight,
            reps,
            is_deleted: false,
            user_id: req.userId,
            saved_at: new Date().toISOString(),
          },
        ],
        {
          onConflict: 'session_id,exercise_id,set_number',
        },
      )
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

// === HISTORY ===

// Get dates with completed workouts in a range
app.get('/workouts/history/dates-with-workouts', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = supabase
      .from('workout_sessions')
      .select('started_at, ended_at')
      .eq('user_id', req.userId)
      .eq('status', 'finished');

    if (startDate) {
      query = query.gte('started_at', `${startDate}T00:00:00`);
    }

    if (endDate) {
      query = query.lte('started_at', `${endDate}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Group by date and extract unique dates
    const datesSet = new Set<string>();
    (data || []).forEach((session: any) => {
      const date = session.started_at.split('T')[0];
      datesSet.add(date);
    });

    res.json(Array.from(datesSet).sort());
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Get all finished sessions for a specific date
app.get('/workouts/history/by-date', async (req, res) => {
  try {
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'date parameter required (YYYY-MM-DD)' });
    }

    const { data: sessions, error } = await supabase
      .from('workout_sessions')
      .select('id, workout_id, started_at, ended_at, status')
      .eq('user_id', req.userId)
      .eq('status', 'finished')
      .gte('started_at', `${date}T00:00:00`)
      .lte('started_at', `${date}T23:59:59`)
      .order('started_at', { ascending: false });

    if (error) throw error;

    const workoutIds = [
      ...new Set(
        (sessions || [])
          .map((session: any) => session.workout_id)
          .filter((workoutId: unknown): workoutId is string =>
            typeof workoutId === 'string' && workoutId.length > 0,
          ),
      ),
    ];

    let workoutNameById = new Map<string, string>();

    if (workoutIds.length > 0) {
      const { data: workouts, error: workoutsError } = await supabase
        .from('workouts')
        .select('id, name')
        .in('id', workoutIds)
        .eq('user_id', req.userId);

      if (workoutsError) throw workoutsError;

      workoutNameById = new Map(
        (workouts || []).map((workout) => [workout.id, workout.name]),
      );
    }

    const enriched = (sessions || []).map((session: any) => ({
      ...session,
      workout_name: workoutNameById.get(session.workout_id) || 'Unknown',
    }));

    res.json(enriched);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Get all finished sessions for a specific month
app.get('/workouts/history/by-month', async (req, res) => {
  try {
    const { month } = req.query;

    if (!month || typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month parameter required (YYYY-MM)' });
    }

    const [yearStr, monthStr] = month.split('-');
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;

    const startOfMonth = new Date(Date.UTC(year, monthIndex, 1));
    const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0));

    const startDateTime = startOfMonth.toISOString().slice(0, 19);
    const endDateTime = `${endOfMonth.toISOString().slice(0, 10)}T23:59:59`;

    const { data: sessions, error } = await supabase
      .from('workout_sessions')
      .select('id, workout_id, started_at, ended_at, status')
      .eq('user_id', req.userId)
      .eq('status', 'finished')
      .gte('started_at', startDateTime)
      .lte('started_at', endDateTime)
      .order('started_at', { ascending: false });

    if (error) throw error;

    const workoutIds = [
      ...new Set(
        (sessions || [])
          .map((session: any) => session.workout_id)
          .filter((workoutId: unknown): workoutId is string =>
            typeof workoutId === 'string' && workoutId.length > 0,
          ),
      ),
    ];

    let workoutNameById = new Map<string, string>();

    if (workoutIds.length > 0) {
      const { data: workouts, error: workoutsError } = await supabase
        .from('workouts')
        .select('id, name')
        .in('id', workoutIds)
        .eq('user_id', req.userId);

      if (workoutsError) throw workoutsError;

      workoutNameById = new Map(
        (workouts || []).map((workout) => [workout.id, workout.name]),
      );
    }

    const enriched = (sessions || []).map((session: any) => ({
      ...session,
      workout_name: workoutNameById.get(session.workout_id) || 'Unknown',
    }));

    res.json(enriched);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Get details of a finished session (with exercises and sets)
app.get('/workout-sessions/:sessionId/details', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data: session, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', req.userId)
      .single();

    if (sessionError) throw sessionError;

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get all sets for this session
    const { data: sets, error: setsError } = await supabase
      .from('workout_session_sets')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', req.userId)
      .eq('is_deleted', false)
      .order('set_number', { ascending: true });

    if (setsError) throw setsError;

    const exerciseIds = [
      ...new Set(
        (sets || [])
          .map((set: any) => set.exercise_id)
          .filter((exerciseId: unknown): exerciseId is string =>
            typeof exerciseId === 'string' && exerciseId.length > 0,
          ),
      ),
    ];

    let exerciseNameById = new Map<string, string>();

    if (exerciseIds.length > 0) {
      const { data: exercises, error: exercisesError } = await supabase
        .from('exercises')
        .select('id, name')
        .in('id', exerciseIds)
        .eq('user_id', req.userId);

      if (exercisesError) throw exercisesError;

      exerciseNameById = new Map(
        (exercises || []).map((exercise) => [exercise.id, exercise.name]),
      );
    }

    const enrichedSets = (sets || []).map((set: any) => ({
      ...set,
      exercise_name: exerciseNameById.get(set.exercise_id) || 'Unknown',
    }));

    res.json({
      session,
      sets: enrichedSets,
    });
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Get last completed workout performance (useful for prepopulating weights/reps)
app.get('/workouts/:workoutId/last-performance', async (req, res) => {
  try {
    const { workoutId } = req.params;

    const { data: finishedSessions, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('id, ended_at, started_at')
      .eq('workout_id', workoutId)
      .eq('user_id', req.userId)
      .eq('status', 'finished')
      .order('ended_at', { ascending: false, nullsFirst: false })
      .order('started_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(200);

    if (sessionError) throw sessionError;

    if (!finishedSessions || finishedSessions.length === 0) {
      return res.json({ session_id: null, sets: [] });
    }

    const sessionIds = finishedSessions.map((session) => session.id);
    const sessionRankById = new Map<string, number>();
    finishedSessions.forEach((session, index) => {
      sessionRankById.set(session.id, index);
    });

    const { data: sets, error: setsError } = await supabase
      .from('workout_session_sets')
      .select('session_id, exercise_id, set_number, weight, reps, created_at, saved_at')
      .in('session_id', sessionIds)
      .eq('user_id', req.userId)
      .eq('is_deleted', false)
      .order('saved_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false });

    if (setsError) throw setsError;

    const resolvedSets = [...(sets || [])]
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
      .reduce<
        Array<{
          exercise_id: string;
          set_number: number;
          weight: number;
          reps: number;
          created_at: string | null;
          saved_at: string | null;
        }>
      >((acc, set) => {
        const key = `${set.exercise_id}:${set.set_number}`;
        const exists = acc.some(
          (entry) => `${entry.exercise_id}:${entry.set_number}` === key,
        );
        if (!exists) {
          acc.push({
            exercise_id: set.exercise_id,
            set_number: set.set_number,
            weight: set.weight,
            reps: set.reps,
            created_at: set.created_at,
            saved_at: set.saved_at,
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

    res.json({
      session_id: finishedSessions[0].id,
      sets: resolvedSets,
    });
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

// === STATS ===

app.get('/stats', async (req, res) => {
  try {
    const { count: programCount } = await supabase
      .from('programs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId);

    const { count: workoutCount } = await supabase
      .from('workouts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId);

    const { count: exerciseCount } = await supabase
      .from('exercises')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId);

    res.json({
      total_programs: programCount || 0,
      total_workouts: workoutCount || 0,
      total_exercises: exerciseCount || 0,
    });
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Get workouts count for last 7 days
app.get('/stats/workouts-7-days', async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    const { count, error } = await supabase
      .from('workout_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .eq('status', 'finished')
      .gte('started_at', sevenDaysAgoISO);

    if (error) throw error;

    res.json({ count: count || 0 });
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Get all exercises with history (times done, last date, personal best)
app.get('/exercises/history', async (req, res) => {
  try {
    const { data: sets, error } = await supabase
      .from('workout_session_sets')
      .select('session_id, exercise_id, weight')
      .eq('is_deleted', false);

    if (error) throw error;

    const { data: sessions, error: sessionsError } = await supabase
      .from('workout_sessions')
      .select('id, started_at')
      .eq('user_id', req.userId)
      .eq('status', 'finished');

    if (sessionsError) throw sessionsError;

    const sessionMap = new Map(sessions?.map((s: any) => [s.id, s]) || []);

    // Group sets by exercise
    const exerciseMap = new Map<
      string,
      { count: number; maxWeight: number; lastDate: string; sessionIds: Set<string> }
    >();

    for (const set of sets || []) {
      const session = sessionMap.get(set.session_id || '');
      if (!session) continue;

      if (!exerciseMap.has(set.exercise_id)) {
        exerciseMap.set(set.exercise_id, {
          count: 0,
          maxWeight: 0,
          lastDate: session.started_at,
          sessionIds: new Set(),
        });
      }

      const entry = exerciseMap.get(set.exercise_id)!;
      entry.sessionIds.add(session.id);
      entry.count = entry.sessionIds.size;
      entry.maxWeight = Math.max(entry.maxWeight, set.weight);
      if (new Date(session.started_at) > new Date(entry.lastDate)) {
        entry.lastDate = session.started_at;
      }
    }

    // Enrich with exercise names
    const result = [];
    for (const [exerciseId, stats] of exerciseMap.entries()) {
      const { data: exercise } = await supabase
        .from('exercises')
        .select('name')
        .eq('id', exerciseId)
        .single();

      result.push({
        exercise_id: exerciseId,
        exercise_name: exercise?.name || 'Unknown',
        times_done: stats.count,
        last_date: stats.lastDate.split('T')[0],
        personal_best: stats.maxWeight,
      });
    }

    // Sort by most recent
    result.sort(
      (a, b) => new Date(b.last_date).getTime() - new Date(a.last_date).getTime(),
    );

    res.json(result);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Get exercise progress history (with max weight and total volume per session)
app.get('/exercises/:exerciseId/progress', async (req, res) => {
  try {
    const { exerciseId } = req.params;
    const { days = '90' } = req.query;
    const daysNum = parseInt(String(days), 10);

    if (isNaN(daysNum) || daysNum < 1) {
      return res.status(400).json({ error: 'days parameter must be positive number' });
    }

    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - daysNum);
    const lookbackISO = lookbackDate.toISOString();

    // Get all sets for this exercise in finished sessions
    const { data: sets, error: setsError } = await supabase
      .from('workout_session_sets')
      .select('session_id, weight, reps, set_number')
      .eq('exercise_id', exerciseId)
      .eq('is_deleted', false);

    if (setsError) throw setsError;

    // Get the sessions for those sets
    const sessionIds = [...new Set((sets || []).map((s: any) => s.session_id))];

    if (sessionIds.length === 0) {
      return res.json({
        exercise_id: exerciseId,
        exercise_name: 'Unknown',
        history: [],
      });
    }

    const { data: sessions, error: sessionsError } = await supabase
      .from('workout_sessions')
      .select('id, started_at')
      .eq('user_id', req.userId)
      .eq('status', 'finished')
      .in('id', sessionIds)
      .gte('started_at', lookbackISO);

    if (sessionsError) throw sessionsError;

    const sessionMap = new Map(sessions?.map((s: any) => [s.id, s]) || []);

    // Calculate stats per calendar day (group by date so N sets in one workout = 1 row)
    const dateStats = new Map<
      string,
      {
        date: string;
        maxWeight: number;
        totalVolume: number;
        sets: number;
        totalReps: number;
      }
    >();

    for (const set of sets || []) {
      const session = sessionMap.get(set.session_id);
      if (!session) continue;

      const date = session.started_at.split('T')[0];

      if (!dateStats.has(date)) {
        dateStats.set(date, {
          date,
          maxWeight: 0,
          totalVolume: 0,
          sets: 0,
          totalReps: 0,
        });
      }

      const stats = dateStats.get(date)!;
      stats.maxWeight = Math.max(stats.maxWeight, set.weight);
      stats.totalVolume += set.weight * set.reps;
      stats.sets += 1;
      stats.totalReps += set.reps;
    }

    // Convert to array and sort by date
    const history = Array.from(dateStats.values())
      .map((stats) => ({
        date: stats.date,
        max_weight: stats.maxWeight,
        total_volume: stats.totalVolume,
        sets: stats.sets,
        total_reps: stats.totalReps,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Get exercise name
    const { data: exercise } = await supabase
      .from('exercises')
      .select('name')
      .eq('id', exerciseId)
      .single();

    res.json({
      exercise_id: exerciseId,
      exercise_name: exercise?.name || 'Unknown',
      history,
    });
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.delete('/account', async (req, res) => {
  try {
    // Delete child records first, then parent records.
    const { data: sessions, error: sessionsError } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', req.userId);

    if (sessionsError) {
      throw sessionsError;
    }

    const sessionIds = (sessions ?? []).map((session) => session.id);
    if (sessionIds.length > 0) {
      await supabase.from('workout_session_sets').delete().in('session_id', sessionIds);
    }

    await supabase.from('workout_sessions').delete().eq('user_id', req.userId);

    await supabase.from('exercises').delete().eq('user_id', req.userId);

    await supabase.from('workouts').delete().eq('user_id', req.userId);

    await supabase.from('programs').delete().eq('user_id', req.userId);

    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(req.userId);
    if (authDeleteError) {
      throw authDeleteError;
    }

    res.status(204).send();
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

// === EXERCISE NOTES ===

app.get('/exercises/:exerciseId/notes', async (req, res) => {
  try {
    const { exerciseId } = req.params;

    const { data, error } = await supabase
      .from('exercise_notes')
      .select('notes')
      .eq('exercise_id', exerciseId)
      .eq('user_id', req.userId)
      .maybeSingle();

    if (error) throw error;
    res.json(data?.notes || null);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.patch('/exercises/:exerciseId/notes', async (req, res) => {
  try {
    const { exerciseId } = req.params;
    const { notes } = req.body;

    if (typeof notes !== 'string') {
      res.status(400).json({ error: 'notes must be a string' });
      return;
    }

    const { data, error } = await supabase
      .from('exercise_notes')
      .upsert(
        [
          {
            exercise_id: exerciseId,
            user_id: req.userId,
            notes,
            updated_at: new Date().toISOString(),
          },
        ],
        {
          onConflict: 'exercise_id,user_id',
        },
      )
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// === WEIGHT TRACKER ===

const resolveActiveGoalId = async (userId: string): Promise<string | null> => {
  const { data: activeGoal } = await supabase
    .from('weight_tracker_goals')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  return activeGoal?.id ?? null;
};

app.get('/weight-tracker/profile', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('weight_tracker_profile')
      .select('*')
      .eq('user_id', req.userId)
      .maybeSingle();

    if (error) throw error;
    res.json(data); // null when no profile exists yet
  } catch (err: unknown) {
    res.status(500).json({ error: formatError(err) });
  }
});

app.post('/weight-tracker/profile', async (req, res) => {
  try {
    const ALLOWED = [
      'gender', 'age', 'birthdate', 'height_cm', 'default_weight_kg',
      'bmr_formula', 'activity_level',
      'show_weight', 'show_steps', 'show_calories',
      'onboarding_complete',
    ];

    const payload: Record<string, unknown> = {
      user_id: req.userId,
      updated_at: new Date().toISOString(),
    };

    for (const field of ALLOWED) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        payload[field] = req.body[field];
      }
    }

    const { data, error } = await supabase
      .from('weight_tracker_profile')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: formatError(err) });
  }
});

app.get('/weight-tracker/goals', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('weight_tracker_goals')
      .select('*')
      .eq('user_id', req.userId)
      .order('started_on', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: unknown) {
    res.status(500).json({ error: formatError(err) });
  }
});

app.post('/weight-tracker/goals', async (req, res) => {
  try {
    const {
      goal_type = 'track',
      weekly_target_kg = null,
      started_on,
      start_weight_kg = null,
    } = req.body;

    if (!['lose', 'gain', 'track'].includes(goal_type)) {
      res.status(400).json({ error: 'goal_type must be lose, gain, or track' });
      return;
    }

    if (!started_on || typeof started_on !== 'string') {
      res.status(400).json({ error: 'started_on is required' });
      return;
    }

    const { error: deactivateError } = await supabase
      .from('weight_tracker_goals')
      .update({
        is_active: false,
        ended_on: started_on,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', req.userId)
      .eq('is_active', true);

    if (deactivateError) throw deactivateError;

    const { data: createdGoal, error: createError } = await supabase
      .from('weight_tracker_goals')
      .insert({
        user_id: req.userId,
        goal_type,
        weekly_target_kg,
        started_on,
        start_weight_kg,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (createError) throw createError;

    res.status(201).json(createdGoal);
  } catch (err: unknown) {
    res.status(500).json({ error: formatError(err) });
  }
});

app.post('/weight-tracker/goals/:goalId/activate', async (req, res) => {
  try {
    const { goalId } = req.params;

    const { data: targetGoal, error: targetError } = await supabase
      .from('weight_tracker_goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', req.userId)
      .single();
    if (targetError) throw targetError;

    const today = new Date().toISOString().split('T')[0];

    const { error: deactivateError } = await supabase
      .from('weight_tracker_goals')
      .update({
        is_active: false,
        ended_on: today,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', req.userId)
      .eq('is_active', true)
      .neq('id', goalId);
    if (deactivateError) throw deactivateError;

    const { data: activatedGoal, error: activateError } = await supabase
      .from('weight_tracker_goals')
      .update({
        is_active: true,
        ended_on: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId)
      .eq('user_id', req.userId)
      .select('*')
      .single();
    if (activateError) throw activateError;

    res.json(activatedGoal ?? targetGoal);
  } catch (err: unknown) {
    res.status(500).json({ error: formatError(err) });
  }
});

app.get('/weight-tracker/entries', async (req, res) => {
  try {
    const explicitGoalId = req.query.goalId ? String(req.query.goalId) : null;
    const resolvedGoalId = explicitGoalId ?? (await resolveActiveGoalId(req.userId));
    if (!resolvedGoalId) {
      res.json([]);
      return;
    }

    const daysParam = req.query.days ? parseInt(String(req.query.days), 10) : 365;
    const days = Number.isNaN(daysParam) || daysParam <= 0 ? 365 : daysParam;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffDate = cutoff.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('weight_tracker_entries')
      .select('*')
      .eq('user_id', req.userId)
      .eq('goal_id', resolvedGoalId)
      .gte('entry_date', cutoffDate)
      .order('entry_date', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: unknown) {
    res.status(500).json({ error: formatError(err) });
  }
});

app.post('/weight-tracker/entries', async (req, res) => {
  try {
    const { entry_date, goal_id, weight_kg, steps, calories } = req.body;

    if (!entry_date || typeof entry_date !== 'string') {
      res.status(400).json({ error: 'entry_date is required' });
      return;
    }

    const resolvedGoalId =
      (typeof goal_id === 'string' && goal_id) || (await resolveActiveGoalId(req.userId));
    if (!resolvedGoalId) {
      res.status(400).json({ error: 'No active goal found. Create a goal first.' });
      return;
    }

    const payload: Record<string, unknown> = {
      user_id: req.userId,
      goal_id: resolvedGoalId,
      entry_date,
      updated_at: new Date().toISOString(),
    };

    if (weight_kg !== undefined) {
      payload.weight_kg =
        weight_kg === null || weight_kg === ''
          ? null
          : normalizeWeightToDotDecimal(weight_kg);
    }
    if (steps !== undefined) payload.steps = steps === '' ? null : steps;
    if (calories !== undefined) payload.calories = calories === '' ? null : calories;

    const { data, error } = await supabase
      .from('weight_tracker_entries')
      .upsert(payload, { onConflict: 'user_id,goal_id,entry_date' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: formatError(err) });
  }
});

app.delete('/weight-tracker/entries/:entryDate', async (req, res) => {
  try {
    const { entryDate } = req.params;
    const explicitGoalId = req.query.goalId ? String(req.query.goalId) : null;
    const resolvedGoalId = explicitGoalId ?? (await resolveActiveGoalId(req.userId));
    if (!resolvedGoalId) {
      res.status(400).json({ error: 'No active goal found. Create a goal first.' });
      return;
    }

    const { error } = await supabase
      .from('weight_tracker_entries')
      .delete()
      .eq('user_id', req.userId)
      .eq('goal_id', resolvedGoalId)
      .eq('entry_date', entryDate);

    if (error) throw error;
    res.status(204).send();
  } catch (err: unknown) {
    res.status(500).json({ error: formatError(err) });
  }
});


app.delete('/weight-tracker/reset', async (req, res) => {
  try {
    const { error: valuesError } = await supabase
      .from('weight_tracker_custom_metric_values')
      .delete()
      .eq('user_id', req.userId);
    if (valuesError) throw valuesError;

    const { error: metricsError } = await supabase
      .from('weight_tracker_custom_metrics')
      .delete()
      .eq('user_id', req.userId);
    if (metricsError) throw metricsError;

    const { error: entriesError } = await supabase
      .from('weight_tracker_entries')
      .delete()
      .eq('user_id', req.userId);
    if (entriesError) throw entriesError;

    const { error: goalsError } = await supabase
      .from('weight_tracker_goals')
      .delete()
      .eq('user_id', req.userId);
    if (goalsError) throw goalsError;

    const { error: profileError } = await supabase
      .from('weight_tracker_profile')
      .delete()
      .eq('user_id', req.userId);
    if (profileError) throw profileError;

    res.status(204).send();
  } catch (err: unknown) {
    res.status(500).json({ error: formatError(err) });
  }
});

// === WEIGHT TRACKER CUSTOM METRICS ===

app.get('/weight-tracker/custom-metrics', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('weight_tracker_custom_metrics')
      .select('*')
      .eq('user_id', req.userId)
      .order('order', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err: unknown) {
    res.status(500).json({ error: formatError(err) });
  }
});

app.post('/weight-tracker/custom-metrics', async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    if (!['boolean', 'integer', 'decimal'].includes(type)) {
      res.status(400).json({ error: 'type must be boolean, integer, or decimal' });
      return;
    }

    const { count } = await supabase
      .from('weight_tracker_custom_metrics')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId);

    if ((count ?? 0) >= 3) {
      res.status(400).json({ error: 'Maximum 3 custom metrics allowed' });
      return;
    }

    const { data: existing } = await supabase
      .from('weight_tracker_custom_metrics')
      .select('order')
      .eq('user_id', req.userId)
      .order('order', { ascending: false })
      .limit(1);

    const nextOrder = ((existing && existing[0]?.order) || 0) + 1;

    const { data, error } = await supabase
      .from('weight_tracker_custom_metrics')
      .insert({ user_id: req.userId, name: name.trim(), type, order: nextOrder })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: formatError(err) });
  }
});

app.delete('/weight-tracker/custom-metrics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('weight_tracker_custom_metrics')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);
    if (error) throw error;
    res.status(204).send();
  } catch (err: unknown) {
    res.status(500).json({ error: formatError(err) });
  }
});

app.get('/weight-tracker/custom-metric-values', async (req, res) => {
  try {
    const explicitGoalId = req.query.goalId ? String(req.query.goalId) : null;
    const resolvedGoalId = explicitGoalId ?? (await resolveActiveGoalId(req.userId));
    if (!resolvedGoalId) {
      res.json([]);
      return;
    }

    const daysParam = req.query.days ? parseInt(String(req.query.days), 10) : 365;
    const days = Number.isNaN(daysParam) || daysParam <= 0 ? 365 : daysParam;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffDate = cutoff.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('weight_tracker_custom_metric_values')
      .select('*')
      .eq('user_id', req.userId)
      .eq('goal_id', resolvedGoalId)
      .gte('entry_date', cutoffDate)
      .order('entry_date', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err: unknown) {
    res.status(500).json({ error: formatError(err) });
  }
});

app.post('/weight-tracker/custom-metric-values', async (req, res) => {
  try {
    const {
      goal_id,
      entry_date,
      metric_id,
      value_boolean,
      value_integer,
      value_decimal,
    } = req.body;
    if (!entry_date || typeof entry_date !== 'string') {
      res.status(400).json({ error: 'entry_date is required' });
      return;
    }
    if (!metric_id || typeof metric_id !== 'string') {
      res.status(400).json({ error: 'metric_id is required' });
      return;
    }

    const resolvedGoalId =
      (typeof goal_id === 'string' && goal_id) || (await resolveActiveGoalId(req.userId));
    if (!resolvedGoalId) {
      res.status(400).json({ error: 'No active goal found. Create a goal first.' });
      return;
    }

    const { data, error } = await supabase
      .from('weight_tracker_custom_metric_values')
      .upsert(
        {
          user_id: req.userId,
          goal_id: resolvedGoalId,
          entry_date,
          metric_id,
          value_boolean: value_boolean ?? null,
          value_integer: value_integer ?? null,
          value_decimal: value_decimal ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,goal_id,entry_date,metric_id' },
      )
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: unknown) {
    res.status(500).json({ error: formatError(err) });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`GymApp backend running on port ${PORT}`);
});
