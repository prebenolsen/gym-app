import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  PROGRAM_TEMPLATES,
  type ProgramTemplateWorkout,
  type ProgramTemplateExercise,
} from '@gym-app/shared';
import NumberSpinner from '../components/NumberSpinner';
import { useApi } from '../hooks/useApi';
import { colors, radius, shadow } from '../theme';
import { usePreferences } from '../context/PreferencesContext';

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

  const template = PROGRAM_TEMPLATES.find((t) => t.id === templateId);

  const [workouts, setWorkouts] = useState<EditableWorkout[]>(
    template ? deepCopyWorkouts(template.workouts) : [],
  );
  const [newExerciseNames, setNewExerciseNames] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);

  if (!template) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Template not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
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

  const addExercise = (workoutIndex: number) => {
    const name = (newExerciseNames[workoutIndex] ?? '').trim();
    if (!name) return;
    setWorkouts((prev) =>
      prev.map((w, wi) =>
        wi !== workoutIndex
          ? w
          : {
              ...w,
              exercises: [...w.exercises, { name, sets: 4, rest_seconds: 120 }],
            },
      ),
    );
    setNewExerciseNames((prev) => ({ ...prev, [workoutIndex]: '' }));
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
      Alert.alert('Success', `"${template.name}" has been imported to your programs!`, [
        {
          text: 'Go to Programs',
          onPress: () => {
            // Navigate back to the Programs tab root
            navigation.getParent()?.navigate('ProgramsList');
          },
        },
      ]);
    } catch (err) {
      console.error('Failed to import template:', err);
      Alert.alert('Error', 'Failed to import program. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{template.name}</Text>
        <Text style={styles.subtitle}>{template.description}</Text>
        <TouchableOpacity
          style={[styles.btnImport, importing && styles.btnImportDisabled]}
          onPress={handleImport}
          disabled={importing}
        >
          {importing ? (
            <ActivityIndicator size="small" color="#fff" />
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
              <Text style={styles.noExercises}>No exercises. Add one below.</Text>
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

            <View style={styles.addExerciseRow}>
              <TextInput
                style={styles.addExerciseInput}
                placeholder="Add exercise..."
                placeholderTextColor={themeColors.textMuted}
                value={newExerciseNames[wi] ?? ''}
                onChangeText={(text) =>
                  setNewExerciseNames((prev) => ({ ...prev, [wi]: text }))
                }
                onSubmitEditing={() => addExercise(wi)}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.btnAdd} onPress={() => addExercise(wi)}>
                <Text style={styles.btnAddText}>+ Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Bottom import button */}
        <TouchableOpacity
          style={[styles.btnImportBottom, importing && styles.btnImportDisabled]}
          onPress={handleImport}
          disabled={importing}
        >
          <Text style={styles.btnImportText}>
            {importing ? 'Importing...' : 'Import Program'}
          </Text>
        </TouchableOpacity>
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
      gap: 6,
    },
    backBtn: {},
    backBtnText: {
      color: themeColors.accent,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 4,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: themeColors.textStrong,
      textTransform: 'capitalize',
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
      color: '#fff',
      fontWeight: '700',
      fontSize: 14,
      textTransform: 'capitalize',
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
      textTransform: 'capitalize',
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
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    },
    btnRemove: {
      backgroundColor: themeColors.danger,
      borderRadius: radius.sm,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    btnRemoveText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 12,
    },
    addExerciseRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    addExerciseInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.sm,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: themeColors.textStrong,
      backgroundColor: themeColors.background,
      fontSize: 14,
    },
    btnAdd: {
      backgroundColor: themeColors.accentSoft,
      borderRadius: radius.sm,
      paddingHorizontal: 12,
      paddingVertical: 8,
      justifyContent: 'center',
    },
    btnAddText: {
      color: themeColors.accent,
      fontWeight: '700',
      fontSize: 13,
    },
    errorText: {
      color: themeColors.textStrong,
      fontSize: 16,
      padding: 16,
    },
  });

export default ProgramTemplateScreen;
