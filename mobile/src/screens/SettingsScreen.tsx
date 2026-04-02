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

const SettingsScreen = () => {
  const { signOut } = useAuth();
  const {
    theme,
    setTheme,
    accent,
    setAccent,
    unit,
    setUnit,
    colors: themeColors,
  } = usePreferences();
  const api = useApi();
  const styles = createStyles(themeColors);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
    Alert.alert(
      'Delete account',
      'Delete your account and all data permanently?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAccount();
              await signOut();
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to delete account';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
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
            thumbColor="#FFFFFF"
            trackColor={{ false: themeColors.border, true: themeColors.accent }}
          />
        </View>

        <Text style={styles.section}>Accent Color</Text>
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, accent === 'auburn' && styles.chipActive]}
            onPress={() => setAccent('auburn')}
          >
            <Text style={[styles.chipText, accent === 'auburn' && styles.chipTextActive]}>Auburn</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, accent === 'emerald' && styles.chipActive]}
            onPress={() => setAccent('emerald')}
          >
            <Text style={[styles.chipText, accent === 'emerald' && styles.chipTextActive]}>Emerald</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>Weight Unit</Text>
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, unit === 'kg' && styles.chipActive]}
            onPress={() => setUnit('kg')}
          >
            <Text style={[styles.chipText, unit === 'kg' && styles.chipTextActive]}>kg</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, unit === 'lb' && styles.chipActive]}
            onPress={() => setUnit('lb')}
          >
            <Text style={[styles.chipText, unit === 'lb' && styles.chipTextActive]}>lb</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Account</Text>

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
          <Text style={styles.dangerTitle}>Delete Account</Text>
          <Text style={styles.dangerText}>This permanently deletes your account and all data.</Text>
          <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAccount}>
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
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
      textTransform: 'uppercase',
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
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    settingHelp: {
      color: themeColors.textMuted,
      fontSize: 13,
    },
    section: {
      marginTop: 16,
      marginBottom: 8,
      color: themeColors.textStrong,
      fontWeight: '700',
      textTransform: 'uppercase',
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
      textTransform: 'uppercase',
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
      textTransform: 'uppercase',
    },
    primaryButton: {
      backgroundColor: themeColors.accent,
      borderRadius: radius.sm,
      paddingVertical: 12,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
      textTransform: 'uppercase',
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
      textTransform: 'uppercase',
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
      textTransform: 'uppercase',
    },
    dangerText: {
      color: themeColors.textMuted,
      marginBottom: 10,
      textTransform: 'uppercase',
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
      textTransform: 'uppercase',
    },
  });

export default SettingsScreen;
