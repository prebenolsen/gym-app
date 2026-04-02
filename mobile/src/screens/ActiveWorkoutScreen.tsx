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

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
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
  const [savingSet, setSavingSet] = useState<number | null>(null);
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);

  const currentExercise = exercises[currentIndex] ?? null;

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

      const startedAtMs = new Date(activeSession.started_at).getTime();
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
      const startedAtMs = new Date(session.started_at).getTime();
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
    setSetDraftsByExercise((prev) => {
      const current = prev[exerciseId] ?? [];
      const next = current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      );
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
        {currentExercise ? (
          <Text style={styles.currentExerciseTitle}>
            Exercise {currentIndex + 1}/{exercises.length}: {currentExercise.name}
          </Text>
        ) : null}
        <Text style={styles.restTimerText}>
          {restSecondsLeft > 0 ? `Rest Timer: ${formatDuration(restSecondsLeft)}` : 'Rest Timer: Ready'}
        </Text>
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
              <Text style={styles.setsHeaderCell}>Save</Text>
            </View>

            {(setDraftsByExercise[currentExercise.id] ?? []).map((draft, setIndex) => (
              <View key={`${currentExercise.id}-${setIndex}`} style={styles.setRow}>
                <Text style={styles.setCellLabel}>{setIndex + 1}</Text>
                <TextInput
                  style={styles.setInput}
                  value={draft.weight}
                  keyboardType="decimal-pad"
                  onChangeText={(value) =>
                    handleSetFieldChange(currentExercise.id, setIndex, 'weight', value)
                  }
                />
                <TextInput
                  style={styles.setInput}
                  value={draft.reps}
                  keyboardType="number-pad"
                  onChangeText={(value) =>
                    handleSetFieldChange(currentExercise.id, setIndex, 'reps', value)
                  }
                />
                <TouchableOpacity
                  style={styles.saveSetButton}
                  onPress={() => handleSaveSet(setIndex)}
                  disabled={savingSet === setIndex}
                >
                  <Text style={styles.saveSetButtonText}>
                    {savingSet === setIndex ? '...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.exerciseNavRow}>
              <TouchableOpacity
                style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
                onPress={() => handleNavigateExercise('prev')}
                disabled={currentIndex === 0}
              >
                <Text style={styles.navButtonText}>Previous</Text>
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
          </View>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancelWorkout}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.finishButton} onPress={handleFinishWorkout}>
          <Text style={styles.finishButtonText}>Finish</Text>
        </TouchableOpacity>
      </View>
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
  title: {
    color: themeColors.textStrong,
    fontSize: 22,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  currentExerciseTitle: {
    marginTop: 6,
    color: themeColors.textStrong,
    fontWeight: '600',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  restTimerText: {
    marginTop: 4,
    color: themeColors.textMuted,
    textTransform: 'uppercase',
    fontSize: 12,
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
    marginBottom: 10,
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
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  setCellLabel: {
    width: 24,
    color: themeColors.textStrong,
    fontWeight: '700',
    textAlign: 'center',
  },
  setInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: themeColors.textStrong,
    backgroundColor: themeColors.background,
  },
  saveSetButton: {
    backgroundColor: themeColors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  saveSetButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  exerciseNavRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
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
    fontSize: 12,
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    backgroundColor: themeColors.surface,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: themeColors.danger,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  finishButton: {
    flex: 1,
    backgroundColor: themeColors.success,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  finishButtonText: {
    color: '#fff',
    fontWeight: '700',
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
