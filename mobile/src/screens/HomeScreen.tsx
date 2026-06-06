import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  type WorkoutStats,
  type Program,
  type Workout,
  type WorkoutSession,
  type WorkoutHistoryByDate,
  type Exercise,
  type MuscleGroup,
  type WeightTrackerGoalProject,
  resolveExerciseMuscleGroup,
} from '@gym-app/shared';
import { colors, radius, shadow } from '../theme';
import { usePreferences } from '../context/PreferencesContext';
import { useApi } from '../hooks/useApi';
import { Ionicons } from '@expo/vector-icons';
import MuscleMapThumb from '../components/MuscleMapThumb';
import AppButton from '../components/ui/AppButton';

type ProgramWithWorkouts = {
  program: Program;
  workouts: Workout[];
  exerciseCounts: Record<string, number>;
  estimatedDurations: Record<string, string>;
  dominantMuscleGroups: Record<string, MuscleGroup[]>;
};

type LastWorkoutSummary = {
  sessionId: string;
  workoutId: string;
  workoutName: string;
  programName: string;
  startedAt: string;
  endedAt: string | null;
  totalLiftedKg: number;
};

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

const roundDownToNearestFive = (value: number): number => Math.floor(value / 5) * 5;
const roundUpToNearestFive = (value: number): number => Math.ceil(value / 5) * 5;

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

const getDaysSortValue = (days: number | null): number =>
  days === null ? Number.POSITIVE_INFINITY : days;

const formatDaysSince = (days: number | null): string =>
  days === null ? 'Never' : `${days}d`;

const formatDaysSinceLabel = (days: number | null): string =>
  days === null ? 'Never' : `${formatDaysSince(days)} ago`;

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

const getCountLabel = (count: number, singular: string, plural: string): string =>
  count === 1 ? singular : plural;

const formatWeightGoalText = (
  goalType: WeightTrackerGoalProject['goal_type'] | null,
): string => {
  if (goalType === 'lose') return 'Goal: Weight loss';
  if (goalType === 'gain') return 'Goal: Weight gain';
  if (goalType === 'track') return 'Goal: Track only';
  return 'Goal: Not set';
};

