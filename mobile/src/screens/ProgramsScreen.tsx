import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ApiClient, type Program, type Workout } from '@gym-app/shared';
import { colors, radius, shadow } from '../theme';

const ProgramsScreen = ({ navigation }: any) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [workoutsByProgram, setWorkoutsByProgram] = useState<Record<string, Workout[]>>({});
  const [exerciseCountByWorkout, setExerciseCountByWorkout] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const api = new ApiClient('http://localhost:3000');

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const data = await api.getPrograms();
      setPrograms(data);

      const workoutsResults = await Promise.all(data.map((p) => api.getWorkouts(p.id)));
      const wbp: Record<string, Workout[]> = {};
      data.forEach((p, i) => { wbp[p.id] = workoutsResults[i]; });
      setWorkoutsByProgram(wbp);

      const allWorkouts = workoutsResults.flat();
      const exercisesResults = await Promise.all(allWorkouts.map((w) => api.getExercises(w.id)));
      const ecbw: Record<string, number> = {};
      allWorkouts.forEach((w, i) => { ecbw[w.id] = exercisesResults[i].length; });
      setExerciseCountByWorkout(ecbw);
    } catch (err) {
      console.error('Failed to fetch programs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProgram = async () => {
    try {
      const newProgram = await api.createProgram();
      setPrograms([...programs, newProgram]);
    } catch (err) {
      console.error('Failed to create program:', err);
      Alert.alert('Error', 'Failed to create program');
    }
  };

  const handleDeleteProgram = async (id: string, name: string) => {
    Alert.alert(
      'Delete Program',
      `Delete "${name}" and all its workouts?`,
      [
        { text: 'Cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await api.deleteProgram(id);
              setPrograms(programs.filter((p) => p.id !== id));
            } catch (err) {
              console.error('Failed to delete program:', err);
              Alert.alert('Error', 'Failed to delete program');
            }
          },
          style: 'destructive',
        },
      ]
    );
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
        <Text style={styles.title}>Programs</Text>
        <TouchableOpacity
          onPress={handleCreateProgram}
          style={styles.btnPrimary}
        >
          <Text style={styles.btnText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {programs.length === 0 ? (
          <Text style={styles.noData}>
            No programs yet. Create one to get started!
          </Text>
        ) : (
          programs.map((program) => (
            <View key={program.id} style={styles.programCard}>
              <View style={styles.programHeader}>
                <TouchableOpacity
                  style={styles.programNameArea}
                  onPress={() =>
                    navigation.navigate('ProgramDetail', {
                      programId: program.id,
                      programName: program.name,
                    })
                  }
                >
                  <Text style={styles.programName}>{program.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteProgram(program.id, program.name)}
                  style={styles.btnSmall}
                >
                  <Text style={styles.btnSmallText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.workoutsList}>
                {(workoutsByProgram[program.id] ?? []).length === 0 ? (
                  <Text style={styles.noWorkouts}>No workouts yet</Text>
                ) : (
                  (workoutsByProgram[program.id] ?? []).map((workout) => {
                    const count = exerciseCountByWorkout[workout.id] ?? 0;
                    return (
                      <TouchableOpacity
                        key={workout.id}
                        style={styles.workoutRow}
                        onPress={() =>
                          navigation.navigate('WorkoutDetail', {
                            programId: program.id,
                            workoutId: workout.id,
                            workoutName: workout.name,
                          })
                        }
                      >
                        <Text style={styles.workoutRowName}>{workout.name}</Text>
                        <Text style={styles.workoutRowCount}>
                          🏋️ {count} {count === 1 ? 'exercise' : 'exercises'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textStrong,
    textTransform: 'uppercase',
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
    textTransform: 'uppercase',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  noData: {
    padding: 16,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textStrong,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  programCard: {
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
  programHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  programNameArea: {
    flex: 1,
  },
  programName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textStrong,
    textTransform: 'uppercase',
  },
  workoutsList: {
    marginTop: 4,
  },
  workoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 6,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  workoutRowName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textStrong,
    textTransform: 'uppercase',
  },
  workoutRowCount: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  noWorkouts: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 4,
    paddingHorizontal: 12,
    textTransform: 'uppercase',
  },
  btnSmall: {
    backgroundColor: colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  btnSmallText: {
    color: colors.surface,
    fontWeight: '600',
    fontSize: 14,
    textTransform: 'uppercase',
  },
});

export default ProgramsScreen;
