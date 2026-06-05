import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Workout, type Exercise, type Program } from '@gym-app/shared';
import { colors, radius, shadow } from '../theme';
import { useApi } from '../hooks/useApi';
import { usePreferences } from '../context/PreferencesContext';
import AppButton from '../components/ui/AppButton';
import ScreenHeader from '../components/ui/ScreenHeader';
import { useErrorDialog } from '../components/ui/ErrorDialogProvider';
import { useToast } from '../components/ui/AppToastProvider';
import { showConfirmDialog, showDeleteConfirmDialog } from '../components/ui/ConfirmDialog';

const PROGRAM_NAME_PATTERN = /^Program\s+\d+$/;
const TIME_PER_SET_SECONDS = { low: 30, high: 45 };

const roundDownToNearestFive = (value: number): number => Math.floor(value / 5) * 5;
const roundUpToNearestFive = (value: number): number => Math.ceil(value / 5) * 5;

const getWorkoutEstimateDuration = (exercises: Exercise[]): string => {
  if (exercises.length === 0) return '0m';

  const totals = exercises.reduce(
    (acc, exercise) => {
      const low =
        exercise.sets * TIME_PER_SET_SECONDS.low +
        Math.max(exercise.sets - 1, 0) * exercise.rest_seconds;
      const high =
        exercise.sets * TIME_PER_SET_SECONDS.high +
        Math.max(exercise.sets - 1, 0) * exercise.rest_seconds;

      return { low: acc.low + low, high: acc.high + high };
    },
    { low: 0, high: 0 },
  );

  const lowMinutes = roundDownToNearestFive(totals.low / 60);
  const highMinutes = roundUpToNearestFive(totals.high / 60);
  return lowMinutes === highMinutes ? `${lowMinutes}m` : `${lowMinutes}-${highMinutes}m`;
};

