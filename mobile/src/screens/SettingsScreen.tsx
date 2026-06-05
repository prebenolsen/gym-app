import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import type { WeightTrackerGender } from '@gym-app/shared';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { useApi } from '../hooks/useApi';
import { colors, getButtonStyles, radius, shadow } from '../theme';
import BrandLogo from '../components/BrandLogo';
import { APP_INFO } from '../constants/appInfo';
import { useToast } from '../components/ui/AppToastProvider';
import { useErrorDialog } from '../components/ui/ErrorDialogProvider';
import { showDeleteConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  COMPLETION_SOUNDS,
  COUNTDOWN_SOUNDS,
  PREPARE_SOUNDS,
  playCountdownPreviewById,
  playSoundById,
} from '../lib/restTimerSounds';
import type { DateFormat } from '../context/PreferencesContext';
import ChipButton from '../components/ui/ChipButton';
import SegmentedControl from '../components/ui/SegmentedControl';

const DATE_FORMAT_OPTIONS: ReadonlyArray<{ key: DateFormat; label: string }> = [
  { key: 'eu', label: 'DD/MM/YYYY' },
  { key: 'iso', label: 'YYYY/MM/DD' },
  { key: 'us', label: 'MM/DD/YYYY' },
];

const getDateFormatConfig = (format: DateFormat) => {
  if (format === 'eu') {
    return { separator: '/', segmentLengths: [2, 2, 4] as const, order: 'dmy' as const };
  }
  if (format === 'us') {
    return { separator: '/', segmentLengths: [2, 2, 4] as const, order: 'mdy' as const };
  }
  return { separator: '/', segmentLengths: [4, 2, 2] as const, order: 'ymd' as const };
};

const formatBirthdateInput = (rawText: string, format: DateFormat) => {
  const { separator, segmentLengths } = getDateFormatConfig(format);
  const maxDigits = segmentLengths.reduce((sum, length) => sum + length, 0);
  const digits = rawText.replace(/\D/g, '').slice(0, maxDigits);
  const parts: string[] = [];

  let cursor = 0;
  for (const length of segmentLengths) {
    if (cursor >= digits.length) break;
    const part = digits.slice(cursor, cursor + length);
    if (!part) break;
    parts.push(part);
    cursor += length;
  }

  return parts.join(separator);
};

