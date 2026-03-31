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
import { ApiClient, type Exercise } from '@gym-app/shared';
import NumberSpinner from '../components/NumberSpinner';

const WorkoutDetailScreen = ({ route, navigation }: any) => {
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
        <ActivityIndicator size="large" color="#007bff" />
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
          {exercises.length === 0 ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('ExercisesCatalog', { programId, workoutId, workoutName })}
              style={styles.btnPrimary}
            >
              <Text style={styles.btnText}>Add exercises from the catalog</Text>
            </TouchableOpacity>
          ) : (
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
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    borderBottomWidth: 2,
    borderBottomColor: '#007bff',
    paddingBottom: 8,
  },
  section: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
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
    borderColor: '#ddd',
    borderRadius: 4,
  },
  btnPrimary: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    justifyContent: 'center',
  },
  btnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  list: {
    flex: 1,
  },
  noData: {
    padding: 16,
    backgroundColor: '#d1ecf1',
    borderRadius: 4,
    color: '#0c5460',
    textAlign: 'center',
  },
  exerciseCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: '#333',
    flex: 1,
  },
  btnSmallDelete: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  btnSmallText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
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
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  btnReorder: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  btnReorderText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 12,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});

export default WorkoutDetailScreen;
