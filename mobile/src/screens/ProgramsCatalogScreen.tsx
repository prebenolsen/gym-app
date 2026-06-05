import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { PROGRAM_TEMPLATES, type ProgramTemplate } from '@gym-app/shared';
import { colors, radius, shadow } from '../theme';
import { usePreferences } from '../context/PreferencesContext';
import AppButton from '../components/ui/AppButton';
import ScreenHeader from '../components/ui/ScreenHeader';

const TIME_PER_SET_SECONDS = { low: 30, high: 45 };

const roundDownToNearestFive = (value: number) => Math.floor(value / 5) * 5;
const roundUpToNearestFive = (value: number) => Math.ceil(value / 5) * 5;

const getExerciseTimeSecondsRange = (sets: number, restSeconds: number) => {
  const low = sets * TIME_PER_SET_SECONDS.low + Math.max(sets - 1, 0) * restSeconds;
  const high = sets * TIME_PER_SET_SECONDS.high + Math.max(sets - 1, 0) * restSeconds;
  return { low, high };
};

const getProgramAverageWorkoutEstimateMinutes = (template: ProgramTemplate) => {
  if (template.workouts.length === 0) return { low: 0, high: 0 };

  const total = template.workouts.reduce(
    (programTotal, workout) => {
      const workoutRange = workout.exercises.reduce(
        (workoutTotal, exercise) => {
          const r = getExerciseTimeSecondsRange(exercise.sets, exercise.rest_seconds);
          return { low: workoutTotal.low + r.low, high: workoutTotal.high + r.high };
        },
        { low: 0, high: 0 },
      );
      return {
        low: programTotal.low + workoutRange.low,
        high: programTotal.high + workoutRange.high,
      };
    },
    { low: 0, high: 0 },
  );

  const avgLowMinutes = total.low / template.workoutCount / 60;
  const avgHighMinutes = total.high / template.workoutCount / 60;

  return {
    low: roundDownToNearestFive(avgLowMinutes),
    high: roundUpToNearestFive(avgHighMinutes),
  };
};

const ProgramsCatalogScreen = ({ navigation }: any) => {
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Program Templates"
        subtitle="Choose a template to add all workouts and exercises at once"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {PROGRAM_TEMPLATES.map((template: ProgramTemplate) => {
          const estimatedTime = getProgramAverageWorkoutEstimateMinutes(template);
          const totalExercises = template.workouts.reduce(
            (sum, w) => sum + w.exercises.length,
            0,
          );

          return (
            <View key={template.id} style={styles.card}>
              <Text style={styles.cardTitle}>{template.name}</Text>
              <Text style={styles.cardDescription}>{template.description}</Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Exercises</Text>
                  <Text style={styles.statValue}>{totalExercises}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Est. Time</Text>
                  <Text style={styles.statValue}>
                    {estimatedTime.low}-{estimatedTime.high} min
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Workouts</Text>
                  <Text style={styles.statValue}>{template.workouts.length}</Text>
                </View>
              </View>

              <View style={styles.workoutsList}>
                <Text style={styles.workoutsTitle}>Workouts in this Program</Text>
                {template.workouts.map((workout, idx) => (
                  <View key={idx} style={styles.workoutRow}>
                    <Text style={styles.workoutName}>{workout.name}</Text>
                    <Text style={styles.workoutCount}>
                      {workout.exercises.length} exercises
                    </Text>
                  </View>
                ))}
              </View>

              <AppButton
                title="View & Import Program"
                style={styles.importButton}
                onPress={() =>
                  navigation.navigate('ProgramTemplate', { templateId: template.id })
                }
              />
            </View>
          );
        })}
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
    content: {
      flex: 1,
      padding: 16,
    },
    card: {
      backgroundColor: themeColors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: themeColors.border,
      padding: 16,
      marginBottom: 16,
      ...shadow.card,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: themeColors.textStrong,
      
      marginBottom: 6,
    },
    cardDescription: {
      fontSize: 13,
      color: themeColors.textMuted,
      marginBottom: 12,
      lineHeight: 18,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    statItem: {
      flex: 1,
      backgroundColor: themeColors.accentSoft,
      borderRadius: radius.sm,
      padding: 10,
      alignItems: 'center',
    },
    statLabel: {
      fontSize: 12,
      color: themeColors.textMuted,
      
      marginBottom: 4,
    },
    statValue: {
      fontSize: 14,
      fontWeight: 'bold',
      color: themeColors.textStrong,
    },
    workoutsList: {
      marginBottom: 16,
    },
    workoutsTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: themeColors.textStrong,
      
      marginBottom: 8,
    },
    workoutRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    workoutName: {
      fontSize: 14,
      color: themeColors.textStrong,
      flex: 1,
    },
    workoutCount: {
      fontSize: 12,
      color: themeColors.textMuted,
    },
    importButton: {
    },
  });

export default ProgramsCatalogScreen;
