import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { useApi } from '../hooks/useApi';
import { colors, radius, shadow } from '../theme';
import BrandLogo from '../components/BrandLogo';
import { APP_INFO } from '../constants/appInfo';

const SettingsScreen = () => {
  const { signOut, user } = useAuth();
  const {
    theme,
    setTheme,
    accent,
    setAccent,
    unit,
    setUnit,
    completionCueEnabled,
    setCompletionCueEnabled,
    countdownCueEnabled,
    setCountdownCueEnabled,
    customCueEnabled,
    setCustomCueEnabled,
    customCueSeconds,
    setCustomCueSeconds,
    colors: themeColors,
  } = usePreferences();
  const api = useApi();
  const styles = createStyles(themeColors);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    Alert.alert('Success', 'Password updated.');
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete account', 'Delete your account and all data permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteAccount();
            await signOut();
          } catch (err) {
            const message =
              err instanceof Error ? err.message : 'Failed to delete account';
            Alert.alert('Error', message);
          }
        },
      },
    ]);
  };

  const handleOpenFeedback = () => {
    if (feedbackSubmitted) {
      return;
    }
    setShowFeedbackForm(true);
  };

  const handleSubmitFeedback = () => {
    if (!feedbackText.trim()) {
      Alert.alert('Feedback required', 'Please write a short message before submitting.');
      return;
    }

    setFeedbackSubmitted(true);
    setShowFeedbackForm(false);
    setFeedbackText('');
    Alert.alert('Thanks!', 'Your feedback has been recorded.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Appearance</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Text style={styles.settingHelp}>Switch between light and dark theme.</Text>
          </View>
          <Switch
            value={theme === 'dark'}
            onValueChange={(value) => setTheme(value ? 'dark' : 'light')}
            thumbColor={themeColors.switchThumb}
            trackColor={{ false: themeColors.border, true: themeColors.accent }}
          />
        </View>

        <Text style={styles.section}>Accent Color</Text>
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, accent === 'auburn' && styles.chipActive]}
            onPress={() => setAccent('auburn')}
          >
            <Text style={[styles.chipText, accent === 'auburn' && styles.chipTextActive]}>
              Auburn
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, accent === 'emerald' && styles.chipActive]}
            onPress={() => setAccent('emerald')}
          >
            <Text
              style={[styles.chipText, accent === 'emerald' && styles.chipTextActive]}
            >
              Emerald
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>Weight Unit</Text>
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, unit === 'kg' && styles.chipActive]}
            onPress={() => setUnit('kg')}
          >
            <Text style={[styles.chipText, unit === 'kg' && styles.chipTextActive]}>
              kg
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, unit === 'lb' && styles.chipActive]}
            onPress={() => setUnit('lb')}
          >
            <Text style={[styles.chipText, unit === 'lb' && styles.chipTextActive]}>
              lb
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Sounds</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Rest Timer Completed</Text>
            <Text style={styles.settingHelp}>
              Play a sound when the rest timer reaches zero.
            </Text>
          </View>
          <Switch
            value={completionCueEnabled}
            onValueChange={setCompletionCueEnabled}
            thumbColor={themeColors.switchThumb}
            trackColor={{ false: themeColors.border, true: themeColors.accent }}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Countdown Cues (3, 2, 1)</Text>
            <Text style={styles.settingHelp}>
              Play sounds at 3, 2, and 1 seconds before completion.
            </Text>
          </View>
          <Switch
            value={countdownCueEnabled}
            onValueChange={setCountdownCueEnabled}
            thumbColor={themeColors.switchThumb}
            trackColor={{ false: themeColors.border, true: themeColors.accent }}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Custom Cue (X Seconds)</Text>
            <Text style={styles.settingHelp}>
              Play a sound at n-seconds before the rest timer ends.
            </Text>
          </View>
          <Switch
            value={customCueEnabled}
            onValueChange={setCustomCueEnabled}
            thumbColor={themeColors.switchThumb}
            trackColor={{ false: themeColors.border, true: themeColors.accent }}
          />
        </View>

        {customCueEnabled ? (
          <View style={styles.prepareInputWrap}>
            <Text style={styles.prepareInputLabel}>Custom Cue At (seconds)</Text>
            <TextInput
              style={styles.prepareInput}
              value={String(customCueSeconds)}
              onChangeText={(value) => {
                const parsed = Number(value);
                if (Number.isInteger(parsed) && parsed >= 1) {
                  setCustomCueSeconds(parsed);
                }
              }}
              keyboardType="number-pad"
              placeholder="10"
              placeholderTextColor={themeColors.textMuted}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.accountEmail}>{user?.email ?? 'No email available'}</Text>

        <TouchableOpacity style={styles.primaryButton} onPress={() => signOut()}>
          <Text style={styles.primaryButtonText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.section}>Change Password</Text>
        <TextInput
          style={styles.input}
          placeholder="New password"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          placeholderTextColor={themeColors.textMuted}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholderTextColor={themeColors.textMuted}
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={handleChangePassword}>
          <Text style={styles.secondaryButtonText}>Update Password</Text>
        </TouchableOpacity>

        <View style={styles.dangerBox}>
          <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAccount}>
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>About</Text>

        <View style={styles.aboutLogoWrap}>
          <BrandLogo width={170} color={themeColors.textStrong} />
        </View>

        <Text style={styles.aboutLine}>
          Version {APP_INFO.version} (Build {APP_INFO.build})
        </Text>
        <Text style={styles.aboutLineMuted}>This release is in {APP_INFO.stage}.</Text>
        <Text style={styles.aboutLine}>Developed by {APP_INFO.author}</Text>

        <TouchableOpacity
          style={[styles.secondaryButton, feedbackSubmitted && styles.successButton]}
          onPress={handleOpenFeedback}
          disabled={feedbackSubmitted}
        >
          <Text
            style={[
              styles.secondaryButtonText,
              feedbackSubmitted && styles.successButtonText,
            ]}
          >
            {feedbackSubmitted
              ? 'Thanks for your feedback!'
              : 'Send Feedback or Report a Bug'}
          </Text>
        </TouchableOpacity>

        {showFeedbackForm ? (
          <View style={styles.feedbackForm}>
            <Text style={styles.section}>Feedback Message</Text>
            <TextInput
              style={styles.feedbackInput}
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              placeholder="Tell us what happened or what you would like improved..."
              placeholderTextColor={themeColors.textMuted}
            />

            <View style={styles.feedbackActions}>
              <TouchableOpacity
                style={styles.feedbackCancelButton}
                onPress={() => {
                  setShowFeedbackForm(false);
                  setFeedbackText('');
                }}
              >
                <Text style={styles.feedbackCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSubmitFeedback}
              >
                <Text style={styles.primaryButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
};

const createStyles = (themeColors: typeof colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    content: {
      padding: 16,
      gap: 12,
    },
    card: {
      backgroundColor: themeColors.surface,
      borderColor: themeColors.border,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: 16,
      ...shadow.card,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: themeColors.textStrong,
      marginBottom: 12,
      
    },
    accountEmail: {
      color: themeColors.textMuted,
      marginTop: -6,
      marginBottom: 12,
    },
    aboutLogoWrap: {
      alignItems: 'center',
      marginBottom: 8,
    },
    aboutLine: {
      color: themeColors.textStrong,
      fontWeight: '700',
      marginBottom: 4,
      
    },
    aboutLineMuted: {
      color: themeColors.textMuted,
      marginBottom: 8,
      
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    settingInfo: {
      flex: 1,
    },
    settingLabel: {
      color: themeColors.textStrong,
      fontWeight: '700',
      
      marginBottom: 4,
    },
    settingHelp: {
      color: themeColors.textMuted,
      fontSize: 13,
    },
    prepareInputWrap: {
      marginTop: 8,
      gap: 6,
    },
    prepareInputLabel: {
      color: themeColors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      
    },
    prepareInput: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.sm,
      backgroundColor: themeColors.background,
      color: themeColors.textStrong,
      paddingHorizontal: 12,
      paddingVertical: 10,
      
    },
    section: {
      marginTop: 16,
      marginBottom: 8,
      color: themeColors.textStrong,
      fontWeight: '700',
      
    },
    chipRow: {
      flexDirection: 'row',
      gap: 10,
    },
    chip: {
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.background,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    chipActive: {
      borderColor: themeColors.accent,
      backgroundColor: themeColors.accentSoft,
    },
    chipText: {
      color: themeColors.textMuted,
      fontWeight: '700',
      
    },
    chipTextActive: {
      color: themeColors.accent,
    },
    input: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.sm,
      backgroundColor: themeColors.background,
      color: themeColors.textStrong,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
      
    },
    primaryButton: {
      backgroundColor: themeColors.accent,
      flex: 1,
      borderRadius: radius.sm,
      paddingVertical: 12,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
      
    },
    secondaryButton: {
      borderColor: themeColors.accent,
      borderWidth: 1,
      borderRadius: radius.sm,
      paddingVertical: 12,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: themeColors.accent,
      fontWeight: '700',
      
    },
    successButton: {
      borderColor: themeColors.success,
      backgroundColor: themeColors.accentSoft,
    },
    successButtonText: {
      color: themeColors.success,
    },
    feedbackForm: {
      marginTop: 14,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
      paddingTop: 12,
    },
    feedbackInput: {
      minHeight: 120,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.sm,
      backgroundColor: themeColors.background,
      color: themeColors.textStrong,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    feedbackActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },
    feedbackCancelButton: {
      flex: 0.5,
      borderColor: themeColors.border,
      borderWidth: 1,
      borderRadius: radius.sm,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: themeColors.background,
    },
    feedbackCancelText: {
      color: themeColors.textMuted,
      fontWeight: '700',
      
    },
    dangerBox: {
      marginTop: 18,
      borderColor: themeColors.danger,
      borderWidth: 1,
      borderRadius: radius.sm,
      padding: 12,
      backgroundColor: themeColors.accentSoft,
    },
    dangerTitle: {
      color: themeColors.danger,
      fontWeight: '700',
      marginBottom: 6,
      
    },
    dangerButton: {
      backgroundColor: themeColors.danger,
      borderRadius: radius.sm,
      paddingVertical: 10,
      alignItems: 'center',
    },
    dangerButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
      
    },
  });

export default SettingsScreen;
