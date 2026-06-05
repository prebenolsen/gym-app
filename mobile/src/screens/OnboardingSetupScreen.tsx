import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  ImageBackground,
  Keyboard,
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
import type { DateFormat } from '../context/PreferencesContext';
import type { WeightTrackerGender, WeightTrackerGoal } from '@gym-app/shared';
import AppButton from '../components/ui/AppButton';
import ChipButton from '../components/ui/ChipButton';

type UnitSystem = 'metric' | 'us';
type AgeInputMode = 'birthdate' | 'age';
type ProfileCardKey = 'gender' | 'birthdate' | 'height' | 'weight';
type ProfileCardsGroup = 'identity' | 'measurements';
type DateFormatChoice = DateFormat | null;

type OnboardingSetupScreenProps = {
  onComplete: () => void;
  onSkip: () => void;
};

const STEPS = {
  welcome: 0,
  unitFormat: 1,
  dateFormat: 2,
  profileCards: 3,
  goal: 4,
  review: 5,
} as const;

const CARD_COUNT = 6;
const CARD_GAP = 0;
const HORIZONTAL_PADDING = 20;

const DATE_FORMAT_OPTIONS: ReadonlyArray<{ key: DateFormat; label: string }> = [
  { key: 'eu', label: 'DD/MM/YYYY' },
  { key: 'iso', label: 'YYYY/MM/DD' },
  { key: 'us', label: 'MM/DD/YYYY' },
];

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

const getDateFormatConfig = (format: DateFormat) => {
  if (format === 'eu') {
    return { separator: '/', segmentLengths: [2, 2, 4] as const, order: 'dmy' as const };
  }
  if (format === 'us') {
    return { separator: '/', segmentLengths: [2, 2, 4] as const, order: 'mdy' as const };
  }
  return { separator: '/', segmentLengths: [4, 2, 2] as const, order: 'ymd' as const };
};

