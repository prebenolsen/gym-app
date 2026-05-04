import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../hooks/useApi';
import { colors, radius } from '../theme';
import { usePreferences } from '../context/PreferencesContext';

const ExerciseNotesScreen = ({ route, navigation }: any) => {
  const { exerciseId, exerciseName } = route.params;
  const api = useApi();
  const { colors: themeColors } = usePreferences();
  const styles = createStyles(themeColors);

  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

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
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentText = notes;

    // Check if current line is empty
    const lines = currentText.split('\n');
    const lastLine = lines[lines.length - 1];

    if (lastLine.trim() === '') {
      // Current line is empty, just insert the date
      setNotes(currentText + today + '\n');
    } else {
      // Current line is not empty, insert blank line then date
      setNotes(currentText + '\n' + today + '\n');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={themeColors.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>{exerciseName} Notes</Text>
        {saving && <ActivityIndicator size="small" color={themeColors.accent} />}
        {!saving && <View style={{ width: 40 }} />}
      </View>

      <TouchableOpacity
        style={[styles.insertDateButton, { marginTop: 12 }]}
        onPress={insertDate}
      >
        <Ionicons name="calendar" size={16} color="#fff" />
        <Text style={styles.insertDateButtonText}>Insert Date</Text>
      </TouchableOpacity>

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
      borderBottomColor: themeColors.border,
      borderBottomWidth: 1,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: themeColors.textStrong,
      fontSize: 18,
      fontWeight: '700',
      textTransform: 'capitalize',
      flex: 1,
      textAlign: 'center',
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
    insertDateButton: {
      backgroundColor: themeColors.accent,
      borderRadius: radius.md,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    insertDateButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
  });

export default ExerciseNotesScreen;
