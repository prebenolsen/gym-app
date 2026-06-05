import { useCallback, useEffect, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
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
import AppButton from '../components/ui/AppButton';
import ScreenHeader from '../components/ui/ScreenHeader';
import { useErrorDialog } from '../components/ui/ErrorDialogProvider';
import { useToast } from '../components/ui/AppToastProvider';
import {
  showConfirmDialog,
  showDeleteConfirmDialog,
  showInputConfirmDialog,
} from '../components/ui/ConfirmDialog';

const getExerciseMuscleGroup = (name: string): MuscleGroup | undefined =>
  resolveExerciseMuscleGroup(name);

const WorkoutDetailScreen = ({ route, navigation }: any) => {
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);
  const { programId, workoutId, workoutName } = route.params;
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(workoutName);
  const [isDraggingExercise, setIsDraggingExercise] = useState(false);

  const api = useApi();
  const { showError } = useErrorDialog();
  const { showToast } = useToast();
  const muscleGroupOptions = getMuscleGroups();

  useEffect(() => {
    setEditName(workoutName);
  }, [workoutName]);

  useFocusEffect(
    useCallback(() => {
      fetchExercises();
    }, [workoutId]),
  );

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

  const handleCreateExercise = async (
    exerciseName: string,
    selectedGroups?: string[],
  ) => {
    const normalizedName = exerciseName.trim();
    if (!normalizedName || isCreatingExercise) return;

    setIsCreatingExercise(true);
    try {
      const fallbackGroups = suggestMuscleGroupsFromInput(normalizedName);
      const normalizedSelections = (selectedGroups ?? fallbackGroups).filter((group): group is MuscleGroup =>
        muscleGroupOptions.includes(group as MuscleGroup),
      );
      const resolvedGroups = normalizedSelections.length > 0 ? normalizedSelections : null;
      const newExercise = await api.createExercise(workoutId, {
        name: normalizedName,
        sets: 4,
        rest_seconds: 120,
        custom_muscle_groups: resolvedGroups,
        is_custom: true,
      });

      setExercises((currentExercises) => [...currentExercises, newExercise]);
    } catch (err) {
      console.error('Failed to create exercise:', err);
      showError({ message: 'Failed to create exercise' });
    } finally {
      setIsCreatingExercise(false);
    }
  };

  const handleOpenCreateExercisePrompt = () => {
    if (isCreatingExercise) return;

    showInputConfirmDialog({
      title: 'Create Exercise',
      message: 'Enter a name for your custom exercise.',
      placeholder: 'Exercise name',
      promptOptions: muscleGroupOptions,
      promptOptionsLabel: 'Muscle groups',
      autoSuggestSelections: (inputValue) => suggestMuscleGroupsFromInput(inputValue),
      selectionMode: 'multi',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      onConfirmInput: handleCreateExercise,
    });
  };

  const handleOpenAddExercisePrompt = () => {
    showConfirmDialog({
      title: 'Add Exercise',
      message: '',
      confirmText: 'Create exercise',
      cancelText: 'From catalog',
      onConfirm: handleOpenCreateExercisePrompt,
      onCancel: () =>
        navigation.navigate('ExercisesCatalog', {
          programId,
          workoutId,
          workoutName,
        }),
    });
  };

  const handleUpdateExercise = async (
    id: string,
    updates: {
      sets?: number;
      rest_seconds?: number;
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

  const handleDeleteExercise = async (id: string) => {
    showDeleteConfirmDialog('Delete Exercise', 'Delete this exercise?', async () => {
      try {
        await api.deleteExercise(id);
        setExercises(exercises.filter((e) => e.id !== id));
      } catch (err) {
        console.error('Failed to delete exercise:', err);
        showError({ message: 'Failed to delete exercise' });
      }
    });
  };

  const handleStartWorkout = async () => {
    try {
      const startedSession = await api.startWorkoutSession(workoutId);
      const parentNav = navigation.getParent?.();
      if (parentNav?.navigate) {
        parentNav.navigate('ActiveWorkoutStack', {
          screen: 'ActiveWorkout',
          params: { initialSession: startedSession },
        });
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
                  const startedSession = await api.startWorkoutSession(workoutId);
                  const parentNav = navigation.getParent?.();
                  if (parentNav?.navigate) {
                    parentNav.navigate('ActiveWorkoutStack', {
                      screen: 'ActiveWorkout',
                      params: { initialSession: startedSession },
                    });
                  }
                } catch (replaceErr) {
                  console.error('Failed to replace active workout session:', replaceErr);
                  showError({ message: 'Failed to replace active workout session' });
                }
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
        return;
      }

      console.error('Failed to start workout session:', err);
      showError({ message: 'Failed to start workout session' });
    }
  };

  const handleDeleteWorkout = async () => {
    showDeleteConfirmDialog(
      'Delete Workout',
      `Delete "${editName}" and all its exercises?`,
      async () => {
        try {
          await api.deleteWorkout(workoutId);
          showToast({ type: 'success', duration: 'short', message: 'Workout deleted.' });
          navigation.goBack();
        } catch (err) {
          console.error('Failed to delete workout:', err);
          showError({ message: 'Failed to delete workout' });
        }
      },
    );
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
      showError({ message: 'Failed to reorder exercises' });
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
      <ScreenHeader
        onBackPress={() => navigation.goBack()}
        rightActions={<AppButton title="+ Add" size="sm" onPress={handleOpenAddExercisePrompt} disabled={isCreatingExercise} />}
        titleNode={
          editing ? (
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
          )
        }
      />

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

          <AppButton
            title="Delete Workout"
            variant="danger"
            onPress={handleDeleteWorkout}
            style={styles.deleteButtonInList}
          />
        </NestableScrollContainer>
      </View>

      <View style={styles.bottomActions}>
        <AppButton title="Start workout" onPress={handleStartWorkout} style={styles.startWorkoutButton} />
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
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: themeColors.textStrong,
      flex: 1,
      includeFontPadding: false,
      lineHeight: 26,
    },
    titleInput: {
      flex: 1,
      fontSize: 22,
      fontWeight: '700',
      color: themeColors.textStrong,
      borderBottomWidth: 2,
      borderBottomColor: themeColors.accent,
      paddingBottom: 8,
      includeFontPadding: false,
      lineHeight: 26,
    },
    startWorkoutButton: {
      width: '100%',
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
    deleteButtonInList: {
      marginTop: 0,
      marginBottom: 20,
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