const ProgramDetailScreen = ({ route, navigation }: any) => {
  const resolvedRouteParams = route.params?.params ?? route.params ?? {};
  const programId = (resolvedRouteParams.programId as string | undefined) ?? '';
  const initialProgramName =
    (resolvedRouteParams.programName as string | undefined) ?? '';
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);
  const [program, setProgram] = useState<Program | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercisesByWorkout, setExercisesByWorkout] = useState<
    Record<string, Exercise[]>
  >({});
  const [estimatedDurationByWorkout, setEstimatedDurationByWorkout] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(initialProgramName);

  const api = useApi();
  const { showError } = useErrorDialog();
  const { showToast } = useToast();
  const resolvedProgramName = (program?.name ?? editName ?? '').trim();
  const showRenameHint = PROGRAM_NAME_PATTERN.test(resolvedProgramName);

  useEffect(() => {
    if (!programId) {
      console.error('ProgramDetailScreen missing required programId route param');
      setProgram(null);
      setWorkouts([]);
      setExercisesByWorkout({});
      setEstimatedDurationByWorkout({});
      setLoading(false);
      return;
    }

    fetchWorkouts();
  }, [programId]);

  useEffect(() => {
    setEditName(initialProgramName);
  }, [initialProgramName]);

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
      const edbw: Record<string, string> = {};
      data.forEach((w, i) => {
        ebw[w.id] = exercisesResults[i];
        edbw[w.id] = getWorkoutEstimateDuration(exercisesResults[i]);
      });
      setExercisesByWorkout(ebw);
      setEstimatedDurationByWorkout(edbw);
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
      setExercisesByWorkout((prev) => ({ ...prev, [newWorkout.id]: [] }));
      setEstimatedDurationByWorkout((prev) => ({ ...prev, [newWorkout.id]: '0m' }));
    } catch (err) {
      console.error('Failed to create workout:', err);
      showError({ message: 'Failed to create workout' });
    }
  };

  const handleAddWorkout = () => {
    showConfirmDialog({
      title: 'Add Workout',
      message: 'Choose how you want to add a workout.',
      confirmText: 'Create empty workout',
      cancelText: 'Import workout',
      onConfirm: async () => {
        await handleCreateWorkout();
      },
      onCancel: () => {
        navigation.navigate('WorkoutsCatalog', { programId });
      },
    });
  };

  const handleRenameProgram = async () => {
    const newName = editName.trim();
    setEditing(false);
    if (!program || !newName) {
      setEditName(program?.name ?? initialProgramName);
      return;
    }

    if (newName === program.name) return;

    try {
      const updated = await api.updateProgram(program.id, { name: newName });
      setProgram(updated);
      setEditName(updated.name);
    } catch (err) {
      console.error('Failed to rename program:', err);
      showError({ message: 'Failed to rename program' });
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
      showError({ message: 'Failed to update favorite' });
    }
  };

  const handleDeleteProgram = () => {
    if (!program) return;

    showDeleteConfirmDialog(
      'Delete Program',
      `Delete "${program.name}" and all its workouts?`,
      async () => {
        try {
          await api.deleteProgram(program.id);
          showToast({ type: 'success', duration: 'short', message: 'Program deleted.' });
          navigation.goBack();
        } catch (err) {
          console.error('Failed to delete program:', err);
          showError({ message: 'Failed to delete program' });
        }
      },
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
      <ScreenHeader
        onBackPress={() => navigation.goBack()}
        titleNode={(
          <View style={styles.titleRow}>
            <TouchableOpacity
              style={styles.favoriteStarButton}
              onPress={handleToggleFavorite}
              accessibilityRole="button"
              accessibilityLabel="Toggle favorite program"
            >
              <Ionicons
                name={program?.is_favorite_program ? 'star' : 'star-outline'}
                size={26}
                color={themeColors.accent}
              />
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
              <View style={styles.titleTextGroup}>
                <Text style={styles.title} onPress={() => setEditing(true)}>
                  {editName}
                </Text>
                {showRenameHint ? <Text style={styles.renameHint}>Click to rename</Text> : null}
              </View>
            )}
          </View>
        )}
        rightActions={<AppButton title="+ Create" size="sm" onPress={handleAddWorkout} />}
      />

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
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate('WorkoutDetail', {
                    programId,
                    workoutId: workout.id,
                    workoutName: workout.name,
                  })
                }
              >
                <View style={styles.workoutHeaderRow}>
                  <Text style={styles.workoutName}>{workout.name}</Text>
                </View>
                {(exercisesByWorkout[workout.id] ?? []).length === 0 ? (
                  <Text style={styles.exerciseEmpty}>No exercises yet</Text>
                ) : (
                  (exercisesByWorkout[workout.id] ?? []).map((ex) => (
                    <Text key={ex.id} style={styles.exerciseItem}>
                      • {ex.name}
                    </Text>
                  ))
                )}
                <Text style={styles.workoutEstimateText}>
                  Est. {estimatedDurationByWorkout[workout.id] ?? '0m'}
                </Text>
              </TouchableOpacity>
            ))
          )}

          <View style={styles.listFooterActions}>
            <AppButton
              title="Delete Program"
              variant="danger"
              onPress={handleDeleteProgram}
              style={styles.deleteButtonInList}
            />
          </View>
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
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    favoriteStarButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },

    title: {
      fontSize: 22,
      fontWeight: '700',
      color: themeColors.textStrong,
      includeFontPadding: false,
      lineHeight: 26,
    },
    titleTextGroup: {
      flex: 1,
    },
    renameHint: {
      marginTop: 2,
      fontSize: 12,
      color: themeColors.textMuted,
      opacity: 0.75,
      fontStyle: 'italic',
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
    workoutHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    workoutName: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: themeColors.textStrong,
    },
    exerciseItem: {
      fontSize: 13,
      color: themeColors.textMuted,
      lineHeight: 20,
      
    },
    exerciseEmpty: {
      fontSize: 13,
      color: themeColors.textMuted,
      fontStyle: 'italic',
      
    },
    workoutEstimateText: {
      marginTop: 10,
      fontSize: 12,
      color: themeColors.textStrong,
      fontWeight: '700',
    },
    listFooterActions: {
      marginTop: 8,
    },
    deleteButtonInList: {
      marginTop: 10,
      marginBottom: 8,
    },
  });

export default ProgramDetailScreen;
