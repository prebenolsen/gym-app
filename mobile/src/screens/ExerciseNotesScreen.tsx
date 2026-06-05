import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useApi } from '../hooks/useApi';
import { colors, radius } from '../theme';
import { usePreferences } from '../context/PreferencesContext';
import AppButton from '../components/ui/AppButton';
import ScreenHeader from '../components/ui/ScreenHeader';

const ExerciseNotesScreen = ({ route, navigation }: any) => {
  const { exerciseId, exerciseName } = route.params;
  const api = useApi();
  const { colors: themeColors, formatDateOnly } = usePreferences();
  const styles = createStyles(themeColors);

  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    loadNotes();
  }, [exerciseId]);

  useEffect(() => {
    // Auto-save with debounce
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (notes !== '') {
        saveNotes();
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [notes]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const exerciseNotes = await api.getExerciseNotes(exerciseId);
      setNotes(exerciseNotes || '');
    } catch (err) {
      console.error('Failed to load exercise notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      await api.saveExerciseNotes(exerciseId, notes);
    } catch (err) {
      console.error('Failed to save exercise notes:', err);
    } finally {
      setSaving(false);
    }
  };

  const insertDate = () => {
    const today = new Date();
    const formattedDate = formatDateOnly(today.toISOString());
    const currentText = notes;

    // Check if current line is empty
    const lines = currentText.split('\n');
    const lastLine = lines[lines.length - 1];

    if (lastLine.trim() === '') {
      // Current line is empty, just insert the date
      setNotes(currentText + formattedDate + '\n');
    } else {
      // Current line is not empty, insert blank line then date
      setNotes(currentText + '\n' + formattedDate + '\n');
    }
  };

  const handleSaveAndGoBack = () => {
    // Notes are auto-saved, just navigate back
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`${exerciseName} Notes`}
        onBackPress={() => navigation.goBack()}
        rightActions={saving ? <ActivityIndicator size="small" color={themeColors.accent} /> : <View style={{ width: 16 }} />}
      />

      <View style={styles.content}>
        <TextInput
          style={styles.noteInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add your notes here..."
          placeholderTextColor={themeColors.textMuted}
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={styles.bottomActionsContainer}>
        <TouchableOpacity
          style={styles.insertDateButton}
          onPress={insertDate}
        >
          <Ionicons name="calendar" size={14} color="#fff" />
          <Text style={styles.insertDateButtonText}>Insert Date</Text>
        </TouchableOpacity>
        <AppButton title="Save Note" style={styles.saveNoteButton} onPress={handleSaveAndGoBack} />
      </View>
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
      gap: 12,
    },
    noteInput: {
      flex: 1,
      backgroundColor: themeColors.background,
      borderColor: themeColors.border,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      paddingVertical: 12,
      color: themeColors.textStrong,
      fontSize: 14,
    },
    bottomActionsContainer: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 16,
      borderTopColor: themeColors.border,
      borderTopWidth: 1,
      backgroundColor: themeColors.surface,
    },
    insertDateButton: {
      backgroundColor: themeColors.accent,
      borderRadius: radius.sm,
      paddingVertical: 10,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      flex: 1,
    },
    insertDateButtonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
      
    },
    saveNoteButton: {
      flex: 1,
    },
  });

export default ExerciseNotesScreen;
