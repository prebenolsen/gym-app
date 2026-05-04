import { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { type ExerciseProgressHistory } from '@gym-app/shared';
import { LineChart } from 'react-native-gifted-charts';
import { useApi } from '../hooks/useApi';
import { usePreferences } from '../context/PreferencesContext';
import { colors, radius, shadow } from '../theme';

type ViewMode = 'max-weight' | 'total-volume';
type RangeKey = '2w' | '1m' | '3m' | '6m' | '12m' | 'all';

const RANGE_OPTIONS: { key: RangeKey; label: string; days?: number }[] = [
  { key: '2w', label: '2W', days: 14 },
  { key: '1m', label: '1M', days: 30 },
  { key: '3m', label: '3M', days: 90 },
  { key: '6m', label: '6M', days: 180 },
  { key: '12m', label: '12M', days: 365 },
  { key: 'all', label: 'All' },
];

const ExerciseProgressScreen = ({ route, navigation }: any) => {
  const { exerciseId } = route.params;
  const { unit, convertFromKg, formatWeight, colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);
  const api = useApi();
  const [data, setData] = useState<ExerciseProgressHistory | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('max-weight');
  const [range, setRange] = useState<RangeKey>('3m');
  const [loading, setLoading] = useState(true);
  const chartWidth = Math.max(Dimensions.get('window').width - 88, 260);
  const history = data?.history ?? [];
  const hasHistory = history.length > 0;

  useEffect(() => {
    const fetchProgress = async () => {
      if (!exerciseId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const selected = RANGE_OPTIONS.find((option) => option.key === range);
        const progressData = await api.getExerciseProgress(exerciseId, selected?.days);
        setData(progressData);
      } catch (err) {
        console.error('Failed to fetch exercise progress:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [api, exerciseId, range]);

  const chartData = useMemo(() => {
    if (!hasHistory) return [];

    const stride = Math.max(1, Math.ceil(history.length / 6));
    return history.map((entry, idx) => {
      const rawValue =
        viewMode === 'max-weight'
          ? convertFromKg(entry.max_weight)
          : convertFromKg(entry.total_volume);
      const showLabel = idx % stride === 0 || idx === history.length - 1;

      return {
        value: Number(rawValue.toFixed(1)),
        label: showLabel ? entry.date.slice(5) : '',
        dataPointText: Number(rawValue.toFixed(1)).toString(),
      };
    });
  }, [hasHistory, history, viewMode, convertFromKg]);

  const maxChartValue = useMemo(() => {
    if (chartData.length === 0) return 1;
    const highest = Math.max(...chartData.map((point) => point.value), 1);
    return Math.ceil(highest * 1.1);
  }, [chartData]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={themeColors.accent} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Exercise</Text>
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
          Personal Best:{' '}
          <Text style={styles.personalBestValue}>{formatWeight(personalBest)}</Text>
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              viewMode === 'max-weight' && styles.toggleBtnActive,
            ]}
            onPress={() => setViewMode('max-weight')}
          >
            <Text
              style={[
                styles.toggleBtnText,
                viewMode === 'max-weight' && styles.toggleBtnTextActive,
              ]}
            >
              Max Weight
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              viewMode === 'total-volume' && styles.toggleBtnActive,
            ]}
            onPress={() => setViewMode('total-volume')}
          >
            <Text
              style={[
                styles.toggleBtnText,
                viewMode === 'total-volume' && styles.toggleBtnTextActive,
              ]}
            >
              Total Volume
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rangeSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rangeRow}
          >
            {RANGE_OPTIONS.map((option) => {
              const active = range === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.rangeChip, active && styles.rangeChipActive]}
                  onPress={() => setRange(option.key)}
                >
                  <Text
                    style={[styles.rangeChipText, active && styles.rangeChipTextActive]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
            <Text style={styles.metricValue}>
              {Math.round(convertFromKg(totalVolume))} {unit}
            </Text>
          </View>
        </View>

        {/* Graph visualization */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>
            {viewMode === 'max-weight'
              ? 'Max Weight Over Time'
              : 'Total Volume Over Time'}
          </Text>
          {hasHistory ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chartScrollContent}
            >
              <LineChart
                data={chartData}
                width={Math.max(chartWidth, chartData.length * 38)}
                height={220}
                noOfSections={4}
                maxValue={maxChartValue}
                spacing={38}
                initialSpacing={10}
                endSpacing={10}
                color={themeColors.accent}
                thickness={3}
                dataPointsRadius={4}
                dataPointsColor={themeColors.accent}
                yAxisColor={themeColors.border}
                xAxisColor={themeColors.border}
                yAxisTextStyle={{ color: themeColors.textMuted, fontSize: 11 }}
                xAxisLabelTextStyle={{ color: themeColors.textMuted, fontSize: 10 }}
                rulesColor={themeColors.border}
                hideRules={false}
                isAnimated
                animationDuration={450}
                areaChart
                startFillColor={themeColors.accent}
                endFillColor={themeColors.accent}
                startOpacity={0.2}
                endOpacity={0.02}
                showDataPointOnFocus
                showStripOnFocus
                stripColor={themeColors.accent}
              />
            </ScrollView>
          ) : (
            <Text style={styles.emptyGraphText}>No workout data in this date range.</Text>
          )}
        </View>

        {/* History table */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Workout History</Text>
          {hasHistory ? (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.5 }]}>
                  Date
                </Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>
                  Max ({unit})
                </Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>
                  Vol ({unit})
                </Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>Sets</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>Reps</Text>
              </View>
              {[...data.history]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((entry, idx) => (
                              <View
                  key={idx}
                  style={[styles.tableRow, idx % 2 === 0 && styles.tableRowEven]}
                >
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>
                    {entry.date.slice(5)}
                  </Text>
                  <Text style={styles.tableCell}>
                    {convertFromKg(entry.max_weight).toFixed(1)}
                  </Text>
                  <Text style={styles.tableCell}>
                    {Math.round(convertFromKg(entry.total_volume))}
                  </Text>
                  <Text style={styles.tableCell}>{entry.sets}</Text>
                  <Text style={styles.tableCell}>{entry.total_reps}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.emptyGraphText}>No history rows in this date range.</Text>
          )}
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
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: themeColors.background,
    },
    header: {
      backgroundColor: themeColors.surface,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      gap: 4,
    },
    backBtn: {
      marginBottom: 4,
    },
    backBtnText: {
      color: themeColors.accent,
      fontSize: 14,
      fontWeight: '600',
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: themeColors.textStrong,
      textTransform: 'capitalize',
    },
    personalBest: {
      fontSize: 13,
      color: themeColors.textMuted,
      marginTop: 2,
    },
    personalBestValue: {
      color: themeColors.accent,
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
      color: themeColors.textMuted,
      textAlign: 'center',
    },
    toggle: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.sm,
      overflow: 'hidden',
      marginBottom: 16,
    },
    toggleBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: themeColors.surface,
    },
    toggleBtnActive: {
      backgroundColor: themeColors.accent,
    },
    toggleBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: themeColors.textMuted,
    },
    toggleBtnTextActive: {
      color: '#fff',
    },
    rangeSection: {
      marginBottom: 16,
    },
    rangeRow: {
      gap: 8,
      justifyContent: 'center',
      alignItems: 'center',
      flexGrow: 1,
      paddingRight: 4,
    },
    rangeChip: {
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.surface,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    rangeChipActive: {
      borderColor: themeColors.accent,
      backgroundColor: themeColors.accent,
    },
    rangeChipText: {
      color: themeColors.textMuted,
      fontWeight: '700',
      fontSize: 12,
      textTransform: 'capitalize',
    },
    rangeChipTextActive: {
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
      backgroundColor: themeColors.surface,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: themeColors.border,
      padding: 12,
      alignItems: 'center',
      ...shadow.card,
    },
    metricLabel: {
      fontSize: 12,
      color: themeColors.textMuted,
      textTransform: 'capitalize',
      marginBottom: 4,
    },
    metricValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: themeColors.accent,
    },
    chartSection: {
      backgroundColor: themeColors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: themeColors.border,
      padding: 16,
      marginBottom: 20,
      ...shadow.card,
    },
    chartScrollContent: {
      paddingRight: 8,
    },
    emptyGraphText: {
      color: themeColors.textMuted,
      fontSize: 13,
      textAlign: 'center',
      paddingVertical: 24,
      textTransform: 'capitalize',
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: themeColors.textStrong,
      textTransform: 'capitalize',
      marginBottom: 12,
    },
    historySection: {
      backgroundColor: themeColors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: themeColors.border,
      padding: 16,
      marginBottom: 32,
      ...shadow.card,
    },
    tableHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      paddingBottom: 8,
      marginBottom: 4,
    },
    tableHeaderText: {
      fontWeight: '700',
      color: themeColors.textStrong,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 6,
    },
    tableRowEven: {
      backgroundColor: themeColors.accentSoft,
    },
    tableCell: {
      flex: 1,
      fontSize: 12,
      color: themeColors.textMuted,
      textAlign: 'center',
    },
  });

export default ExerciseProgressScreen;
