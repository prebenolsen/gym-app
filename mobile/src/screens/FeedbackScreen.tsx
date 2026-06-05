import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { usePreferences } from '../context/PreferencesContext';
import { useToast } from '../components/ui/AppToastProvider';
import AppButton from '../components/ui/AppButton';

const FeedbackScreen = ({ navigation }: any) => {
  const { colors: themeColors } = usePreferences();
  const { showToast } = useToast();
  const styles = createStyles(themeColors);
  const [feedbackText, setFeedbackText] = useState('');

  const handleSubmit = () => {
    showToast({
      type: 'info',
      duration: 'short',
      message: 'Submit is not connected yet. Thanks for sharing your thoughts.',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={themeColors.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>Feedback and Bug Report</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Help Us Improve</Text>
          <Text style={styles.leadText}>
            Tell us what is missing, confusing, or not working as expected. Your ideas help shape the next updates.
          </Text>

          <Text style={styles.inputLabel}>Your message</Text>
          <TextInput
            style={styles.feedbackInput}
            value={feedbackText}
            onChangeText={setFeedbackText}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
            placeholder="Share details, examples, or steps to reproduce issues..."
            placeholderTextColor={themeColors.textMuted}
          />

          <View style={styles.actions}>
            <AppButton title="Cancel" variant="outline" style={styles.actionButton} onPress={() => navigation.goBack()} />
            <AppButton title="Submit" style={styles.actionButton} onPress={handleSubmit} />
          </View>
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
      flex: 1,
      textAlign: 'center',
    },
    content: {
      flex: 1,
    },
    contentInner: {
      padding: 16,
      paddingBottom: 24,
    },
    card: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.md,
      backgroundColor: themeColors.surface,
      padding: 16,
      gap: 12,
    },
    cardTitle: {
      color: themeColors.textStrong,
      fontSize: 22,
      fontWeight: '700',
    },
    leadText: {
      color: themeColors.textMuted,
      fontSize: 14,
      lineHeight: 21,
    },
    inputLabel: {
      marginTop: 6,
      color: themeColors.textStrong,
      fontWeight: '700',
    },
    feedbackInput: {
      minHeight: 180,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.sm,
      backgroundColor: themeColors.background,
      color: themeColors.textStrong,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    actionButton: {
      flex: 1,
    },
  });

export default FeedbackScreen;
