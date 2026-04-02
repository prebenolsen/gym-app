// @ts-nocheck
import React from 'react';
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { colors, radius, shadow } from '../theme';

const SettingsScreen = () => {
  const { signOut } = useAuth();
  const api = useApi();
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
    <View style={styles.container}>
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
          placeholderTextColor={colors.textMuted}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholderTextColor={colors.textMuted}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 16,
    ...shadow.card,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textStrong,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  section: {
    marginTop: 16,
    marginBottom: 8,
    color: colors.textStrong,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    color: colors.textStrong,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  secondaryButton: {
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dangerBox: {
    marginTop: 18,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: 12,
    backgroundColor: '#FCEBE9',
  },
  dangerTitle: {
    color: colors.danger,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  dangerText: {
    color: colors.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  dangerButton: {
    backgroundColor: colors.danger,
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
