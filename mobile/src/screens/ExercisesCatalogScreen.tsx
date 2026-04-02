import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { ActivityIndicator } from 'react-native';
import {
  exercises,
  getMuscleGroups,
  getEquipment,
  type MuscleGroup,
  type Equipment,
} from '@gym-app/shared';
import { useApi } from '../hooks/useApi';
import { colors, radius, shadow } from '../theme';
import { usePreferences } from '../context/PreferencesContext';

const ExercisesCatalogScreen = ({ route, navigation }: any) => {
  const { programId, workoutId, workoutName } = route.params;
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<
    MuscleGroup | null
  >(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Set<Equipment>>(
    new Set()
  );
  const [selectedMovementType, setSelectedMovementType] = useState<
    Set<string>
  >(new Set());
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(
    new Set()
  );
  const [isAdding, setIsAdding] = useState(false);

  const api = useApi();

  // Filter exercises
  let filteredExercises = exercises;
  if (selectedMuscleGroup) {
    filteredExercises = filteredExercises.filter(
      (e) => e.muscleGroup === selectedMuscleGroup
    );
  }
  if (selectedEquipment.size > 0) {
    filteredExercises = filteredExercises.filter((e) =>
      selectedEquipment.has(e.equipment)
    );
  }
  if (selectedMovementType.size > 0) {
    filteredExercises = filteredExercises.filter((e) => {
      const type = e.movementType === 'isometric' ? 'isolation' : e.movementType;
      return selectedMovementType.has(type);
    });
  }

  const toggleEquipment = (equip: Equipment) => {
    const newSet = new Set(selectedEquipment);
    if (newSet.has(equip)) {
      newSet.delete(equip);
    } else {
      newSet.add(equip);
    }
    setSelectedEquipment(newSet);
  };

  const toggleMovementType = (type: string) => {
    const newSet = new Set(selectedMovementType);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setSelectedMovementType(newSet);
  };

  const toggleExerciseSelection = (exerciseId: string) => {
    const newSet = new Set(selectedExercises);
    if (newSet.has(exerciseId)) {
      newSet.delete(exerciseId);
    } else {
      newSet.add(exerciseId);
    }
    setSelectedExercises(newSet);
  };

  const handleAddSelected = async () => {
    if (selectedExercises.size === 0) {
      Alert.alert('No exercises selected', 'Please select at least one exercise');
      return;
    }

    setIsAdding(true);
    try {
      const selectedExerciseIds = Array.from(selectedExercises);
      const selectedExerciseList = exercises.filter((e) =>
        selectedExerciseIds.includes(e.id)
      );

      for (const ex of selectedExerciseList) {
        await api.createExercise(workoutId, {
          name: ex.name,
          sets: 4,
          rest_seconds: 120,
        });
      }

      navigation.goBack();
    } catch (err) {
      console.error('Failed to add exercises:', err);
      Alert.alert('Error', 'Failed to add exercises');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Active Workout Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          Active workout: <Text style={styles.bannerWorkout}>{workoutName}</Text>
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Muscle Groups */}
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Muscle Groups</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsRow}
          >
            <TouchableOpacity
              style={[
                styles.chip,
                !selectedMuscleGroup && styles.chipActive,
              ]}
              onPress={() => setSelectedMuscleGroup(null)}
            >
              <Text
                style={[
                  styles.chipText,
                  !selectedMuscleGroup && styles.chipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {getMuscleGroups().map((group) => (
              <TouchableOpacity
                key={group}
                style={[
                  styles.chip,
                  selectedMuscleGroup === group && styles.chipActive,
                ]}
                onPress={() => setSelectedMuscleGroup(group)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedMuscleGroup === group && styles.chipTextActive,
                  ]}
                >
                  {group}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Equipment */}
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Equipment</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsRow}
          >
            <TouchableOpacity
              style={[
                styles.chip,
                selectedEquipment.size === 0 && styles.chipActive,
              ]}
              onPress={() => setSelectedEquipment(new Set())}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedEquipment.size === 0 && styles.chipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {getEquipment().map((equip) => (
              <TouchableOpacity
                key={equip}
                style={[
                  styles.chip,
                  selectedEquipment.has(equip) && styles.chipActive,
                ]}
                onPress={() => toggleEquipment(equip)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedEquipment.has(equip) && styles.chipTextActive,
                  ]}
                >
                  {equip}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Movement Type */}
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Movement Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsRow}
          >
            <TouchableOpacity
              style={[
                styles.chip,
                selectedMovementType.size === 0 && styles.chipActive,
              ]}
              onPress={() => setSelectedMovementType(new Set())}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedMovementType.size === 0 && styles.chipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {['compound', 'isolation'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.chip,
                  selectedMovementType.has(type) && styles.chipActive,
                ]}
                onPress={() => toggleMovementType(type)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedMovementType.has(type) && styles.chipTextActive,
                  ]}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Exercise List with Checkboxes */}
        <View style={styles.exercisesSection}>
          <Text style={styles.resultsTitle}>
            {filteredExercises.length} Exercise{filteredExercises.length !== 1 ? 's' : ''}
            {selectedExercises.size > 0 && ` (${selectedExercises.size} selected)`}
          </Text>

          {filteredExercises.length === 0 ? (
            <Text style={styles.noData}>No exercises match your filters.</Text>
          ) : (
            filteredExercises.map((exercise) => (
              <TouchableOpacity
                key={exercise.id}
                style={[
                  styles.exerciseItem,
                  selectedExercises.has(exercise.id) &&
                    styles.exerciseItemSelected,
                ]}
                onPress={() => toggleExerciseSelection(exercise.id)}
              >
                <View style={styles.checkbox}>
                  {selectedExercises.has(exercise.id) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseMeta}>
                    {exercise.muscleGroup} • {exercise.equipment}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Add Button */}
      {selectedExercises.size > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.btnAddSelected,
              isAdding && styles.btnDisabled,
            ]}
            onPress={handleAddSelected}
            disabled={isAdding}
          >
            {isAdding ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnText}>
                Add Selected ({selectedExercises.size})
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const createStyles = (themeColors: typeof colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  banner: {
    backgroundColor: themeColors.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  bannerWorkout: {
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.textStrong,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  chipsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    borderRadius: 16,
  },
  chipActive: {
    backgroundColor: themeColors.accentSoft,
    borderColor: themeColors.accent,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: themeColors.textMuted,
    textTransform: 'uppercase',
  },
  chipTextActive: {
    color: themeColors.accent,
    textTransform: 'uppercase',
  },
  exercisesSection: {
    backgroundColor: themeColors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    padding: 0,
    overflow: 'hidden',
    marginBottom: 20,
    ...shadow.card,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textStrong,
    paddingVertical: 16,
    paddingHorizontal: 16,
    textTransform: 'uppercase',
  },
  noData: {
    padding: 16,
    backgroundColor: themeColors.accentSoft,
    borderRadius: 6,
    color: themeColors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    textTransform: 'uppercase',
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  exerciseItemSelected: {
    backgroundColor: themeColors.accentSoft,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: themeColors.border,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkmark: {
    color: themeColors.accent,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '500',
    color: themeColors.textStrong,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  exerciseMeta: {
    fontSize: 12,
    color: themeColors.textMuted,
    textTransform: 'uppercase',
  },
  spacer: {
    height: 20,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    backgroundColor: themeColors.surface,
  },
  btnAddSelected: {
    backgroundColor: themeColors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textTransform: 'uppercase',
  },
});

export default ExercisesCatalogScreen;
