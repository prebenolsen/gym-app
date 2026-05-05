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
import { type Workout, type Exercise, type Program } from '@gym-app/shared';
import { colors, radius, shadow } from '../theme';
import { useApi } from '../hooks/useApi';
import { usePreferences } from '../context/PreferencesContext';

const ProgramDetailScreen = ({ route, navigation }: any) => {
  const { programId, programName } = route.params;
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);
  const [program, setProgram] = useState<Program | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercisesByWorkout, setExercisesByWorkout] = useState<
    Record<string, Exercise[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(programName);

  const api = useApi();

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    setLoading(true);
    try {
      const programs = await api.getPrograms();
      const currentProgram = programs.find((p) => p.id === programId) ?? null;
      setProgram(currentProgram);
      if (currentProgram) {
        setEditName(currentProgram.name);
      }

      const data = await api.getWorkouts(programId);
      setWorkouts(data);

      const exercisesResults = await Promise.all(data.map((w) => api.getExercises(w.id)));
      const ebw: Record<string, Exercise[]> = {};
      data.forEach((w, i) => {
        ebw[w.id] = exercisesResults[i];
      });
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

  const handleAddWorkout = () => {
    Alert.alert('Add Workout', 'Choose how you want to add a workout', [
      {
        text: 'From Templates',
        onPress: () => navigation.navigate('WorkoutsCatalog', { programId }),
      },
      {
        text: 'Create Empty',
        onPress: () => {
          void handleCreateWorkout();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleRenameProgram = async () => {
    const newName = editName.trim();
    setEditing(false);
    if (!program || !newName) {
      setEditName(program?.name ?? programName);
      return;
    }

    if (newName === program.name) return;

    try {
      const updated = await api.updateProgram(program.id, { name: newName });
      setProgram(updated);
      setEditName(updated.name);
    } catch (err) {
      console.error('Failed to rename program:', err);
      Alert.alert('Error', 'Failed to rename program');
      setEditName(program.name);
    }
  };

  const handleToggleFavorite = async () => {
    if (!program) return;

    try {
      const updated = await api.favoriteProgramId(
        program.id,
        !program.is_favorite_program,
      );
      setProgram(updated);
    } catch (err) {
      console.error('Failed to toggle favorite program:', err);
      Alert.alert('Error', 'Failed to update favorite');
    }
  };

  const handleDeleteProgram = () => {
    if (!program) return;

    Alert.alert('Delete Program', `Delete "${program.name}" and all its workouts?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteProgram(program.id);
            navigation.goBack();
          } catch (err) {
            console.error('Failed to delete program:', err);
            Alert.alert('Error', 'Failed to delete program');
          }
        },
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
        <View style={styles.titleRow}>
          <TouchableOpacity
            style={styles.favoriteStarButton}
            onPress={handleToggleFavorite}
            accessibilityRole="button"
            accessibilityLabel="Toggle favorite program"
          >
            <Text style={styles.favoriteStarText}>
              {program?.is_favorite_program ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
          {editing ? (
            <TextInput
              style={styles.titleInput}
              value={editName}
              onChangeText={setEditName}
              onBlur={handleRenameProgram}
              autoFocus
              onSubmitEditing={handleRenameProgram}
            />
          ) : (
            <Text style={styles.title} onPress={() => setEditing(true)}>
              {editName}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Workouts</Text>
        </View>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {workouts.length === 0 ? (
            <Text style={styles.noData}>No workouts yet. Add one to get started!</Text>
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
                    <Text key={ex.id} style={styles.exerciseItem}>
                      • {ex.name}
                    </Text>
                  ))
                )}
              </TouchableOpacity>
            ))
          )}

          <TouchableOpacity onPress={handleAddWorkout} style={styles.addWorkoutButton}>
            <Text style={styles.btnText}>+ Add</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, styles.deleteButtonInList]}
            onPress={handleDeleteProgram}
          >
            <Text style={styles.deleteButtonText}>Delete Program</Text>
          </TouchableOpacity>
        </ScrollView>
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
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    favoriteStarButton: {
      padding: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    favoriteStarText: {
      color: themeColors.accent,
      fontSize: 27,
      fontWeight: '800',
      lineHeight: 30,
    },
    title: {
      flex: 1,
      fontSize: 24,
      fontWeight: 'bold',
      color: themeColors.textStrong,
      textTransform: 'capitalize',
    },
    titleInput: {
      flex: 1,
      fontSize: 24,
      fontWeight: 'bold',
      color: themeColors.textStrong,
      borderBottomWidth: 2,
      borderBottomColor: themeColors.accent,
      paddingBottom: 8,
      textTransform: 'capitalize',
    },
    deleteButton: {
      backgroundColor: themeColors.danger,
      borderRadius: radius.sm,
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: 'center',
    },
    
    deleteButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 13,
      textTransform: 'capitalize',
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
      flexWrap: 'wrap',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: themeColors.textStrong,
      textTransform: 'capitalize',
    },
    addWorkoutButton: {
      backgroundColor: themeColors.accent,
      width: '100%',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: radius.sm,
      alignItems: 'center',
      marginTop: 8,
    },
    btnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 14,
      textTransform: 'capitalize',
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingBottom: 20,
    },
    noData: {
      padding: 16,
      backgroundColor: themeColors.accentSoft,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: themeColors.border,
      color: themeColors.textStrong,
      textAlign: 'center',
      textTransform: 'capitalize',
    },
    workoutCard: {
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
    workoutName: {
      fontSize: 16,
      fontWeight: '600',
      color: themeColors.textStrong,
      marginBottom: 6,
      textTransform: 'capitalize',
    },
    exerciseItem: {
      fontSize: 13,
      color: themeColors.textMuted,
      lineHeight: 20,
      textTransform: 'capitalize',
    },
    exerciseEmpty: {
      fontSize: 13,
      color: themeColors.textMuted,
      fontStyle: 'italic',
      textTransform: 'capitalize',
    },
    deleteButtonInList: {
      marginTop: 10,
      marginBottom: 8,
    },
  });

export default ProgramDetailScreen;
