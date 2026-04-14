import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  type Exercise,
  type Program,
  type Workout,
  type WorkoutSession,
  type WorkoutSessionSet,
  type ExerciseLastPerformance,
} from '@gym-app/shared';
import { useUnit } from '../context/UnitContext';
import { useTheme } from '../context/ThemeContext';
import { useApi } from '../hooks/useApi';
import { playCompletionBeep, playCountdownBeep, playPrepareBeep } from '../lib/restTimerSounds';
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

const normalizeDraftValue = (value: string): string => value.trim().replace(',', '.');

const hasDraftChanged = (draft: SetDraft, baseline?: SetDraft): boolean => {
  if (!baseline) return true;

  const baselineWeight = Number(normalizeDraftValue(baseline.weight));
  const draftWeight = Number(normalizeDraftValue(draft.weight));
  const baselineReps = Number(normalizeDraftValue(baseline.reps));
  const draftReps = Number(normalizeDraftValue(draft.reps));

  const weightChanged =
    Number.isNaN(baselineWeight) || Number.isNaN(draftWeight)
      ? normalizeDraftValue(draft.weight) !== normalizeDraftValue(baseline.weight)
      : baselineWeight !== draftWeight;

  const repsChanged =
    Number.isNaN(baselineReps) || Number.isNaN(draftReps)
      ? normalizeDraftValue(draft.reps) !== normalizeDraftValue(baseline.reps)
      : baselineReps !== draftReps;

  return weightChanged || repsChanged;
};