const formatBirthdateInput = (
  rawText: string,
  format: DateFormat,
  showSeparators: boolean,
): string => {
  const { separator, segmentLengths } = getDateFormatConfig(format);
  const maxDigits = segmentLengths.reduce((sum, length) => sum + length, 0);
  const digits = rawText.replace(/\D/g, '').slice(0, maxDigits);
  const parts: string[] = [];

  let cursor = 0;
  for (const length of segmentLengths) {
    if (cursor >= digits.length) {
      if (showSeparators && parts.length > 0 && parts.length < segmentLengths.length) {
        parts.push('');
      }
      break;
    }

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

const getDateFormatLabel = (format: DateFormat): string =>
  DATE_FORMAT_OPTIONS.find((option) => option.key === format)?.label ?? 'YYYY/MM/DD';

const todayIsoString = (): string => new Date().toISOString().split('T')[0];

const normalizeDecimalInput = (value: string): string => value.trim().replace(',', '.');

const toKg = (value: number, unitSystem: UnitSystem): number =>
  unitSystem === 'us' ? value / 2.2 : value;

const toCm = (value: number, unitSystem: UnitSystem): number =>
  unitSystem === 'us' ? value * 30.48 : value;

const formatSummaryValue = (value: string): string => (value ? value : 'Not set');

export default function OnboardingSetupScreen({ onComplete, onSkip }: OnboardingSetupScreenProps) {
  const api = useApi();
  const { colors: themeColors, setUnit, dateFormat, setDateFormat } = usePreferences();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const showTroubleshootingSkip = __DEV__;

  const initialCardWidth = Dimensions.get('window').width - HORIZONTAL_PADDING * 2;
  const [cardWidth, setCardWidth] = useState(initialCardWidth);
  const sliderX = useRef(new Animated.Value(0)).current;
  const previousDateFormatRef = useRef<DateFormat>(dateFormat);

  const [step, setStep] = useState<number>(STEPS.welcome);
  const [saving, setSaving] = useState(false);

  const [unitSystem, setUnitSystem] = useState<UnitSystem | null>(null);
  const [selectedDateFormat, setSelectedDateFormat] = useState<DateFormatChoice>(null);
  const [ageMode, setAgeMode] = useState<AgeInputMode>('birthdate');
  const [birthdateInput, setBirthdateInput] = useState('');
  const [ageInput, setAgeInput] = useState('');
  const [gender, setGender] = useState<WeightTrackerGender | null>(null);
  const [heightInput, setHeightInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [goal, setGoal] = useState<WeightTrackerGoal | null>(null);
  const [profileCardsGroup, setProfileCardsGroup] = useState<ProfileCardsGroup>('identity');
  const [hiddenProfileCards, setHiddenProfileCards] = useState<Record<ProfileCardKey, boolean>>({
    gender: false,
    birthdate: false,
    height: false,
    weight: false,
  });

  const genderCardAnim = useRef(new Animated.Value(1)).current;
  const birthdateCardAnim = useRef(new Animated.Value(1)).current;
  const heightCardAnim = useRef(new Animated.Value(1)).current;
  const weightCardAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(sliderX, {
      toValue: -(step * (cardWidth + CARD_GAP)),
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [cardWidth, sliderX, step]);

  useEffect(() => {
    if (!selectedDateFormat) {
      return;
    }

    if (!birthdateInput.trim()) {
      previousDateFormatRef.current = selectedDateFormat;
      return;
    }

    const previousFormat = previousDateFormatRef.current;
    if (previousFormat === selectedDateFormat) {
      return;
    }

    const isoBirthdate = parseBirthdateToIso(birthdateInput, previousFormat);
    if (isoBirthdate) {
      setBirthdateInput(formatIsoBirthdateForInput(isoBirthdate, selectedDateFormat));
    } else {
      setBirthdateInput((current) => formatBirthdateInput(current, selectedDateFormat, false));
    }

    previousDateFormatRef.current = selectedDateFormat;
  }, [birthdateInput, selectedDateFormat]);

  useEffect(() => {
    if (step !== STEPS.profileCards || profileCardsGroup !== 'measurements') {
      return;
    }

    heightCardAnim.setValue(1);
    weightCardAnim.setValue(1);
    setHiddenProfileCards((previous) => {
      if (!previous.height && !previous.weight) {
        return previous;
      }
      return { ...previous, height: false, weight: false };
    });
  }, [heightCardAnim, profileCardsGroup, step, weightCardAnim]);

  const openHomeWithSkip = () => {
    if (saving) return;
    onSkip();
  };

  const goToStep = (nextStep: number) => {
    if (nextStep < 0 || nextStep >= CARD_COUNT) return;
    setStep(nextStep);
  };

  const handleBirthdateChange = (rawValue: string) => {
    if (!selectedDateFormat) {
      return;
    }

    const previousDigits = birthdateInput.replace(/\D/g, '').length;
    const nextDigits = rawValue.replace(/\D/g, '').length;
    const isDeleting = rawValue.length < birthdateInput.length || nextDigits < previousDigits;
    const formatted = formatBirthdateInput(rawValue, selectedDateFormat, !isDeleting);
    setBirthdateInput(formatted);

    const digitCount = formatted.replace(/\D/g, '').length;
    if (digitCount === 8) {
      Keyboard.dismiss();
      if (!hiddenProfileCards.birthdate) {
        const isValid = !!parseBirthdateToIso(formatted, selectedDateFormat);
        if (isValid) {
        dismissProfileCard('birthdate');
        }
      }
    }
  };

  const handleHeightChange = (rawValue: string) => {
    setHeightInput(rawValue);

    const digitCount = rawValue.replace(/\D/g, '').length;
    if (digitCount === 3 && !hiddenProfileCards.height) {
      Keyboard.dismiss();
      dismissProfileCard('height');
    }
  };

  const handleWeightChange = (rawValue: string) => {
    setWeightInput(rawValue);

    const normalizedValue = normalizeDecimalInput(rawValue);
    const isCompleteDecimalWeight = /^\d{2,3}\.\d$/.test(normalizedValue);
    if (isCompleteDecimalWeight && !hiddenProfileCards.weight) {
      Keyboard.dismiss();
      dismissProfileCard('weight');
    }
  };

  const getProfileCardAnim = (card: ProfileCardKey) => {
    if (card === 'gender') return genderCardAnim;
    if (card === 'birthdate') return birthdateCardAnim;
    if (card === 'height') return heightCardAnim;
    return weightCardAnim;
  };

  const dismissProfileCard = (card: ProfileCardKey) => {
    if (hiddenProfileCards[card]) {
      return;
    }

    Animated.timing(getProfileCardAnim(card), {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setHiddenProfileCards((previous) => {
        if (previous[card]) {
          return previous;
        }

        const next = { ...previous, [card]: true };
        const identityComplete = next.gender && next.birthdate;
        const measurementsComplete = next.height && next.weight;
        if (profileCardsGroup === 'identity' && identityComplete) {
          setProfileCardsGroup('measurements');
        }
        if (measurementsComplete) {
          goToStep(STEPS.goal);
        }
        return next;
      });
    });
  };

  const resetProfileCards = () => {
    genderCardAnim.setValue(1);
    birthdateCardAnim.setValue(1);
    heightCardAnim.setValue(1);
    weightCardAnim.setValue(1);

    setHiddenProfileCards({
      gender: false,
      birthdate: false,
      height: false,
      weight: false,
    });
    setProfileCardsGroup('identity');
  };

  const goBackInProfileCards = () => {
    if (profileCardsGroup === 'measurements') {
      genderCardAnim.setValue(1);
      birthdateCardAnim.setValue(1);
      setHiddenProfileCards((previous) => ({ ...previous, gender: false, birthdate: false }));
      setProfileCardsGroup('identity');
      return;
    }

    goToStep(STEPS.dateFormat);
  };

  const handleSelectGender = (value: WeightTrackerGender) => {
    setGender(value);
    dismissProfileCard('gender');
  };

  const handleConfirmBirthdateAge = () => {
    if (!selectedDateFormat) {
      Alert.alert('Select date format', 'Please choose your date format first.');
      return;
    }

    if (ageMode === 'birthdate') {
      if (!parseBirthdateToIso(birthdateInput, selectedDateFormat)) {
        Alert.alert('Invalid birthdate', `Use the ${getDateFormatLabel(selectedDateFormat)} format.`);
        return;
      }
      Keyboard.dismiss();
      dismissProfileCard('birthdate');
      return;
    }

    const numericAge = Number(ageInput);
    if (!Number.isFinite(numericAge) || numericAge <= 0) {
      Alert.alert('Invalid age', 'Please provide a valid age.');
      return;
    }

    Keyboard.dismiss();
    dismissProfileCard('birthdate');
  };

  const handleConfirmHeight = () => {
    const numericHeight = Number(normalizeDecimalInput(heightInput));
    if (!Number.isFinite(numericHeight) || numericHeight <= 0) {
      Alert.alert('Invalid height', 'Please provide a valid height.');
      return;
    }

    dismissProfileCard('height');
  };

  const handleConfirmWeight = () => {
    const numericWeight = Number(normalizeDecimalInput(weightInput));
    if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
      Alert.alert('Invalid weight', 'Please provide a valid weight.');
      return;
    }

    Keyboard.dismiss();
    dismissProfileCard('weight');
  };

  const handleFinish = async () => {
    if (!selectedDateFormat) {
      Alert.alert('Select date format', 'Please choose your date format first.');
      return;
    }

    const numericWeight = Number(normalizeDecimalInput(weightInput));
    const numericHeight = Number(normalizeDecimalInput(heightInput));
    const numericAge = Number(ageInput);

    if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
      Alert.alert('Invalid weight', 'Please provide a valid weight.');
      return;
    }

    if (!Number.isFinite(numericHeight) || numericHeight <= 0) {
      Alert.alert('Invalid height', 'Please provide a valid height.');
      return;
    }

    if (ageMode === 'birthdate' && !parseBirthdateToIso(birthdateInput, selectedDateFormat)) {
      Alert.alert('Invalid birthdate', `Use the ${getDateFormatLabel(selectedDateFormat)} format.`);
      return;
    }

    if (ageMode === 'age' && (!Number.isFinite(numericAge) || numericAge <= 0)) {
      Alert.alert('Invalid age', 'Please provide a valid age.');
      return;
    }

    if (!goal) {
      Alert.alert('Select a goal', 'Please choose a goal first.');
      return;
    }

    setSaving(true);
    try {
      if (!unitSystem) {
        Alert.alert('Select units', 'Please choose Metric or US Units first.');
        return;
      }

      setUnit(unitSystem === 'metric' ? 'kg' : 'lb');
      setDateFormat(selectedDateFormat);

      const weightKg = toKg(numericWeight, unitSystem);
      const heightCm = toCm(numericHeight, unitSystem);
      const birthdateIso =
        ageMode === 'birthdate' ? parseBirthdateToIso(birthdateInput, selectedDateFormat) : null;
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
    { label: 'Units', value: unitSystem === 'metric' ? 'Metric (kg/cm)' : unitSystem === 'us' ? 'US (lb/ft)' : '' },
    { label: 'Date format', value: selectedDateFormat ? getDateFormatLabel(selectedDateFormat) : '' },
    {
      label: ageMode === 'birthdate' ? 'Birthdate' : 'Age',
      value: ageMode === 'birthdate' ? birthdateInput : ageInput ? `${ageInput} years` : '',
    },
    { label: 'Gender', value: gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : '' },
    {
      label: 'Height',
      value: heightInput ? `${heightInput} ${unitSystem === 'metric' ? 'cm' : 'ft'}` : '',
    },
    {
      label: 'Weight',
      value: weightInput ? `${weightInput} ${unitSystem === 'metric' ? 'kg' : 'lb'}` : '',
    },
    { label: 'Goal', value: goal ? GOAL_OPTIONS.find((item) => item.id === goal)?.title ?? '' : '' },
  ];
  const showBirthdateConfirmAction =
    ageMode === 'age' || (ageMode === 'birthdate' && birthdateInput.trim().length > 0);

  return (
    <ImageBackground
      source={require('../../../shared/assets/Copilot_20260402_133811.png')}
      style={styles.screen}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {showTroubleshootingSkip ? (
          <TouchableOpacity style={styles.skipButton} onPress={openHomeWithSkip}>
            <Text style={styles.skipButtonText}>Skip (temp)</Text>
          </TouchableOpacity>
        ) : null}

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
              <View style={[styles.card, styles.welcomeCard, { width: cardWidth }]}> 
                <View style={[styles.cardContent, styles.welcomeCardContent]}>
                  <BrandLogo width={220} color={themeColors.accent} />

                  <AppButton
                    title="Get started"
                    style={styles.welcomeButton}
                    onPress={() => goToStep(STEPS.unitFormat)}
                  />
                </View>
              </View>

              <View style={[styles.card, { width: cardWidth }]}> 
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Which formats do you prefer?</Text>
                  <Text style={styles.cardSubtitle}>
                    We will use this unit system for your goals and weight tracking.
                  </Text>

                  <Text style={styles.label}>Units</Text>
                  <View style={styles.quickChoiceRow}>
                    <TouchableOpacity
                      style={styles.quickChoiceCard}
                      onPress={() => {
                        setUnitSystem('metric');
                        goToStep(STEPS.dateFormat);
                      }}
                    >
                      <Text style={styles.quickChoiceTitle}>Metric</Text>
                      <Text style={styles.quickChoiceSubtitle}>kg and cm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickChoiceCard}
                      onPress={() => {
                        setUnitSystem('us');
                        goToStep(STEPS.dateFormat);
                      }}
                    >
                      <Text style={styles.quickChoiceTitle}>US Units</Text>
                      <Text style={styles.quickChoiceSubtitle}>lb and ft</Text>
                    </TouchableOpacity>
                  </View>


                  <View style={styles.buttonRow}>
                    <AppButton
                      title="Back"
                      variant="secondary"
                      style={styles.rowButton}
                      onPress={() => goToStep(STEPS.welcome)}
                    />
                  </View>
                </View>
              </View>

              <View style={[styles.card, { width: cardWidth }]}> 
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>And how do you write dates?</Text>


                  <Text style={styles.label}>Date format</Text>
                  <View style={styles.quickChoiceRow}>
                    {DATE_FORMAT_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        style={styles.quickChoiceCard}
                        onPress={() => {
                          setSelectedDateFormat(option.key);
                          setDateFormat(option.key);
                          goToStep(STEPS.profileCards);
                        }}
                      >
                        <Text style={styles.quickChoiceTitle}>{option.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.buttonRow}>
                    <AppButton
                      title="Back"
                      variant="secondary"
                      style={styles.rowButton}
                      onPress={() => goToStep(STEPS.unitFormat)}
                    />
                  </View>
                </View>
              </View>

              <View style={[styles.profilePage, { width: cardWidth }]}> 
                <View style={styles.profilePageContent}>
                  <View style={styles.profileCardsStack}>
                    {profileCardsGroup === 'identity' ? (
                      <>
                        <Animated.View
                          pointerEvents={hiddenProfileCards.gender ? 'none' : 'auto'}
                          style={[
                            styles.profileMiniCard,
                            {
                              opacity: genderCardAnim,
                              transform: [
                                {
                                  translateX: genderCardAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-420, 0],
                                  }),
                                },
                              ],
                            },
                          ]}
                        >
                          <Text style={styles.profileMiniTitle}>I am a</Text>
                          <View style={styles.segmentRow}>
                            {(['male', 'female', 'other'] as WeightTrackerGender[]).map((option) => (
                              <ChipButton
                                key={option}
                                label={option.charAt(0).toUpperCase() + option.slice(1)}
                                selected={gender === option}
                                onPress={() => handleSelectGender(option)}
                              />
                            ))}
                          </View>
                        </Animated.View>

                        <Animated.View
                          pointerEvents={hiddenProfileCards.birthdate ? 'none' : 'auto'}
                          style={[
                            styles.profileMiniCard,
                            {
                              opacity: birthdateCardAnim,
                              transform: [
                                {
                                  translateX: birthdateCardAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-420, 0],
                                  }),
                                },
                              ],
                            },
                          ]}
                        >
                          <Text style={styles.profileMiniTitle}>I was born on</Text>
                          {ageMode === 'birthdate' ? (
                            <View style={styles.inputShell}>
                              <TextInput
                                style={[styles.input, styles.inputWithRightHint]}
                                value={birthdateInput}
                                onChangeText={handleBirthdateChange}
                                keyboardType="number-pad"
                                placeholderTextColor={themeColors.textMuted}
                              />
                              <Text style={styles.inputRightHint}>
                                {selectedDateFormat ? getDateFormatLabel(selectedDateFormat) : ''}
                              </Text>
                            </View>
                          ) : (
                            <TextInput
                              style={styles.input}
                              value={ageInput}
                              onChangeText={setAgeInput}
                              keyboardType="number-pad"
                              placeholder="e.g. 29"
                              placeholderTextColor={themeColors.textMuted}
                            />
                          )}
                          <View style={styles.birthdateActionsRow}>
                            <TouchableOpacity
                              style={styles.birthdateModeSwitchAction}
                              onPress={() => setAgeMode(ageMode === 'birthdate' ? 'age' : 'birthdate')}
                            >
                              <Text style={styles.modeSwitchText}>
                                {ageMode === 'birthdate' ? 'Use my Age instead' : 'Use my birthdate instead'}
                              </Text>
                            </TouchableOpacity>
                            {showBirthdateConfirmAction ? (
                              <TouchableOpacity
                                style={styles.birthdateConfirmAction}
                                onPress={handleConfirmBirthdateAge}
                              >
                                <Text style={styles.birthdateConfirmActionText}>Confirm</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </Animated.View>
                      </>
                    ) : (
                      <>
                        <Animated.View
                          pointerEvents={hiddenProfileCards.height ? 'none' : 'auto'}
                          style={[
                            styles.profileMiniCard,
                            {
                              opacity: heightCardAnim,
                              transform: [
                                {
                                  translateX: heightCardAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-420, 0],
                                  }),
                                },
                              ],
                            },
                          ]}
                        >
                          <Text style={styles.profileMiniTitle}>My height is</Text>
                          <View style={styles.inputShell}>
                            <TextInput
                              style={[styles.input, styles.inputWithRightHint]}
                              value={heightInput}
                              onChangeText={handleHeightChange}
                              keyboardType="decimal-pad"
                              placeholderTextColor={themeColors.textMuted}
                            />
                            <Text style={styles.inputRightHint}>{unitSystem === 'metric' ? 'cm' : 'ft'}</Text>
                          </View>
                          <AppButton
                            title="Confirm"
                            style={styles.inlineConfirmButton}
                            onPress={handleConfirmHeight}
                          />
                        </Animated.View>

                        <Animated.View
                          pointerEvents={hiddenProfileCards.weight ? 'none' : 'auto'}
                          style={[
                            styles.profileMiniCard,
                            {
                              opacity: weightCardAnim,
                              transform: [
                                {
                                  translateX: weightCardAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-420, 0],
                                  }),
                                },
                              ],
                            },
                          ]}
                        >
                          <Text style={styles.profileMiniTitle}>I weigh roughly</Text>
                          <View style={styles.inputShell}>
                            <TextInput
                              style={[styles.input, styles.inputWithRightHint]}
                              value={weightInput}
                              onChangeText={handleWeightChange}
                              onSubmitEditing={handleConfirmWeight}
                              keyboardType="decimal-pad"
                              returnKeyType="done"
                              placeholderTextColor={themeColors.textMuted}
                            />
                            <Text style={styles.inputRightHint}>{unitSystem === 'metric' ? 'kg' : 'lb'}</Text>
                          </View>
                          <AppButton
                            title="Confirm"
                            style={styles.inlineConfirmButton}
                            onPress={handleConfirmWeight}
                          />
                        </Animated.View>
                      </>
                    )}
                  </View>

                  <View style={styles.buttonRow}>
                    <AppButton
                      title="Back"
                      variant="secondary"
                      style={styles.rowButton}
                      onPress={goBackInProfileCards}
                    />
                  </View>
                </View>
              </View>

              <View style={[styles.card, { width: cardWidth }]}> 
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Your goal</Text>


                  {GOAL_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[styles.goalCard, goal === option.id && styles.goalCardActive]}
                      onPress={() => {
                        setGoal(option.id);
                        goToStep(STEPS.review);
                      }}
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
                    <AppButton
                      title="Back"
                      variant="secondary"
                      style={styles.rowButton}
                      onPress={() => {
                        setProfileCardsGroup('measurements');
                        goToStep(STEPS.profileCards);
                      }}
                    />
                  </View>
                </View>
              </View>

              <View style={[styles.card, { width: cardWidth }]}> 
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>All set</Text>
                  <Text style={styles.cardSubtitle}>
                    You can change everything in the Settings menu.
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
                      <AppButton
                        title="Back"
                        variant="secondary"
                        style={styles.rowButton}
                        onPress={() => goToStep(STEPS.goal)}
                      />
                      <AppButton
                        title="Continue"
                        style={styles.rowButton}
                        onPress={handleFinish}
                      />
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
    </ImageBackground>
  );
}

