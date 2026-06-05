import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BrandLogo from '../components/BrandLogo';
import { usePreferences } from '../context/PreferencesContext';
import { useApi } from '../hooks/useApi';
import { radius, shadow } from '../theme';
import type { WeightTrackerGender, WeightTrackerGoal } from '@gym-app/shared';

type UnitSystem = 'metric' | 'us';
type AgeInputMode = 'birthdate' | 'age';

type OnboardingSetupScreenProps = {
  onComplete: () => void;
  onSkip: () => void;
};

const CARD_COUNT = 4;
const CARD_GAP = 0;
const HORIZONTAL_PADDING = 20;

const GOAL_OPTIONS: Array<{
  id: WeightTrackerGoal;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    id: 'lose',
    title: 'Lose weight',
    subtitle: 'Enables trend and pace guidance toward a deficit.',
    icon: 'trending-down-outline',
  },
  {
    id: 'gain',
    title: 'Build muscle',
    subtitle: 'Targets gradual gain and progress-oriented surplus guidance.',
    icon: 'barbell-outline',
  },
  {
    id: 'track',
    title: 'Just tracking',
    subtitle: 'No pressure. Log and observe your progress over time.',
    icon: 'analytics-outline',
  },
];

const parseBirthdateIso = (value: string): string | null => {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const [yearRaw, monthRaw, dayRaw] = trimmed.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

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

  return `${yearRaw}-${monthRaw}-${dayRaw}`;
};

const formatBirthdateInput = (rawText: string, showSeparators: boolean): string => {
  const digits = rawText.replace(/\D/g, '').slice(0, 8);
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);

  let output = year;
  if (month.length > 0 || (showSeparators && digits.length === 4)) output += '-';
  if (month.length > 0) output += month;
  if (day.length > 0 || (showSeparators && digits.length === 6)) output += '-';
  if (day.length > 0) output += day;
  return output;
};

const todayIsoString = (): string => new Date().toISOString().split('T')[0];

const toKg = (value: number, unitSystem: UnitSystem): number =>
  unitSystem === 'us' ? value / 2.2 : value;

const toCm = (value: number, unitSystem: UnitSystem): number =>
  unitSystem === 'us' ? value * 30.48 : value;

const formatSummaryValue = (value: string): string => (value ? value : 'Not set');