const ActiveWorkoutPage = () => {
  const navigate = useNavigate();
  const api = useApi();
  const { unit, convertFromKg, convertToKg, formatWeight } = useUnit();
  const { soundEnabled, prepareSoundEnabled, prepareSoundSeconds } = useTheme();

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
  const [lastEditedSetIndex, setLastEditedSetIndex] = useState<number | null>(null);
  const [savedDraftBaseline, setSavedDraftBaseline] = useState<SetDraft[]>([]);
  const [dirtySavedSets, setDirtySavedSets] = useState<SavedSetTracking>({});
  const lastSoundSecondRef = useRef<number | null>(null);

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
    setSavedDraftBaseline(nextDrafts);
    setDirtySavedSets({});
    
    // Track which sets are saved
    const tracking: SavedSetTracking = {};
    savedSets.forEach((set) => {
      tracking[set.set_number] = true;
    });
    setSavedSetsForExercise(tracking);

    const firstUnsavedIndex = nextDrafts.findIndex((_, idx) => !tracking[idx + 1]);
    if (firstUnsavedIndex >= 0) {
      setLastEditedSetIndex(firstUnsavedIndex);
    } else {
      setLastEditedSetIndex(nextDrafts.length > 0 ? nextDrafts.length - 1 : null);
    }
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
    if (!soundEnabled) {
      lastSoundSecondRef.current = restSecondsLeft;
      return;
    }

    if (lastSoundSecondRef.current === restSecondsLeft) {
      return;
    }

    if (restSecondsLeft === 0 && lastSoundSecondRef.current !== 0) {
      playCompletionBeep();
      lastSoundSecondRef.current = restSecondsLeft;
      return;
    }

    if (restSecondsLeft > 0 && restSecondsLeft <= 3) {
      playCountdownBeep();
    }

    if (
      restSecondsLeft > 0 &&
      prepareSoundEnabled &&
      Number.isInteger(prepareSoundSeconds) &&
      prepareSoundSeconds > 0 &&
      restSecondsLeft === prepareSoundSeconds
    ) {
      playPrepareBeep();
    }

    lastSoundSecondRef.current = restSecondsLeft;
  }, [restSecondsLeft, soundEnabled, prepareSoundEnabled, prepareSoundSeconds]);

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
    setLastEditedSetIndex(rowIndex);
    setSetDrafts((prev) => {
      const nextDrafts = prev.map((row, idx) =>
        idx === rowIndex ? { ...row, [field]: value } : row
      );

      const setNumber = rowIndex + 1;
      if (savedSetsForExercise[setNumber]) {
        const nextRow = nextDrafts[rowIndex];
        const baselineRow = savedDraftBaseline[rowIndex];
        const isDirty = hasDraftChanged(nextRow, baselineRow);
        setDirtySavedSets((prevDirty) => ({
          ...prevDirty,
          [setNumber]: isDirty,
        }));
      }

      return nextDrafts;
    });
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
      setSavedDraftBaseline((prev) =>
        prev.map((row, idx) => (idx === rowIndex ? { ...draft } : row))
      );
      setDirtySavedSets((prev) => ({
        ...prev,
        [setNumber]: false,
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

  const firstUnsavedSetIndex = setDrafts.findIndex((_, idx) => !savedSetsForExercise[idx + 1]);
  const activeSaveIndex = lastEditedSetIndex;
  const activeSaveSetNumber = activeSaveIndex !== null ? activeSaveIndex + 1 : null;
  const activeSaveIsSaved =
    activeSaveSetNumber !== null && savedSetsForExercise[activeSaveSetNumber] === true;
  const activeSaveShouldOverwrite =
    activeSaveSetNumber !== null &&
    activeSaveIsSaved &&
    dirtySavedSets[activeSaveSetNumber] === true;

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
        {currentExercise ? (
          <button
            type="button"
            className="exercise-name-link"
            onClick={() => navigate(`/exercise-progress/${currentExercise.id}`)}
            title="View exercise statistics"
          >
            {currentExercise.name}
          </button>
        ) : (
          <h2>No exercise available</h2>
        )}
      </div>

      {currentExercise && (
        <div className="set-table">
          <div className="set-table-header">
            <span>Set #</span>
            <span>Weight ({unit}) (prev)</span>
            <span>Reps (prev)</span>
          </div>
          {setDrafts.map((draft, index) => {
            const prevPerf = previousPerformance[currentExercise.id];
            const prevForThisSet = prevPerf?.find((p) => p.set_number === index + 1);
            const setNumber = index + 1;
            const isSaved = savedSetsForExercise[setNumber] === true;
            const canEdit = firstUnsavedSetIndex === index || isSaved;

            return (
              <div key={index} className="set-row">
                <span>{index + 1}</span>
                <div className="input-with-previous">
                  <input
                    value={draft.weight}
                    onFocus={() => setLastEditedSetIndex(index)}
                    onChange={(e) => handleSetFieldChange(index, 'weight', e.target.value)}
                    placeholder={prevForThisSet ? `(${formatWeight(prevForThisSet.weight)})` : "e.g. 10,5"}
                    disabled={!canEdit}
                  />
                </div>
                <div className="input-with-previous">
                  <input
                    value={draft.reps}
                    onFocus={() => setLastEditedSetIndex(index)}
                    onChange={(e) => handleSetFieldChange(index, 'reps', e.target.value)}
                    placeholder={prevForThisSet ? `(${prevForThisSet.reps})` : "e.g. 8"}
                    disabled={!canEdit}
                  />
                </div>
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
          className={`btn-set-action ${activeSaveShouldOverwrite ? 'btn-overwrite' : 'btn-primary'}`}
          onClick={() => activeSaveIndex !== null && handleSaveSet(activeSaveIndex)}
          disabled={activeSaveIndex === null || savingSet === activeSaveIndex}
          title={
            activeSaveSetNumber !== null
              ? `Save set #${activeSaveSetNumber}`
              : 'Select a set first'
          }
        >
          {activeSaveSetNumber === null
            ? 'Save'
            : savingSet === activeSaveIndex
              ? `Saving Set #${activeSaveSetNumber}...`
              : activeSaveShouldOverwrite
                ? `⚠ Overwrite Set #${activeSaveSetNumber}`
                : `Save Set #${activeSaveSetNumber}`}
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
