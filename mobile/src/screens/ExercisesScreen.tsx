import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import {
  exercises,
  getMuscleGroups,
  getEquipment,
  type MuscleGroup,
  type Equipment,
} from '@gym-app/shared';
import { colors, radius, shadow } from '../theme';
import { usePreferences } from '../context/PreferencesContext';
import ChipButton from '../components/ui/ChipButton';
import AppButton from '../components/ui/AppButton';

const ExercisesScreen = ({ navigation }: any) => {
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<MuscleGroup | null>(
    null,
  );
  const [selectedEquipment, setSelectedEquipment] = useState<Set<Equipment>>(new Set());
  const [selectedMovementType, setSelectedMovementType] = useState<Set<string>>(
    new Set(),
  );

  // Filter exercises
  let filteredExercises = exercises;
  if (selectedMuscleGroup) {
    filteredExercises = filteredExercises.filter(
      (e) => e.muscleGroup === selectedMuscleGroup,
    );
  }
  if (selectedEquipment.size > 0) {
    filteredExercises = filteredExercises.filter((e) =>
      selectedEquipment.has(e.equipment),
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Muscle Groups */}
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Muscle Groups</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsRow}
          >
            <ChipButton
              label="All"
              selected={!selectedMuscleGroup}
              compact
              onPress={() => setSelectedMuscleGroup(null)}
            />
            {getMuscleGroups().map((group) => (
              <ChipButton
                key={group}
                label={group}
                selected={selectedMuscleGroup === group}
                compact
                onPress={() => setSelectedMuscleGroup(group)}
              />
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
            <ChipButton
              label="All"
              selected={selectedEquipment.size === 0}
              compact
              onPress={() => setSelectedEquipment(new Set())}
            />
            {getEquipment().map((equip) => (
              <ChipButton
                key={equip}
                label={equip}
                selected={selectedEquipment.has(equip)}
                compact
                onPress={() => toggleEquipment(equip)}
              />
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
            <ChipButton
              label="All"
              selected={selectedMovementType.size === 0}
              compact
              onPress={() => setSelectedMovementType(new Set())}
            />
            {['compound', 'isolation'].map((type) => (
              <ChipButton
                key={type}
                label={type.charAt(0).toUpperCase() + type.slice(1)}
                selected={selectedMovementType.has(type)}
                compact
                onPress={() => toggleMovementType(type)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Exercise List */}
        <View style={styles.exercisesSection}>
          <Text style={styles.resultsTitle}>
            {filteredExercises.length} Exercise{filteredExercises.length !== 1 ? 's' : ''}
          </Text>

          {filteredExercises.length === 0 ? (
            <Text style={styles.noData}>No exercises match your filters.</Text>
          ) : (
            filteredExercises.map((exercise) => (
              <View key={exercise.id} style={styles.exerciseItem}>
                <View style={styles.exerciseTopRow}>
                  <View style={styles.exerciseMainInfo}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseMeta}>
                      {exercise.muscleGroup} • {exercise.equipment}
                    </Text>
                  </View>
                  <AppButton
                    title="Progress"
                    variant="outlineAccent"
                    size="sm"
                    onPress={() =>
                      navigation.navigate('ExerciseProgress', { exerciseId: exercise.id })
                    }
                  />
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (themeColors: typeof colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
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
      
      letterSpacing: 0.3,
    },
    chipsRow: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    exercisesSection: {
      backgroundColor: themeColors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: themeColors.border,
      padding: 16,
      marginBottom: 20,
      ...shadow.card,
    },
    resultsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: themeColors.textStrong,
      marginBottom: 16,
      
    },
    noData: {
      padding: 16,
      backgroundColor: themeColors.accentSoft,
      borderRadius: 6,
      color: themeColors.textMuted,
      textAlign: 'center',
      fontStyle: 'italic',
      
    },
    exerciseItem: {
      paddingVertical: 12,
      paddingHorizontal: 0,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    exerciseTopRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    exerciseMainInfo: {
      flex: 1,
    },
    exerciseName: {
      fontSize: 14,
      fontWeight: '500',
      color: themeColors.textStrong,
      marginBottom: 4,
      
    },
    exerciseMeta: {
      fontSize: 12,
      color: themeColors.textMuted,
      
    },
  });

export default ExercisesScreen;
