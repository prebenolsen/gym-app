import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PROGRAM_TEMPLATES,
  type ProgramTemplateWorkout,
  type ProgramTemplateExercise,
} from '@gym-app/shared';
import NumberSpinner from '../components/NumberSpinner';
import { useApi } from '../hooks/useApi';
import { colors, radius, shadow } from '../theme';
import { usePreferences } from '../context/PreferencesContext';
import { useToast } from '../components/ui/AppToastProvider';
import { useErrorDialog } from '../components/ui/ErrorDialogProvider';

interface EditableExercise {
  name: string;
  sets: number;
  rest_seconds: number;
}

interface EditableWorkout {
  name: string;
  exercises: EditableExercise[];
}

const deepCopyWorkouts = (workouts: ProgramTemplateWorkout[]): EditableWorkout[] =>
  workouts.map((w) => ({
    name: w.name,
    exercises: w.exercises.map((e: ProgramTemplateExercise) => ({
      name: e.name,
      sets: e.sets,
      rest_seconds: e.rest_seconds,
    })),
  }));

const ProgramTemplateScreen = ({ route, navigation }: any) => {
  const { templateId } = route.params;
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);
  const api = useApi();
  const { showToast } = useToast();
  const { showError } = useErrorDialog();

  const template = PROGRAM_TEMPLATES.find((t) => t.id === templateId);

  const [workouts, setWorkouts] = useState<EditableWorkout[]>(
    template ? deepCopyWorkouts(template.workouts) : [],
  );
  const [importing, setImporting] = useState(false);

  if (!template) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={themeColors.accent} />
          </TouchableOpacity>
          <Text style={styles.errorText}>Template not found.</Text>
        </View>
      </View>
    );
  }

  const updateExercise = (
    workoutIndex: number,
    exerciseIndex: number,
    updates: Partial<EditableExercise>,
  ) => {
    setWorkouts((prev) =>
      prev.map((w, wi) =>
        wi !== workoutIndex
          ? w
          : {
              ...w,
              exercises: w.exercises.map((e, ei) =>
                ei !== exerciseIndex ? e : { ...e, ...updates },
              ),
            },
      ),
    );
  };

  const removeExercise = (workoutIndex: number, exerciseIndex: number) => {
    setWorkouts((prev) =>
      prev.map((w, wi) =>
        wi !== workoutIndex
          ? w
          : { ...w, exercises: w.exercises.filter((_, ei) => ei !== exerciseIndex) },
      ),
    );
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      await api.createProgramWithWorkouts({
        name: template.name,
        workouts: workouts.map((w) => ({
          name: w.name,
          exercises: w.exercises.map((e) => ({
            name: e.name,
            sets: e.sets,
            rest_seconds: e.rest_seconds,
          })),
        })),
      });
      showToast({
        type: 'success',
        duration: 'short',
        message: `"${template.name}" has been imported to your programs!`,
      });
    } catch (err) {
      console.error('Failed to import template:', err);
      showError({ message: 'Failed to import program. Please try again.' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={themeColors.accent} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{template.name}</Text>
            <Text style={styles.subtitle}>{template.description}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.btnImport, importing && styles.btnImportDisabled]}
          onPress={handleImport}
          disabled={importing}
        >
          {importing ? (
            <ActivityIndicator size="small" color={themeColors.textOnAccent} />
          ) : (
            <Text style={styles.btnImportText}>Import Program</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {workouts.map((workout, wi) => (
          <View key={wi} style={styles.workoutCard}>
            <Text style={styles.workoutName}>{workout.name}</Text>

            {workout.exercises.length === 0 && (
              <Text style={styles.noExercises}>No exercises in this workout.</Text>
            )}

            {workout.exercises.map((exercise, ei) => (
              <View key={ei} style={styles.exerciseRow}>
                <Text style={styles.exerciseName} numberOfLines={1}>
                  {exercise.name}
                </Text>
                <View style={styles.exerciseControls}>
                  <NumberSpinner
                    value={exercise.sets}
                    onChange={(v) => updateExercise(wi, ei, { sets: v })}
                    min={1}
                    max={100}
                    step={1}
                    label="Sets"
                  />
                  <NumberSpinner
                    value={exercise.rest_seconds}
                    onChange={(v) => updateExercise(wi, ei, { rest_seconds: v })}
                    min={0}
                    max={600}
                    step={5}
                    label="Rest (s)"
                  />
                  <TouchableOpacity
                    style={styles.btnRemove}
                    onPress={() => removeExercise(wi, ei)}
                  >
                    <Text style={styles.btnRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ))}
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
    subtitle: {
      fontSize: 13,
      color: themeColors.textMuted,
      lineHeight: 18,
      marginBottom: 8,
    },
    btnImport: {
      backgroundColor: themeColors.accent,
      borderRadius: radius.sm,
      padding: 12,
      alignItems: 'center',
    },
    btnImportBottom: {
      backgroundColor: themeColors.accent,
      borderRadius: radius.sm,
      padding: 14,
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 32,
    },
    btnImportDisabled: {
      opacity: 0.6,
    },
    btnImportText: {
      color: themeColors.textOnAccent,
      fontWeight: '700',
      fontSize: 14,
      
    },
    content: {
      flex: 1,
      padding: 16,
    },
    workoutCard: {
      backgroundColor: themeColors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: themeColors.border,
      padding: 16,
      marginBottom: 16,
      ...shadow.card,
    },
    workoutName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: themeColors.textStrong,
      
      marginBottom: 12,
    },
    noExercises: {
      fontSize: 13,
      color: themeColors.textMuted,
      fontStyle: 'italic',
      marginBottom: 8,
    },
    exerciseRow: {
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      paddingVertical: 10,
      gap: 8,
    },
    exerciseName: {
      fontSize: 14,
      color: themeColors.textStrong,
      fontWeight: '600',
      flex: 1,
    },
    exerciseControls: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 12,
      flexWrap: 'wrap',
    },
    btnRemove: {
      backgroundColor: themeColors.danger,
      borderRadius: radius.sm,
      minWidth: 36,
      paddingHorizontal: 10,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 'auto',
    },
    btnRemoveText: {
      color: themeColors.textOnAccent,
      fontWeight: 'bold',
      fontSize: 12,
    },
    errorText: {
      color: themeColors.textStrong,
      fontSize: 16,
      padding: 16,
    },
  });

export default ProgramTemplateScreen;
