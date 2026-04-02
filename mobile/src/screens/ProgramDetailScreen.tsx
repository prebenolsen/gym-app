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
  const [exercisesByWorkout, setExercisesByWorkout] = useState<Record<string, Exercise[]>>({});
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
      const updated = await api.favoriteProgramId(program.id, !program.is_favorite_program);
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
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.favoriteButton} onPress={handleToggleFavorite}>
            <Text style={styles.favoriteButtonText}>
              {program?.is_favorite_program ? '★ Favorited' : '☆ Add Favorite'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteProgram}>
            <Text style={styles.deleteButtonText}>Delete Program</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Workouts</Text>
          <View style={styles.sectionActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('WorkoutsCatalog', { programId })}
              style={styles.btnSecondary}
            >
              <Text style={styles.btnSecondaryText}>Browse Templates</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreateWorkout}
              style={styles.btnPrimary}
            >
              <Text style={styles.btnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
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

const createStyles = (themeColors: typeof colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  header: {
    backgroundColor: themeColors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: themeColors.textStrong,
    textTransform: 'uppercase',
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: themeColors.textStrong,
    borderBottomWidth: 2,
    borderBottomColor: themeColors.accent,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  favoriteButton: {
    backgroundColor: themeColors.accentSoft,
    borderWidth: 1,
    borderColor: themeColors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  favoriteButtonText: {
    color: themeColors.accent,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  deleteButton: {
    backgroundColor: themeColors.danger,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
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
    gap: 8,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 8,
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
  sectionTitle: {
    fontSize: 18,
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
  list: {
    flex: 1,
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
    textTransform: 'uppercase',
  },
  exerciseItem: {
    fontSize: 13,
    color: themeColors.textMuted,
    lineHeight: 20,
    textTransform: 'uppercase',
  },
  exerciseEmpty: {
    fontSize: 13,
    color: themeColors.textMuted,
    fontStyle: 'italic',
    textTransform: 'uppercase',
  },
});

export default ProgramDetailScreen;
