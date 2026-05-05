import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  type WorkoutStats,
  type Program,
  type Workout,
  type WorkoutSession,
  type WorkoutHistoryByDate,
  type Exercise,
  type MuscleGroup,
  exercises as exerciseCatalog,
} from '@gym-app/shared';
import { colors, radius, shadow } from '../theme';
import { usePreferences } from '../context/PreferencesContext';
import { useApi } from '../hooks/useApi';
import { Ionicons } from '@expo/vector-icons';
import MuscleMapThumb from '../components/MuscleMapThumb';

type ProgramWithWorkouts = {
  program: Program;
  workouts: Workout[];
  exerciseCounts: Record<string, number>;
  estimatedDurations: Record<string, string>;
  dominantMuscleGroups: Record<string, MuscleGroup[]>;
};

const TIME_PER_SET_SECONDS = { low: 30, high: 45 };
const HISTORY_LOOKBACK_MONTHS = 18;
const DAY_MS = 24 * 60 * 60 * 1000;
const FRONT_MUSCLE_GROUPS = new Set<MuscleGroup>([
  'Chest',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Legs (Quads focus)',
  'Core / Abs',
]);

const normalizeExerciseName = (name: string): string =>
  name.trim().toLowerCase().replace(/\s+/g, ' ');

const EXERCISE_NAME_TO_MUSCLE_GROUP = new Map<string, MuscleGroup>(
  exerciseCatalog.map((exercise) => [
    normalizeExerciseName(exercise.name),
    exercise.muscleGroup,
  ]),
);

const roundDownToNearestFive = (value: number) => Math.floor(value / 5) * 5;
const roundUpToNearestFive = (value: number) => Math.ceil(value / 5) * 5;

const toMonthKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

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

