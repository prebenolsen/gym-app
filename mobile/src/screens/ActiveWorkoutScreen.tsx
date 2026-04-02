import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { type Exercise, type Workout, type WorkoutSession, type WorkoutSessionSet } from '@gym-app/shared';
import { useApi } from '../hooks/useApi';
import { colors, radius, shadow } from '../theme';
import { usePreferences } from '../context/PreferencesContext';

type SetDraft = {
  weight: string;
  reps: string;
};

type SavedSetTracking = Record<number, boolean>;

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

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

const parseApiDate = (value: string): number => {
  const hasTz = /[zZ]|[+\-]\d{2}:?\d{2}$/.test(value);
  const normalized = hasTz ? value : `${value}Z`;
  return new Date(normalized).getTime();
};

const ActiveWorkoutScreen = ({ navigation }: any) => {
  const api = useApi();
  const { colors: themeColors, unit, convertFromKg, convertToKg } = usePreferences();
  const styles = createStyles(themeColors);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [setDraftsByExercise, setSetDraftsByExercise] = useState<Record<string, SetDraft[]>>({});
  const [savedSetsByExercise, setSavedSetsByExercise] = useState<Record<string, SavedSetTracking>>({});
  const [savedDraftBaselinesByExercise, setSavedDraftBaselinesByExercise] = useState<Record<string, SetDraft[]>>({});
  const [dirtySavedSetsByExercise, setDirtySavedSetsByExercise] = useState<Record<string, SavedSetTracking>>({});
  const [lastEditedSetIndexByExercise, setLastEditedSetIndexByExercise] = useState<Record<string, number | null>>({});
  const [savingSet, setSavingSet] = useState<number | null>(null);
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);

  const currentExercise = exercises[currentIndex] ?? null;
  const currentDrafts = currentExercise ? setDraftsByExercise[currentExercise.id] ?? [] : [];
  const currentSavedSets = currentExercise ? savedSetsByExercise[currentExercise.id] ?? {} : {};
  const currentDirtySavedSets = currentExercise
    ? dirtySavedSetsByExercise[currentExercise.id] ?? {}
    : {};
  const activeSaveIndex = currentExercise
    ? (lastEditedSetIndexByExercise[currentExercise.id] ?? null)
    : null;

  const firstUnsavedSetIndex = currentDrafts.findIndex((_, idx) => !currentSavedSets[idx + 1]);
  const activeSaveSetNumber = activeSaveIndex !== null ? activeSaveIndex + 1 : null;
  const activeSaveIsSaved =
    activeSaveSetNumber !== null && currentSavedSets[activeSaveSetNumber] === true;
  const activeSaveShouldOverwrite =
    activeSaveSetNumber !== null &&
    activeSaveIsSaved &&
    currentDirtySavedSets[activeSaveSetNumber] === true;

  const formatWeightInput = (kg: number): string => {
    const converted = convertFromKg(kg);
    return Number.isInteger(converted) ? String(converted) : converted.toFixed(1);
  };

  const hydrateDrafts = (exercise: Exercise, savedSets: WorkoutSessionSet[]) => {
    const drafts: SetDraft[] = Array.from({ length: exercise.sets }).map((_, idx) => {
      const found = savedSets.find((set) => set.set_number === idx + 1);
      return {
        weight: found ? formatWeightInput(found.weight) : '',
        reps: found ? String(found.reps) : '',
      };
    });

    setSetDraftsByExercise((prev) => ({
      ...prev,
      [exercise.id]: drafts,
    }));

    const tracking: SavedSetTracking = {};
    savedSets.forEach((set) => {
      tracking[set.set_number] = true;
    });

    setSavedSetsByExercise((prev) => ({
      ...prev,
      [exercise.id]: tracking,
    }));

    setSavedDraftBaselinesByExercise((prev) => ({
      ...prev,
      [exercise.id]: drafts,
    }));

    setDirtySavedSetsByExercise((prev) => ({
      ...prev,
      [exercise.id]: {},
    }));

    const firstUnsavedIndex = drafts.findIndex((_, idx) => !tracking[idx + 1]);
    setLastEditedSetIndexByExercise((prev) => ({
      ...prev,
      [exercise.id]: firstUnsavedIndex >= 0 ? firstUnsavedIndex : drafts.length > 0 ? drafts.length - 1 : null,
    }));
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

  const loadContext = async () => {
    setLoading(true);
    try {
      const activeSession = await api.getActiveSession();
      setSession(activeSession);

      if (!activeSession) {
        setWorkout(null);
        setExercises([]);
        return;
      }

      const currentWorkout = await loadWorkoutById(activeSession.workout_id);
      setWorkout(currentWorkout);

      const workoutExercises = await api.getExercises(activeSession.workout_id);
      setExercises(workoutExercises);

      const index = Math.min(
        activeSession.current_exercise_index || 0,
        Math.max(workoutExercises.length - 1, 0)
      );
      setCurrentIndex(index);

      if (workoutExercises[index]) {
        const savedSets = await api.getSessionSets(activeSession.id, workoutExercises[index].id);
        hydrateDrafts(workoutExercises[index], savedSets);
      }

      const startedAtMs = parseApiDate(activeSession.started_at);
      const nowMs = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((nowMs - startedAtMs) / 1000)));
    } catch (err) {
      console.error('Failed to load active workout:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContext();
  }, []);

  useEffect(() => {
    if (!session) return;

    const timer = setInterval(() => {
      const startedAtMs = parseApiDate(session.started_at);
      const nowMs = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((nowMs - startedAtMs) / 1000)));
    }, 1000);

    return () => clearInterval(timer);
  }, [session?.started_at]);

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
    const loadCurrentExerciseSets = async () => {
      if (!session || !currentExercise) return;
      if (setDraftsByExercise[currentExercise.id]) return;

      try {
        const savedSets = await api.getSessionSets(session.id, currentExercise.id);
        hydrateDrafts(currentExercise, savedSets);
      } catch (err) {
        console.error('Failed to load sets for current exercise:', err);
      }
    };

    loadCurrentExerciseSets();
  }, [session?.id, currentExercise?.id]);

  const handleSetFieldChange = (
    exerciseId: string,
    index: number,
    field: keyof SetDraft,
    value: string
  ) => {
    setLastEditedSetIndexByExercise((prev) => ({
      ...prev,
      [exerciseId]: index,
    }));

    setSetDraftsByExercise((prev) => {
      const current = prev[exerciseId] ?? [];
      const next = current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      );

      const setNumber = index + 1;
      if (savedSetsByExercise[exerciseId]?.[setNumber]) {
        const baseline = savedDraftBaselinesByExercise[exerciseId]?.[index];
        const isDirty = hasDraftChanged(next[index], baseline);
        setDirtySavedSetsByExercise((prevDirty) => ({
          ...prevDirty,
          [exerciseId]: {
            ...(prevDirty[exerciseId] ?? {}),
            [setNumber]: isDirty,
          },
        }));
      }

      return { ...prev, [exerciseId]: next };
    });
  };

  const handleSaveSet = async (index: number) => {
    if (!session || !currentExercise) return;

    const drafts = setDraftsByExercise[currentExercise.id] ?? [];
    const draft = drafts[index];
    if (!draft) return;

    const reps = Number(draft.reps);
    const weightInput = Number(draft.weight.replace(',', '.'));

    if (!draft.weight.trim() || Number.isNaN(weightInput) || weightInput <= 0 || Number.isNaN(reps) || reps <= 0) {
      Alert.alert('Invalid set', 'Please provide valid weight and reps.');
      return;
    }

    try {
      setSavingSet(index);
      await api.saveWorkoutSet(session.id, {
        exercise_id: currentExercise.id,
        set_number: index + 1,
        weight: Number(convertToKg(weightInput).toFixed(2)),
        reps,
      });

      setSavedSetsByExercise((prev) => ({
        ...prev,
        [currentExercise.id]: {
          ...(prev[currentExercise.id] ?? {}),
          [index + 1]: true,
        },
      }));

      setSavedDraftBaselinesByExercise((prev) => ({
        ...prev,
        [currentExercise.id]: (prev[currentExercise.id] ?? drafts).map((row, rowIndex) =>
          rowIndex === index ? { ...draft } : row
        ),
      }));

      setDirtySavedSetsByExercise((prev) => ({
        ...prev,
        [currentExercise.id]: {
          ...(prev[currentExercise.id] ?? {}),
          [index + 1]: false,
        },
      }));

      setRestSecondsLeft(currentExercise.rest_seconds);
    } catch (err) {
      console.error('Failed to save workout set:', err);
      Alert.alert('Error', 'Failed to save set');
    } finally {
      setSavingSet(null);
    }
  };

  const handleNavigateExercise = async (direction: 'prev' | 'next') => {
    if (!session || exercises.length === 0) return;

    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= exercises.length) return;

    setCurrentIndex(nextIndex);

    try {
      await api.updateCurrentExerciseIndex(session.id, nextIndex);

      const nextExercise = exercises[nextIndex];
      if (nextExercise && !setDraftsByExercise[nextExercise.id]) {
        const savedSets = await api.getSessionSets(session.id, nextExercise.id);
        hydrateDrafts(nextExercise, savedSets);
      }
    } catch (err) {
      console.error('Failed to update current exercise index:', err);
    }
  };

  const handleCancelWorkout = () => {
    if (!session) return;

    Alert.alert('Cancel workout', 'Cancel this active workout?', [
      { text: 'Back', style: 'cancel' },
      {
        text: 'Cancel workout',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.cancelWorkoutSession(session.id);
            await loadContext();
          } catch (err) {
            console.error('Failed to cancel workout:', err);
            Alert.alert('Error', 'Failed to cancel workout');
          }
        },
      },
    ]);
  };

  const handleFinishWorkout = () => {
    if (!session) return;

    Alert.alert('Finish workout', 'Finish this active workout?', [
      { text: 'Back', style: 'cancel' },
      {
        text: 'Finish',
        onPress: async () => {
          try {
            await api.finishWorkoutSession(session.id);
            await loadContext();
          } catch (err) {
            console.error('Failed to finish workout:', err);
            Alert.alert('Error', 'Failed to finish workout');
          }
        },
      },
    ]);
  };

  const title = useMemo(() => {
    if (!workout) return 'Active Workout';
    return `${workout.name} (${formatDuration(elapsedSeconds)})`;
  }, [workout?.name, elapsedSeconds]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={themeColors.accent} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No Active Workout</Text>
        <Text style={styles.emptyText}>Start one from a workout details page.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerActionsRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelWorkout}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.finishButton} onPress={handleFinishWorkout}>
            <Text style={styles.finishButtonText}>Finish</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.list}>
        {!currentExercise ? (
          <Text style={styles.emptyText}>No exercises found for this workout.</Text>
        ) : (
          <View style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{currentExercise.name}</Text>
            <Text style={styles.exerciseMeta}>Rest: {currentExercise.rest_seconds}s</Text>

            <View style={styles.setsHeaderRow}>
              <Text style={styles.setsHeaderCell}>Set</Text>
              <Text style={styles.setsHeaderCell}>Weight ({unit})</Text>
              <Text style={styles.setsHeaderCell}>Reps</Text>
              <Text style={styles.setsStatusHeaderCell}></Text>
            </View>

            {currentDrafts.map((draft, setIndex) => {
              const setNumber = setIndex + 1;
              const isSaved = currentSavedSets[setNumber] === true;
              const canEdit = firstUnsavedSetIndex === setIndex || isSaved;
              const isLocked = !canEdit && !isSaved;

              return (
              <View
                key={`${currentExercise.id}-${setIndex}`}
                style={[
                  styles.setRow,
                  isLocked && styles.setRowLocked,
                ]}
              >
                <Text style={styles.setCellLabel}>{setIndex + 1}</Text>
                <TextInput
                  style={[
                    styles.setInput,
                    isLocked && styles.setInputLocked,
                  ]}
                  value={draft.weight}
                  onFocus={() =>
                    setLastEditedSetIndexByExercise((prev) => ({
                      ...prev,
                      [currentExercise.id]: setIndex,
                    }))
                  }
                  keyboardType="decimal-pad"
                  onChangeText={(value) =>
                    handleSetFieldChange(currentExercise.id, setIndex, 'weight', value)
                  }
                  editable={canEdit}
                />
                <TextInput
                  style={[
                    styles.setInput,
                    isLocked && styles.setInputLocked,
                  ]}
                  value={draft.reps}
                  onFocus={() =>
                    setLastEditedSetIndexByExercise((prev) => ({
                      ...prev,
                      [currentExercise.id]: setIndex,
                    }))
                  }
                  keyboardType="number-pad"
                  onChangeText={(value) =>
                    handleSetFieldChange(currentExercise.id, setIndex, 'reps', value)
                  }
                  editable={canEdit}
                />
                <View style={styles.setStatusCell}>
                  <Text style={styles.setStatusText}>{isSaved ? '✓' : ''}</Text>
                </View>
              </View>
              );
            })}

          </View>
        )}
      </ScrollView>

      {currentExercise ? (
        <View style={styles.bottomActionsWrap}>
          <Text style={styles.restTimerText}>
            {restSecondsLeft > 0 ? `Rest: ${restSecondsLeft}s` : 'Rest: Ready'}
          </Text>
          <View style={styles.bottomActionsBar}>
            <TouchableOpacity
              style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
              onPress={() => handleNavigateExercise('prev')}
              disabled={currentIndex === 0}
            >
              <Text style={styles.navButtonText}>Previous</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveSetButton,
                activeSaveShouldOverwrite && styles.saveSetButtonOverwrite,
              ]}
              onPress={() => activeSaveIndex !== null && handleSaveSet(activeSaveIndex)}
              disabled={activeSaveIndex === null || savingSet === activeSaveIndex}
            >
              <Text style={styles.saveSetButtonText}>
                {activeSaveSetNumber === null
                  ? 'Save'
                  : savingSet === activeSaveIndex
                    ? `Saving #${activeSaveSetNumber}...`
                    : activeSaveShouldOverwrite
                      ? `Overwrite #${activeSaveSetNumber}`
                      : `Save #${activeSaveSetNumber}`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButton,
                currentIndex >= exercises.length - 1 && styles.navButtonDisabled,
              ]}
              onPress={() => handleNavigateExercise('next')}
              disabled={currentIndex >= exercises.length - 1}
            >
              <Text style={styles.navButtonText}>Next</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.exerciseProgressRow}>
            {exercises.map((exercise, index) => (
              <View
                key={exercise.id}
                style={[
                  styles.exerciseProgressMark,
                  index === currentIndex && styles.exerciseProgressMarkActive,
                ]}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const createStyles = (themeColors: typeof colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: themeColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: themeColors.surface,
    borderBottomColor: themeColors.border,
    borderBottomWidth: 1,
    padding: 16,
  },
  headerActionsRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: themeColors.textStrong,
    fontSize: 22,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  restTimerText: {
    color: themeColors.textMuted,
    fontSize: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  exerciseCard: {
    backgroundColor: themeColors.surface,
    borderColor: themeColors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 14,
    marginBottom: 6,
    ...shadow.card,
  },
  exerciseName: {
    color: themeColors.textStrong,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  exerciseMeta: {
    color: themeColors.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  setsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    paddingTop: 8,
    marginBottom: 6,
    gap: 6,
  },
  setsHeaderCell: {
    flex: 1,
    color: themeColors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  setsStatusHeaderCell: {
    width: 24,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  setRowLocked: {
    opacity: 0.45,
  },
  setCellLabel: {
    width: 30,
    color: themeColors.textStrong,
    fontWeight: '700',
    textAlign: 'center',
  },
  setInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: themeColors.textStrong,
    backgroundColor: themeColors.background,
  },
  setInputLocked: {
    backgroundColor: themeColors.accentSoft,
  },
  setStatusCell: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setStatusText: {
    color: themeColors.accent,
    fontWeight: '700',
    fontSize: 16,
  },
  saveSetButton: {
    backgroundColor: themeColors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 10,
    flex: 1.1,
    alignItems: 'center',
  },
  saveSetButtonOverwrite: {
    backgroundColor: themeColors.danger,
  },
  saveSetButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  navButton: {
    flex: 1,
    backgroundColor: themeColors.accentSoft,
    borderWidth: 1,
    borderColor: themeColors.accent,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.45,
  },
  navButtonText: {
    color: themeColors.accent,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  bottomActionsWrap: {
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    backgroundColor: themeColors.surface,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  bottomActionsBar: {
    flexDirection: 'row',
    gap: 10,
  },
  exerciseProgressRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  exerciseProgressMark: {
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: themeColors.border,
  },
  exerciseProgressMarkActive: {
    height: 5,
    backgroundColor: themeColors.accent,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: themeColors.danger,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth: 92,
  },
  cancelButtonText: {
    color: themeColors.danger,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  finishButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: themeColors.success,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth: 92,
  },
  finishButtonText: {
    color: themeColors.success,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  emptyTitle: {
    color: themeColors.textStrong,
    fontSize: 22,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyText: {
    color: themeColors.textMuted,
    marginTop: 10,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});

export default ActiveWorkoutScreen;
