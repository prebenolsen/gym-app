import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ApiClient,
  type Exercise,
  type Program,
  type Workout,
  type WorkoutSession,
  type WorkoutSessionSet,
  type ExerciseLastPerformance,
} from '@gym-app/shared';
import { useUnit } from '../context/UnitContext';
import './ActiveWorkoutPage.css';

type SetDraft = {
  weight: string;
  reps: string;
};

type SavedSetTracking = {
  [setNumber: number]: boolean; // true if saved
};

type PreviousPerformance = {
  [exerciseId: string]: ExerciseLastPerformance[];
};

const ActiveWorkoutPage = () => {
  const navigate = useNavigate();
  const api = new ApiClient('http://localhost:3000');
  const { unit, convertFromKg, convertToKg, formatWeight } = useUnit();

  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [setDrafts, setSetDrafts] = useState<SetDraft[]>([]);
  const [savingSet, setSavingSet] = useState<number | null>(null);
  const [previousPerformance, setPreviousPerformance] = useState<PreviousPerformance>({});
  const [savedSetsForExercise, setSavedSetsForExercise] = useState<SavedSetTracking>({});

  const currentExercise = exercises[currentIndex] || null;

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const formatWeightInput = (kg: number): string => {
    const converted = convertFromKg(kg);
    if (Number.isInteger(converted)) {
      return String(converted);
    }
    return converted.toFixed(1);
  };

  const hydrateSetDrafts = (exercise: Exercise, savedSets: WorkoutSessionSet[]) => {
    const nextDrafts: SetDraft[] = Array.from({ length: exercise.sets }).map((_, idx) => {
      const found = savedSets.find((set) => set.set_number === idx + 1);
      return {
        weight: found ? formatWeightInput(found.weight) : '',
        reps: found ? String(found.reps) : '',
      };
    });
    setSetDrafts(nextDrafts);
    
    // Track which sets are saved
    const tracking: SavedSetTracking = {};
    savedSets.forEach((set) => {
      tracking[set.set_number] = true;
    });
    setSavedSetsForExercise(tracking);
  };

  const loadWorkoutById = async (workoutId: string): Promise<Workout | null> => {
    const programs = await api.getPrograms();
    for (const program of programs) {
      const workoutsInProgram = await api.getWorkouts(program.id);
      const found = workoutsInProgram.find((wk) => wk.id === workoutId);
      if (found) return found;
    }
    return null;
  };

  const loadSessionContext = async () => {
    setLoading(true);
    try {
      const session = await api.getActiveSession();
      setActiveSession(session);

      if (!session) {
        setLoading(false);
        return;
      }

      const wk = await loadWorkoutById(session.workout_id);
      setWorkout(wk);

      const workoutExercises = await api.getExercises(session.workout_id);
      setExercises(workoutExercises);

      // Load previous performance data for this workout
      try {
        const lastPerf = await api.getLastWorkoutPerformance(session.workout_id);
        if (lastPerf && lastPerf.sets && lastPerf.sets.length > 0) {
          const perfByExercise: PreviousPerformance = {};
          lastPerf.sets.forEach((set) => {
            if (!perfByExercise[set.exercise_id]) {
              perfByExercise[set.exercise_id] = [];
            }
            perfByExercise[set.exercise_id].push(set);
          });
          setPreviousPerformance(perfByExercise);
        }
      } catch (err) {
        console.warn('Failed to load previous performance:', err);
      }

      const safeIndex = Math.min(
        session.current_exercise_index || 0,
        Math.max(workoutExercises.length - 1, 0)
      );
      setCurrentIndex(safeIndex);

      if (workoutExercises.length > 0) {
        const sets = await api.getSessionSets(session.id, workoutExercises[safeIndex].id);
        hydrateSetDrafts(workoutExercises[safeIndex], sets);
      }

      const startedAtMs = new Date(session.started_at).getTime();
      const nowMs = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((nowMs - startedAtMs) / 1000)));
    } catch (err) {
      console.error('Failed to load active session:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessionContext();
  }, []);

  useEffect(() => {
    if (!activeSession) return;

    const timer = setInterval(() => {
      const startedAtMs = new Date(activeSession.started_at).getTime();
      const nowMs = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((nowMs - startedAtMs) / 1000)));
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession]);

  useEffect(() => {
    if (restSecondsLeft <= 0) return;

    const timer = setInterval(() => {
      setRestSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [restSecondsLeft]);

  useEffect(() => {
    const loadSetsForCurrentExercise = async () => {
      if (!activeSession || !currentExercise) return;
      try {
        const sets = await api.getSessionSets(activeSession.id, currentExercise.id);
        hydrateSetDrafts(currentExercise, sets);
      } catch (err) {
        console.error('Failed to load set data:', err);
      }
    };

    loadSetsForCurrentExercise();
  }, [activeSession?.id, currentExercise?.id]);

  const handleNavigateExercise = async (direction: 'prev' | 'next') => {
    if (!activeSession || exercises.length === 0) return;
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= exercises.length) return;

    setCurrentIndex(nextIndex);
    try {
      await api.updateCurrentExerciseIndex(activeSession.id, nextIndex);
    } catch (err) {
      console.error('Failed to persist current exercise index:', err);
    }
  };

  const handleSetFieldChange = (
    rowIndex: number,
    field: keyof SetDraft,
    value: string
  ) => {
    setSetDrafts((prev) =>
      prev.map((row, idx) => (idx === rowIndex ? { ...row, [field]: value } : row))
    );
  };

  const handleSaveSet = async (rowIndex: number) => {
    if (!activeSession || !currentExercise) return;

    const draft = setDrafts[rowIndex];
    if (!draft) return;

    const reps = Number(draft.reps);
    const parsedWeight = Number(draft.weight.replace(',', '.'));

    if (!draft.weight.trim() || Number.isNaN(parsedWeight) || parsedWeight <= 0 || Number.isNaN(reps) || reps <= 0) {
      window.alert('Please provide valid Weight and Reps before saving the set.');
      return;
    }

    try {
      setSavingSet(rowIndex);
      const setNumber = rowIndex + 1;
      await api.saveWorkoutSet(activeSession.id, {
        exercise_id: currentExercise.id,
        set_number: setNumber,
        weight: Number(convertToKg(parsedWeight).toFixed(2)),
        reps,
      });
      // Mark this set as saved
      setSavedSetsForExercise((prev) => ({
        ...prev,
        [setNumber]: true,
      }));
      setRestSecondsLeft(currentExercise.rest_seconds);
    } catch (err) {
      console.error('Failed to save set:', err);
      window.alert('Failed to save set. Please try again.');
    } finally {
      setSavingSet(null);
    }
  };

  const handleCancelWorkout = async () => {
    if (!activeSession) return;
    if (!window.confirm('Cancel this workout? Saved sets will be removed from default views.')) {
      return;
    }

    try {
      await api.cancelWorkoutSession(activeSession.id);
      navigate('/');
    } catch (err) {
      console.error('Failed to cancel workout:', err);
      window.alert('Failed to cancel workout.');
    }
  };

  const handleFinishWorkout = async () => {
    if (!activeSession) return;
    if (!window.confirm('Finish this workout?')) return;

    try {
      await api.finishWorkoutSession(activeSession.id);
      navigate('/');
    } catch (err) {
      console.error('Failed to finish workout:', err);
      window.alert('Failed to finish workout.');
    }
  };

  const title = useMemo(() => {
    if (!workout) return 'Active Workout';
    return `${workout.name} (${formatDuration(elapsedSeconds)})`;
  }, [workout?.name, elapsedSeconds]);

  if (loading) {
    return <div className="active-workout-page">Loading...</div>;
  }

  if (!activeSession) {
    return (
      <div className="active-workout-page">
        <h1>Active Workout</h1>
        <div className="active-empty-state">
          <p>No workout is currently active.</p>
          <button onClick={() => navigate('/programs')} className="btn-primary">
            Start a Workout!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="active-workout-page">
      <div className="active-header">
        <h1>{title}</h1>
        <p>
          Exercise {exercises.length === 0 ? 0 : currentIndex + 1} of {exercises.length}
        </p>
      </div>

      <div className="active-actions top">
        <button className="btn-danger" onClick={handleCancelWorkout}>
          Cancel Workout
        </button>
        <button className="btn-success" onClick={handleFinishWorkout}>
          Finish Workout
        </button>
      </div>

      <div className="exercise-hero">
        <div className="rest-timer-bar">
          {restSecondsLeft > 0 ? `Rest Timer: ${formatDuration(restSecondsLeft)}` : 'Rest Timer: Ready'}
        </div>
        <h2>{currentExercise?.name || 'No exercise available'}</h2>
      </div>

      {currentExercise && (
        <div className="set-table">
          <div className="set-table-header">
            <span>Set #</span>
            <span>Weight ({unit}) (prev)</span>
            <span>Reps (prev)</span>
            <span aria-hidden="true"></span>
          </div>
          {setDrafts.map((draft, index) => {
            const prevPerf = previousPerformance[currentExercise.id];
            const prevForThisSet = prevPerf?.find((p) => p.set_number === index + 1);
            const setNumber = index + 1;
            const isSaved = savedSetsForExercise[setNumber] === true;
            
            // Find first unsaved set
            let firstUnsavedIndex = -1;
            for (let i = 0; i < setDrafts.length; i++) {
              if (!savedSetsForExercise[i + 1]) {
                firstUnsavedIndex = i;
                break;
              }
            }
            
            // Show button if: next unsaved set OR already saved
            const showButton = firstUnsavedIndex === index || isSaved;

            return (
              <div key={index} className="set-row">
                <span>{index + 1}</span>
                <div className="input-with-previous">
                  <input
                    value={draft.weight}
                    onChange={(e) => handleSetFieldChange(index, 'weight', e.target.value)}
                    placeholder={prevForThisSet ? `(${formatWeight(prevForThisSet.weight)})` : "e.g. 10,5"}
                    disabled={!showButton}
                  />
                </div>
                <div className="input-with-previous">
                  <input
                    value={draft.reps}
                    onChange={(e) => handleSetFieldChange(index, 'reps', e.target.value)}
                    placeholder={prevForThisSet ? `(${prevForThisSet.reps})` : "e.g. 8"}
                    disabled={!showButton}
                  />
                </div>
                {showButton && (
                  <button
                    className={`btn-set-action ${isSaved ? 'btn-saved' : 'btn-primary'}`}
                    onClick={() => handleSaveSet(index)}
                    disabled={savingSet === index}
                    title={isSaved ? 'Click to overwrite' : 'Save this set'}
                  >
                    {savingSet === index ? 'Saving...' : isSaved ? 'Saved ✓' : 'Save'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="exercise-nav-buttons">
        <button
          className="btn-secondary"
          onClick={() => handleNavigateExercise('prev')}
          disabled={currentIndex === 0}
        >
          ◀ Previous
        </button>
        <button
          className="btn-secondary"
          onClick={() => handleNavigateExercise('next')}
          disabled={currentIndex >= exercises.length - 1}
        >
          Next ▶
        </button>
      </div>
    </div>
  );
};

export default ActiveWorkoutPage;
