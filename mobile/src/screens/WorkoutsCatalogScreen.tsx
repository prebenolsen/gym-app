import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { WORKOUT_TEMPLATES, type WorkoutTemplate } from '@gym-app/shared';
import { useApi } from '../hooks/useApi';
import { colors, radius, shadow } from '../theme';
import { usePreferences } from '../context/PreferencesContext';

const WorkoutsCatalogScreen = ({ route, navigation }: any) => {
  const { programId } = route.params;
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);
  const api = useApi();

  const [importing, setImporting] = useState<string | null>(null);

  if (!programId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Invalid program. Please go back and try again.</Text>
      </View>
    );
  }

  const handleImportTemplate = async (template: WorkoutTemplate) => {
    setImporting(template.id);
    try {
      await api.createWorkoutWithExercises(programId, template);
      Alert.alert('Success', `"${template.name}" has been added to your program!`, [
        {
          text: 'Back to Program',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      console.error('Failed to import template:', err);
      Alert.alert('Error', 'Failed to import workout template. Please try again.');
    } finally {
      setImporting(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back to Program</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Workout Templates</Text>
        <Text style={styles.subtitle}>Choose a workout template to add to your program</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {WORKOUT_TEMPLATES.map((template: WorkoutTemplate) => (
          <View key={template.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{template.name}</Text>
              <Text style={styles.categoryBadge}>{template.category}</Text>
            </View>

            <Text style={styles.cardDescription}>{template.description}</Text>

            <Text style={styles.exercisesTitle}>
              {template.exercises.length} Exercises
            </Text>

            {template.exercises.map((exercise, idx) => (
              <View key={idx} style={styles.exerciseRow}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <View style={styles.exerciseMeta}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{exercise.sets} sets</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{exercise.rest_seconds}s rest</Text>
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[
                styles.btnImport,
                importing !== null && styles.btnImportDisabled,
              ]}
              onPress={() => handleImportTemplate(template)}
              disabled={importing !== null}
            >
              {importing === template.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.btnImportText}>Import Template</Text>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const createStyles = (themeColors: typeof colors) => StyleSheet.create({
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
    marginBottom: 8,
  },
  backBtnText: {
    color: themeColors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: themeColors.textStrong,
    textTransform: 'uppercase',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: themeColors.textStrong,
    textTransform: 'uppercase',
    flex: 1,
  },
  categoryBadge: {
    fontSize: 11,
    color: themeColors.accent,
    fontWeight: '600',
    textTransform: 'uppercase',
    borderWidth: 1,
    borderColor: themeColors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cardDescription: {
    fontSize: 13,
    color: themeColors.textMuted,
    marginBottom: 12,
    lineHeight: 18,
  },
  exercisesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.textStrong,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    gap: 8,
  },
  exerciseName: {
    flex: 1,
    fontSize: 13,
    color: themeColors.textStrong,
  },
  exerciseMeta: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    backgroundColor: themeColors.accentSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    color: themeColors.accent,
    fontWeight: '600',
  },
  btnImport: {
    backgroundColor: themeColors.accent,
    borderRadius: radius.sm,
    padding: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  btnImportDisabled: {
    opacity: 0.6,
  },
  btnImportText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  errorText: {
    color: themeColors.textStrong,
    fontSize: 16,
    padding: 16,
  },
});

export default WorkoutsCatalogScreen;
