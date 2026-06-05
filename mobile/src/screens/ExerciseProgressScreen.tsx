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
import { Ionicons } from '@expo/vector-icons';
import { type ExerciseProgressHistory } from '@gym-app/shared';
import { LineChart } from 'react-native-gifted-charts';
import { useApi } from '../hooks/useApi';
import { usePreferences } from '../context/PreferencesContext';
import { colors, radius, shadow } from '../theme';
import ChipButton from '../components/ui/ChipButton';
import SegmentedControl from '../components/ui/SegmentedControl';

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
  const { unit, convertFromKg, formatWeight, colors: themeColors, formatDateOnly, dateFormat } = usePreferences();
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

    const formatDateCompact = (dateStr: string): string => {
      // dateStr is in format YYYY-MM-DD
      const parts = dateStr.split('-');
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      
      if (dateFormat === 'eu') {
        return `${day}/${month}`;
      } else if (dateFormat === 'us') {
        return `${month}/${day}`;
      } else {
        // 'iso' format
        return `${month}-${day}`;
      }
    };

    const stride = Math.max(1, Math.ceil(history.length / 6));
    return history.map((entry, idx) => {
      const rawValue =
        viewMode === 'max-weight'
          ? convertFromKg(entry.max_weight)
          : convertFromKg(entry.total_volume);
      const showLabel = idx % stride === 0 || idx === history.length - 1;

      return {
        value: Number(rawValue.toFixed(1)),
        label: showLabel ? formatDateCompact(entry.date) : '',
        dataPointText: Number(rawValue.toFixed(1)).toString(),
      };
    });
  }, [hasHistory, history, viewMode, convertFromKg, dateFormat]);

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
            <Ionicons name="chevron-back" size={24} color={themeColors.accent} />
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
          <Ionicons name="chevron-back" size={24} color={themeColors.accent} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{data.exercise_name}</Text>
          <Text style={styles.personalBest}>
            Personal Best:{' '}
            <Text style={styles.personalBestValue}>{formatWeight(personalBest)}</Text>
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Toggle */}
        <SegmentedControl
          style={styles.toggle}
          options={[
            { value: 'max-weight', label: 'Max Weight' },
            { value: 'total-volume', label: 'Total Volume' },
          ]}
          selectedValue={viewMode}
          onChange={setViewMode}
        />

        <View style={styles.rangeSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rangeRow}
          >
            {RANGE_OPTIONS.map((option) => {
              const active = range === option.key;
              return (
                <ChipButton
                  key={option.key}
                  label={option.label}
                  selected={active}
                  compact
                  onPress={() => setRange(option.key)}
                />
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
                    {formatDateOnly(`${entry.date}T00:00:00Z`)}
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
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backBtn: {
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: themeColors.textStrong,
      
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
      marginBottom: 16,
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
      
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: themeColors.textStrong,
      
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
