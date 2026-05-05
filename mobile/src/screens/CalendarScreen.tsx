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
import { usePreferences } from '../context/PreferencesContext';

const toMonthKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

type CalendarDayCell = {
  date: Date;
  inCurrentMonth: boolean;
};

const getCalendarCells = (monthDate: Date): CalendarDayCell[] => {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1 - startOffset,
  );

  return Array.from({ length: 42 }).map((_, idx) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + idx);
    return {
      date,
      inCurrentMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
};

const CalendarScreen = ({ navigation }: any) => {
  const api = useApi();
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [loadingDates, setLoadingDates] = useState(true);
  const [workouts, setWorkouts] = useState<WorkoutHistoryByDate[]>([]);
  const [datesWithWorkouts, setDatesWithWorkouts] = useState<Set<string>>(new Set());

  const calendarCells = useMemo(() => getCalendarCells(monthDate), [monthDate]);

  const selectedDayKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);

  const workoutsForSelectedDay = useMemo(
    () => workouts.filter((entry) => entry.started_at.slice(0, 10) === selectedDayKey),
    [workouts, selectedDayKey],
  );

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

  const loadDatesWithWorkouts = async (date: Date) => {
    setLoadingDates(true);
    try {
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const startDate = new Date(startOfMonth);
      startDate.setDate(startDate.getDate() - 7);

      const endDate = new Date(endOfMonth);
      endDate.setDate(endDate.getDate() + 7);

      const dates = await api.getDatesWithWorkouts(
        toDateKey(startDate),
        toDateKey(endDate),
      );
      setDatesWithWorkouts(new Set(dates));
    } catch (err) {
      console.error('Failed to load dates with workouts:', err);
      setDatesWithWorkouts(new Set());
    } finally {
      setLoadingDates(false);
    }
  };

  useEffect(() => {
    loadWorkouts(monthDate);
    loadDatesWithWorkouts(monthDate);
  }, [monthDate]);

  const heading = useMemo(() => formatMonthHeading(monthDate), [monthDate]);

  const shiftMonth = (offset: number) => {
    setMonthDate((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + offset, 1);
      setSelectedDate(next);
      return next;
    });
  };

  const renderCalendarGrid = () => {
    return (
      <View style={styles.calendarCard}>
        <View style={styles.weekdaysRow}>
          {WEEKDAY_LABELS.map((label) => (
            <Text key={label} style={styles.weekdayText}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {calendarCells.map((cell) => {
            const key = toDateKey(cell.date);
            const hasWorkout = datesWithWorkouts.has(key);
            const isSelected = key === selectedDayKey;

            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.dayCell,
                  !cell.inCurrentMonth && styles.dayCellOutside,
                  isSelected && styles.dayCellSelected,
                ]}
                onPress={() => setSelectedDate(cell.date)}
              >
                <Text
                  style={[
                    styles.dayCellText,
                    !cell.inCurrentMonth && styles.dayCellTextOutside,
                    isSelected && styles.dayCellTextSelected,
                  ]}
                >
                  {cell.date.getDate()}
                </Text>
                {hasWorkout ? <View style={styles.workoutDot} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workout History</Text>
        <View style={styles.monthRow}>
          <TouchableOpacity style={styles.monthButton} onPress={() => shiftMonth(-1)}>
            <Text style={styles.monthButtonText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{heading}</Text>
          <TouchableOpacity style={styles.monthButton} onPress={() => shiftMonth(1)}>
            <Text style={styles.monthButtonText}>{'>'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading || loadingDates ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={themeColors.accent} />
        </View>
      ) : (
        <ScrollView style={styles.list}>
          {renderCalendarGrid()}

          <View style={styles.listHeaderBlock}>
            <Text style={styles.listTitle}>Workouts</Text>
            <Text style={styles.listSubtitle}>{selectedDayKey}</Text>
          </View>

          {workoutsForSelectedDay.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyText}>No workouts for selected date</Text>
            </View>
          ) : (
            workoutsForSelectedDay.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.historyItem}
                onPress={() =>
                  navigation.navigate('WorkoutHistoryDetail', { sessionId: item.id })
                }
              >
                <Text style={styles.workoutName}>{item.workout_name}</Text>
                <Text style={styles.metaText}>Start: {formatTime(item.started_at)}</Text>
                {item.ended_at ? (
                  <Text style={styles.metaText}>End: {formatTime(item.ended_at)}</Text>
                ) : null}
                <Text style={styles.metaText}>
                  Duration: {formatDuration(item.started_at, item.ended_at)}
                </Text>
              </TouchableOpacity>
            ))
          )}
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
    header: {
      backgroundColor: themeColors.surface,
      borderBottomColor: themeColors.border,
      borderBottomWidth: 1,
      padding: 16,
    },
    title: {
      color: themeColors.textStrong,
      fontSize: 22,
      fontWeight: '700',
      
    },
    monthRow: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    monthLabel: {
      color: themeColors.textStrong,
      fontWeight: '700',
      
    },
    monthButton: {
      borderColor: themeColors.border,
      borderWidth: 1,
      borderRadius: radius.sm,
      backgroundColor: themeColors.background,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    monthButtonText: {
      color: themeColors.textStrong,
      fontWeight: '700',
    },
    calendarCard: {
      backgroundColor: themeColors.surface,
      borderColor: themeColors.border,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: 10,
      marginBottom: 14,
      ...shadow.card,
    },
    weekdaysRow: {
      flexDirection: 'row',
      marginBottom: 6,
    },
    weekdayText: {
      flex: 1,
      textAlign: 'center',
      color: themeColors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 6,
    },
    dayCell: {
      width: '14.2857%',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: radius.sm,
      minHeight: 42,
    },
    dayCellOutside: {
      opacity: 0.5,
    },
    dayCellSelected: {
      backgroundColor: themeColors.accentSoft,
      borderColor: themeColors.accent,
      borderWidth: 1,
    },
    dayCellText: {
      color: themeColors.textStrong,
      fontWeight: '600',
      fontSize: 12,
    },
    dayCellTextOutside: {
      color: themeColors.textMuted,
    },
    dayCellTextSelected: {
      color: themeColors.accent,
      fontWeight: '700',
    },
    workoutDot: {
      marginTop: 3,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: themeColors.accent,
    },
    list: {
      flex: 1,
      padding: 16,
    },
    listHeaderBlock: {
      marginBottom: 10,
      gap: 3,
    },
    listTitle: {
      color: themeColors.textStrong,
      fontSize: 16,
      fontWeight: '700',
      
    },
    listSubtitle: {
      color: themeColors.textMuted,
      fontSize: 12,
      
    },
    historyItem: {
      backgroundColor: themeColors.surface,
      borderColor: themeColors.border,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: 14,
      marginBottom: 10,
      ...shadow.card,
    },
    workoutName: {
      color: themeColors.textStrong,
      fontWeight: '700',
      marginBottom: 6,
      
    },
    metaText: {
      color: themeColors.textMuted,
      
      fontSize: 12,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    emptyBlock: {
      backgroundColor: themeColors.surface,
      borderColor: themeColors.border,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: 14,
    },
    emptyText: {
      color: themeColors.textMuted,
      
    },
  });

export default CalendarScreen;