const createStyles = (themeColors: ReturnType<typeof usePreferences>['colors']) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      backgroundColor: themeColors.overlayScrim,
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
      alignItems: 'center',
    },
    card: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.surface,
      ...shadow.card,
    },
    profilePage: {
      backgroundColor: 'transparent',
    },
    profilePageContent: {
      gap: 6,
      paddingHorizontal: 2,
      paddingBottom: 6,
    },
    cardContent: {
      padding: 20,
      paddingBottom: 22,
      gap: 10,
    },
    welcomeCardContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    welcomeCard: {
      borderWidth: 0,
      backgroundColor: 'transparent',
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
      minHeight: '54%',
      maxHeight: '60%',
    },
    welcomeButton: {
      flex: 0,
      marginTop: 39,
      width: '100%',
      maxWidth: 220,
    },
    skipButton: {
      position: 'absolute',
      top: 50,
      right: 20,
      zIndex: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: themeColors.accent,
      backgroundColor: themeColors.surface,
      ...shadow.card,
    },
    skipButtonText: {
      color: themeColors.accent,
      fontSize: 12,
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
      paddingRight: 112,
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
    modeSwitchText: {
      fontSize: 13,
      fontWeight: '700',
      color: themeColors.accent,
    },
    birthdateActionsRow: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    birthdateModeSwitchAction: {
      flexShrink: 1,
    },
    birthdateConfirmAction: {
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: themeColors.accent,
      backgroundColor: themeColors.accentSoft,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    birthdateConfirmActionText: {
      color: themeColors.accent,
      fontSize: 12,
      fontWeight: '800',
    },
    segmentRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 2,
    },
    segmentedRow: {
      marginBottom: 2,
    },
    quickChoiceRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 2,
      flexWrap: 'wrap',
    },
    quickChoiceCard: {
      minWidth: 94,
      flexGrow: 1,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.sm,
      backgroundColor: themeColors.background,
      paddingVertical: 14,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    quickChoiceTitle: {
      color: themeColors.textStrong,
      fontSize: 15,
      fontWeight: '700',
    },
    quickChoiceSubtitle: {
      color: themeColors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    profileCardsStack: {
      gap: 14,
      marginTop: 8,
    },
    profileMiniCard: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.sm,
      backgroundColor: themeColors.surface,
      padding: 12,
      gap: 8,
    },
    profileMiniTitle: {
      color: themeColors.textStrong,
      fontWeight: '800',
      fontSize: 18,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },
    rowButton: {
      flex: 1,
    },
    inlineConfirmButton: {
      marginTop: 2,
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
