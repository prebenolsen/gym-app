import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
} from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import {
  type Exercise,
  type MuscleGroup,
  getMuscleGroups,
  resolveExerciseMuscleGroup,
  suggestMuscleGroupsFromInput,
} from '@gym-app/shared';
import NumberSpinner from '../components/NumberSpinner';
import { useApi } from '../hooks/useApi';
import { colors, radius, shadow } from '../theme';
import { usePreferences } from '../context/PreferencesContext';
import MuscleMapThumb from '../components/MuscleMapThumb';

const getExerciseMuscleGroup = (name: string): MuscleGroup | undefined =>
  resolveExerciseMuscleGroup(name);

const WorkoutDetailScreen = ({ route, navigation }: any) => {
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);
  const { programId, workoutId, workoutName } = route.params;
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseMuscleGroups, setNewExerciseMuscleGroups] = useState<
    MuscleGroup[] | null
  >(null);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(workoutName);
  const [isDraggingExercise, setIsDraggingExercise] = useState(false);

  const api = useApi();
  const muscleGroupOptions = getMuscleGroups();
  const suggestedGroups = useMemo(
    () => suggestMuscleGroupsFromInput(newExerciseName),
    [newExerciseName],
  );
  const autoMappedGroups = useMemo(
    () => (newExerciseMuscleGroups === null ? suggestedGroups : newExerciseMuscleGroups),
    [newExerciseMuscleGroups, suggestedGroups],
  );

  useEffect(() => {
    setEditName(workoutName);
    fetchExercises();
  }, [workoutId, workoutName]);

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
    if (!newExerciseName.trim() || isAddingExercise) return;

    setIsAddingExercise(true);
    try {
      const resolvedGroups = autoMappedGroups.length > 0 ? autoMappedGroups : null;
      const newExercise = await api.createExercise(workoutId, {
        name: newExerciseName,
        sets: 4,
        rest_seconds: 120,
        custom_muscle_groups: resolvedGroups,
        is_custom: true,
      });

      setExercises((currentExercises) => [...currentExercises, newExercise]);
      setNewExerciseName('');
      setNewExerciseMuscleGroups(null);
    } catch (err) {
      console.error('Failed to add exercise:', err);
      Alert.alert('Error', 'Failed to add exercise');
    } finally {
      setIsAddingExercise(false);
    }
  };

  const handleUpdateExercise = async (
    id: string,
    updates: {
      sets?: number;
      rest_seconds?: number;
      custom_muscle_groups?: MuscleGroup[] | null;
    },
  ) => {
    try {
      const updated = await api.updateExercise(id, updates);
      setExercises((currentExercises) =>
        currentExercises.map((exercise) => (exercise.id === id ? updated : exercise)),
      );
    } catch (err) {
      console.error('Failed to update exercise:', err);
    }
  };

  const getResolvedExerciseMuscleGroups = (exercise: Exercise): MuscleGroup[] => {
    if (exercise.custom_muscle_groups && exercise.custom_muscle_groups.length > 0) {
      return exercise.custom_muscle_groups;
    }
    if (exercise.is_custom) {
      return [];
    }
    const resolved = getExerciseMuscleGroup(exercise.name);
    return resolved ? [resolved] : [];
  };

  const toggleGroupSelection = (
    selected: MuscleGroup[] | null | undefined,
    group: MuscleGroup,
  ): MuscleGroup[] => {
    const current = selected ?? [];
    if (current.includes(group)) {
      return current.filter((entry) => entry !== group);
    }
    return [...current, group];
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

  const handleReorderExercises = async (reorderedExercises: Exercise[]) => {
    const previousExercises = exercises;

    setExercises(reorderedExercises);

    try {
      await api.reorderExercises(
        workoutId,
        reorderedExercises.map((exercise, index) => ({
          id: exercise.id,
          order: index + 1,
        })),
      );
    } catch (err) {
      console.error('Failed to reorder exercises:', err);
      setExercises(previousExercises);
      Alert.alert('Error', 'Failed to reorder exercises');
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
        {/*<Text style={styles.sectionTitle}>Exercises</Text>*/}

        <NestableScrollContainer
          style={styles.list}
          scrollEnabled={!isDraggingExercise}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {exercises.length > 0 && (
            <NestableDraggableFlatList
              data={exercises}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              containerStyle={styles.exercisesDraggableList}
              onDragBegin={() => setIsDraggingExercise(true)}
              onDragEnd={({ data }) => {
                setIsDraggingExercise(false);
                handleReorderExercises(data);
              }}
              renderItem={({ item: exercise, drag, isActive }) => (
                <View style={[styles.exerciseCard, isActive && styles.exerciseCardActive]}>
                  <View style={styles.exerciseHeader}>
                    <View style={styles.exerciseHeaderLeft}>
                      <TouchableOpacity
                        onLongPress={drag}
                        delayLongPress={200}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={styles.reorderHandle}
                        accessibilityRole="button"
                        accessibilityLabel={`Reorder ${exercise.name}`}
                      >
                        <Ionicons
                          name="reorder-three-outline"
                          size={20}
                          color={themeColors.textMuted}
                        />
                      </TouchableOpacity>

                      <MuscleMapThumb
                        groups={getResolvedExerciseMuscleGroups(exercise)}
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
                    {exercise.is_custom ? (
                      <View style={styles.customGroupEditorBox}>
                        <Text style={styles.customGroupLabel}>Custom muscle group</Text>
                        <View style={styles.customGroupChipsWrap}>
                          <TouchableOpacity
                            style={[
                              styles.customGroupChip,
                              (!exercise.custom_muscle_groups ||
                                exercise.custom_muscle_groups.length === 0) &&
                                styles.customGroupChipActive,
                            ]}
                            onPress={() =>
                              handleUpdateExercise(exercise.id, {
                                custom_muscle_groups: null,
                              })
                            }
                          >
                            <Text
                              style={[
                                styles.customGroupChipText,
                                (!exercise.custom_muscle_groups ||
                                  exercise.custom_muscle_groups.length === 0) &&
                                  styles.customGroupChipTextActive,
                              ]}
                            >
                              None
                            </Text>
                          </TouchableOpacity>
                          {muscleGroupOptions.map((group) => (
                            <TouchableOpacity
                              key={`${exercise.id}-${group}`}
                              style={[
                                styles.customGroupChip,
                                (exercise.custom_muscle_groups ?? []).includes(group) &&
                                  styles.customGroupChipActive,
                              ]}
                              onPress={() =>
                                handleUpdateExercise(exercise.id, {
                                  custom_muscle_groups:
                                    toggleGroupSelection(exercise.custom_muscle_groups, group),
                                })
                              }
                            >
                              <Text
                                style={[
                                  styles.customGroupChipText,
                                  (exercise.custom_muscle_groups ?? []).includes(group) &&
                                    styles.customGroupChipTextActive,
                                ]}
                              >
                                {group}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ) : null}
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
              )}
            />
          )}


          <View style={styles.addExercise}>
          <TextInput
            style={styles.input}
            placeholder="Add a custom exercise"
            placeholderTextColor={themeColors.textMuted}
            value={newExerciseName}
            editable={!isAddingExercise}
            onChangeText={setNewExerciseName}
          />
          <TouchableOpacity
            onPress={handleAddExercise}
            style={[styles.btnPrimary, isAddingExercise && styles.btnPrimaryDisabled]}
            activeOpacity={0.7}
            disabled={isAddingExercise}
          >
            <Text style={styles.btnText}>{isAddingExercise ? 'Adding...' : '+ Add'}</Text>
          </TouchableOpacity>
        </View>

          {newExerciseName.trim().length > 0 ? (
            <View style={styles.customGroupCreateBox}>
              <Text style={styles.customGroupLabel}>
                Optional muscle groups for custom exercise
              </Text>
              {suggestedGroups.length > 0 ? (
                <Text style={styles.suggestionText}>
                  Auto-mapped from name: {suggestedGroups.join(', ')}
                </Text>
              ) : null}
              <View style={styles.customGroupChipsWrap}>
                <TouchableOpacity
                  style={[
                    styles.customGroupChip,
                    autoMappedGroups.length === 0 && styles.customGroupChipActive,
                  ]}
                  onPress={() => setNewExerciseMuscleGroups([])}
                >
                  <Text
                    style={[
                      styles.customGroupChipText,
                      autoMappedGroups.length === 0 && styles.customGroupChipTextActive,
                    ]}
                  >
                    None
                  </Text>
                </TouchableOpacity>
                {muscleGroupOptions.map((group) => (
                  <TouchableOpacity
                    key={`new-${group}`}
                    style={[
                      styles.customGroupChip,
                      autoMappedGroups.includes(group) && styles.customGroupChipActive,
                    ]}
                    onPress={() =>
                      setNewExerciseMuscleGroups((prev) =>
                        toggleGroupSelection(prev ?? [], group),
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.customGroupChipText,
                        autoMappedGroups.includes(group) &&
                          styles.customGroupChipTextActive,
                      ]}
                    >
                      {group}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

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
        </NestableScrollContainer>
      </View>

      <View style={styles.bottomActions}>
        <TouchableOpacity
          onPress={handleStartWorkout}
          style={styles.startWorkoutButton}
          activeOpacity={0.8}
        >
          <Text style={styles.startWorkoutButtonText}>Start workout</Text>
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
      
    },
    titleInput: {
      fontSize: 24,
      fontWeight: 'bold',
      color: themeColors.textStrong,
      borderBottomWidth: 2,
      borderBottomColor: themeColors.accent,
      paddingBottom: 8,
      
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
      
    },
    addExercise: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    customGroupCreateBox: {
      marginBottom: 16,
      padding: 10,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.sm,
      backgroundColor: themeColors.surface,
      gap: 8,
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
    btnPrimaryDisabled: {
      opacity: 0.55,
    },
    catalogButton: {
      marginTop: 8,
      marginBottom: 16,
    },
    btnText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 12,
      
    },
    list: {
      flex: 1,
    },
    exercisesDraggableList: {
      flexGrow: 0,
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
    exerciseCardActive: {
      borderColor: themeColors.accent,
      backgroundColor: themeColors.accentSoft,
    },
    exerciseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
      position: 'relative',
    },
    exerciseHeaderLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingRight: 10,
    },
    reorderHandle: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 4,
      paddingRight: 2,
    },
    exerciseName: {
      fontSize: 16,
      fontWeight: '600',
      color: themeColors.textStrong,
      flex: 1,
      
    },
    btnSmallDelete: {
      position: 'absolute',
      top:-15,
      right: 0,
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderColor: themeColors.danger,
      paddingHorizontal: 2,
      paddingVertical: 0,
      borderRadius: radius.sm,
    },
    btnSmallText: {
      color: themeColors.danger,
      fontWeight: '900',
      fontSize: 40,
    },
    exerciseControls: {
      gap: 12,
    },
    customGroupEditorBox: {
      padding: 10,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.sm,
      backgroundColor: themeColors.background,
      gap: 8,
    },
    customGroupLabel: {
      color: themeColors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    suggestionText: {
      color: themeColors.textMuted,
      fontSize: 12,
      marginTop: -2,
    },
    customGroupChipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    customGroupChip: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: themeColors.background,
    },
    customGroupChipActive: {
      borderColor: themeColors.accent,
      backgroundColor: themeColors.accentSoft,
    },
    customGroupChipText: {
      color: themeColors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    customGroupChipTextActive: {
      color: themeColors.accent,
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
      
    },
    bottomActions: {
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 10,
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
