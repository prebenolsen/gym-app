import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { ApiClient, type Workout, type Exercise } from '@gym-app/shared';
import { colors, radius, shadow } from '../theme';

const ProgramDetailScreen = ({ route, navigation }: any) => {
  const { programId, programName } = route.params;
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercisesByWorkout, setExercisesByWorkout] = useState<Record<string, Exercise[]>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(programName);

  const api = new ApiClient('http://localhost:3000');

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    setLoading(true);
    try {
      const data = await api.getWorkouts(programId);
      setWorkouts(data);

      const exercisesResults = await Promise.all(data.map((w) => api.getExercises(w.id)));
      const ebw: Record<string, Exercise[]> = {};
      data.forEach((w, i) => { ebw[w.id] = exercisesResults[i]; });
      setExercisesByWorkout(ebw);
    } catch (err) {
      console.error('Failed to fetch workouts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkout = async () => {
    try {
      const newWorkout = await api.createWorkout(programId);
      setWorkouts([...workouts, newWorkout]);
    } catch (err) {
      console.error('Failed to create workout:', err);
      Alert.alert('Error', 'Failed to create workout');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {editing ? (
          <TextInput
            style={styles.titleInput}
            value={editName}
            onChangeText={setEditName}
            onBlur={() => setEditing(false)}
            autoFocus
          />
        ) : (
          <Text style={styles.title} onPress={() => setEditing(true)}>
            {editName}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Workouts</Text>
          <TouchableOpacity
            onPress={handleCreateWorkout}
            style={styles.btnPrimary}
          >
            <Text style={styles.btnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.list}>
          {workouts.length === 0 ? (
            <Text style={styles.noData}>
              No workouts yet. Add one to get started!
            </Text>
          ) : (
            workouts.map((workout) => (
              <TouchableOpacity
                key={workout.id}
                style={styles.workoutCard}
                onPress={() =>
                  navigation.navigate('WorkoutDetail', {
                    programId,
                    workoutId: workout.id,
                    workoutName: workout.name,
                  })
                }
              >
                <Text style={styles.workoutName}>{workout.name}</Text>
                {(exercisesByWorkout[workout.id] ?? []).length === 0 ? (
                  <Text style={styles.exerciseEmpty}>No exercises yet</Text>
                ) : (
                  (exercisesByWorkout[workout.id] ?? []).map((ex) => (
                    <Text key={ex.id} style={styles.exerciseItem}>• {ex.name}</Text>
                  ))
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textStrong,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textStrong,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingBottom: 8,
  },
  section: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textStrong,
  },
  btnPrimary: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  btnText: {
    color: colors.surface,
    fontWeight: '600',
    fontSize: 12,
  },
  list: {
    flex: 1,
  },
  noData: {
    padding: 16,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textStrong,
    textAlign: 'center',
  },
  workoutCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textStrong,
    marginBottom: 6,
  },
  exerciseItem: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
  },
  exerciseEmpty: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});

export default ProgramDetailScreen;
