import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { type WorkoutHistoryByDate } from '@gym-app/shared';
import { useApi } from '../hooks/useApi';
import { colors, radius, shadow } from '../theme';

const toMonthKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const formatMonthHeading = (date: Date): string =>
  date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

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
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
};

const CalendarScreen = ({ navigation }: any) => {
  const api = useApi();
  const [monthDate, setMonthDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<WorkoutHistoryByDate[]>([]);

  const loadWorkouts = async (date: Date) => {
    setLoading(true);
    try {
      const monthKey = toMonthKey(date);
      const data = await api.getWorkoutsByMonth(monthKey);
      setWorkouts(data);
    } catch (err) {
      console.error('Failed to load workouts for calendar:', err);
      setWorkouts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkouts(monthDate);
  }, [monthDate]);

  const heading = useMemo(() => formatMonthHeading(monthDate), [monthDate]);

  const shiftMonth = (offset: number) => {
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workout History</Text>
        <View style={styles.monthRow}>
          <TouchableOpacity style={styles.monthButton} onPress={() => shiftMonth(-1)}>
            <Text style={styles.monthButtonText}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{heading}</Text>
          <TouchableOpacity style={styles.monthButton} onPress={() => shiftMonth(1)}>
            <Text style={styles.monthButtonText}>▶</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : workouts.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No workouts completed in this month</Text>
        </View>
      ) : (
        <ScrollView style={styles.list}>
          {workouts.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.historyItem}
              onPress={() => navigation.navigate('WorkoutHistoryDetail', { sessionId: item.id })}
            >
              <Text style={styles.workoutName}>{item.workout_name}</Text>
              <Text style={styles.metaText}>Start: {formatTime(item.started_at)}</Text>
              {item.ended_at ? <Text style={styles.metaText}>End: {formatTime(item.ended_at)}</Text> : null}
              <Text style={styles.metaText}>
                Duration: {formatDuration(item.started_at, item.ended_at)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    padding: 16,
  },
  title: {
    color: colors.textStrong,
    fontSize: 22,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  monthRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthLabel: {
    color: colors.textStrong,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  monthButton: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  monthButtonText: {
    color: colors.textStrong,
    fontWeight: '700',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  historyItem: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
    ...shadow.card,
  },
  workoutName: {
    color: colors.textStrong,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  metaText: {
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
});

export default CalendarScreen;
