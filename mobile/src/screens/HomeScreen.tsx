import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { type WorkoutStats } from '@gym-app/shared';
import { colors, radius, shadow } from '../theme';
import { useApi } from '../hooks/useApi';

const HomeScreen = () => {
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [loading, setLoading] = useState(true);

  const api = useApi();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {!stats ? (
        <Text style={styles.noData}>
          No workout data yet. Create a program to get started!
        </Text>
      ) : (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📋</Text>
            <Text style={styles.statValue}>{stats.total_programs}</Text>
            <Text style={styles.statLabel}>Programs</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🏋️</Text>
            <Text style={styles.statValue}>{stats.total_workouts}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💪</Text>
            <Text style={styles.statValue}>{stats.total_exercises}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  noData: {
    padding: 16,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textStrong,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.accent,
    textTransform: 'uppercase',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
    textTransform: 'uppercase',
  },
});

export default HomeScreen;
