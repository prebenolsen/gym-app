import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { type ExerciseProgressHistory } from '@gym-app/shared';
import { useApi } from '../hooks/useApi';
import { usePreferences } from '../context/PreferencesContext';
import { colors, radius, shadow } from '../theme';

type ViewMode = 'max-weight' | 'total-volume';

const ExerciseProgressScreen = ({ route, navigation }: any) => {
  const { exerciseId } = route.params;
  const { unit, convertFromKg, formatWeight } = usePreferences();
  const api = useApi();
  const [data, setData] = useState<ExerciseProgressHistory | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('max-weight');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!exerciseId) return;
      try {
        setLoading(true);
        const progressData = await api.getExerciseProgress(exerciseId, 90);
        setData(progressData);
      } catch (err) {
        console.error('Failed to fetch exercise progress:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, [exerciseId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!data || data.history.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{data?.exercise_name ?? 'Exercise'}</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data available for this exercise yet.</Text>
        </View>
      </View>
    );
  }

  const personalBest = data.history.reduce((max, e) => Math.max(max, e.max_weight), 0);
  const totalTimesExercised = data.history.length;
  const totalRepetitions = data.history.reduce((sum, e) => sum + e.total_reps, 0);
  const totalSets = data.history.reduce((sum, e) => sum + e.sets, 0);
  const totalVolume = data.history.reduce((sum, e) => sum + e.total_volume, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{data.exercise_name}</Text>
        <Text style={styles.personalBest}>
          Personal Best: <Text style={styles.personalBestValue}>{formatWeight(personalBest)}</Text>
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'max-weight' && styles.toggleBtnActive]}
            onPress={() => setViewMode('max-weight')}
          >
            <Text
              style={[styles.toggleBtnText, viewMode === 'max-weight' && styles.toggleBtnTextActive]}
            >
              Max Weight
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'total-volume' && styles.toggleBtnActive]}
            onPress={() => setViewMode('total-volume')}
          >
            <Text
              style={[styles.toggleBtnText, viewMode === 'total-volume' && styles.toggleBtnTextActive]}
            >
              Total Volume
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Workout Days</Text>
            <Text style={styles.metricValue}>{totalTimesExercised}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Reps</Text>
            <Text style={styles.metricValue}>{totalRepetitions}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Sets</Text>
            <Text style={styles.metricValue}>{totalSets}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Volume</Text>
            <Text style={styles.metricValue}>{Math.round(convertFromKg(totalVolume))} {unit}</Text>
          </View>
        </View>

        {/* Progress bars visualization */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>
            {viewMode === 'max-weight' ? 'Max Weight Over Time' : 'Total Volume Over Time'}
          </Text>
          {(() => {
            const values = data.history.map((e) =>
              viewMode === 'max-weight' ? convertFromKg(e.max_weight) : convertFromKg(e.total_volume)
            );
            const maxVal = Math.max(...values, 1);
            const recent = data.history.slice(-15); // show last 15 entries

            return recent.map((entry, idx) => {
              const val = viewMode === 'max-weight'
                ? convertFromKg(entry.max_weight)
                : convertFromKg(entry.total_volume);
              const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
              return (
                <View key={idx} style={styles.barRow}>
                  <Text style={styles.barDate}>{entry.date.slice(5)}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.barValue}>{val.toFixed(1)}</Text>
                </View>
              );
            });
          })()}
        </View>

        {/* History table */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Workout History</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.5 }]}>Date</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText]}>Max ({unit})</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText]}>Vol ({unit})</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText]}>Sets</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText]}>Reps</Text>
          </View>
          {data.history.map((entry, idx) => (
            <View key={idx} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowEven]}>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>{entry.date.slice(5)}</Text>
              <Text style={styles.tableCell}>{convertFromKg(entry.max_weight).toFixed(1)}</Text>
              <Text style={styles.tableCell}>{Math.round(convertFromKg(entry.total_volume))}</Text>
              <Text style={styles.tableCell}>{entry.sets}</Text>
              <Text style={styles.tableCell}>{entry.total_reps}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  backBtn: {
    marginBottom: 4,
  },
  backBtnText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textStrong,
    textTransform: 'uppercase',
  },
  personalBest: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  personalBestValue: {
    color: colors.accent,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  toggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    overflow: 'hidden',
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  toggleBtnActive: {
    backgroundColor: colors.accent,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  toggleBtnTextActive: {
    color: '#fff',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
    ...shadow.card,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.accent,
  },
  chartSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 20,
    ...shadow.card,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textStrong,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  barDate: {
    fontSize: 11,
    color: colors.textMuted,
    width: 36,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: colors.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 5,
  },
  barValue: {
    fontSize: 11,
    color: colors.textMuted,
    width: 40,
    textAlign: 'right',
  },
  historySection: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 32,
    ...shadow.card,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
    marginBottom: 4,
  },
  tableHeaderText: {
    fontWeight: '700',
    color: colors.textStrong,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  tableRowEven: {
    backgroundColor: colors.accentSoft,
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default ExerciseProgressScreen;
