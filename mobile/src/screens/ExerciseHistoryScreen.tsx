import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { type ExerciseLastPerformance } from '@gym-app/shared';
import { useApi } from '../hooks/useApi';
import { colors, radius, shadow } from '../theme';
import { usePreferences } from '../context/PreferencesContext';
import ScreenHeader from '../components/ui/ScreenHeader';

type GroupedByDate = {
  date: string;
  sets: ExerciseLastPerformance[];
};

const ExerciseHistoryScreen = ({ route, navigation }: any) => {
  const { exerciseId, exerciseName } = route.params;
  const api = useApi();
  const { colors: themeColors, unit, convertFromKg, formatDateOnly } = usePreferences();
  const styles = createStyles(themeColors);

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<GroupedByDate[]>([]);

  useEffect(() => {
    loadExerciseHistory();
  }, [exerciseId]);

  const loadExerciseHistory = async () => {
    setLoading(true);
    try {
      const sessions = await api.getWorkoutSessions();
      const relevantSets: Map<string, ExerciseLastPerformance[]> = new Map();

      // Collect all sets for this exercise, grouped by date
      for (const session of sessions) {
        const isoDate = (session.ended_at || session.started_at);
        const date = isoDate.split('T')[0]; // Extract YYYY-MM-DD for grouping
        const sets = await api.getSessionSets(session.id, exerciseId);

        if (sets.length > 0) {
          if (!relevantSets.has(date)) {
            relevantSets.set(date, []);
          }
          relevantSets.get(date)!.push(...sets);
        }
      }

      // Sort by date descending (newest first)
      const grouped: GroupedByDate[] = Array.from(relevantSets.entries())
        .map(([date, sets]) => ({ date, sets }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setHistory(grouped);
    } catch (err) {
      console.error('Failed to load exercise history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatWeight = (kg: number): string => {
    const converted = convertFromKg(kg);
    return Number.isInteger(converted) ? String(converted) : converted.toFixed(1);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={`${exerciseName} History`} onBackPress={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={themeColors.accent} />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No history found for this exercise.</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {history.map((group) => (
            <View key={group.date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{formatDateOnly(`${group.date}T00:00:00Z`)}</Text>
              <View style={styles.setsTable}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, styles.setNumber]}>Set</Text>
                  <Text style={[styles.tableCell, styles.weight]}>Weight ({unit})</Text>
                  <Text style={[styles.tableCell, styles.reps]}>Reps</Text>
                </View>
                {group.sets.map((set, idx) => (
                  <View
                    key={`${group.date}-${set.set_number}-${idx}`}
                    style={styles.tableRow}
                  >
                    <Text style={[styles.tableCell, styles.setNumber]}>
                      {set.set_number}
                    </Text>
                    <Text style={[styles.tableCell, styles.weight]}>
                      {formatWeight(set.weight)}
                    </Text>
                    <Text style={[styles.tableCell, styles.reps]}>{set.reps}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
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
      padding: 20,
    },
    emptyText: {
      color: themeColors.textMuted,
      fontSize: 14,
      textAlign: 'center',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    dateGroup: {
      marginBottom: 20,
    },
    dateHeader: {
      color: themeColors.textStrong,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 8,
      
    },
    setsTable: {
      backgroundColor: themeColors.surface,
      borderColor: themeColors.border,
      borderWidth: 1,
      borderRadius: radius.md,
      overflow: 'hidden',
      ...shadow.card,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: themeColors.background,
      borderBottomColor: themeColors.border,
      borderBottomWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    tableRow: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomColor: themeColors.border,
      borderBottomWidth: 1,
    },
    tableCell: {
      color: themeColors.textStrong,
      fontSize: 12,
      fontWeight: '600',
    },
    setNumber: {
      width: 50,
    },
    weight: {
      flex: 1,
      textAlign: 'center',
    },
    reps: {
      flex: 1,
      textAlign: 'right',
    },
  });

export default ExerciseHistoryScreen;
