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
  useColorScheme,
} from 'react-native';
import { ApiClient, type Exercise } from '@gym-app/shared';
import NumberSpinner from '../components/NumberSpinner';
import { colors, radius, shadow } from '../theme';

type ThemeColors = typeof colors;

const darkColors: ThemeColors = {
  accent: '#C65A1E',
  accentPressed: '#A94A16',
  accentSoft: '#35261E',
  background: '#0D0D0D',
  surface: '#1A1A1A',
  border: '#353535',
  textStrong: '#FFFFFF',
  textMuted: '#FFFFFF',
  success: '#4CAF73',
  successSoft: '#18251D',
  danger: '#E45D4F',
  dangerPressed: '#C84D41',
};

const WorkoutDetailScreen = ({ route, navigation }: any) => {
  const scheme = useColorScheme();
  const themeColors = scheme === 'dark' ? darkColors : colors;
  const styles = createStyles(themeColors);
  const { programId, workoutId, workoutName } = route.params;
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(workoutName);

  const api = new ApiClient('http://localhost:3000');

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
        sets: 1,
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
    updates: { sets?: number; rest_seconds?: number }
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

  const handleMoveExercise = async (
    index: number,
    direction: 'up' | 'down'
  ) => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === exercises.length - 1)
    ) {
      return;
    }

    const newExercises = [...exercises];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newExercises[index], newExercises[targetIndex]] = [
      newExercises[targetIndex],
      newExercises[index],
    ];

    setExercises(newExercises);

    try {
      const orderData = newExercises.map((e, idx) => ({
        id: e.id,
        order: idx + 1,
      }));
      await api.reorderExercises(workoutId, orderData);
    } catch (err) {
      console.error('Failed to reorder exercises:', err);
      setExercises(exercises);
    }
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
        <Text style={styles.sectionTitle}>Exercises</Text>

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
          >
            <Text style={styles.btnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.list}>
          {exercises.length > 0 && (
            exercises.map((exercise, index) => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteExercise(exercise.id)}
                    style={styles.btnSmallDelete}
                  >
                    <Text style={styles.btnSmallText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.exerciseControls}>
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

                  <View style={styles.reorderGroup}>
                    <Text style={styles.label}>Reorder</Text>
                    <View style={styles.reorderButtons}>
                      <TouchableOpacity
                        onPress={() => handleMoveExercise(index, 'up')}
                        disabled={index === 0}
                        style={[
                          styles.btnReorder,
                          index === 0 && styles.btnDisabled,
                        ]}
                      >
                        <Text style={styles.btnReorderText}>▲</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleMoveExercise(index, 'down')}
                        disabled={index === exercises.length - 1}
                        style={[
                          styles.btnReorder,
                          index === exercises.length - 1 && styles.btnDisabled,
                        ]}
                      >
                        <Text style={styles.btnReorderText}>▼</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}

          <TouchableOpacity
            onPress={() => navigation.navigate('ExercisesCatalog', { programId, workoutId, workoutName })}
            style={[styles.btnPrimary, styles.catalogButton]}
          >
            <Text style={styles.btnText}>Add exercises from the catalog</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
};

const createStyles = (themeColors: ThemeColors) =>
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
  section: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.textStrong,
    marginBottom: 16,
    textTransform: 'uppercase',
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
    backgroundColor: themeColors.success,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    justifyContent: 'center',
  },
  catalogButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  btnText: {
    color: themeColors.textStrong,
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
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textStrong,
    flex: 1,
    textTransform: 'uppercase',
  },
  btnSmallDelete: {
    backgroundColor: themeColors.danger,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  btnSmallText: {
    color: themeColors.textStrong,
    fontWeight: '600',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  exerciseControls: {
    gap: 12,
  },
  reorderGroup: {
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.textStrong,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  btnReorder: {
    flex: 1,
    backgroundColor: themeColors.accentSoft,
    padding: 8,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  btnReorderText: {
    color: themeColors.textStrong,
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});

export default WorkoutDetailScreen;
