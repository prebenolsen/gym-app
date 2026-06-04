import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PROGRAM_TEMPLATES, type ProgramTemplate } from '@gym-app/shared';
import { colors, radius, shadow } from '../theme';
import { usePreferences } from '../context/PreferencesContext';

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={themeColors.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>Program Templates</Text>
        <Text style={styles.subtitle}>
          Choose a template to add all workouts and exercises at once
        </Text>
      </View>

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

              <TouchableOpacity
                style={styles.btnImport}
                onPress={() =>
                  navigation.navigate('ProgramTemplate', { templateId: template.id })
                }
              >
                <Text style={styles.btnImportText}>View &amp; Import Program</Text>
              </TouchableOpacity>
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
    header: {
      backgroundColor: themeColors.surface,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      gap: 4,
    },
    backBtn: {
      alignSelf: 'flex-start',
      marginBottom: 8,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: themeColors.textStrong,
      
    },
    subtitle: {
      fontSize: 13,
      color: themeColors.textMuted,
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
    btnImport: {
      backgroundColor: themeColors.accent,
      borderRadius: radius.sm,
      padding: 12,
      alignItems: 'center',
    },
    btnImportText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 14,
      
    },
  });

export default ProgramsCatalogScreen;
