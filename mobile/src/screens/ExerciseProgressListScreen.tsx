import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type ExerciseHistorySummary, type ExerciseProgressEntry } from '@gym-app/shared';
import { useApi } from '../hooks/useApi';
import { usePreferences } from '../context/PreferencesContext';
import { colors, radius, shadow } from '../theme';

type ExerciseMonthlyStats = {
  exerciseId: string;
  exerciseName: string;
  trainingDays: number;
  totalVolume: number;
  maxWeight: number;
  growthPercent: number | null;
};

type FunFacts = {
  mostTrained: ExerciseMonthlyStats | null;
  leastFavorite: ExerciseMonthlyStats | null;
  biggestGrowth: ExerciseMonthlyStats | null;
  totalTrainingDays: number;
  activeExercisesCount: number;
};

const LOOKBACK_DAYS = 30;

const sumBy = (entries: ExerciseProgressEntry[], selector: (entry: ExerciseProgressEntry) => number): number =>
  entries.reduce((sum, entry) => sum + selector(entry), 0);

const getGrowthPercent = (entries: ExerciseProgressEntry[]): number | null => {
  if (entries.length < 2) return null;

  const first = entries[0].max_weight;
  const last = entries[entries.length - 1].max_weight;

  if (first <= 0 || last <= first) return null;
  return ((last - first) / first) * 100;
};

const getFunFacts = (stats: ExerciseMonthlyStats[]): FunFacts => {
  const mostTrained =
    stats.length > 0
      ? stats.reduce((best, entry) =>
          entry.trainingDays > best.trainingDays ? entry : best,
        )
      : null;

  const leastFavorite =
    stats.length > 0
      ? stats.reduce((least, entry) =>
          entry.trainingDays < least.trainingDays ? entry : least,
        )
      : null;

  const growthCandidates = stats.filter((entry) => entry.growthPercent !== null);
  const biggestGrowth =
    growthCandidates.length > 0
      ? growthCandidates.reduce((best, entry) =>
          (entry.growthPercent ?? 0) > (best.growthPercent ?? 0) ? entry : best,
        )
      : null;

  return {
    mostTrained,
    leastFavorite,
    biggestGrowth,
    totalTrainingDays: stats.reduce((sum, entry) => sum + entry.trainingDays, 0),
    activeExercisesCount: stats.filter((entry) => entry.trainingDays > 0).length,
  };
};

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

