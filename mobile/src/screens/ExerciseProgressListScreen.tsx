import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { type ExerciseHistorySummary } from '@gym-app/shared';
import { useApi } from '../hooks/useApi';
import { usePreferences } from '../context/PreferencesContext';
import { colors, radius, shadow } from '../theme';

const ExerciseProgressListScreen = ({ navigation }: any) => {
  const { formatWeight, colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);
  const api = useApi();

  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<ExerciseHistorySummary[]>([]);

  useEffect(() => {
    const loadExerciseHistory = async () => {
      setLoading(true);
      try {
        const data = await api.getExerciseHistory();
        setExercises(data);
      } catch (err) {
        console.error('Failed to fetch exercise history:', err);
      } finally {
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
        <Text style={styles.title}>Your Exercise Progress</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
      paddingVertical: 14,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: themeColors.textStrong,
      textTransform: 'capitalize',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    noData: {
      padding: 16,
      backgroundColor: themeColors.accentSoft,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: themeColors.border,
      color: themeColors.textStrong,
      textAlign: 'center',
      textTransform: 'capitalize',
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
      textTransform: 'capitalize',
    },
    exerciseCardStats: {
      flexDirection: 'row',
      gap: 16,
    },
    exerciseStatText: {
      fontSize: 12,
      color: themeColors.textMuted,
      textTransform: 'capitalize',
    },
  });

export default ExerciseProgressListScreen;
