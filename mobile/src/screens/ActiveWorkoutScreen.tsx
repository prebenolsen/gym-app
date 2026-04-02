import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { type Exercise, type Workout, type WorkoutSession } from '@gym-app/shared';
import { useApi } from '../hooks/useApi';
import { colors, radius, shadow } from '../theme';

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

const ActiveWorkoutScreen = ({ navigation }: any) => {
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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
        <ActivityIndicator size="large" color={colors.accent} />
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
      </View>

      <ScrollView style={styles.list}>
        {exercises.map((exercise, index) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>
              {index + 1}. {exercise.name}
            </Text>
            <Text style={styles.exerciseMeta}>
              Sets: {exercise.sets} | Rest: {exercise.rest_seconds}s
            </Text>
          </View>
        ))}

        {exercises.length === 0 && (
          <Text style={styles.emptyText}>No exercises found for this workout.</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    padding: 16,
  },
  title: {
    color: colors.textStrong,
    fontSize: 22,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    ...shadow.card,
  },
  exerciseName: {
    color: colors.textStrong,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  exerciseMeta: {
    color: colors.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.danger,
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
    backgroundColor: colors.success,
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
    color: colors.textStrong,
    fontSize: 22,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyText: {
    color: colors.textMuted,
    marginTop: 10,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});

export default ActiveWorkoutScreen;