export default function OnboardingSetupScreen({ onComplete, onSkip }: OnboardingSetupScreenProps) {
  const api = useApi();
  const { colors: themeColors, setUnit } = usePreferences();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const initialCardWidth = Dimensions.get('window').width - HORIZONTAL_PADDING * 2;
  const [cardWidth, setCardWidth] = useState(initialCardWidth);
  const sliderX = useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [ageMode, setAgeMode] = useState<AgeInputMode>('birthdate');
  const [birthdateInput, setBirthdateInput] = useState('');
  const [ageInput, setAgeInput] = useState('');
  const [gender, setGender] = useState<WeightTrackerGender | null>(null);
  const [heightInput, setHeightInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [goal, setGoal] = useState<WeightTrackerGoal>('track');

  useEffect(() => {
    Animated.timing(sliderX, {
      toValue: -(step * (cardWidth + CARD_GAP)),
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [cardWidth, sliderX, step]);

  const aboutYouComplete = useMemo(() => {
    const hasBirthdate = ageMode === 'birthdate' ? !!parseBirthdateIso(birthdateInput) : true;
    const hasAge = ageMode === 'age' ? !!ageInput.trim() && Number(ageInput) > 0 : true;
    const hasHeight = !!heightInput.trim() && Number(heightInput.replace(',', '.')) > 0;
    const hasWeight = !!weightInput.trim() && Number(weightInput.replace(',', '.')) > 0;
    return hasBirthdate && hasAge && hasHeight && hasWeight;
  }, [ageInput, ageMode, birthdateInput, heightInput, weightInput]);

  const openHomeWithSkip = () => {
    if (saving) return;
    onSkip();
  };

  const goToStep = (nextStep: number) => {
    if (nextStep < 0 || nextStep >= CARD_COUNT) return;
    setStep(nextStep);
  };

  const handleBirthdateChange = (rawValue: string) => {
    const previousDigits = birthdateInput.replace(/\D/g, '').length;
    const nextDigits = rawValue.replace(/\D/g, '').length;
    const isDeleting = rawValue.length < birthdateInput.length || nextDigits < previousDigits;
    setBirthdateInput(formatBirthdateInput(rawValue, !isDeleting));
  };

  const handleNextFromAboutYou = () => {
    if (!aboutYouComplete) {
      Alert.alert('Required fields missing', 'Please complete your birthdate or age, plus height and weight.');
      return;
    }
    goToStep(2);
  };

  const handleFinish = async () => {
    const numericWeight = Number(weightInput.replace(',', '.'));
    const numericHeight = Number(heightInput.replace(',', '.'));
    const numericAge = Number(ageInput);

    if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
      Alert.alert('Invalid weight', 'Please provide a valid weight.');
      return;
    }

    if (!Number.isFinite(numericHeight) || numericHeight <= 0) {
      Alert.alert('Invalid height', 'Please provide a valid height.');
      return;
    }

    if (ageMode === 'birthdate' && !parseBirthdateIso(birthdateInput)) {
      Alert.alert('Invalid birthdate', 'Use the format yyyy-mm-dd.');
      return;
    }

    if (ageMode === 'age' && (!Number.isFinite(numericAge) || numericAge <= 0)) {
      Alert.alert('Invalid age', 'Please provide a valid age.');
      return;
    }

    setSaving(true);
    try {
      setUnit(unitSystem === 'metric' ? 'kg' : 'lb');

      const weightKg = toKg(numericWeight, unitSystem);
      const heightCm = toCm(numericHeight, unitSystem);
      const birthdateIso = ageMode === 'birthdate' ? parseBirthdateIso(birthdateInput) : null;
      const ageValue = ageMode === 'age' ? Math.floor(numericAge) : null;

      await api.upsertWeightTrackerProfile({
        gender,
        age: ageValue,
        birthdate: birthdateIso,
        height_cm: heightCm,
        default_weight_kg: weightKg,
        bmr_formula: 'mifflin_st_jeor',
        activity_level: null,
        show_weight: true,
        show_steps: true,
        show_calories: true,
        onboarding_complete: true,
      });

      const createdGoal = await api.createWeightTrackerGoal({
        goal_type: goal,
        weekly_target_kg: null,
        started_on: todayIsoString(),
        start_weight_kg: weightKg,
      });

      await api.upsertWeightTrackerEntry({
        goal_id: createdGoal.id,
        entry_date: todayIsoString(),
        weight_kg: weightKg,
      });

      onComplete();
    } catch {
      Alert.alert('Setup failed', 'Could not save onboarding data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const summaryRows = [
    { label: 'Units', value: unitSystem === 'metric' ? 'Metric (kg/cm)' : 'US (lb/ft)' },
    {
      label: ageMode === 'birthdate' ? 'Birthdate' : 'Age',
      value: ageMode === 'birthdate' ? birthdateInput : ageInput ? `${ageInput} years` : '',
    },
    { label: 'Gender', value: gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : '' },
    { label: 'Height', value: heightInput ? `${heightInput} ${unitSystem === 'metric' ? 'cm' : 'ft'}` : '' },
    { label: 'Weight', value: weightInput ? `${weightInput} ${unitSystem === 'metric' ? 'kg' : 'lb'}` : '' },
    { label: 'Goal', value: GOAL_OPTIONS.find((item) => item.id === goal)?.title ?? '' },
  ];

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.skipButton} onPress={openHomeWithSkip}>
          <Text style={styles.skipButtonText}>Skip setup</Text>
        </TouchableOpacity>

        <View
          style={styles.sliderViewport}
          onLayout={(event) => {
            const nextWidth = Math.floor(event.nativeEvent.layout.width - HORIZONTAL_PADDING * 2);
            if (nextWidth > 0 && nextWidth !== cardWidth) {
              setCardWidth(nextWidth);
            }
          }}
        >
          <View style={styles.sliderClip}>
            <Animated.View
              style={[
                styles.sliderRow,
                {
                  width: CARD_COUNT * cardWidth,
                  transform: [{ translateX: sliderX }],
                },
              ]}
            >
            <View style={[styles.card, { width: cardWidth }]}> 
              <View style={[styles.cardContent, styles.welcomeCardContent]}>
                <BrandLogo width={220} color={themeColors.accent} />
                <Text style={styles.welcomeTitle}>Welcome</Text>
                <Text style={styles.welcomeSubtitle}>Let's get started</Text>

                <TouchableOpacity style={[styles.primaryButton, styles.welcomeButton]} onPress={() => goToStep(1)}>
                  <Text style={styles.primaryButtonText}>Get started</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.card, { width: cardWidth }]}> 
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>About you</Text>
                <Text style={styles.cardSubtitle}>
                  These details are saved in Settings and used in progress calculations.
                </Text>

                <Text style={styles.label}>Units</Text>
                <View style={styles.segmentRow}>
                  <TouchableOpacity
                    style={[styles.segment, unitSystem === 'metric' && styles.segmentActive]}
                    onPress={() => setUnitSystem('metric')}
                  >
                    <Text style={[styles.segmentText, unitSystem === 'metric' && styles.segmentTextActive]}>
                      Metric (kg · cm)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segment, unitSystem === 'us' && styles.segmentActive]}
                    onPress={() => setUnitSystem('us')}
                  >
                    <Text style={[styles.segmentText, unitSystem === 'us' && styles.segmentTextActive]}>
                      US Units (lb · ft)
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.helperText}>
                  Metric uses kilograms/centimeters. US Units uses pounds/feet.
                </Text>

                <Text style={styles.label}>Birthdate or age</Text>
                <View style={styles.segmentRow}>
                  <TouchableOpacity
                    style={[styles.segment, ageMode === 'birthdate' && styles.segmentActive]}
                    onPress={() => setAgeMode('birthdate')}
                  >
                    <Text style={[styles.segmentText, ageMode === 'birthdate' && styles.segmentTextActive]}>Birthdate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segment, ageMode === 'age' && styles.segmentActive]}
                    onPress={() => setAgeMode('age')}
                  >
                    <Text style={[styles.segmentText, ageMode === 'age' && styles.segmentTextActive]}>Age</Text>
                  </TouchableOpacity>
                </View>

                {ageMode === 'birthdate' ? (
                  <View style={styles.inputShell}>
                    <TextInput
                      style={[styles.input, styles.inputWithRightHint]}
                      value={birthdateInput}
                      onChangeText={handleBirthdateChange}
                      keyboardType="number-pad"
                      placeholderTextColor={themeColors.textMuted}
                    />
                    <Text style={styles.inputRightHint}>yyyy-mm-dd</Text>
                  </View>
                ) : (
                  <TextInput
                    style={styles.input}
                    value={ageInput}
                    onChangeText={setAgeInput}
                    keyboardType="number-pad"
                    placeholder="Age"
                    placeholderTextColor={themeColors.textMuted}
                  />
                )}

                <Text style={styles.label}>Gender</Text>
                <View style={styles.segmentRow}>
                  {(['male', 'female', 'other'] as WeightTrackerGender[]).map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[styles.segment, gender === option && styles.segmentActive]}
                      onPress={() => setGender(gender === option ? null : option)}
                    >
                      <Text style={[styles.segmentText, gender === option && styles.segmentTextActive]}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Height ({unitSystem === 'metric' ? 'cm' : 'ft'})</Text>
                <View style={styles.inputShell}>
                  <TextInput
                    style={[styles.input, styles.inputWithRightHint]}
                    value={heightInput}
                    onChangeText={setHeightInput}
                    keyboardType="decimal-pad"
                    placeholderTextColor={themeColors.textMuted}
                  />
                  <Text style={styles.inputRightHint}>{unitSystem === 'metric' ? 'e.g. 178' : 'e.g. 5.10'}</Text>
                </View>

                <Text style={styles.label}>Weight ({unitSystem === 'metric' ? 'kg' : 'lb'})</Text>
                <View style={styles.inputShell}>
                  <TextInput
                    style={[styles.input, styles.inputWithRightHint]}
                    value={weightInput}
                    onChangeText={setWeightInput}
                    keyboardType="decimal-pad"
                    placeholderTextColor={themeColors.textMuted}
                  />
                  <Text style={styles.inputRightHint}>{unitSystem === 'metric' ? 'e.g. 78.5' : 'e.g. 173.0'}</Text>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => goToStep(0)}>
                    <Text style={styles.secondaryButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleNextFromAboutYou}>
                    <Text style={styles.primaryButtonText}>Next</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={[styles.card, { width: cardWidth }]}> 
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Your goal</Text>
                <Text style={styles.cardSubtitle}>
                  Pick the mode that shapes guidance in the Weight Tracker.
                </Text>

                {GOAL_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.goalCard, goal === option.id && styles.goalCardActive]}
                    onPress={() => setGoal(option.id)}
                  >
                    <Ionicons
                      name={option.icon}
                      size={22}
                      color={goal === option.id ? themeColors.accent : themeColors.textMuted}
                    />
                    <View style={styles.goalCardTextWrap}>
                      <Text style={styles.goalCardTitle}>{option.title}</Text>
                      <Text style={styles.goalCardSubtitle}>{option.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                ))}

                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => goToStep(1)}>
                    <Text style={styles.secondaryButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryButton} onPress={() => goToStep(3)}>
                    <Text style={styles.primaryButtonText}>Next</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={[styles.card, { width: cardWidth }]}> 
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>All set</Text>
                <Text style={styles.cardSubtitle}>
                  Review your setup. You can change everything later in Settings.
                </Text>

                <View style={styles.summaryCard}>
                  {summaryRows.map((row) => (
                    <View key={row.label} style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{row.label}</Text>
                      <Text style={styles.summaryValue}>{formatSummaryValue(row.value)}</Text>
                    </View>
                  ))}
                </View>

                {saving ? (
                  <ActivityIndicator color={themeColors.accent} style={styles.savingIndicator} />
                ) : (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => goToStep(2)}>
                      <Text style={styles.secondaryButtonText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.primaryButton} onPress={handleFinish}>
                      <Text style={styles.primaryButtonText}>Go to dashboard</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
            </Animated.View>
          </View>
        </View>

        <View style={styles.progressDotsRow}>
          {Array.from({ length: CARD_COUNT }).map((_, index) => (
            <View
              key={index}
              style={[styles.progressDot, index === step && styles.progressDotActive]}
            />
          ))}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (themeColors: ReturnType<typeof usePreferences>['colors']) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    sliderViewport: {
      flex: 1,
      paddingHorizontal: HORIZONTAL_PADDING,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sliderClip: {
      width: '100%',
      overflow: 'hidden',
    },
    sliderRow: {
      flexDirection: 'row',
      gap: CARD_GAP,
      alignItems: 'flex-start',
    },
    card: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.surface,
      ...shadow.card,
    },
    cardContent: {
      padding: 20,
      paddingBottom: 22,
      gap: 10,
    },
    welcomeCardContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    welcomeButton: {
      flex: 0,
      marginTop: 14,
      width: '100%',
      maxWidth: 220,
    },
    skipButton: {
      position: 'absolute',
      top: 14,
      right: 20,
      zIndex: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    skipButtonText: {
      color: themeColors.textMuted,
      fontWeight: '700',
    },
    welcomeTitle: {
      fontSize: 42,
      lineHeight: 44,
      fontWeight: '800',
      color: themeColors.textStrong,
      marginTop: 8,
      textAlign: 'center',
    },
    welcomeSubtitle: {
      fontSize: 20,
      fontWeight: '600',
      color: themeColors.textMuted,
      marginBottom: 16,
      textAlign: 'center',
    },
    cardTitle: {
      fontSize: 30,
      fontWeight: '800',
      color: themeColors.textStrong,
    },
    cardSubtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: themeColors.textMuted,
      marginBottom: 4,
    },
    label: {
      color: themeColors.textStrong,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 2,
    },
    input: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.sm,
      backgroundColor: themeColors.background,
      color: themeColors.textStrong,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    inputShell: {
      position: 'relative',
      justifyContent: 'center',
    },
    inputWithRightHint: {
      paddingRight: 98,
    },
    inputRightHint: {
      position: 'absolute',
      right: 12,
      color: themeColors.textMuted,
      fontSize: 12,
    },
    helperText: {
      color: themeColors.textMuted,
      fontSize: 12,
      lineHeight: 16,
      marginTop: -2,
      marginBottom: 4,
    },
    segmentRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 2,
    },
    segment: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.sm,
      paddingHorizontal: 11,
      paddingVertical: 8,
      backgroundColor: themeColors.background,
    },
    segmentActive: {
      borderColor: themeColors.accent,
      backgroundColor: themeColors.accentSoft,
    },
    segmentText: {
      color: themeColors.textMuted,
      fontWeight: '600',
      fontSize: 13,
    },
    segmentTextActive: {
      color: themeColors.accent,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },
    primaryButton: {
      flex: 1,
      backgroundColor: themeColors.accent,
      borderRadius: radius.sm,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    primaryButtonText: {
      color: themeColors.textOnAccent,
      fontWeight: '700',
    },
    secondaryButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.sm,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      backgroundColor: themeColors.surface,
    },
    secondaryButtonText: {
      color: themeColors.textStrong,
      fontWeight: '700',
    },
    goalCard: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.sm,
      backgroundColor: themeColors.background,
      padding: 12,
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    goalCardActive: {
      borderColor: themeColors.accent,
      backgroundColor: themeColors.accentSoft,
    },
    goalCardTextWrap: {
      flex: 1,
      gap: 2,
    },
    goalCardTitle: {
      color: themeColors.textStrong,
      fontWeight: '700',
      fontSize: 15,
    },
    goalCardSubtitle: {
      color: themeColors.textMuted,
      fontSize: 12,
      lineHeight: 16,
    },
    summaryCard: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.md,
      backgroundColor: themeColors.background,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 10,
      marginTop: 4,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    summaryLabel: {
      color: themeColors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    summaryValue: {
      color: themeColors.textStrong,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'right',
      flexShrink: 1,
    },
    savingIndicator: {
      marginTop: 16,
    },
    progressDotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 20,
      paddingBottom: 18,
      paddingTop: 12,
    },
    progressDot: {
      width: 18,
      height: 3,
      borderRadius: 2,
      backgroundColor: themeColors.border,
    },
    progressDotActive: {
      height: 5,
      backgroundColor: themeColors.accent,
    },
  });