const getDominantWorkoutMuscleGroups = (workoutExercises: Exercise[]): MuscleGroup[] => {
  const groupsCount = workoutExercises.reduce((acc, exercise) => {
    const mappedGroup = EXERCISE_NAME_TO_MUSCLE_GROUP.get(
      normalizeExerciseName(exercise.name),
    );
    if (!mappedGroup) return acc;

    acc[mappedGroup] = (acc[mappedGroup] ?? 0) + 1;
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

const getDaysSortValue = (days: number | null): number =>
  days === null ? Number.POSITIVE_INFINITY : days;

const formatDaysSince = (days: number | null): string =>
  days === null ? 'Never' : `${days}d`;

const getWorkoutMessage = (count: number): string => {
  switch (count) {
    case 0:
      return "Welcome back! Let's make the next 7 days count";
    case 1:
      return "1 workout in the last 7 days - hey, it's a start!";
    case 2:
      return 'Not bad - 2 workouts in the last 7 days. The gains are coming!';
    case 3:
      return "Look at you - 3 workouts in the last 7 days. You're actually doing it!";
    case 4:
      return "4 workouts in the last 7 days - you're on a roll!";
    case 5:
      return "5 workouts in the last 7 days?! Now that's impressive!";
    case 6:
      return 'Call the newspaper - 6 workouts in the last 7 days? Absolute headline!';
    case 7:
      return "7 workouts in 7 days. We're not worthy!";
    default:
      return "Welcome back! Let's make the next 7 days count";
  }
};

const HomeScreen = ({ navigation }: any) => {
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [programTree, setProgramTree] = useState<ProgramWithWorkouts[]>([]);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [workouts7Days, setWorkouts7Days] = useState<number>(0);
  const [daysSinceByWorkout, setDaysSinceByWorkout] = useState<
    Record<string, number | null>
  >({});
  const [loading, setLoading] = useState(true);

  const api = useApi();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsData, programs, session] = await Promise.all([
        api.getStats(),
        api.getPrograms(),
        api.getActiveSession(),
      ]);

      const workoutsByProgram = await Promise.all(
        programs.map(async (program) => {
          const workouts = await api.getWorkouts(program.id);
          const exerciseResults = await Promise.all(
            workouts.map((w) => api.getExercises(w.id)),
          );

          const exerciseCounts: Record<string, number> = {};
          const estimatedDurations: Record<string, string> = {};
          const dominantMuscleGroups: Record<string, MuscleGroup[]> = {};

          workouts.forEach((w, i) => {
            exerciseCounts[w.id] = exerciseResults[i].length;
            estimatedDurations[w.id] = getWorkoutEstimateDuration(exerciseResults[i]);
            dominantMuscleGroups[w.id] = getDominantWorkoutMuscleGroups(
              exerciseResults[i],
            );
          });

          return {
            program,
            workouts,
            exerciseCounts,
            estimatedDurations,
            dominantMuscleGroups,
          };
        }),
      );

      const workoutIds = workoutsByProgram.flatMap(({ workouts }) =>
        workouts.map((workout) => workout.id),
      );

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

      setStats(statsData);
      setProgramTree(workoutsByProgram);
      setActiveSession(session);
      setDaysSinceByWorkout(nextDaysSinceByWorkout);

      try {
        const workouts7 = await api.getWorkouts7Days();
        setWorkouts7Days(workouts7.count);
      } catch (err) {
        console.error('Failed to fetch 7-day workouts count:', err);
      }

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={themeColors.accent} />
      </View>
    );
  }

  if (!stats || stats.total_programs === 0) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.onboarding}>
          <Text style={styles.onboardingHelper}>
            Track your workouts, build your programs, crush your goals.
          </Text>
          <TouchableOpacity
            style={styles.btnGetStarted}
            onPress={() =>
              navigation.navigate('ProgramsStack', { screen: 'ProgramsList' })
            }
          >
            <Text style={styles.btnGetStartedText}>Get started!</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.screenWrapper}>
      <View style={styles.header}>
        <Text style={styles.headerMessage}>{getWorkoutMessage(workouts7Days)}</Text>
      </View>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {activeSession && (
          <TouchableOpacity
            style={styles.activeSessionCard}
            onPress={() => navigation.navigate('ActiveWorkoutStack')}
          >
            <Text style={styles.activeSessionText}>
              You have an active workout session.
            </Text>
            <Text style={styles.activeSessionBtn}>Resume Active Workout</Text>
          </TouchableOpacity>
        )}

        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() =>
              navigation.navigate('ProgramsStack', { screen: 'ProgramsList' })
            }
          >
            <Ionicons
              name="clipboard-outline"
              size={28}
              color={themeColors.accent}
              style={{ marginBottom: 6 }}
            />
            <Text style={styles.statValue}>{stats.total_programs}</Text>
            <Text style={styles.statLabel}>Programs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() =>
              navigation.navigate('ProgramsStack', { screen: 'ProgramsList' })
            }
          >
            <Ionicons
              name="body-outline"
              size={28}
              color={themeColors.accent}
              style={{ marginBottom: 6 }}
            />
            <Text style={styles.statValue}>{stats.total_workouts}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() =>
              navigation.navigate('ProgramsStack', { screen: 'ExerciseProgressList' })
            }
          >
            <Ionicons
              name="barbell-outline"
              size={28}
              color={themeColors.accent}
              style={{ marginBottom: 6 }}
            />
            <Text style={styles.statValue}>{stats.total_exercises}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('CalendarStack')}
          >
            <Ionicons
              name="calendar-outline"
              size={28}
              color={themeColors.accent}
              style={{ marginBottom: 6 }}
            />
            <Text style={styles.statValue}>{workouts7Days}</Text>
            <Text style={styles.statLabel}>Last 7 Days</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favorite programs</Text>
          {(() => {
            const favorites = programTree.filter(
              ({ program }) => program.is_favorite_program,
            );
            if (favorites.length === 0) {
              return (
                <Text style={styles.noData}>
                  No favorites yet. Open a program and star it to add it here.
                </Text>
              );
            }

            return favorites.map(
              ({
                program,
                workouts,
                exerciseCounts,
                estimatedDurations,
                dominantMuscleGroups,
              }) => (
                <View key={program.id} style={styles.favoriteProgramTile}>
                  <TouchableOpacity
                    style={styles.favoriteProgramHeader}
                    onPress={() => {
                      navigation.navigate('ProgramsStack', {
                        screen: 'ProgramDetail',
                        params: { programId: program.id },
                      });
                    }}
                  >
                    <Ionicons name="star" size={18} color={themeColors.accent} />
                    <Text style={styles.favoriteProgramName}>{program.name}</Text>
                  </TouchableOpacity>
                  {workouts.length === 0 ? (
                    <Text style={styles.noData}>No workouts in this program yet.</Text>
                  ) : (
                    workouts
                      .slice()
                      .sort((a, b) => {
                        const aDays = getDaysSortValue(daysSinceByWorkout[a.id] ?? null);
                        const bDays = getDaysSortValue(daysSinceByWorkout[b.id] ?? null);
                        if (aDays !== bDays) return bDays - aDays;
                        return a.order - b.order;
                      })
                      .map((workout) => (
                        <TouchableOpacity
                          key={`workout-${program.id}-${workout.id}`}
                          style={styles.workoutRowTile}
                          onPress={() => {
                            navigation.navigate('ProgramsStack', {
                              screen: 'WorkoutDetail',
                              params: {
                                programId: program.id,
                                workoutId: workout.id,
                                workoutName: workout.name,
                              },
                            });
                          }}
                        >
                          <View style={styles.workoutRowTileContent}>
                            <MuscleMapThumb
                              groups={dominantMuscleGroups[workout.id] ?? []}
                              size={34}
                              mutedColor={themeColors.textMuted}
                              highlightColor={themeColors.accent}
                            />
                            <View style={styles.workoutRowTileMain}>
                              <Text style={styles.workoutRowTileName}>{workout.name}</Text>
                              <View style={styles.workoutRowMeta}>
                                <View style={styles.workoutRowMetaCell}>
                                  <Text style={styles.workoutRowTileDays}>
                                    {formatDaysSince(daysSinceByWorkout[workout.id] ?? null)}
                                  </Text>
                                </View>
                                <View style={styles.workoutRowMetaCell}>
                                  <Text style={styles.workoutRowTileDuration}>
                                    {estimatedDurations[workout.id] ?? '0m'}
                                  </Text>
                                </View>
                                <View style={styles.workoutRowMetaCell}>
                                  <Text style={styles.workoutRowTileCount}>
                                    {exerciseCounts[workout.id] ?? 0}{' '}
                                    {(exerciseCounts[workout.id] ?? 0) === 1
                                      ? 'exercise'
                                      : 'exercises'}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))
                  )}
                </View>
              ),
            );
          })()}
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
      padding: 16,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: themeColors.background,
    },
    onboarding: {
      paddingTop: 32,
      alignItems: 'center',
      gap: 16,
    },
    onboardingHelper: {
      fontSize: 15,
      color: themeColors.textMuted,
      textAlign: 'center',
      lineHeight: 22,
    },
    btnGetStarted: {
      backgroundColor: themeColors.accent,
      borderRadius: radius.sm,
      paddingHorizontal: 24,
      paddingVertical: 14,
    },
    btnGetStartedText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
    },
    screenWrapper: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    header: {
      backgroundColor: themeColors.surface,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    headerMessage: {
      fontSize: 16,
      fontWeight: '700',
      color: themeColors.textStrong,
      lineHeight: 24,
    },
    activeSessionCard: {
      backgroundColor: themeColors.accentSoft,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: themeColors.accent,
      padding: 14,
      marginBottom: 16,
      gap: 6,
    },
    activeSessionText: {
      fontSize: 14,
      color: themeColors.textStrong,
    },
    activeSessionBtn: {
      fontSize: 14,
      color: themeColors.accent,
      fontWeight: '700',
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 24,
    },
    statCard: {
      width: '47%',
      backgroundColor: themeColors.surface,
      borderRadius: radius.md,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: themeColors.border,
      ...shadow.card,
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: themeColors.accent,
      
    },
    statLabel: {
      fontSize: 12,
      color: themeColors.textMuted,
      marginTop: 6,
      
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      color: themeColors.textStrong,
      
      marginBottom: 12,
    },
    noData: {
      fontSize: 13,
      color: themeColors.textMuted,
      fontStyle: 'italic',
      paddingVertical: 8,
    },
    favoriteProgramTile: {
      backgroundColor: themeColors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: themeColors.border,
      padding: 14,
      marginBottom: 10,
      ...shadow.card,
    },
    favoriteProgramHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    favoriteProgramName: {
      fontSize: 15,
      fontWeight: 'bold',
      color: themeColors.textStrong,
      
      flex: 1,
    },
    workoutRowTile: {
      alignItems: 'stretch',
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: themeColors.background,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.sm,
      marginBottom: 6,
    },
    workoutRowTileContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    workoutRowTileMain: {
      flex: 1,
    },
    workoutRowTileName: {
      fontSize: 14,
      color: themeColors.textStrong,
      fontWeight: '600',
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
    workoutRowTileDays: {
      fontSize: 12,
      color: themeColors.textMuted,
      textAlign: 'left',
    },
    workoutRowTileDuration: {
      fontSize: 12,
      color: themeColors.textStrong,
      fontWeight: '700',
      textAlign: 'center',
    },
    workoutRowTileCount: {
      fontSize: 12,
      color: themeColors.textMuted,
      textAlign: 'right',
    },
  });

export default HomeScreen;
