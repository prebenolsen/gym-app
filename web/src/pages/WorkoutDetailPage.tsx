import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApiClient, type Workout, type Exercise } from '@gym-app/shared';
import NumberSpinner from '../components/NumberSpinner';
import './WorkoutDetailPage.css';

const WorkoutDetailPage = () => {
  const { programId, workoutId } = useParams<{
    programId: string;
    workoutId: string;
  }>();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [loading, setLoading] = useState(true);

  const api = new ApiClient('http://localhost:3000');

  useEffect(() => {
    if (!workoutId) return;
    fetchData();
  }, [workoutId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!programId) return;

      const workouts = await api.getWorkouts(programId);
      const wk = workouts.find((w) => w.id === workoutId);
      setWorkout(wk || null);

      if (wk) {
        const exs = await api.getExercises(wk.id);
        setExercises(exs);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRenameWorkout = async (newName: string) => {
    if (!workout || !newName.trim()) {
      setEditingName(null);
      return;
    }

    try {
      const updated = await api.updateWorkout(workout.id, { name: newName });
      setWorkout(updated);
      setEditingName(null);
    } catch (err) {
      console.error('Failed to rename workout:', err);
    }
  };

  const handleAddExercise = async () => {
    if (!workout || !newExerciseName.trim()) return;

    try {
      const newExercise = await api.createExercise(workout.id, {
        name: newExerciseName,
        sets: 4,
        rest_seconds: 120,
      });

      setExercises([...exercises, newExercise]);
      setNewExerciseName('');
    } catch (err) {
      console.error('Failed to add exercise:', err);
    }
  };

  const handleUpdateExercise = async (
    id: string,
    updates: { sets?: number; rest_seconds?: number; name?: string }
  ) => {
    try {
      const updated = await api.updateExercise(id, updates);
      setExercises(exercises.map((e) => (e.id === id ? updated : e)));
    } catch (err) {
      console.error('Failed to update exercise:', err);
    }
  };

  const handleDeleteExercise = async (id: string) => {
    if (!window.confirm('Delete this exercise?')) return;

    try {
      await api.deleteExercise(id);
      setExercises(exercises.filter((e) => e.id !== id));
    } catch (err) {
      console.error('Failed to delete exercise:', err);
    }
  };



  const handleStartWorkout = async () => {
    if (!workout) return;

    try {
      await api.startWorkoutSession(workout.id);
      navigate('/active-workout');
    } catch (err) {
      const apiErr = err as Error & { status?: number };
      if (apiErr.status === 409) {
        const shouldResume = window.confirm(
          'You already have an active workout session. Press OK to resume it, or Cancel to replace it with this workout.'
        );

        if (shouldResume) {
          navigate('/active-workout');
          return;
        }

        const activeSession = await api.getActiveSession();
        if (activeSession) {
          await api.cancelWorkoutSession(activeSession.id);
          await api.startWorkoutSession(workout.id);
          navigate('/active-workout');
        }
        return;
      }

      console.error('Failed to start workout session:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to start workout session. Please try again.';
      if (
        message.toLowerCase().includes('workout_sessions') ||
        message.toLowerCase().includes('does not exist')
      ) {
        window.alert(
          'Workout session tables are missing in Supabase. Run backend/supabase_session_schema.sql, then restart backend:dev.'
        );
        return;
      }
      window.alert(message);
    }
  };

  const handleMoveExercise = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === exercises.length - 1)
    ) {
      return;
    }

    const newExercises = [...exercises];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newExercises[index], newExercises[targetIndex]] = [
      newExercises[targetIndex],
      newExercises[index],
    ];

    setExercises(newExercises);

    // Update backend with new order
    try {
      const orderData = newExercises.map((e, idx) => ({
        id: e.id,
        order: idx + 1,
      }));
      await api.reorderExercises(workout!.id, orderData);
    } catch (err) {
      console.error('Failed to reorder exercises:', err);
      setExercises(exercises); // Revert on error
    }
  };

  if (loading) return <div className="workout-detail-page">Loading...</div>;
  if (!workout)
    return (
      <div className="workout-detail-page">
        <p>Workout not found</p>
      </div>
    );

  return (
    <div className="workout-detail-page">
      <div className="detail-header">
        <button
          onClick={() => navigate(`/programs/${programId}`)}
          className="btn-back"
        >
          ← Back
        </button>

        <div className="title-section">
          {editingName !== null ? (
            <div className="edit-input-group">
              <input
                type="text"
                defaultValue={workout.name}
                autoFocus
                onBlur={(e) => handleRenameWorkout(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameWorkout(e.currentTarget.value);
                  if (e.key === 'Escape') setEditingName(null);
                }}
              />
            </div>
          ) : (
            <h1 onClick={() => setEditingName(workout.name)}>{workout.name}</h1>
          )}
        </div>
      </div>

      <div className="exercises-section">
        <div className="section-top-row">
          <h2>Exercises</h2>
          <button onClick={handleStartWorkout} className="btn-start-workout">
            Start Workout
          </button>
        </div>

        <div className="add-exercise">
          <input
            type="text"
            placeholder="Add a custom exercise"
            value={newExerciseName}
            onChange={(e) => setNewExerciseName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddExercise();
            }}
          />
          <button onClick={handleAddExercise} className="btn-primary">
            + Add Exercise
          </button>
        </div>

        {exercises.length > 0 && (
          <div className="exercises-list">
            {exercises.map((exercise, index) => (
              <div key={exercise.id} className="exercise-card">
                <div className="exercise-header">
                  <h3>{exercise.name}</h3>
                  <button
                    onClick={() => handleDeleteExercise(exercise.id)}
                    className="btn-small btn-delete"
                  >
                    ✕
                  </button>
                </div>

                <div className="exercise-controls">
                  <div className="control-group">
                    <NumberSpinner
                      value={exercise.sets}
                      onChange={(value) =>
                        handleUpdateExercise(exercise.id, { sets: value })
                      }
                      min={1}
                      max={100}
                      step={1}
                      label="Sets"
                    />
                  </div>

                  <div className="control-group">
                    <NumberSpinner
                      value={exercise.rest_seconds}
                      onChange={(value) =>
                        handleUpdateExercise(exercise.id, {
                          rest_seconds: value,
                        })
                      }
                      min={0}
                      max={600}
                      step={5}
                      label="Rest (sec)"
                    />
                  </div>

                  <div className="control-group reorder-group">
                    <label>Reorder</label>
                    <div className="reorder-buttons">
                      {index > 0 ? (
                        <button
                          onClick={() => handleMoveExercise(index, 'up')}
                          className="btn-reorder"
                        >
                          ▲
                        </button>
                      ) : (
                        <div className="btn-reorder-slot" aria-hidden="true" />
                      )}
                      {index < exercises.length - 1 ? (
                        <button
                          onClick={() => handleMoveExercise(index, 'down')}
                          className="btn-reorder"
                        >
                          ▼
                        </button>
                      ) : (
                        <div className="btn-reorder-slot" aria-hidden="true" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => navigate(`/exercises?programId=${programId}&workoutId=${workoutId}&workoutName=${encodeURIComponent(workout?.name || '')}`)}
          className="btn-large btn-primary btn-catalog"
        >
          Add exercises from the catalog
        </button>
      </div>
    </div>
  );
};

export default WorkoutDetailPage;
