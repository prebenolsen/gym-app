import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { type WorkoutSessionDetail, type WorkoutSessionSet } from '@gym-app/shared';
import { useApi } from '../hooks/useApi';
import { colors, radius, shadow } from '../theme';
import { usePreferences } from '../context/PreferencesContext';
import ScreenHeader from '../components/ui/ScreenHeader';

const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatDuration = (startIso: string, endIso: string | null): string => {
  if (!endIso) return 'IN PROGRESS';
  const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes} MIN`;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${hours}H ${minutes}M`;
};

const WorkoutHistoryDetailScreen = ({ route, navigation }: any) => {
  const api = useApi();
  const { colors: themeColors, unit, convertFromKg, formatDate } = usePreferences();
  const styles = createStyles(themeColors);
  const { sessionId } = route.params;
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<WorkoutSessionDetail | null>(null);

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      try {
        const data = await api.getSessionDetails(sessionId);
        setDetail(data);
      } catch (err) {
        console.error('Failed to load workout history details:', err);
        setDetail(null);
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [sessionId]);

  const groupedByExercise = useMemo(() => {
    if (!detail) return {} as Record<string, WorkoutSessionSet[]>;
    return detail.sets.reduce(
      (acc, set) => {
        if (!acc[set.exercise_name]) {
          acc[set.exercise_name] = [];
        }
        acc[set.exercise_name].push(set);
        return acc;
      },
      {} as Record<string, WorkoutSessionSet[]>,
    );
  }, [detail]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={themeColors.accent} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Failed to load workout details.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        onBackPress={() => navigation.goBack()}
        title="Workout Details"
        subtitle={
          `${formatDate(detail.session.started_at)} · Start: ${formatTime(detail.session.started_at)}${
            detail.session.ended_at ? ` · End: ${formatTime(detail.session.ended_at)}` : ''
          } · Duration: ${formatDuration(detail.session.started_at, detail.session.ended_at)}`
        }
      />

      <ScrollView style={styles.list}>
        {Object.entries(groupedByExercise).map(([exerciseName, sets]) => (
          <View key={exerciseName} style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{exerciseName}</Text>
            {sets.map((set) => (
              <View key={set.id} style={styles.setRow}>
                <Text style={styles.setCell}>Set #{set.set_number}</Text>
                <Text style={styles.setCell}>
                  {convertFromKg(set.weight).toFixed(1)} {unit}
                </Text>
                <Text style={styles.setCell}>{set.reps} reps</Text>
              </View>
            ))}
          </View>
        ))}

        {Object.keys(groupedByExercise).length === 0 ? (
          <Text style={styles.emptyText}>No exercises recorded for this workout.</Text>
        ) : null}
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
      backgroundColor: themeColors.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    metaText: {
      color: themeColors.textMuted,
      
      fontSize: 12,
    },
    list: {
      flex: 1,
      padding: 16,
    },
    exerciseCard: {
      backgroundColor: themeColors.surface,
      borderColor: themeColors.border,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: 14,
      marginBottom: 10,
      ...shadow.card,
    },
    exerciseName: {
      color: themeColors.textStrong,
      fontWeight: '700',
      marginBottom: 8,
      
    },
    setRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderTopColor: themeColors.border,
      borderTopWidth: 1,
    },
    setCell: {
      color: themeColors.textMuted,
      
      fontSize: 12,
    },
    emptyText: {
      color: themeColors.textMuted,
      
      textAlign: 'center',
      marginTop: 16,
    },
  });

export default WorkoutHistoryDetailScreen;