const formatSessionDuration = (startIso: string, endIso: string | null): string => {
  if (!endIso) return 'In progress';
  const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${hours}h ${minutes}m`;
};

const formatRelativeDay = (isoDate: string): string => {
  const days = getDaysSince(isoDate);
  if (days === 0) return 'Today';
  return `${days} days ago`;
};

const HomeScreen = ({ navigation }: any) => {
  const { colors: themeColors, convertFromKg, unit, formatDateOnly } = usePreferences();
  const styles = createStyles(themeColors);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [programTree, setProgramTree] = useState<ProgramWithWorkouts[]>([]);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [workouts7Days, setWorkouts7Days] = useState<number>(0);
  const [weightGoalText, setWeightGoalText] = useState<string>('Goal: Not set');
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(true);
  const [daysSinceByWorkout, setDaysSinceByWorkout] = useState<
    Record<string, number | null>
  >({});
  const [lastWorkout, setLastWorkout] = useState<LastWorkoutSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const api = useApi();

  const fetchDashboardData = useCallback(async () => {
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

      const workoutMetaById = workoutsByProgram.reduce(
        (acc, { program, workouts }) => {
          workouts.forEach((workout) => {
            acc[workout.id] = {
              workoutName: workout.name,
              programName: program.name,
            };
          });
          return acc;
        },
        {} as Record<string, { workoutName: string; programName: string }>,
      );

      const finishedEntries = monthHistories
        .flat()
        .filter((entry) => entry.status === 'finished');

      if (finishedEntries.length > 0) {
        const latestFinished = finishedEntries.reduce((latest, entry) =>
          new Date(entry.started_at).getTime() > new Date(latest.started_at).getTime()
            ? entry
            : latest,
        );

        try {
          const detail = await api.getSessionDetails(latestFinished.id);
          const totalLiftedKg = detail.sets.reduce(
            (sum, set) =>
              set.is_deleted ? sum : sum + Number(set.weight || 0) * Number(set.reps || 0),
            0,
          );
          const mappedMeta = workoutMetaById[latestFinished.workout_id];

          setLastWorkout({
            sessionId: latestFinished.id,
            workoutId: latestFinished.workout_id,
            workoutName: mappedMeta?.workoutName ?? latestFinished.workout_name,
            programName: mappedMeta?.programName ?? 'Unknown program',
            startedAt: latestFinished.started_at,
            endedAt: latestFinished.ended_at,
            totalLiftedKg,
          });
        } catch (err) {
          console.error('Failed to fetch last workout details:', err);
          setLastWorkout(null);
        }
      } else {
        setLastWorkout(null);
      }

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

      try {
        const [profile, goals] = await Promise.all([
          api.getWeightTrackerProfile(),
          api.getWeightTrackerGoals(),
        ]);

        setOnboardingComplete(profile?.onboarding_complete ?? false);

        const activeGoal =
          goals.find((goal) => goal.is_active) ??
          null;

        setWeightGoalText(formatWeightGoalText(activeGoal?.goal_type ?? null));
      } catch (err) {
        console.error('Failed to fetch weight tracker goal:', err);
        setWeightGoalText(formatWeightGoalText(null));
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setLastWorkout(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData]),
  );

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
          <AppButton
            title="Get started"
            style={styles.btnGetStarted}
            onPress={() =>
              onboardingComplete
                ? navigation.navigate('ProgramsStack', { screen: 'ProgramsList' })
                : navigation.navigate('OnboardingSetup')
            }
          />
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.screenWrapper}>
      {/*
      <View style={styles.header}>
        <Text style={styles.headerMessage}>{getWorkoutMessage(workouts7Days)}</Text>
      </View>
      */}
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
            <Text style={styles.statLabel}>
              {getCountLabel(stats.total_exercises, 'Exercise', 'Exercises')}
            </Text>
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

        {lastWorkout && (
          <TouchableOpacity
            style={styles.lastWorkoutCard}
            onPress={() =>
              navigation.navigate('CalendarStack', {
                screen: 'WorkoutHistoryDetail',
                params: { sessionId: lastWorkout.sessionId },
              })
            }
          >
            <View style={styles.lastWorkoutHeaderRow}>
              <Ionicons name="time-outline" size={20} color={themeColors.accent} />
              <Text style={styles.lastWorkoutTitle}>Last Workout</Text>
            </View>
            <Text style={styles.lastWorkoutMeta} numberOfLines={1}>
              {lastWorkout.programName}
            </Text>
            <Text style={styles.lastWorkoutName} numberOfLines={1}>
              {lastWorkout.workoutName}
            </Text>

            <View style={styles.lastWorkoutStatsRow}>
              <View style={styles.lastWorkoutStatBlock}>
                <Text style={styles.lastWorkoutStatLabel}>Date</Text>
                <Text style={styles.lastWorkoutMeta}>
                  {formatDateOnly(lastWorkout.startedAt)}
                </Text>
              </View>
              <View style={styles.lastWorkoutStatBlockCenter}>
                <Text style={styles.lastWorkoutStatLabel}>When</Text>
                <Text style={styles.lastWorkoutMeta}>
                  {formatRelativeDay(lastWorkout.startedAt)}
                </Text>
              </View>
              <View style={styles.lastWorkoutStatBlockRight}>
                <View style={styles.lastWorkoutDurationStack}>
                  <Text style={styles.lastWorkoutStatLabel}>Duration</Text>
                  <Text style={styles.lastWorkoutMeta}>
                    {formatSessionDuration(lastWorkout.startedAt, lastWorkout.endedAt)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.lastWorkoutLiftedRow}>
              <Text style={styles.lastWorkoutStatLabel}>Total lifted</Text>
              <Text style={styles.lastWorkoutMetaStrong}>
                {convertFromKg(lastWorkout.totalLiftedKg).toFixed(1)} {unit}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favorite programs</Text>
          {(() => {
            const favorites = programTree.filter(
              ({ program }) => program.is_favorite_program,
            );
            if (favorites.length === 0) {
              return (
                <Text style={styles.noData}>
                  The first program you create will automatically become favorited.
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
                        params: { programId: program.id, programName: program.name },
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
                            <View style={styles.workoutRowThumbWrap}>
                              <MuscleMapThumb
                                groups={dominantMuscleGroups[workout.id] ?? []}
                                size={68}
                                mutedColor={themeColors.textMuted}
                                highlightColor={themeColors.accent}
                              />
                            </View>
                            <View style={styles.workoutRowTileMain}>
                              <Text style={styles.workoutRowTileName}>{workout.name}</Text>
                              <Text style={styles.workoutRowTileDuration}>
                                Est. {estimatedDurations[workout.id] ?? '0m'}
                              </Text>
                              <Text style={styles.workoutRowTileCount}>
                                {exerciseCounts[workout.id] ?? 0}{' '}
                                {(exerciseCounts[workout.id] ?? 0) === 1
                                  ? 'exercise'
                                  : 'exercises'}
                              </Text>
                              <View style={styles.workoutRowTileFooter}>
                                <View />
                                <Text style={styles.workoutRowTileDays}>
                                  {formatDaysSinceLabel(daysSinceByWorkout[workout.id] ?? null)}
                                </Text>
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
      minWidth: 180,
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
    lastWorkoutCard: {
      backgroundColor: themeColors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: themeColors.border,
      padding: 14,
      marginBottom: 16,
      gap: 8,
      ...shadow.card,
    },
    lastWorkoutHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    lastWorkoutTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: themeColors.textStrong,
    },
    lastWorkoutName: {
      fontSize: 14,
      fontWeight: '700',
      color: themeColors.textStrong,
    },
    lastWorkoutMeta: {
      fontSize: 12,
      color: themeColors.textMuted,
      fontWeight: '600',
    },
    lastWorkoutStatsRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
      marginTop: 2,
    },
    lastWorkoutStatBlock: {
      flex: 1,
      alignItems: 'flex-start',
      gap: 2,
    },
    lastWorkoutStatBlockCenter: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    lastWorkoutStatBlockRight: {
      flex: 1,
      alignItems: 'flex-end',
      gap: 2,
    },
    lastWorkoutDurationStack: {
      alignItems: 'center',
      gap: 2,
    },
    lastWorkoutStatLabel: {
      fontSize: 11,
      color: themeColors.textMuted,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    lastWorkoutLiftedRow: {
      marginTop: 2,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    lastWorkoutMetaStrong: {
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
    statGoalValue: {
      fontSize: 14,
      fontWeight: '700',
      color: themeColors.accent,
      textAlign: 'center',
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
      paddingVertical: 2,
      paddingHorizontal: 12,
      backgroundColor: themeColors.background,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.sm,
      marginBottom: 6,
    },
    workoutRowTileContent: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 12,
      flex: 1,
    },
    workoutRowThumbWrap: {
      alignSelf: 'stretch',
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 76,
    },
    workoutRowTileMain: {
      flex: 1,
      justifyContent: 'space-between',
    },
    workoutRowTileName: {
      fontSize: 14,
      color: themeColors.textStrong,
      fontWeight: '700',
      marginBottom: 8,
    },
    workoutRowTileDuration: {
      fontSize: 12,
      color: themeColors.textStrong,
      fontWeight: '700',
      marginBottom: 2,
    },
    workoutRowTileCount: {
      fontSize: 12,
      color: themeColors.textMuted,
      fontWeight: '600',
      marginBottom: 10,
    },
    workoutRowTileFooter: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 'auto',
    },
    workoutRowTileDays: {
      fontSize: 12,
      color: themeColors.textMuted,
      fontWeight: '600',
      textAlign: 'right',
    },
  });

export default HomeScreen;
