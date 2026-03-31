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

// Mock user for MVP
const MOCK_USER_ID = 'user_mock_mvp';

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

// === PROGRAMS ===

app.get('/programs', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('user_id', MOCK_USER_ID)
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
      .eq('user_id', MOCK_USER_ID)
      .order('order', { ascending: false })
      .limit(1);

    const nextOrder = ((existing && existing[0]?.order) || 0) + 1;

    const { data, error } = await supabase
      .from('programs')
      .insert([
        {
          name,
          user_id: MOCK_USER_ID,
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

app.put('/programs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const { data, error } = await supabase
      .from('programs')
      .update({ name })
      .eq('id', id)
      .eq('user_id', MOCK_USER_ID)
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

    // Delete all workouts and exercises in this program
    const { data: workouts } = await supabase
      .from('workouts')
      .select('id')
      .eq('program_id', id);

    if (workouts) {
      for (const workout of workouts) {
        await supabase
          .from('exercises')
          .delete()
          .eq('workout_id', workout.id);
      }

      await supabase.from('workouts').delete().eq('program_id', id);
    }

    // Delete the program
    const { error } = await supabase
      .from('programs')
      .delete()
      .eq('id', id)
      .eq('user_id', MOCK_USER_ID);

    if (error) throw error;
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
      .eq('user_id', MOCK_USER_ID)
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
          user_id: MOCK_USER_ID,
          is_favorite: false,
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
      .eq('user_id', MOCK_USER_ID)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.patch('/workouts/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existing, error: existingError } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', id)
      .eq('user_id', MOCK_USER_ID)
      .single();

    if (existingError) throw existingError;

    const nextValue = !Boolean(existing.is_favorite);

    const { data, error } = await supabase
      .from('workouts')
      .update({ is_favorite: nextValue })
      .eq('id', id)
      .eq('user_id', MOCK_USER_ID)
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

    // Delete all exercises in this workout
    await supabase.from('exercises').delete().eq('workout_id', id);

    // Delete the workout
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', id)
      .eq('user_id', MOCK_USER_ID);

    if (error) throw error;
    res.status(204).send();
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.patch('/programs/:programId/workouts/reorder', async (req, res) => {
  try {
    const { items } = req.body;

    for (const item of items) {
      await supabase
        .from('workouts')
        .update({ order: item.order })
        .eq('id', item.id);
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
      .eq('user_id', MOCK_USER_ID)
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
      sets = 1,
      rest_seconds = 120,
    } = req.body;

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
          user_id: MOCK_USER_ID,
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

    if ('name' in req.body) updates.name = req.body.name;
    if ('sets' in req.body) updates.sets = req.body.sets;
    if ('rest_seconds' in req.body)
      updates.rest_seconds = req.body.rest_seconds;

    const { data, error } = await supabase
      .from('exercises')
      .update(updates)
      .eq('id', id)
      .eq('user_id', MOCK_USER_ID)
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
      .eq('user_id', MOCK_USER_ID);

    if (error) throw error;
    res.status(204).send();
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

app.patch('/workouts/:workoutId/exercises/reorder', async (req, res) => {
  try {
    const { items } = req.body;

    for (const item of items) {
      await supabase
        .from('exercises')
        .update({ order: item.order })
        .eq('id', item.id);
    }

    res.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = formatError(err);
    res.status(500).json({ error: errorMsg });
  }
});

// === WORKOUT SESSIONS ===

app.get('/workout-sessions/active', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', MOCK_USER_ID)
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
      .eq('user_id', MOCK_USER_ID)
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
          user_id: MOCK_USER_ID,
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
      .eq('user_id', MOCK_USER_ID)
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
      .eq('user_id', MOCK_USER_ID)
      .eq('status', 'active')
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('workout_session_sets')
      .update({ is_deleted: true })
      .eq('session_id', id)
      .eq('user_id', MOCK_USER_ID);

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
      .eq('user_id', MOCK_USER_ID)
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
      .eq('user_id', MOCK_USER_ID)
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
            user_id: MOCK_USER_ID,
            saved_at: new Date().toISOString(),
          },
        ],
        {
          onConflict: 'session_id,exercise_id,set_number',
        }
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
      .eq('user_id', MOCK_USER_ID)
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
      .eq('user_id', MOCK_USER_ID)
      .eq('status', 'finished')
      .gte('started_at', `${date}T00:00:00`)
      .lte('started_at', `${date}T23:59:59`)
      .order('started_at', { ascending: false });

    if (error) throw error;

    // Enrich with workout names
    const enriched = await Promise.all(
      (sessions || []).map(async (session: any) => {
        const { data: workout } = await supabase
          .from('workouts')
          .select('name')
          .eq('id', session.workout_id)
          .single();

        return {
          ...session,
          workout_name: workout?.name || 'Unknown',
        };
      })
    );

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
      .eq('user_id', MOCK_USER_ID)
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
      .eq('is_deleted', false)
      .order('set_number', { ascending: true });

    if (setsError) throw setsError;

    // Get exercise names for each set
    const enrichedSets = await Promise.all(
      (sets || []).map(async (set: any) => {
        const { data: exercise } = await supabase
          .from('exercises')
          .select('name')
          .eq('id', set.exercise_id)
          .single();

        return {
          ...set,
          exercise_name: exercise?.name || 'Unknown',
        };
      })
    );

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

    const { data: lastSession, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('workout_id', workoutId)
      .eq('user_id', MOCK_USER_ID)
      .eq('status', 'finished')
      .order('ended_at', { ascending: false })
      .limit(1)
      .single();

    if (sessionError && sessionError.code !== 'PGRST116') {
      throw sessionError;
    }

    if (!lastSession) {
      return res.json({ session: null, sets: [] });
    }

    const { data: sets, error: setsError } = await supabase
      .from('workout_session_sets')
      .select('exercise_id, set_number, weight, reps')
      .eq('session_id', lastSession.id)
      .eq('is_deleted', false)
      .order('set_number', { ascending: true });

    if (setsError) throw setsError;

    res.json({
      session_id: lastSession.id,
      sets: sets || [],
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
      .eq('user_id', MOCK_USER_ID);

    const { count: workoutCount } = await supabase
      .from('workouts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', MOCK_USER_ID);

    const { count: exerciseCount } = await supabase
      .from('exercises')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', MOCK_USER_ID);

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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🏋️ Gym app backend running on port ${PORT}`);
});
