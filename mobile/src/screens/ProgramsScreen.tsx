import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  type Program,
  type Workout,
  type Exercise,
  type WorkoutHistoryByDate,
  type MuscleGroup,
  resolveExerciseMuscleGroup,
} from '@gym-app/shared';
import { colors, radius, shadow } from '../theme';
import { useApi } from '../hooks/useApi';
import { usePreferences } from '../context/PreferencesContext';
import MuscleMapThumb from '../components/MuscleMapThumb';
import AppButton from '../components/ui/AppButton';
import ScreenHeader from '../components/ui/ScreenHeader';
import { useToast } from '../components/ui/AppToastProvider';
import { useErrorDialog } from '../components/ui/ErrorDialogProvider';
import { showConfirmDialog, showDeleteConfirmDialog } from '../components/ui/ConfirmDialog';

const TIME_PER_SET_SECONDS = { low: 30, high: 45 };
const HISTORY_LOOKBACK_MONTHS = 18;
const DAY_MS = 24 * 60 * 60 * 1000;
const FRONT_MUSCLE_GROUPS = new Set<MuscleGroup>([
  'Chest',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Legs',
  'Core / Abs',
]);

const roundDownToNearestFive = (value: number) => Math.floor(value / 5) * 5;
const roundUpToNearestFive = (value: number) => Math.ceil(value / 5) * 5;

const toMonthKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const getWorkoutEstimateDuration = (
  exercises: Exercise[],
): string => {
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

const getDominantWorkoutMuscleGroups = (workoutExercises: Exercise[]): MuscleGroup[] => {
  const groupsCount = workoutExercises.reduce((acc, exercise) => {
    const mappedGroups =
      exercise.custom_muscle_groups && exercise.custom_muscle_groups.length > 0
        ? exercise.custom_muscle_groups
        : (() => {
            const fallback = resolveExerciseMuscleGroup(exercise.name);
            return fallback ? [fallback] : [];
          })();

    if (mappedGroups.length === 0) return acc;

    mappedGroups.forEach((group) => {
      acc[group] = (acc[group] ?? 0) + 1;
    });
    return acc;
  }, {} as Record<MuscleGroup, number>);

  const matchedGroups = Object.entries(groupsCount) as [MuscleGroup, number][];
  if (matchedGroups.length === 0) return [];

  const frontTotal = matchedGroups.reduce(
    (sum, [group, count]) => (FRONT_MUSCLE_GROUPS.has(group) ? sum + count : sum),
    0,
  );
  const backTotal = matchedGroups.reduce(
    (sum, [group, count]) => (FRONT_MUSCLE_GROUPS.has(group) ? sum : sum + count),
    0,
  );
  const showFront = frontTotal >= backTotal;

  return matchedGroups
    .filter(([group]) => FRONT_MUSCLE_GROUPS.has(group) === showFront)
    .sort((a, b) => b[1] - a[1])
    .map(([group]) => group);
};

const getDaysSince = (isoDate: string): number => {
  const date = new Date(isoDate);
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const dateStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  return Math.max(0, Math.floor((todayStart - dateStart) / DAY_MS));
};

const formatDaysSince = (days: number | null): string => {
  if (days === null) return 'Never';
  if (days === 0) return 'Today';
  return `${days}d`;
};

const PROGRAM_NAME_PATTERN = /^Program\s+(\d+)$/;

const getNextProgramName = (existingPrograms: Program[]): string => {
  const maxNumber = existingPrograms.reduce((max, program) => {
    const match = program.name.trim().match(PROGRAM_NAME_PATTERN);
    if (!match) return max;

    const parsedNumber = Number.parseInt(match[1], 10);
    if (Number.isNaN(parsedNumber)) return max;

    return Math.max(max, parsedNumber);
  }, 0);

  const nextNumber = maxNumber + 1;
  return `Program ${String(nextNumber).padStart(2, '0')}`;
};

const ProgramsScreen = ({ navigation, route }: any) => {
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [workoutsByProgram, setWorkoutsByProgram] = useState<Record<string, Workout[]>>(
    {},
  );
  const [exerciseCountByWorkout, setExerciseCountByWorkout] = useState<
    Record<string, number>
  >({});
  const [estimatedDurationByWorkout, setEstimatedDurationByWorkout] = useState<
    Record<string, string>
  >({});
  const [dominantMuscleGroupsByWorkout, setDominantMuscleGroupsByWorkout] = useState<
    Record<string, MuscleGroup[]>
  >({});
  const [daysSinceByWorkout, setDaysSinceByWorkout] = useState<
    Record<string, number | null>
  >({});
  const [loading, setLoading] = useState(true);

  const api = useApi();
  const { showToast } = useToast();
  const { showError } = useErrorDialog();

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getPrograms();
      setPrograms(data);

      const workoutsResults = await Promise.all(data.map((p) => api.getWorkouts(p.id)));
      const wbp: Record<string, Workout[]> = {};
      data.forEach((p, i) => {
        wbp[p.id] = workoutsResults[i];
      });
      setWorkoutsByProgram(wbp);

      const allWorkouts = workoutsResults.flat();
      const exercisesResults = await Promise.all(
        allWorkouts.map((w) => api.getExercises(w.id)),
      );
      const ecbw: Record<string, number> = {};
      const edbw: Record<string, string> = {};
      const dmgbw: Record<string, MuscleGroup[]> = {};
      allWorkouts.forEach((w, i) => {
        ecbw[w.id] = exercisesResults[i].length;
        edbw[w.id] = getWorkoutEstimateDuration(exercisesResults[i]);
        dmgbw[w.id] = getDominantWorkoutMuscleGroups(exercisesResults[i]);
      });
      setExerciseCountByWorkout(ecbw);
      setEstimatedDurationByWorkout(edbw);
      setDominantMuscleGroupsByWorkout(dmgbw);

      const workoutIds = allWorkouts.map((workout) => workout.id);
      const monthKeys = Array.from({ length: HISTORY_LOOKBACK_MONTHS }).map((_, idx) => {
        const monthDate = new Date();
        monthDate.setDate(1);
        monthDate.setMonth(monthDate.getMonth() - idx);
        return toMonthKey(monthDate);
      });

      const monthHistories = await Promise.all(
        monthKeys.map(async (monthKey) => {
          try {
            return await api.getWorkoutsByMonth(monthKey);
          } catch {
            return [] as WorkoutHistoryByDate[];
          }
        }),
      );

      const latestByWorkout: Record<string, string> = {};
      monthHistories.flat().forEach((entry) => {
        if (entry.status === 'cancelled') return;

        const existing = latestByWorkout[entry.workout_id];
        if (
          !existing ||
          new Date(entry.started_at).getTime() > new Date(existing).getTime()
        ) {
          latestByWorkout[entry.workout_id] = entry.started_at;
        }
      });

      const nextDaysSinceByWorkout: Record<string, number | null> = {};
      workoutIds.forEach((workoutId) => {
        const lastPerformed = latestByWorkout[workoutId];
        nextDaysSinceByWorkout[workoutId] = lastPerformed
          ? getDaysSince(lastPerformed)
          : null;
      });

      setDaysSinceByWorkout(nextDaysSinceByWorkout);
    } catch (err) {
      console.error('Failed to fetch programs:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      fetchPrograms();
    }, [fetchPrograms, route?.params?.forceRefreshAt]),
  );

  const handleCreateProgram = async () => {
    try {
      const nextProgramName = getNextProgramName(programs);
      const newProgram = await api.createProgram({ name: nextProgramName });
      setPrograms([...programs, newProgram]);
      showToast({
        type: 'success',
        duration: 'short',
        message: 'Program created successfully.',
      });
    } catch (err) {
      console.error('Failed to create program:', err);
      showError({ message: 'Failed to create program' });
    }
  };

  const handleOpenAddProgramPrompt = () => {
    showConfirmDialog({
      title: 'Add Program',
      message: 'Choose how you want to add a program.',
      confirmText: 'Create program',
      cancelText: 'Import program',
      onConfirm: handleCreateProgram,
      onCancel: () => {
        navigation.navigate('ProgramsCatalog');
      },
    });
  };

  const handleDeleteProgram = async (id: string, name: string) => {
    showDeleteConfirmDialog(
      'Delete Program',
      `Delete "${name}" and all its workouts?`,
      async () => {
        try {
          await api.deleteProgram(id);
          setPrograms(programs.filter((p) => p.id !== id));
          showToast({ type: 'success', duration: 'short', message: 'Program deleted.' });
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

  const favoritePrograms = programs.filter((program) => program.is_favorite_program);
  const otherPrograms = programs.filter((program) => !program.is_favorite_program);

  const renderProgramCard = (program: Program) => (
    <TouchableOpacity
      key={program.id}
      style={styles.programCard}
      activeOpacity={0.9}
      onPress={() =>
        navigation.navigate('ProgramDetail', {
          programId: program.id,
          programName: program.name,
        })
      }
    >
      <View style={styles.programHeader}>
        <View style={styles.programNameArea}>
          <Text style={styles.programName}>{program.name}</Text>
        </View>
        {program.is_favorite_program ? (
          <Ionicons name="star" size={18} color={themeColors.accent} />
        ) : null}
      </View>

      <View style={styles.workoutsList}>
        {(workoutsByProgram[program.id] ?? []).length === 0 ? (
          <Text style={styles.noWorkouts}>No workouts yet</Text>
        ) : (
          (workoutsByProgram[program.id] ?? []).map((workout) => {
              const count = exerciseCountByWorkout[workout.id] ?? 0;

              return (
                <TouchableOpacity
                  key={workout.id}
                  style={styles.workoutRow}
                  activeOpacity={0.9}
                  onPress={() =>
                    navigation.navigate('WorkoutDetail', {
                      programId: program.id,
                      workoutId: workout.id,
                      workoutName: workout.name,
                    })
                  }
                >
                  <View style={styles.workoutRowContent}>
                    <MuscleMapThumb
                      groups={dominantMuscleGroupsByWorkout[workout.id] ?? []}
                      size={34}
                      mutedColor={themeColors.textMuted}
                      highlightColor={themeColors.accent}
                    />

                    <View style={styles.workoutRowMain}>
                      <Text style={styles.workoutRowName}>{workout.name}</Text>
                      <View style={styles.workoutRowMeta}>
                        <View style={styles.workoutRowMetaCell}>
                          <Text style={styles.workoutRowDays}>
                            {formatDaysSince(daysSinceByWorkout[workout.id] ?? null)}
                          </Text>
                        </View>
                        <View style={styles.workoutRowMetaCell}>
                          <Text style={styles.workoutRowDuration}>
                            {estimatedDurationByWorkout[workout.id] ?? '0m'}
                          </Text>
                        </View>
                        <View style={styles.workoutRowMetaCell}>
                          <Text style={styles.workoutRowCount}>
                            {count} {count === 1 ? 'exercise' : 'exercises'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Programs"
        rightActions={(
          <AppButton title="+ Create" size="sm" onPress={handleOpenAddProgramPrompt} />
        )}
      />

      <ScrollView
        style={styles.list}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {programs.length === 0 ? (
          <Text style={styles.noData}>No programs yet. Create one to get started!</Text>
        ) : (
          <>
            {favoritePrograms.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Favorite programs</Text>
                {favoritePrograms.map(renderProgramCard)}
              </>
            ) : null}

            {otherPrograms.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Other programs</Text>
                {otherPrograms.map(renderProgramCard)}
              </>
            ) : null}
          </>
        )}
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
    list: {
      flex: 1,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: themeColors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 4,
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
    programCard: {
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
    programHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    programNameArea: {
      flex: 1,
    },
    programName: {
      fontSize: 16,
      fontWeight: '600',
      color: themeColors.textStrong,
      
    },
    workoutsList: {
      marginTop: 4,
    },
    workoutRow: {
      alignItems: 'stretch',
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginTop: 6,
      backgroundColor: themeColors.background,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    workoutRowContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    workoutRowMain: {
      flex: 1,
    },
    workoutRowName: {
      fontSize: 14,
      fontWeight: '600',
      color: themeColors.textStrong,
      marginBottom: 8,
      
    },
    workoutRowMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    workoutRowMetaCell: {
      flex: 1,
      justifyContent: 'center',
    },
    workoutRowDays: {
      fontSize: 12,
      color: themeColors.textMuted,
      textAlign: 'left',
    },
    workoutRowDuration: {
      fontSize: 12,
      color: themeColors.textStrong,
      fontWeight: '700',
      textAlign: 'center',
      
    },
    workoutRowCount: {
      fontSize: 12,
      color: themeColors.textMuted,
      textAlign: 'right',
      
    },
    noWorkouts: {
      fontSize: 13,
      color: themeColors.textMuted,
      fontStyle: 'italic',
      paddingVertical: 4,
      paddingHorizontal: 12,
      
    },
  });

export default ProgramsScreen;
