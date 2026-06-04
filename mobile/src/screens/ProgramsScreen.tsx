import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
} from 'react-native-draggable-flatlist';
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

const formatDaysSince = (days: number | null): string =>
  days === null ? 'Never' : `${days}d`;

const ProgramsScreen = ({ navigation }: any) => {
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
  const [isDraggingWorkout, setIsDraggingWorkout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMessage, setShowMessage] = useState(false);

  const api = useApi();

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (showMessage) {
      const timer = setTimeout(() => setShowMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showMessage]);

  const fetchPrograms = async () => {
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
  };

  const handleCreateProgram = async () => {
    try {
      const newProgram = await api.createProgram();
      setPrograms([...programs, newProgram]);
      setShowMessage(true);
    } catch (err) {
      console.error('Failed to create program:', err);
      Alert.alert('Error', 'Failed to create program');
    }
  };

  const handleDeleteProgram = async (id: string, name: string) => {
    Alert.alert('Delete Program', `Delete "${name}" and all its workouts?`, [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await api.deleteProgram(id);
            setPrograms(programs.filter((p) => p.id !== id));
          } catch (err) {
            console.error('Failed to delete program:', err);
            Alert.alert('Error', 'Failed to delete program');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const handleReorderWorkouts = async (programId: string, reorderedWorkouts: Workout[]) => {
    const previousWorkouts = workoutsByProgram[programId] ?? [];

    setWorkoutsByProgram((prev) => ({
      ...prev,
      [programId]: reorderedWorkouts,
    }));

    try {
      await api.reorderWorkouts(
        programId,
        reorderedWorkouts.map((workout, index) => ({
          id: workout.id,
          order: index + 1,
        })),
      );
    } catch (err) {
      console.error('Failed to reorder workouts:', err);
      setWorkoutsByProgram((prev) => ({
        ...prev,
        [programId]: previousWorkouts,
      }));
      Alert.alert('Error', 'Failed to reorder workouts');
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
        <Text style={styles.title}>Programs</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleCreateProgram} style={styles.btnPrimary}>
            <Text style={styles.btnText}>+ Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showMessage && (
        <TouchableOpacity
          style={styles.notification}
          onPress={() => setShowMessage(false)}
          activeOpacity={0.7}
        >
          <Text style={styles.notificationText}>Program created successfully!</Text>
        </TouchableOpacity>
      )}

      <NestableScrollContainer
        style={styles.list}
        scrollEnabled={!isDraggingWorkout}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {programs.length === 0 ? (
          <Text style={styles.noData}>No programs yet. Create one to get started!</Text>
        ) : (
          programs.map((program) => (
            <View key={program.id} style={styles.programCard}>
              <View style={styles.programHeader}>
                <TouchableOpacity
                  style={styles.programNameArea}
                  onPress={() =>
                    navigation.navigate('ProgramDetail', {
                      programId: program.id,
                      programName: program.name,
                    })
                  }
                >
                  <Text style={styles.programName}>{program.name}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.workoutsList}>
                {(workoutsByProgram[program.id] ?? []).length === 0 ? (
                  <Text style={styles.noWorkouts}>No workouts yet</Text>
                ) : (
                  <NestableDraggableFlatList
                    data={workoutsByProgram[program.id] ?? []}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    containerStyle={styles.workoutsDraggableList}
                    onDragBegin={() => setIsDraggingWorkout(true)}
                    onDragEnd={({ data }) => {
                      setIsDraggingWorkout(false);
                      handleReorderWorkouts(program.id, data);
                    }}
                    renderItem={({ item: workout, drag, isActive }) => {
                      const count = exerciseCountByWorkout[workout.id] ?? 0;

                      return (
                        <TouchableOpacity
                          style={[styles.workoutRow, isActive && styles.workoutRowActive]}
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
                            <TouchableOpacity
                              onLongPress={drag}
                              delayLongPress={200}
                              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                              style={styles.reorderHandle}
                              accessibilityRole="button"
                              accessibilityLabel={`Reorder ${workout.name}`}
                            >
                              <Ionicons
                                name="reorder-three-outline"
                                size={20}
                                color={themeColors.textMuted}
                              />
                            </TouchableOpacity>

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
                    }}
                  />
                )}
              </View>
            </View>
          ))
        )}
      </NestableScrollContainer>
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
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: themeColors.surface,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: themeColors.textStrong,
      
    },
    btnPrimary: {
      backgroundColor: themeColors.accent,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: radius.sm,
    },
    btnText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 12,
      
    },
    list: {
      flex: 1,
      padding: 16,
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
    workoutsDraggableList: {
      flexGrow: 0,
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
    workoutRowActive: {
      borderColor: themeColors.accent,
      backgroundColor: themeColors.accentSoft,
    },
    workoutRowContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    reorderHandle: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 4,
      paddingRight: 2,
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
    notification: {
      backgroundColor: themeColors.success,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginHorizontal: 16,
      marginBottom: 12,
      marginTop: 8,
      borderRadius: radius.sm,
      alignItems: 'center',
    },
    notificationText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
      
    },
  });

export default ProgramsScreen;
