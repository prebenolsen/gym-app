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
import { type Program, type Workout } from '@gym-app/shared';
import { colors, radius, shadow } from '../theme';
import { useApi } from '../hooks/useApi';
import { usePreferences } from '../context/PreferencesContext';

const ProgramsScreen = ({ navigation }: any) => {
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [workoutsByProgram, setWorkoutsByProgram] = useState<Record<string, Workout[]>>({});
  const [exerciseCountByWorkout, setExerciseCountByWorkout] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showMessage, setShowMessage] = useState(false);

  const api = useApi();

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (showMessage) {
      const timer = setTimeout(() => setShowMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showMessage]);

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
      setShowMessage(true);
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
        <ActivityIndicator size="large" color={themeColors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Programs</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ProgramsCatalog')}
            style={styles.btnSecondary}
          >
            <Text style={styles.btnSecondaryText}>Templates</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCreateProgram}
            style={styles.btnPrimary}
          >
            <Text style={styles.btnText}>+ Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showMessage && (
        <TouchableOpacity
          style={styles.notification}
          onPress={() => setShowMessage(false)}
          activeOpacity={0.7}
        >
          <Text style={styles.notificationText}>Program created successfully!</Text>
        </TouchableOpacity>
      )}

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
                        {count} {count === 1 ? 'exercise' : 'exercises'}
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

const createStyles = (themeColors: typeof colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: themeColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: themeColors.textStrong,
    textTransform: 'uppercase',
  },
  btnPrimary: {
    backgroundColor: themeColors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  btnSecondary: {
    backgroundColor: themeColors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: themeColors.accent,
  },
  btnSecondaryText: {
    color: themeColors.accent,
    fontWeight: '600',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  noData: {
    padding: 16,
    backgroundColor: themeColors.accentSoft,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
    color: themeColors.textStrong,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  programCard: {
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: themeColors.accent,
    borderWidth: 1,
    borderColor: themeColors.border,
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
    color: themeColors.textStrong,
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
    backgroundColor: themeColors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  workoutRowName: {
    fontSize: 14,
    fontWeight: '500',
    color: themeColors.textStrong,
    textTransform: 'uppercase',
  },
  workoutRowCount: {
    fontSize: 12,
    color: themeColors.textMuted,
    textTransform: 'uppercase',
  },
  noWorkouts: {
    fontSize: 13,
    color: themeColors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 4,
    paddingHorizontal: 12,
    textTransform: 'uppercase',
  },
  btnSmall: {
    backgroundColor: themeColors.danger,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  btnSmallText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  notification: {
    backgroundColor: themeColors.success,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 8,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  notificationText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textTransform: 'uppercase',
  },
});

export default ProgramsScreen;
