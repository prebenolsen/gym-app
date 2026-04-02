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
  type ExerciseHistorySummary,
} from '@gym-app/shared';
import { colors, radius, shadow } from '../theme';
import { usePreferences } from '../context/PreferencesContext';
import { useApi } from '../hooks/useApi';
import { Ionicons } from '@expo/vector-icons';

type ProgramWithWorkouts = {
  program: Program;
  workouts: Workout[];
  exerciseCounts: Record<string, number>;
};

const HomeScreen = ({ navigation }: any) => {
  const { formatWeight, colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [programTree, setProgramTree] = useState<ProgramWithWorkouts[]>([]);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [workouts7Days, setWorkouts7Days] = useState<number>(0);
  const [exercises, setExercises] = useState<ExerciseHistorySummary[]>([]);
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
            workouts.map((w) => api.getExercises(w.id))
          );
          const exerciseCounts: Record<string, number> = {};
          workouts.forEach((w, i) => { exerciseCounts[w.id] = exerciseResults[i].length; });
          return { program, workouts, exerciseCounts };
        })
      );

      setStats(statsData);
      setProgramTree(workoutsByProgram);
      setActiveSession(session);

      try {
        const workouts7 = await api.getWorkouts7Days();
        setWorkouts7Days(workouts7.count);
      } catch (err) {
        console.error('Failed to fetch 7-day workouts count:', err);
      }

      try {
        const exercisesData = await api.getExerciseHistory();
        setExercises(exercisesData);
      } catch (err) {
        console.error('Failed to fetch exercise history:', err);
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
            onPress={() => navigation.navigate('ProgramsStack')}
          >
            <Text style={styles.btnGetStartedText}>Get started! 💪</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {activeSession && (
        <TouchableOpacity
          style={styles.activeSessionCard}
          onPress={() => navigation.navigate('ActiveWorkoutStack')}
        >
          <Text style={styles.activeSessionText}>You have an active workout session.</Text>
          <Text style={styles.activeSessionBtn}>Resume Active Workout →</Text>
        </TouchableOpacity>
      )}

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('ProgramsStack')}
        >
          <Ionicons name="clipboard-outline" size={28} color={themeColors.accent} style={{ marginBottom: 6 }} />
          <Text style={styles.statValue}>{stats.total_programs}</Text>
          <Text style={styles.statLabel}>Programs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('ActiveWorkoutStack')}
        >
          <Ionicons name="body-outline" size={28} color={themeColors.accent} style={{ marginBottom: 6 }} />
          <Text style={styles.statValue}>{stats.total_workouts}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('ProgramsStack')}
        >
          <Ionicons name="barbell-outline" size={28} color={themeColors.accent} style={{ marginBottom: 6 }} />
          <Text style={styles.statValue}>{stats.total_exercises}</Text>
          <Text style={styles.statLabel}>Exercises</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('CalendarStack')}
        >
          <Ionicons name="calendar-outline" size={28} color={themeColors.accent} style={{ marginBottom: 6 }} />
          <Text style={styles.statValue}>{workouts7Days}</Text>
          <Text style={styles.statLabel}>Last 7 Days</Text>
        </TouchableOpacity>
      </View>

      {/* Favorite workouts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Favorite Workouts</Text>
        {(() => {
          const favorites = programTree.filter(({ program }) => program.is_favorite_program);
          if (favorites.length === 0) {
            return (
              <Text style={styles.noData}>
                No favorites yet. Open a program and star it to add it here.
              </Text>
            );
          }
          return favorites.map(({ program, workouts, exerciseCounts }) => (
            <View key={program.id} style={styles.favoriteProgramTile}>
              <View style={styles.favoriteProgramHeader}>
                <Ionicons name="star" size={18} color={themeColors.accent} />
                <Text style={styles.favoriteProgramName}>{program.name}</Text>
              </View>
              {workouts.length === 0 ? (
                <Text style={styles.noData}>No workouts in this program yet.</Text>
              ) : (
                workouts.map((workout) => (
                  <TouchableOpacity
                    key={workout.id}
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
                    <Text style={styles.workoutRowTileName}>{workout.name}</Text>
                    <Text style={styles.workoutRowTileCount}>
                      {exerciseCounts[workout.id] ?? 0}{' '}
                      {(exerciseCounts[workout.id] ?? 0) === 1 ? 'exercise' : 'exercises'}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          ));
        })()}
      </View>

      {/* Exercise progress */}
      {exercises.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Exercise Progress</Text>
          {exercises.map((exercise) => (
            <TouchableOpacity
              key={exercise.exercise_id}
              style={styles.exerciseCard}
              onPress={() => {
                navigation.navigate('ProgramsStack', {
                  screen: 'ExerciseProgress',
                  params: { exerciseId: exercise.exercise_id },
                });
              }}
            >
              <Text style={styles.exerciseCardName}>{exercise.exercise_name}</Text>
              <View style={styles.exerciseCardStats}>
                <Text style={styles.exerciseStatText}>
                  Times exercised: {exercise.times_done}
                </Text>
                <Text style={styles.exerciseStatText}>
                  Max: {formatWeight(exercise.personal_best)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
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
    statIcon: {
      fontSize: 28,
      marginBottom: 6,
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: themeColors.accent,
      textTransform: 'uppercase',
    },
    statLabel: {
      fontSize: 12,
      color: themeColors.textMuted,
      marginTop: 6,
      textTransform: 'uppercase',
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      color: themeColors.textStrong,
      textTransform: 'uppercase',
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
    favoriteStar: {
      fontSize: 18,
      color: themeColors.accent,
    },
    favoriteProgramName: {
      fontSize: 15,
      fontWeight: 'bold',
      color: themeColors.textStrong,
      textTransform: 'uppercase',
      flex: 1,
    },
    workoutRowTile: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: themeColors.accentSoft,
      borderRadius: radius.sm,
      marginBottom: 6,
    },
    workoutRowTileName: {
      fontSize: 14,
      color: themeColors.textStrong,
      fontWeight: '600',
      flex: 1,
    },
    workoutRowTileCount: {
      fontSize: 12,
      color: themeColors.textMuted,
    },
    exerciseCard: {
      backgroundColor: themeColors.surface,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: themeColors.border,
      padding: 12,
      marginBottom: 8,
      ...shadow.card,
    },
    exerciseCardName: {
      fontSize: 14,
      fontWeight: '600',
      color: themeColors.textStrong,
      marginBottom: 4,
    },
    exerciseCardStats: {
      flexDirection: 'row',
      gap: 16,
    },
    exerciseStatText: {
      fontSize: 12,
      color: themeColors.textMuted,
    },
  });

export default HomeScreen;