const parseBirthdateToIso = (inputText: string, format: DateFormat): string | null => {
  const digits = inputText.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  const { order } = getDateFormatConfig(format);
  let year = 0;
  let month = 0;
  let day = 0;

  if (order === 'ymd') {
    year = Number(digits.slice(0, 4));
    month = Number(digits.slice(4, 6));
    day = Number(digits.slice(6, 8));
  } else if (order === 'dmy') {
    day = Number(digits.slice(0, 2));
    month = Number(digits.slice(2, 4));
    year = Number(digits.slice(4, 8));
  } else {
    month = Number(digits.slice(0, 2));
    day = Number(digits.slice(2, 4));
    year = Number(digits.slice(4, 8));
  }

  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const formatIsoBirthdateForInput = (isoDate: string, format: DateFormat): string => {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts;

  if (format === 'eu') return `${day}/${month}/${year}`;
  if (format === 'us') return `${month}/${day}/${year}`;
  return `${year}/${month}/${day}`;
};

const SettingsScreen = ({ navigation }: any) => {
  const { signOut, user } = useAuth();
  const {
    theme,
    setTheme,
    accent,
    setAccent,
    unit,
    setUnit,
    heightUnit,
    convertFromKg,
    convertToKg,
    convertFromCm,
    convertToCm,
    dateFormat,
    setDateFormat,
    showFileDisplay,
    setShowFileDisplay,
    completionCueEnabled,
    setCompletionCueEnabled,
    countdownCueEnabled,
    setCountdownCueEnabled,
    customCueEnabled,
    setCustomCueEnabled,
    customCueSeconds,
    setCustomCueSeconds,
    completionSoundId,
    setCompletionSoundId,
    countdownSoundId,
    setCountdownSoundId,
    prepareSoundId,
    setPrepareSoundId,
    colors: themeColors,
  } = usePreferences();
  const api = useApi();
  const styles = createStyles(themeColors);
  const { showToast } = useToast();
  const { showError } = useErrorDialog();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [completionSoundOpen, setCompletionSoundOpen] = useState(false);
  const [countdownSoundOpen, setCountdownSoundOpen] = useState(false);
  const [prepareSoundOpen, setPrepareSoundOpen] = useState(false);

  const [profileLoading, setProfileLoading] = useState(true);
  const [savingPersonalMetrics, setSavingPersonalMetrics] = useState(false);
  const [personalWeight, setPersonalWeight] = useState('');
  const [personalHeight, setPersonalHeight] = useState('');
  const [personalAgeMode, setPersonalAgeMode] = useState<'age' | 'birthdate'>('age');
  const [personalAge, setPersonalAge] = useState('');
  const [personalBirthdate, setPersonalBirthdate] = useState('');
  const [personalGender, setPersonalGender] = useState<WeightTrackerGender | null>(null);
  const previousDateFormatRef = useRef<DateFormat>(dateFormat);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const profile = await api.getWeightTrackerProfile();
        if (!active || !profile) return;

        setPersonalWeight(
          profile.default_weight_kg != null
            ? String(parseFloat(convertFromKg(profile.default_weight_kg).toFixed(1)))
            : '',
        );
        setPersonalHeight(
          profile.height_cm != null
            ? String(parseFloat(convertFromCm(profile.height_cm).toFixed(1)))
            : '',
        );
        setPersonalGender(profile.gender);
        setPersonalAge(profile.age != null ? String(profile.age) : '');
        setPersonalBirthdate(
          profile.birthdate ? formatIsoBirthdateForInput(profile.birthdate, dateFormat) : '',
        );
        setPersonalAgeMode(profile.birthdate ? 'birthdate' : 'age');
      } finally {
        if (active) setProfileLoading(false);
      }
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, [api, convertFromCm, convertFromKg]);

  useEffect(() => {
    if (!personalBirthdate.trim()) {
      previousDateFormatRef.current = dateFormat;
      return;
    }

    const previousFormat = previousDateFormatRef.current;
    if (previousFormat === dateFormat) {
      return;
    }

    const isoBirthdate = parseBirthdateToIso(personalBirthdate, previousFormat);
    if (isoBirthdate) {
      setPersonalBirthdate(formatIsoBirthdateForInput(isoBirthdate, dateFormat));
    } else {
      setPersonalBirthdate((current) => formatBirthdateInput(current, dateFormat));
    }

    previousDateFormatRef.current = dateFormat;
  }, [dateFormat, personalBirthdate]);

  const handleSavePersonalMetrics = async () => {
    setSavingPersonalMetrics(true);
    try {
      const normalizedBirthdate =
        personalAgeMode === 'birthdate' && personalBirthdate.trim()
          ? parseBirthdateToIso(personalBirthdate, dateFormat)
          : null;

      if (personalAgeMode === 'birthdate' && personalBirthdate.trim() && !normalizedBirthdate) {
        const activeDateFormat = DATE_FORMAT_OPTIONS.find((option) => option.key === dateFormat)?.label;
        Alert.alert('Invalid birthdate', `Please use a valid date in ${activeDateFormat} format.`);
        return;
      }

      await api.upsertWeightTrackerProfile({
        default_weight_kg: personalWeight.trim() ? convertToKg(parseFloat(personalWeight.replace(',', '.'))) : null,
        height_cm: personalHeight.trim() ? convertToCm(parseFloat(personalHeight.replace(',', '.'))) : null,
        age: personalAgeMode === 'age' && personalAge.trim() ? parseInt(personalAge, 10) : null,
        birthdate: normalizedBirthdate,
        gender: personalGender,
      });
      showToast({ type: 'success', duration: 'short', message: 'Personal metrics were updated.' });
    } catch {
      showError({ message: 'Could not save personal metrics.' });
    } finally {
      setSavingPersonalMetrics(false);
    }
  };

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
      showError({ message: error.message });
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    showToast({ type: 'success', duration: 'short', message: 'Password updated.' });
  };

  const handleDeleteAccount = () => {
    showDeleteConfirmDialog(
      'Delete account',
      'Delete your account and all data permanently?',
      async () => {
        try {
          await api.deleteAccount();
          await signOut();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to delete account';
          showError({ message });
        }
      },
    );
  };

  const handleOpenFeedback = () => {
    navigation.navigate('Feedback');
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
          <ChipButton
            label="Auburn"
            selected={accent === 'auburn'}
            onPress={() => setAccent('auburn')}
          />
          <ChipButton
            label="Emerald"
            selected={accent === 'emerald'}
            onPress={() => setAccent('emerald')}
          />
        </View>

        <Text style={styles.section}>Unit System</Text>
        <SegmentedControl
          style={styles.unitControl}
          options={[
            { value: 'kg', label: 'Metric (kg · cm)' },
            { value: 'lb', label: 'US Units (lb · ft)' },
          ]}
          selectedValue={unit}
          onChange={setUnit}
          compact
        />

        <Text style={styles.section}>Date Format</Text>
        <SegmentedControl
          style={styles.dateFormatControl}
          options={DATE_FORMAT_OPTIONS.map((option) => ({
            value: option.key,
            label: option.label,
          }))}
          selectedValue={dateFormat}
          onChange={setDateFormat}
          compact
        />

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Show File Display</Text>
            <Text style={styles.settingHelp}>Display file name at the bottom of the screen.</Text>
          </View>
          <Switch
            value={showFileDisplay}
            onValueChange={setShowFileDisplay}
            thumbColor={themeColors.switchThumb}
            trackColor={{ false: themeColors.border, true: themeColors.accent }}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Personal Metrics</Text>
        <Text style={styles.settingHelp}>
          These values are used as defaults in Weight Tracker and for calorie calculations.
        </Text>

        {profileLoading ? (
          <ActivityIndicator color={themeColors.accent} style={{ marginTop: 12 }} />
        ) : (
          <>
            <Text style={styles.section}>Default Weight ({unit})</Text>
            <TextInput
              style={styles.input}
              value={personalWeight}
              onChangeText={setPersonalWeight}
              keyboardType="decimal-pad"
              placeholder={unit === 'kg' ? 'e.g. 80.0' : 'e.g. 176.4'}
              placeholderTextColor={themeColors.textMuted}
            />

            <Text style={styles.section}>Height ({heightUnit === 'ft' ? 'ft' : 'cm'})</Text>
            <TextInput
              style={styles.input}
              value={personalHeight}
              onChangeText={setPersonalHeight}
              keyboardType="decimal-pad"
              placeholder={heightUnit === 'ft' ? 'e.g. 5.9' : 'e.g. 180'}
              placeholderTextColor={themeColors.textMuted}
            />

            <Text style={styles.section}>Age / Birthdate</Text>
            <SegmentedControl
              style={styles.ageModeRow}
              options={[
                { value: 'birthdate', label: 'Birthdate' },
                { value: 'age', label: 'Age' },
              ]}
              selectedValue={personalAgeMode}
              onChange={setPersonalAgeMode}
              compact
            />

            {personalAgeMode === 'age' ? (
              <TextInput
                style={styles.input}
                value={personalAge}
                onChangeText={setPersonalAge}
                keyboardType="number-pad"
                placeholder="e.g. 30"
                placeholderTextColor={themeColors.textMuted}
              />
            ) : (
              <TextInput
                style={styles.input}
                value={personalBirthdate}
                onChangeText={(value) => setPersonalBirthdate(formatBirthdateInput(value, dateFormat))}
                autoCapitalize="none"
                placeholder={DATE_FORMAT_OPTIONS.find((option) => option.key === dateFormat)?.label}
                placeholderTextColor={themeColors.textMuted}
                keyboardType="number-pad"
              />
            )}

            <Text style={styles.section}>Gender</Text>
            <View style={styles.chipRow}>
              {(['male', 'female', 'other'] as WeightTrackerGender[]).map((gender) => (
                <ChipButton
                  key={gender}
                  label={gender.charAt(0).toUpperCase() + gender.slice(1)}
                  selected={personalGender === gender}
                  onPress={() => setPersonalGender(personalGender === gender ? null : gender)}
                />
              ))}
            </View>

            {savingPersonalMetrics ? (
              <ActivityIndicator color={themeColors.accent} style={{ marginTop: 12 }} />
            ) : (
              <TouchableOpacity style={[styles.primaryButton, { marginTop: 10 }]} onPress={handleSavePersonalMetrics}>
                <Text style={styles.primaryButtonText}>Save Personal Metrics</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Sounds</Text>

        {/* Rest Timer Completed */}
        <View style={styles.soundSectionContainer}>
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

        {completionCueEnabled && (
          <View style={styles.soundDropdownContainer}>
            <TouchableOpacity
              style={styles.soundDropdownTrigger}
              onPress={() => setCompletionSoundOpen((v) => !v)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.soundDropdownLabel}>
                  {COMPLETION_SOUNDS.find((s) => s.id === completionSoundId)?.name || 'Select sound'}
                </Text>
              </View>
              <Text style={styles.soundDropdownChevron}>
                {completionSoundOpen ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {completionSoundOpen && (
              <View style={styles.soundDropdownOptions}>
                {COMPLETION_SOUNDS.map(({ id, name }) => (
                  <TouchableOpacity
                    key={id}
                    style={styles.soundDropdownRow}
                    onPress={() => {
                      setCompletionSoundId(id);
                      setCompletionSoundOpen(false);
                      playSoundById(id);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.soundDropdownLabel}>{name}</Text>
                    </View>
                    {completionSoundId === id && (
                      <Text style={styles.soundDropdownCheckmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.soundSectionSpacer} />

        {/* Countdown Cues */}
        <View style={styles.soundSectionContainer}>
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

        {countdownCueEnabled && (
          <View style={styles.soundDropdownContainer}>
            <TouchableOpacity
              style={styles.soundDropdownTrigger}
              onPress={() => setCountdownSoundOpen((v) => !v)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.soundDropdownLabel}>
                  {COUNTDOWN_SOUNDS.find((s) => s.id === countdownSoundId)?.name || 'Select sound'}
                </Text>
              </View>
              <Text style={styles.soundDropdownChevron}>
                {countdownSoundOpen ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {countdownSoundOpen && (
              <View style={styles.soundDropdownOptions}>
                {COUNTDOWN_SOUNDS.map(({ id, name }) => (
                  <TouchableOpacity
                    key={id}
                    style={styles.soundDropdownRow}
                    onPress={() => {
                      setCountdownSoundId(id);
                      setCountdownSoundOpen(false);
                      playCountdownPreviewById(id);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.soundDropdownLabel}>{name}</Text>
                    </View>
                    {countdownSoundId === id && (
                      <Text style={styles.soundDropdownCheckmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.soundSectionSpacer} />

        {/* Prepare Cue */}
        <View style={styles.soundSectionContainer}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Prepare Cue (Custom)</Text>
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

        {customCueEnabled && (
          <>
            <View style={styles.soundDropdownContainer}>
              <TouchableOpacity
                style={styles.soundDropdownTrigger}
                onPress={() => setPrepareSoundOpen((v) => !v)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.soundDropdownLabel}>
                    {PREPARE_SOUNDS.find((s) => s.id === prepareSoundId)?.name || 'Select sound'}
                  </Text>
                </View>
                <Text style={styles.soundDropdownChevron}>
                  {prepareSoundOpen ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {prepareSoundOpen && (
                <View style={styles.soundDropdownOptions}>
                  {PREPARE_SOUNDS.map(({ id, name }) => (
                    <TouchableOpacity
                      key={id}
                      style={styles.soundDropdownRow}
                      onPress={() => {
                        setPrepareSoundId(id);
                        setPrepareSoundOpen(false);
                        playSoundById(id);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.soundDropdownLabel}>{name}</Text>
                      </View>
                      {prepareSoundId === id && (
                        <Text style={styles.soundDropdownCheckmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

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
          </>
        )}
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

        <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAccount}>
          <Text style={styles.dangerButtonText}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>

        <View style={styles.aboutLogoWrap}>
          <BrandLogo width={170} color={themeColors.textStrong} />
        </View>

        <Text style={styles.aboutLine}>
          Version {APP_INFO.version} (Build {APP_INFO.build})
        </Text>
        <Text style={styles.aboutLineMuted}>This release is in {APP_INFO.stage}.</Text>
        <Text style={styles.aboutLine}>Developed by {APP_INFO.author}</Text>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleOpenFeedback}
        >
          <Text style={styles.secondaryButtonText}>Send Feedback or Report a Bug</Text>
        </TouchableOpacity>
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
    unitControl: {
      marginBottom: 8,
    },
    dateFormatControl: {
      marginBottom: 8,
    },
    ageModeRow: {
      marginBottom: 10,
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
      ...getButtonStyles(themeColors).mainButton,
      flex: 1,
    },
    primaryButtonText: {
      ...getButtonStyles(themeColors).mainButtonText,
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
    dangerButton: {
      ...getButtonStyles(themeColors).deleteButton,
      marginTop: 18,
    },
    dangerButtonText: {
      ...getButtonStyles(themeColors).deleteButtonText,
    },
    soundSectionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    soundSectionSpacer: {
      height: 8,
    },
    soundDropdownContainer: {
      marginTop: 12,
      marginBottom: 4,
      borderRadius: radius.sm,
      overflow: 'hidden',
      backgroundColor: themeColors.surface,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    soundDropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 8,
    },
    soundDropdownLabel: {
      fontSize: 14,
      color: themeColors.textStrong,
      fontWeight: '500',
    },
    soundDropdownChevron: {
      fontSize: 14,
      color: themeColors.textMuted,
      marginLeft: 4,
    },
    soundDropdownOptions: {
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
      backgroundColor: themeColors.background,
    },
    soundDropdownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    soundDropdownCheckmark: {
      fontSize: 16,
      color: themeColors.accent,
      fontWeight: '700',
      marginLeft: 8,
    },
  });

export default SettingsScreen;