const ExerciseProgressListScreen = ({ navigation }: any) => {
  const { formatWeight, colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);
  const api = useApi();

  const [loading, setLoading] = useState(true);
  const [loadingFacts, setLoadingFacts] = useState(true);
  const [exercises, setExercises] = useState<ExerciseHistorySummary[]>([]);
  const [funFacts, setFunFacts] = useState<FunFacts | null>(null);

  useEffect(() => {
    const loadExerciseHistory = async () => {
      setLoading(true);
      setLoadingFacts(true);
      try {
        const data = await api.getExerciseHistory();
        setExercises(data);

        if (data.length === 0) {
          setFunFacts(null);
          return;
        }

        const monthlyStats = await Promise.all(
          data.map(async (exercise) => {
            try {
              const progress = await api.getExerciseProgress(
                exercise.exercise_id,
                LOOKBACK_DAYS,
              );
              const history = progress.history;

              return {
                exerciseId: exercise.exercise_id,
                exerciseName: exercise.exercise_name,
                trainingDays: history.length,
                totalVolume: sumBy(history, (entry) => entry.total_volume),
                maxWeight: history.reduce(
                  (max, entry) => Math.max(max, entry.max_weight),
                  0,
                ),
                growthPercent: getGrowthPercent(history),
              } satisfies ExerciseMonthlyStats;
            } catch (err) {
              console.error(
                `Failed to fetch 30-day exercise progress for ${exercise.exercise_name}:`,
                err,
              );
              return {
                exerciseId: exercise.exercise_id,
                exerciseName: exercise.exercise_name,
                trainingDays: 0,
                totalVolume: 0,
                maxWeight: 0,
                growthPercent: null,
              } satisfies ExerciseMonthlyStats;
            }
          }),
        );

        setFunFacts(getFunFacts(monthlyStats));
      } catch (err) {
        console.error('Failed to fetch exercise history:', err);
        setFunFacts(null);
      } finally {
        setLoadingFacts(false);
        setLoading(false);
      }
    };

    loadExerciseHistory();
  }, [api]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={themeColors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={themeColors.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>Your Exercise Progress</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.funFactsSection}>
          <Text style={styles.funFactsTitle}>Last 30 days fun facts</Text>
          {loadingFacts ? (
            <Text style={styles.funFactsLoading}>Crunching your numbers...</Text>
          ) : funFacts ? (
            <>
              <View style={styles.factCardRow}>
                <View style={[styles.factCard, styles.factCardHalf]}>
                  <Text style={styles.factLabel}>Most trained</Text>
                  <Text style={styles.factValueSmall}>
                    {funFacts.mostTrained?.exerciseName ?? 'N/A'}
                  </Text>
                  <Text style={styles.factMeta}>
                    {funFacts.mostTrained?.trainingDays ?? 0} training days
                  </Text>
                </View>

                <View style={[styles.factCard, styles.factCardHalf]}>
                  <Text style={styles.factLabel}>Least trained</Text>
                  <Text style={styles.factValueSmall}>
                    {funFacts.leastFavorite?.exerciseName ?? 'N/A'}
                  </Text>
                  <Text style={styles.factMeta}>
                    {funFacts.leastFavorite?.trainingDays ?? 0} training days
                  </Text>
                </View>
              </View>

              <View style={styles.factCard}>
                <Text style={styles.factLabel}>Biggest strength growth</Text>
                <Text style={styles.factValue}>
                  {funFacts.biggestGrowth?.exerciseName ?? 'No clear winner yet'}
                </Text>
                <Text style={styles.factMeta}>
                  {funFacts.biggestGrowth?.growthPercent
                    ? `${formatPercent(funFacts.biggestGrowth.growthPercent)} max-weight growth`
                    : 'Need at least two logged days with upward trend'}
                </Text>
              </View>

              <View style={styles.factSummaryRow}>
                <Text style={styles.factSummaryText}>
                  Active exercises in last 30d: {funFacts.activeExercisesCount}
                </Text>
                <Text style={styles.factSummaryText}>
                  Total training days logged: {funFacts.totalTrainingDays}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.funFactsLoading}>No monthly stats yet.</Text>
          )}
        </View>

        <Text style={styles.listHeading}>All exercises done</Text>
        {exercises.length === 0 ? (
          <Text style={styles.noData}>No exercise progress data yet.</Text>
        ) : (
          exercises.map((exercise) => (
            <TouchableOpacity
              key={exercise.exercise_id}
              style={styles.exerciseCard}
              onPress={() =>
                navigation.navigate('ExerciseProgress', {
                  exerciseId: exercise.exercise_id,
                })
              }
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
          ))
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
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: themeColors.background,
    },
    header: {
      backgroundColor: themeColors.surface,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: themeColors.textStrong,
      flex: 1,
    },
    backButton: {},
    content: {
      flex: 1,
      padding: 16,
    },
    funFactsSection: {
      marginBottom: 18,
      gap: 10,
    },
    funFactsTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: themeColors.textStrong,
    },
    funFactsLoading: {
      fontSize: 13,
      color: themeColors.textMuted,
      fontStyle: 'italic',
    },
    factCard: {
      backgroundColor: themeColors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: themeColors.border,
      padding: 12,
      ...shadow.card,
    },
    factCardRow: {
      flexDirection: 'row',
      gap: 10,
    },
    factCardHalf: {
      flex: 1,
    },
    factLabel: {
      fontSize: 12,
      color: themeColors.textMuted,
      marginBottom: 2,
    },
    factValue: {
      fontSize: 16,
      fontWeight: '700',
      color: themeColors.textStrong,
      marginBottom: 4,
    },
    factValueSmall: {
      fontSize: 14,
      fontWeight: '700',
      color: themeColors.textStrong,
      marginBottom: 4,
    },
    factMeta: {
      fontSize: 12,
      color: themeColors.textMuted,
    },
    factSummaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
      flexWrap: 'wrap',
    },
    factSummaryText: {
      fontSize: 12,
      color: themeColors.textMuted,
      fontWeight: '600',
    },
    listHeading: {
      fontSize: 14,
      fontWeight: '700',
      color: themeColors.textStrong,
      marginBottom: 8,
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

export default ExerciseProgressListScreen;
