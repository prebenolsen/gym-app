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
import {
  type Exercise,
  type MuscleGroup,
  exercises as exerciseCatalog,
} from '@gym-app/shared';
import NumberSpinner from '../components/NumberSpinner';
import { useApi } from '../hooks/useApi';
import { colors, radius, shadow } from '../theme';
import { usePreferences } from '../context/PreferencesContext';
import MuscleMapThumb from '../components/MuscleMapThumb';

const normalizeExerciseName = (name: string): string =>
  name.trim().toLowerCase().replace(/\s+/g, ' ');

const EXERCISE_NAME_TO_MUSCLE_GROUP = new Map<string, MuscleGroup>(
  exerciseCatalog.map((exercise) => [
    normalizeExerciseName(exercise.name),
    exercise.muscleGroup,
  ]),
);

const getExerciseMuscleGroup = (name: string): MuscleGroup | undefined =>
  EXERCISE_NAME_TO_MUSCLE_GROUP.get(normalizeExerciseName(name));

const WorkoutDetailScreen = ({ route, navigation }: any) => {
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);
  const { programId, workoutId, workoutName } = route.params;
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(workoutName);

  const api = useApi();

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const data = await api.getExercises(workoutId);
      setExercises(data);
    } catch (err) {
      console.error('Failed to fetch exercises:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExercise = async () => {
    if (!newExerciseName.trim()) return;

    try {
      const newExercise = await api.createExercise(workoutId, {
        name: newExerciseName,
        sets: 4,
        rest_seconds: 120,
      });

      setExercises([...exercises, newExercise]);
      setNewExerciseName('');
    } catch (err) {
      console.error('Failed to add exercise:', err);
      Alert.alert('Error', 'Failed to add exercise');
    }
  };

  const handleUpdateExercise = async (
    id: string,
    updates: { sets?: number; rest_seconds?: number },
  ) => {
    try {
      const updated = await api.updateExercise(id, updates);
      setExercises(exercises.map((e) => (e.id === id ? updated : e)));
    } catch (err) {
      console.error('Failed to update exercise:', err);
    }
  };

  const handleDeleteExercise = async (id: string) => {
    Alert.alert('Delete Exercise', 'Delete this exercise?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await api.deleteExercise(id);
            setExercises(exercises.filter((e) => e.id !== id));
          } catch (err) {
            console.error('Failed to delete exercise:', err);
            Alert.alert('Error', 'Failed to delete exercise');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const handleStartWorkout = async () => {
    try {
      await api.startWorkoutSession(workoutId);
      const parentNav = navigation.getParent?.();
      if (parentNav?.navigate) {
        parentNav.navigate('ActiveWorkoutStack', { screen: 'ActiveWorkout' });
      }
    } catch (err) {
      const apiErr = err as Error & { status?: number };
      if (apiErr.status === 409) {
        Alert.alert(
          'Active Workout Exists',
          'You already have an active workout session. Resume it or replace it with this workout?',
          [
            {
              text: 'Resume',
              onPress: () => {
                const parentNav = navigation.getParent?.();
                if (parentNav?.navigate) {
                  parentNav.navigate('ActiveWorkoutStack', { screen: 'ActiveWorkout' });
                }
              },
            },
            {
              text: 'Replace',
              style: 'destructive',
              onPress: async () => {
                try {
                  const activeSession = await api.getActiveSession();
                  if (activeSession) {
                    await api.cancelWorkoutSession(activeSession.id);
                  }
                  await api.startWorkoutSession(workoutId);
                  const parentNav = navigation.getParent?.();
                  if (parentNav?.navigate) {
                    parentNav.navigate('ActiveWorkoutStack', { screen: 'ActiveWorkout' });
                  }
                } catch (replaceErr) {
                  console.error('Failed to replace active workout session:', replaceErr);
                  Alert.alert('Error', 'Failed to replace active workout session');
                }
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
        return;
      }

      console.error('Failed to start workout session:', err);
      Alert.alert('Error', 'Failed to start workout session');
    }
  };

  const handleDeleteWorkout = async () => {
    Alert.alert('Delete Workout', `Delete "${editName}" and all its exercises?`, [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await api.deleteWorkout(workoutId);
            navigation.goBack();
          } catch (err) {
            console.error('Failed to delete workout:', err);
            Alert.alert('Error', 'Failed to delete workout');
          }
        },
        style: 'destructive',
      },
    ]);
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
        {/*<Text style={styles.sectionTitle}>Exercises</Text>*/}

        <ScrollView style={styles.list}>
          {exercises.length > 0 &&
            exercises.map((exercise) => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseHeaderLeft}>
                    <MuscleMapThumb
                      group={getExerciseMuscleGroup(exercise.name)}
                      size={54}
                      mutedColor={themeColors.textMuted}
                      highlightColor={themeColors.accent}
                    />
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteExercise(exercise.id)}
                    style={styles.btnSmallDelete}
                  >
                    <Text style={styles.btnSmallText}>-</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.exerciseControls}>
                  <View style={styles.exerciseControlsRow}>
                    <View style={{ flex: 1 }}>
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
                    </View>

                    <View style={{ flex: 1 }}>
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
                    </View>
                  </View>

                </View>
              </View>
            ))}


          <View style={styles.addExercise}>
          <TextInput
            style={styles.input}
            placeholder="Add a custom exercise"
            placeholderTextColor={themeColors.textMuted}
            value={newExerciseName}
            onChangeText={setNewExerciseName}
          />
          <TouchableOpacity
            onPress={handleAddExercise}
            style={styles.btnPrimary}
            activeOpacity={0.7}
          >
            <Text style={styles.btnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate('ExercisesCatalog', {
                programId,
                workoutId,
                workoutName,
              })
            }
            style={[styles.btnPrimary, styles.catalogButton]}
          >
            <Text style={styles.btnText}>Add exercises from the catalog</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDeleteWorkout}
            style={[styles.deleteButton, styles.deleteButtonInList]}
          >
            <Text style={styles.deleteButtonText}>Delete Workout</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.bottomActions}>
        <TouchableOpacity
          onPress={handleStartWorkout}
          style={styles.startWorkoutButton}
          activeOpacity={0.8}
        >
          <Text style={styles.startWorkoutButtonText}>Start Workout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (themeColors: typeof colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    header: {
      backgroundColor: themeColors.surface,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: themeColors.textStrong,
      textTransform: 'capitalize',
    },
    titleInput: {
      fontSize: 24,
      fontWeight: 'bold',
      color: themeColors.textStrong,
      borderBottomWidth: 2,
      borderBottomColor: themeColors.accent,
      paddingBottom: 8,
      textTransform: 'capitalize',
    },
    startWorkoutButton: {
      backgroundColor: themeColors.accent,
      borderRadius: radius.sm,
      width: '100%',
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: 'center',
    },
    startWorkoutButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 14,
      textTransform: 'capitalize',
    },
    section: {
      flex: 1,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: themeColors.textStrong,
      marginBottom: 16,
      textTransform: 'capitalize',
    },
    addExercise: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    input: {
      flex: 1,
      padding: 10,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.sm,
      color: themeColors.textStrong,
      backgroundColor: themeColors.surface,
    },
    btnPrimary: {
      backgroundColor: themeColors.accent,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: radius.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    catalogButton: {
      marginTop: 8,
      marginBottom: 16,
    },
    btnText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 12,
      textTransform: 'capitalize',
    },
    list: {
      flex: 1,
    },
    noData: {
      padding: 16,
      backgroundColor: themeColors.accentSoft,
      borderRadius: radius.sm,
      color: themeColors.textStrong,
      textAlign: 'center',
    },
    exerciseCard: {
      backgroundColor: themeColors.surface,
      borderRadius: radius.md,
      borderLeftWidth: 4,
      borderLeftColor: themeColors.accent,
      borderWidth: 1,
      borderColor: themeColors.border,
      padding: 16,
      marginBottom: 12,
      ...shadow.card,
    },
    exerciseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    exerciseHeaderLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingRight: 10,
    },
    exerciseName: {
      fontSize: 16,
      fontWeight: '600',
      color: themeColors.textStrong,
      flex: 1,
      textTransform: 'capitalize',
    },
    btnSmallDelete: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: themeColors.danger,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.sm,
    },
    btnSmallText: {
      color: themeColors.danger,
      fontWeight: '600',
      fontSize: 14,
      textTransform: 'capitalize',
    },
    exerciseControls: {
      gap: 12,
    },
    deleteButton: {
      backgroundColor: themeColors.danger,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: radius.sm,
      alignItems: 'center',
    },
    deleteButtonInList: {
      marginTop: 0,
      marginBottom: 20,
    },
    deleteButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 12,
      textTransform: 'capitalize',
    },
    bottomActions: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 18,
      backgroundColor: themeColors.background,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
    },
    exerciseControlsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
  });

export default WorkoutDetailScreen;
