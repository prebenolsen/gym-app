// @ts-nocheck
import React from 'react';
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ImageBackground,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, radius, shadow } from '../theme';

type Mode = 'login' | 'signup' | 'forgot';

const AuthScreen = () => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      Alert.alert('Email required', 'Please enter an email address.');
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
        if (error) throw error;
        Alert.alert('Check your email', 'If this email exists, a reset link has been sent.');
        setMode('login');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send reset email';
        Alert.alert('Error', message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      Alert.alert('Password required', 'Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 8) {
        Alert.alert('Weak password', 'Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Password mismatch', 'Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(normalizedEmail, password);
      } else {
        await signUp(normalizedEmail, password);
        Alert.alert(
          'Account created',
          'Your account was created. If email confirmation is enabled, please verify your email.'
        );
        setMode('login');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../../shared/assets/Copilot_20260402_133811.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.authHeader}>
            <Text style={styles.authLogoIcon}>💪</Text>
            <Text style={styles.authHeaderText}>GymApp</Text>
          </View>

          <Text style={styles.title}>
            {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Forgot Password'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholderTextColor={colors.textMuted}
          />

          {mode !== 'forgot' && (
            <TextInput
              style={styles.input}
              placeholder="Password"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholderTextColor={colors.textMuted}
            />
          )}

          {mode === 'signup' && (
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholderTextColor={colors.textMuted}
            />
          )}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton]}
            disabled={loading}
            onPress={handleSubmit}
          >
            {loading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Email'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.links}>
            {mode !== 'login' && (
              <TouchableOpacity onPress={() => setMode('login')}>
                <Text style={styles.link}>Back to sign in</Text>
              </TouchableOpacity>
            )}
            {mode !== 'signup' && (
              <TouchableOpacity onPress={() => setMode('signup')}>
                <Text style={styles.link}>Create account</Text>
              </TouchableOpacity>
            )}
            {mode !== 'forgot' && (
              <TouchableOpacity onPress={() => setMode('forgot')}>
                <Text style={styles.link}>Forgot password?</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7, 14, 22, 0.45)',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 20,
    ...shadow.card,
  },
  authHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  authLogoIcon: {
    fontSize: 32,
  },
  authHeaderText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textStrong,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textStrong,
    marginBottom: 14,
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
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  links: {
    marginTop: 22,
    gap: 10,
  },
  link: {
    color: colors.accent,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});

export default AuthScreen;
