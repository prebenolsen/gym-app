import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Switch,
  Alert,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import { usePreferences } from '../context/PreferencesContext';
import { useApi } from '../hooks/useApi';
import { getButtonStyles, radius, shadow } from '../theme';
import type {
  WeightTrackerProfile,
  WeightTrackerGoalProject,
  WeightTrackerEntry,
  WeightTrackerCustomMetric,
  WeightTrackerCustomMetricValue,
  WeightTrackerCustomMetricType,
  WeightTrackerActivityLevel,
  WeightTrackerBmrFormula,
  WeightTrackerGoal,
  WeightTrackerGender,
} from '@gym-app/shared';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const LOG_WHEEL_ROW_HEIGHT = 52;
const LOG_WHEEL_LOOKBACK_DAYS = 3650;
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const ACTIVITY_LEVELS: {
  key: WeightTrackerActivityLevel;
  label: string;
  sub: string;
  multiplier: number;
}[] = [
  { key: 'sedentary',         label: 'Sedentary',          sub: 'Little / no exercise',   multiplier: 1.2   },
  { key: 'lightly_active',    label: 'Lightly Active',     sub: '1–3 days / week',         multiplier: 1.375 },
  { key: 'moderately_active', label: 'Moderately Active',  sub: '3–5 days / week',         multiplier: 1.55  },
  { key: 'very_active',       label: 'Very Active',        sub: '6–7 days / week',         multiplier: 1.725 },
  { key: 'extremely_active',  label: 'Extremely Active',   sub: 'Athlete / physical job',  multiplier: 1.9   },
];

const BMR_FORMULAS: { key: WeightTrackerBmrFormula; label: string; note: string }[] = [
  {
    key: 'mifflin_st_jeor',
    label: 'Mifflin–St Jeor',
    note: 'Widely used, good for most adults',
  },
  {
    key: 'harris_benedict',
    label: 'Harris–Benedict (revised)',
    note: 'Classic formula, slightly higher estimates',
  },
  {
    key: 'katch_mcardle',
    label: 'Katch–McArdle',
    note: 'Lean-mass based — less accurate without body-fat %',
  },
];

const HEALTH_INFO_TEXT = `
**Basal Metabolic Rate (BMR)**
Your BMR is the number of calories your body burns at complete rest — just to keep you alive (breathing, circulation, cell repair). It accounts for roughly 60–70 % of your total daily energy use.

**Total Daily Energy Expenditure (TDEE)**
TDEE = BMR × activity multiplier. It represents the total calories you burn in a day including all movement and exercise. Eating at your TDEE means your weight stays stable.

**Weight Loss**
A calorie deficit of ~500 kcal/day produces roughly 0.5 kg (1 lb) of fat loss per week. A 250 kcal deficit is gentler and easier to sustain. Going below BMR for extended periods is not recommended.

**Weight Gain (muscle)**
A modest surplus of 150–300 kcal/day above TDEE supports lean muscle gain when combined with resistance training, while minimising excess fat.

**Sustainable rates**
Safe weight loss is generally 0.25–1 % of body weight per week. Faster rates risk muscle loss and metabolic adaptation. Consistency over weeks matters far more than perfection each day.

**About the formulas**
Mifflin–St Jeor (1990) is validated in the most studies and is the recommended default for most people. Harris–Benedict (revised 1984) tends to estimate slightly higher. Katch–McArdle accounts for lean mass but requires an accurate body-fat percentage — without one, the estimate is rougher.
`.trim();

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const todayString = (): string => new Date().toISOString().split('T')[0];

const parseIsoDateLocal = (isoDate: string): Date => {
  const [year, month, day] = isoDate.split('-').map((v) => parseInt(v, 10));
  return new Date(year, month - 1, day);
};

const dateLabel = (isoDate: string): string => {
  const today = todayString();
  if (isoDate === today) return 'Today';
  const d = parseIsoDateLocal(isoDate);
  return `${WEEKDAY_SHORT[d.getDay()]} ${d.getDate()}. ${MONTH_NAMES[d.getMonth()]}`;
};

const compactDateForFormat = (isoDate: string, dateFormat: 'iso' | 'eu' | 'us'): string => {
  const [, month, day] = isoDate.split('-');
  if (dateFormat === 'eu') return `${day}/${month}`;
  if (dateFormat === 'us') return `${month}/${day}`;
  return `${month}/${day}`;
};

const fullDateForFormat = (isoDate: string, dateFormat: 'iso' | 'eu' | 'us'): string => {
  const [year, month, day] = isoDate.split('-');
  if (dateFormat === 'eu') return `${day}/${month}/${year}`;
  if (dateFormat === 'us') return `${month}/${day}/${year}`;
  return `${year}-${month}-${day}`;
};

const GOAL_TYPE_LABEL: Record<WeightTrackerGoal, string> = {
  lose: 'Weight Loss',
  gain: 'Weight Gain',
  track: 'Weight Tracking',
};

const calcBMR = (
  formula: WeightTrackerBmrFormula,
  weightKg: number,
  heightCm: number,
  age: number,
  gender: WeightTrackerGender,
): number => {
  switch (formula) {
    case 'mifflin_st_jeor':
      return gender === 'male'
        ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
        : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    case 'harris_benedict':
      return gender === 'male'
        ? 13.397 * weightKg + 4.799 * heightCm - 5.677 * age + 88.362
        : 9.247 * weightKg + 3.098 * heightCm - 4.33 * age + 447.593;
    case 'katch_mcardle':
      // Without body-fat %, lean mass is approximated at 75 % of weight
      return 370 + 21.6 * (weightKg * 0.75);
    default:
      return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
};

const buildPastDates = (days: number): string[] =>
  Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });

const ageFromBirthdate = (birthdate: string): number | null => {
  const d = new Date(birthdate);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age > 0 ? age : null;
};

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

type ScreenView = 'loading' | 'ob-1' | 'ob-2' | 'ob-3' | 'ob-4' | 'ob-5' | 'main';
type LogDateOption = {
  iso: string;
  label: string;
  isMissingWeight: boolean;
};

export default function WeightTrackerScreen() {
  const {
    colors: C,
    formatWeight,
    dateFormat,
    convertFromKg,
    convertToKg,
    unit,
    heightUnit,
    convertFromCm,
    convertToCm,
  } = usePreferences();
  const api = useApi();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(C), [C]);
  const logDateWheelRef = useRef<FlatList<LogDateOption>>(null);

  // ── core data ──────────────────────────────────────────────
  const [profile, setProfile]           = useState<WeightTrackerProfile | null>(null);
  const [goals, setGoals]               = useState<WeightTrackerGoalProject[]>([]);
  const [entries, setEntries]           = useState<WeightTrackerEntry[]>([]);
  const [customMetrics, setCustomMetrics]     = useState<WeightTrackerCustomMetric[]>([]);
  const [customMetricValues, setCustomMetricValues] = useState<WeightTrackerCustomMetricValue[]>([]);
  const [view, setView]                 = useState<ScreenView>('loading');
  const [showGoalDropdown, setShowGoalDropdown] = useState(false);

  // ── new goal modal ─────────────────────────────────────────
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const [newGoalType, setNewGoalType] = useState<WeightTrackerGoal>('lose');
  const [newGoalWeeklyTarget, setNewGoalWeeklyTarget] = useState<number | null>(0.5);
  const [newGoalStartWeight, setNewGoalStartWeight] = useState('');
  const [savingNewGoal, setSavingNewGoal] = useState(false);

  // ── onboarding state ───────────────────────────────────────
  const [obWeight,          setObWeight]          = useState('');
  const [obHeight,          setObHeight]          = useState('');
  const [obGender,          setObGender]          = useState<WeightTrackerGender | null>(null);
  const [obAge,             setObAge]             = useState('');
  const [obAgeMode,         setObAgeMode]         = useState<'age' | 'birthdate'>('age');
  const [obBirthdateInput,  setObBirthdateInput]  = useState('');
  const [obShowWeight,      setObShowWeight]      = useState(true);
  const [obShowSteps,       setObShowSteps]       = useState(true);
  const [obShowCal,         setObShowCal]         = useState(true);
  const [obGoal,            setObGoal]            = useState<WeightTrackerGoal | null>(null);
  const [obWeeklyTarget,    setObWeeklyTarget]    = useState<number | null>(null);
  const [obActivity,        setObActivity]        = useState<WeightTrackerActivityLevel | null>(null);
  const [obSaving,          setObSaving]          = useState(false);

  // ── log-entry modal ────────────────────────────────────────
  const [showLogModal,    setShowLogModal]    = useState(false);
  const [logDate,         setLogDate]         = useState(todayString());
  const [logWeightInput,  setLogWeightInput]  = useState('');
  const [logSteps,        setLogSteps]        = useState('');
  const [logCalories,     setLogCalories]     = useState('');
  const [logCustomValues, setLogCustomValues] = useState<Record<string, string | boolean>>({});
  const [savingLog,       setSavingLog]       = useState(false);

  // ── accordion sections ─────────────────────────────────────
  const [showBmr,         setShowBmr]         = useState(false);
  const [showHealthInfo,  setShowHealthInfo]  = useState(false);
  const [showSettings,    setShowSettings]    = useState(false);

  // ── inline settings edit mirrors ──────────────────────────
  const [editSWeight,      setEditSWeight]      = useState(true);
  const [editSSteps,       setEditSSteps]       = useState(true);
  const [editSCal,         setEditSCal]         = useState(true);
  const [savingSettings,   setSavingSettings]   = useState(false);

  // ── custom metric creation ─────────────────────────────────
  const [showAddMetricModal,  setShowAddMetricModal]  = useState(false);
  const [newMetricName,       setNewMetricName]       = useState('');
  const [newMetricType,       setNewMetricType]       = useState<WeightTrackerCustomMetricType>('boolean');
  const [savingNewMetric,     setSavingNewMetric]     = useState(false);

  // ── data loading ───────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const load = async () => {
        try {
          const [profileData, goalsData, metricsData] = await Promise.all([
            api.getWeightTrackerProfile(),
            api.getWeightTrackerGoals(),
            api.getCustomMetrics(),
          ]);

          const resolvedActiveGoalId =
            profileData?.active_goal_id ?? goalsData.find((g) => g.is_active)?.id ?? null;

          const [entriesData, metricValuesData] = await Promise.all([
            api.getWeightTrackerEntries(365, resolvedActiveGoalId ?? undefined),
            api.getCustomMetricValues(365, resolvedActiveGoalId ?? undefined),
          ]);

          if (!mounted) return;

          setProfile(profileData);
          setGoals(goalsData ?? []);
          setEntries(entriesData ?? []);
          setCustomMetrics(metricsData ?? []);
          setCustomMetricValues(metricValuesData ?? []);

          if (!profileData || !profileData.onboarding_complete || !resolvedActiveGoalId) {
            if (profileData) {
              // pre-fill from existing partial profile
              setObGender(profileData.gender);
              if (profileData.birthdate) {
                setObAgeMode('birthdate');
                setObBirthdateInput(profileData.birthdate);
              } else {
                setObAge(profileData.age ? String(profileData.age) : '');
              }
              setObWeight(
                profileData.default_weight_kg != null
                  ? String(parseFloat(convertFromKg(profileData.default_weight_kg).toFixed(1)))
                  : '',
              );
              setObHeight(profileData.height_cm ? String(parseFloat(convertFromCm(profileData.height_cm).toFixed(1))) : '');
              setObShowWeight(profileData.show_weight);
              setObShowSteps(profileData.show_steps);
              setObShowCal(profileData.show_calories);
              setObActivity(profileData.activity_level);
            }
            setView('ob-1');
          } else {
            seedSettingsMirrors(profileData);
            setView('main');
          }
        } catch {
          if (mounted) setView('ob-1');
        }
      };

      load();
      return () => { mounted = false; };
    }, [api, convertFromCm, convertFromKg]),
  );

  const seedSettingsMirrors = (p: WeightTrackerProfile) => {
    setEditSWeight(p.show_weight);
    setEditSSteps(p.show_steps);
    setEditSCal(p.show_calories);
  };

  // ─── derived values ────────────────────────────────────────
  const weightEntries = useMemo(
    () =>
      entries
        .filter((e) => e.weight_kg !== null)
        .sort((a, b) => a.entry_date.localeCompare(b.entry_date)),
    [entries],
  );

  const latestWeightEntry = weightEntries[weightEntries.length - 1] ?? null;
  const currentWeightKg   = latestWeightEntry?.weight_kg ?? null;

  const activeGoal = useMemo(
    () => goals.find((g) => g.id === profile?.active_goal_id) ?? goals.find((g) => g.is_active) ?? null,
    [goals, profile?.active_goal_id],
  );

  const profileAge = useMemo(() => {
    if (profile?.age) return profile.age;
    if (profile?.birthdate) return ageFromBirthdate(profile.birthdate);
    return null;
  }, [profile]);

  const canBMR = !!(
    profile?.height_cm && profileAge && profile?.gender && currentWeightKg
  );

  const bmrValue = useMemo(() => {
    if (!canBMR || !profileAge) return null;
    return calcBMR(
      profile!.bmr_formula,
      currentWeightKg!,
      profile!.height_cm!,
      profileAge,
      profile!.gender!,
    );
  }, [canBMR, profile, currentWeightKg, profileAge]);

  const activityMultiplier =
    ACTIVITY_LEVELS.find((a) => a.key === profile?.activity_level)?.multiplier ??
    ACTIVITY_LEVELS[1].multiplier;

  const tdee = bmrValue ? Math.round(bmrValue * activityMultiplier) : null;

  // chart data — show in user's preferred unit
  const chartData = useMemo(() => {
    const pts = weightEntries.map((e, idx) => {
      const displayVal = parseFloat(convertFromKg(e.weight_kg!).toFixed(1));
      const totalPts   = weightEntries.length;
      // label only at first, last, and every ~7th point
      const showLabel  = idx === 0 || idx === totalPts - 1 || idx % 7 === 0;
      return {
        value:         displayVal,
        label:         showLabel ? compactDateForFormat(e.entry_date, dateFormat) : '',
        dataPointText: '',
      };
    });
    return pts;
  }, [weightEntries, convertFromKg, dateFormat]);

  const chartRange = useMemo(() => {
    if (weightEntries.length === 0) return null;
    const values = weightEntries.map((e) => convertFromKg(e.weight_kg!));
    const minWeight = Math.min(...values);
    const maxWeight = Math.max(...values);
    const bufferInDisplayUnit = convertFromKg(2);
    const minValue = parseFloat((minWeight - bufferInDisplayUnit).toFixed(1));
    const maxValue = parseFloat((maxWeight + bufferInDisplayUnit).toFixed(1));
    return {
      yAxisOffset: minValue,
      maxValue: parseFloat((maxValue - minValue).toFixed(1)),
    };
  }, [weightEntries, convertFromKg]);

  const logDateOptions = useMemo<LogDateOption[]>(() => {
    return buildPastDates(LOG_WHEEL_LOOKBACK_DAYS).map((iso) => {
      const existing = entries.find((e) => e.entry_date === iso);
      return {
        iso,
        label: dateLabel(iso),
        isMissingWeight: existing?.weight_kg == null,
      };
    });
  }, [entries]);

  const setLogFieldsFromDate = useCallback(
    (date: string) => {
      const existing = entries.find((e) => e.entry_date === date);
      setLogWeightInput(
        existing?.weight_kg != null
          ? String(parseFloat(convertFromKg(existing.weight_kg).toFixed(1)))
          : '',
      );
      setLogSteps(existing?.steps != null ? String(existing.steps) : '');
      setLogCalories(existing?.calories != null ? String(existing.calories) : '');
      // populate custom metric values for this date
      const vals: Record<string, string | boolean> = {};
      for (const m of customMetrics) {
        const cv = customMetricValues.find(
          (v) => v.entry_date === date && v.metric_id === m.id,
        );
        if (m.type === 'boolean') vals[m.id] = cv?.value_boolean ?? false;
        else if (m.type === 'integer') vals[m.id] = cv?.value_integer != null ? String(cv.value_integer) : '';
        else vals[m.id] = cv?.value_decimal != null ? String(parseFloat(cv.value_decimal.toFixed(2))) : '';
      }
      setLogCustomValues(vals);
    },
    [entries, convertFromKg, customMetrics, customMetricValues],
  );

  // ─── open log modal pre-filled with existing entry if any ──
  const openLogModal = (date: string = todayString()) => {
    setLogDate(date);
    setLogFieldsFromDate(date);
    setShowLogModal(true);

    // Defer until modal/list has rendered, then snap to selected day.
    requestAnimationFrame(() => {
      const selectedIndex = logDateOptions.findIndex((d) => d.iso === date);
      if (selectedIndex >= 0) {
        logDateWheelRef.current?.scrollToIndex({
          index: selectedIndex,
          animated: false,
          viewPosition: 0,
        });
      }
    });
  };

  // ─── save log entry ────────────────────────────────────────
  const handleSaveLog = async () => {
    if (!activeGoal) {
      Alert.alert('No active goal', 'Start a goal project before logging entries.');
      return;
    }

    setSavingLog(true);
    try {
      const weightKg =
        logWeightInput.trim() !== ''
          ? convertToKg(parseFloat(logWeightInput.replace(',', '.')))
          : null;

      const saved = await api.upsertWeightTrackerEntry({
        goal_id:    activeGoal.id,
        entry_date: logDate,
        weight_kg:  weightKg,
        steps:      logSteps.trim()    !== '' ? parseInt(logSteps, 10)    : null,
        calories:   logCalories.trim() !== '' ? parseInt(logCalories, 10) : null,
      });

      setEntries((prev) => {
        const next = prev.filter((e) => e.entry_date !== logDate);
        return [...next, saved];
      });

      // Save custom metric values
      const savedCustomValues: WeightTrackerCustomMetricValue[] = [];
      for (const m of customMetrics) {
        const raw = logCustomValues[m.id];
        const req: Parameters<typeof api.upsertCustomMetricValue>[0] = {
          goal_id:    activeGoal.id,
          entry_date: logDate,
          metric_id:  m.id,
        };
        if (m.type === 'boolean')       req.value_boolean = raw as boolean;
        else if (m.type === 'integer')  req.value_integer = raw !== '' ? parseInt(raw as string, 10) : null;
        else                            req.value_decimal = raw !== '' ? parseFloat((raw as string).replace(',', '.')) : null;
        const cv = await api.upsertCustomMetricValue(req);
        savedCustomValues.push(cv);
      }
      if (savedCustomValues.length > 0) {
        setCustomMetricValues((prev) => {
          const filtered = prev.filter(
            (v) => !(
              v.goal_id === activeGoal.id &&
              v.entry_date === logDate &&
              savedCustomValues.some((sv) => sv.metric_id === v.metric_id)
            ),
          );
          return [...filtered, ...savedCustomValues];
        });
      }

      setShowLogModal(false);
    } catch (err) {
      Alert.alert('Error', 'Could not save entry. Please try again.');
    } finally {
      setSavingLog(false);
    }
  };

  // ─── delete entry ──────────────────────────────────────────
  const handleDeleteEntry = (entry: WeightTrackerEntry) => {
    if (!activeGoal) return;

    Alert.alert(
      'Delete Entry',
      `Remove the entry for ${dateLabel(entry.entry_date)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteWeightTrackerEntry(entry.entry_date, activeGoal.id);
              setEntries((prev) => prev.filter((e) => e.id !== entry.id));
            } catch {
              Alert.alert('Error', 'Could not delete entry.');
            }
          },
        },
      ],
    );
  };

  // ─── save profile settings ─────────────────────────────────
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const updated = await api.upsertWeightTrackerProfile({
        show_weight:   editSWeight,
        show_steps:    editSSteps,
        show_calories: editSCal,
      });
      setProfile(updated);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch {
      Alert.alert('Error', 'Could not save settings.');
    } finally {
      setSavingSettings(false);
    }
  };


  // ─── reset / delete all data ───────────────────────────────
  const handleResetTracker = () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all your weight entries and profile data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.resetWeightTracker();
              setProfile(null);
              setEntries([]);
              (navigation as any).navigate('Home');
            } catch {
              Alert.alert('Error', 'Could not reset data. Please try again.');
            }
          },
        },
      ],
    );
  };

  const loadGoalScopedData = useCallback(
    async (goalId: string) => {
      const [entriesData, metricValuesData] = await Promise.all([
        api.getWeightTrackerEntries(365, goalId),
        api.getCustomMetricValues(365, goalId),
      ]);
      setEntries(entriesData ?? []);
      setCustomMetricValues(metricValuesData ?? []);
    },
    [api],
  );

  const handleActivateGoal = async (goalId: string) => {
    if (goalId === activeGoal?.id) {
      setShowGoalDropdown(false);
      return;
    }

    try {
      const activatedGoal = await api.activateWeightTrackerGoal(goalId);
      setGoals((prev) =>
        prev.map((g) => ({
          ...g,
          is_active: g.id === activatedGoal.id,
          ended_on: g.id === activatedGoal.id ? null : g.ended_on,
        })),
      );
      const updatedProfile = await api.upsertWeightTrackerProfile({ active_goal_id: activatedGoal.id });
      setProfile(updatedProfile);
      await loadGoalScopedData(activatedGoal.id);
      setShowGoalDropdown(false);
    } catch {
      Alert.alert('Error', 'Could not switch goal project.');
    }
  };

  const openNewGoalModal = () => {
    setNewGoalType('lose');
    setNewGoalWeeklyTarget(0.5);
    setNewGoalStartWeight(
      currentWeightKg != null
        ? String(parseFloat(convertFromKg(currentWeightKg).toFixed(1)))
        : profile?.default_weight_kg != null
          ? String(parseFloat(convertFromKg(profile.default_weight_kg).toFixed(1)))
          : '',
    );
    setShowGoalDropdown(false);
    setShowNewGoalModal(true);
  };

  const handleStartNewGoal = async () => {
    if (!newGoalStartWeight.trim()) {
      Alert.alert('Weight required', 'Please enter a starting weight for this goal.');
      return;
    }

    setSavingNewGoal(true);
    try {
      const today = todayString();
      const startWeightKg = convertToKg(parseFloat(newGoalStartWeight.replace(',', '.')));
      const createdGoal = await api.createWeightTrackerGoal({
        goal_type: newGoalType,
        weekly_target_kg: newGoalType === 'track' ? null : newGoalWeeklyTarget,
        started_on: today,
        start_weight_kg: startWeightKg,
      });

      await api.upsertWeightTrackerEntry({
        goal_id: createdGoal.id,
        entry_date: today,
        weight_kg: startWeightKg,
      });

      const updatedProfile = await api.upsertWeightTrackerProfile({
        active_goal_id: createdGoal.id,
        default_weight_kg: startWeightKg,
        onboarding_complete: true,
      });

      const refreshedGoals = await api.getWeightTrackerGoals();
      setGoals(refreshedGoals);
      setProfile(updatedProfile);
      await loadGoalScopedData(createdGoal.id);
      setShowNewGoalModal(false);
    } catch {
      Alert.alert('Error', 'Could not start a new goal.');
    } finally {
      setSavingNewGoal(false);
    }
  };

  // ─── onboarding handlers ───────────────────────────────────
  const handleOb1Next = () => {
    if (!obWeight.trim()) {
      Alert.alert('Weight required', 'Please enter your current weight to get started.');
      return;
    }
    setView('ob-2');
  };

  const handleOb2Next = () => {
    const hasAge = obAgeMode === 'age' ? !!obAge.trim() : !!obBirthdateInput.trim();
    const hasStats = !!obHeight.trim() && hasAge;
    if (!hasStats) handleFinishOnboarding();
    else setView('ob-3');
  };

  const handleOb3Next = () => {
    if (obGoal === 'lose' || obGoal === 'gain') setView('ob-4');
    else setView('ob-5');
  };

  const handleOb4Next = () => setView('ob-5');

  const handleFinishOnboarding = async () => {
    setObSaving(true);
    try {
      const today = todayString();
      const weightKgValue = convertToKg(parseFloat(obWeight.replace(',', '.')));
      const ageValue   = obAgeMode === 'age'       && obAge.trim()          ? parseInt(obAge, 10)          : null;
      const bdayValue  = obAgeMode === 'birthdate' && obBirthdateInput.trim() ? obBirthdateInput.trim() : null;

      const createdGoal = await api.createWeightTrackerGoal({
        goal_type:        obGoal ?? 'track',
        weekly_target_kg: obGoal === 'lose' || obGoal === 'gain' ? obWeeklyTarget : null,
        started_on:       today,
        start_weight_kg:  weightKgValue,
      });

      const saved = await api.upsertWeightTrackerProfile({
        gender:              obGender,
        age:                 ageValue,
        birthdate:           bdayValue,
        height_cm:           obHeight.trim() ? convertToCm(parseFloat(obHeight)) : null,
        default_weight_kg:   weightKgValue,
        bmr_formula:         'mifflin_st_jeor',
        activity_level:      obActivity,
        show_weight:         obShowWeight,
        show_steps:          obShowSteps,
        show_calories:       obShowCal,
        active_goal_id:      createdGoal.id,
        onboarding_complete: true,
      });

      // Log starting weight as first entry (today)
      const entry = await api.upsertWeightTrackerEntry({
        goal_id:    createdGoal.id,
        entry_date: today,
        weight_kg:  weightKgValue,
      });

      setProfile(saved);
      setGoals([createdGoal]);
      setEntries([entry]);
      seedSettingsMirrors(saved);
      setView('main');
    } catch {
      Alert.alert('Error', 'Could not save profile. Please try again.');
    } finally {
      setObSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // Render helpers
  // ═══════════════════════════════════════════════════════════

  if (view === 'loading') {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  if (view === 'ob-1') return renderOnboarding1();
  if (view === 'ob-2') return renderOnboarding2();
  if (view === 'ob-3') return renderOnboarding3();
  if (view === 'ob-4') return renderOnboarding4();
  if (view === 'ob-5') return renderOnboarding5();
  return renderMain();

  // ───────────────────────────────────────────────────────────
  function renderOnboarding1() {
    const unitLabel = unit === 'kg' ? 'kg' : 'lb';
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.obContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.obIconWrap}>
          <Ionicons name="body-outline" size={48} color={C.accent} />
        </View>
        <Text style={styles.obTitle}>Welcome to Weight Tracker</Text>
        <Text style={styles.obSubtitle}>
          Let's set up your profile. Only your current weight is required — the rest helps us
          calculate calorie estimates.
        </Text>

        <Text style={styles.fieldLabel}>Current Weight ({unitLabel}) *</Text>
        <TextInput
          style={styles.input}
          value={obWeight}
          onChangeText={setObWeight}
          placeholder={`e.g. ${unit === 'kg' ? '75' : '165'}`}
          placeholderTextColor={C.textMuted}
          keyboardType="decimal-pad"
        />

        <Text style={styles.fieldLabel}>Height ({heightUnit === 'ft' ? 'ft' : 'cm'}) — optional</Text>
        <TextInput
          style={styles.input}
          value={obHeight}
          onChangeText={setObHeight}
          placeholder={heightUnit === 'ft' ? 'e.g. 5.8' : 'e.g. 178'}
          placeholderTextColor={C.textMuted}
          keyboardType="decimal-pad"
        />

        <Text style={styles.fieldLabel}>Age / Birthdate — optional</Text>
        <View style={[styles.pillRow, { marginBottom: 8 }]}>
          <TouchableOpacity
            style={[styles.pill, obAgeMode === 'age' && styles.pillActive]}
            onPress={() => setObAgeMode('age')}
          >
            <Text style={[styles.pillText, obAgeMode === 'age' && styles.pillTextActive]}>Enter Age</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pill, obAgeMode === 'birthdate' && styles.pillActive]}
            onPress={() => setObAgeMode('birthdate')}
          >
            <Text style={[styles.pillText, obAgeMode === 'birthdate' && styles.pillTextActive]}>Enter Birthdate</Text>
          </TouchableOpacity>
        </View>
        {obAgeMode === 'age' ? (
          <TextInput
            style={styles.input}
            value={obAge}
            onChangeText={setObAge}
            placeholder="e.g. 30"
            placeholderTextColor={C.textMuted}
            keyboardType="number-pad"
          />
        ) : (
          <TextInput
            style={styles.input}
            value={obBirthdateInput}
            onChangeText={setObBirthdateInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
          />
        )}

        <Text style={styles.fieldLabel}>Gender — optional</Text>
        <View style={styles.pillRow}>
          {(['male', 'female'] as WeightTrackerGender[]).map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.pill, obGender === g && styles.pillActive]}
              onPress={() => setObGender(obGender === g ? null : g)}
            >
              <Text style={[styles.pillText, obGender === g && styles.pillTextActive]}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.obNote}>
          Height, age and gender unlock calorie estimates based on your BMR. They are stored
          privately and never shared.
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleOb1Next}>
          <Text style={styles.primaryBtnText}>Next</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ───────────────────────────────────────────────────────────
  function renderOnboarding2() {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.obContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.obIconWrap}>
          <Ionicons name="options-outline" size={48} color={C.accent} />
        </View>
        <Text style={styles.obTitle}>What do you want to track?</Text>
        <Text style={styles.obSubtitle}>
          Weight, Steps and Calories are enabled by default. You can change these at any time in settings.
        </Text>

        {([
          { key: 'weight',   label: 'Weight',   val: obShowWeight, set: setObShowWeight },
          { key: 'steps',    label: 'Steps',    val: obShowSteps,  set: setObShowSteps  },
          { key: 'calories', label: 'Calories', val: obShowCal,    set: setObShowCal    },
        ] as const).map(({ key, label, val, set }) => (
          <View key={key} style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{label}</Text>
            <Switch
              value={val}
              onValueChange={(v) => (set as (v: boolean) => void)(v)}
              trackColor={{ true: C.accent }}
              thumbColor="#fff"
            />
          </View>
        ))}

        <Text style={[styles.obNote, { marginTop: 16 }]}>
          You can add up to 3 custom metrics (e.g. Sleep Score, Creatine, or Alcohol) under Metric Settings after setup.
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleOb2Next}>
          <Text style={styles.primaryBtnText}>Next</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => setView('ob-1')}
        >
          <Text style={styles.ghostBtnText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ───────────────────────────────────────────────────────────
  function renderOnboarding3() {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.obContent}>
        <View style={styles.obIconWrap}>
          <Ionicons name="trending-up-outline" size={48} color={C.accent} />
        </View>
        <Text style={styles.obTitle}>What's your goal?</Text>
        <Text style={styles.obSubtitle}>
          This helps us tailor the calorie guidance we show you.
        </Text>

        {([
          { val: 'lose' as WeightTrackerGoal, label: 'Lose Weight',  icon: 'trending-down-outline' as const },
          { val: 'gain' as WeightTrackerGoal, label: 'Gain Weight',  icon: 'trending-up-outline'   as const },
          { val: null,                         label: 'Just Track',  icon: 'analytics-outline'     as const },
        ]).map(({ val, label, icon }) => (
          <TouchableOpacity
            key={label}
            style={[styles.goalCard, obGoal === val && styles.goalCardActive]}
            onPress={() => setObGoal(val)}
          >
            <Ionicons
              name={icon}
              size={24}
              color={obGoal === val ? C.accent : C.textMuted}
              style={{ marginRight: 12 }}
            />
            <Text style={[styles.goalCardText, obGoal === val && { color: C.accent }]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 32 }]}
          onPress={handleOb3Next}
        >
          <Text style={styles.primaryBtnText}>Next</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => setView('ob-2')}
        >
          <Text style={styles.ghostBtnText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ───────────────────────────────────────────────────────────
  function renderOnboarding4() {
    const direction = obGoal === 'gain' ? 'gain' : 'lose';
    const rates: { val: number; label: string; note: string }[] = [
      { val: 0.25, label: '0.25 kg / week', note: 'Very gentle — easiest to sustain' },
      { val: 0.5,  label: '0.5 kg / week',  note: 'Recommended for most people' },
      { val: 0.75, label: '0.75 kg / week', note: 'Moderate pace' },
      { val: 1.0,  label: '1.0 kg / week',  note: 'Aggressive — requires strict adherence' },
    ];
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.obContent}>
        <View style={styles.obIconWrap}>
          <Ionicons name="speedometer-outline" size={48} color={C.accent} />
        </View>
        <Text style={styles.obTitle}>How fast?</Text>
        <Text style={styles.obSubtitle}>
          Choose your target rate of weight {direction} per week.
        </Text>

        {rates.map(({ val, label, note }) => (
          <TouchableOpacity
            key={val}
            style={[styles.goalCard, obWeeklyTarget === val && styles.goalCardActive]}
            onPress={() => setObWeeklyTarget(val)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.goalCardText, obWeeklyTarget === val && { color: C.accent }]}>
                {label}
              </Text>
              <Text style={styles.formulaNote}>{note}</Text>
            </View>
            {obWeeklyTarget === val && (
              <Ionicons name="checkmark-circle" size={20} color={C.accent} />
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 32 }]}
          onPress={handleOb4Next}
        >
          <Text style={styles.primaryBtnText}>Next</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => setView('ob-3')}
        >
          <Text style={styles.ghostBtnText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ───────────────────────────────────────────────────────────
  function renderOnboarding5() {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.obContent}>
        <View style={styles.obIconWrap}>
          <Ionicons name="walk-outline" size={48} color={C.accent} />
        </View>
        <Text style={styles.obTitle}>Activity Level</Text>
        <Text style={styles.obSubtitle}>
          How active are you on a typical week? This helps us estimate your daily calorie needs.
        </Text>

        {ACTIVITY_LEVELS.map((a) => (
          <TouchableOpacity
            key={a.key}
            style={[styles.goalCard, obActivity === a.key && styles.goalCardActive]}
            onPress={() => setObActivity(a.key)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.goalCardText, obActivity === a.key && { color: C.accent }]}>
                {a.label}
              </Text>
              <Text style={styles.formulaNote}>{a.sub}</Text>
            </View>
            {obActivity === a.key && (
              <Ionicons name="checkmark-circle" size={20} color={C.accent} />
            )}
          </TouchableOpacity>
        ))}

        {obSaving ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 24 }} />
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 32 }]}
            onPress={() => handleFinishOnboarding()}
          >
            <Text style={styles.primaryBtnText}>Let's go!</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => setView(obGoal === 'lose' || obGoal === 'gain' ? 'ob-4' : 'ob-3')}
        >
          <Text style={styles.ghostBtnText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ───────────────────────────────────────────────────────────
  function renderMain() {
    const startKg    = activeGoal?.start_weight_kg ?? null;
    const deltaKg    = startKg && currentWeightKg ? currentWeightKg - startKg : null;
    const deltaLabel =
      deltaKg !== null
        ? `${deltaKg >= 0 ? '+' : ''}${formatWeight(Math.abs(deltaKg), 1)} ${unit}`
        : null;

    const activeGoalLabel = activeGoal
      ? `${GOAL_TYPE_LABEL[activeGoal.goal_type]} (started ${fullDateForFormat(activeGoal.started_on, dateFormat)})`
      : 'Select goal project';

    const sortedEntries = [...entries].sort((a, b) =>
      b.entry_date.localeCompare(a.entry_date),
    );

    const showCols = {
      weight:   profile?.show_weight   ?? true,
      steps:    profile?.show_steps    ?? true,
      calories: profile?.show_calories ?? true,
    };

    return (
      <View style={styles.screen}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.goalDropdownWrap}>
            <TouchableOpacity
              style={styles.goalDropdownTrigger}
              onPress={() => setShowGoalDropdown((v) => !v)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.goalDropdownTitle}>{activeGoalLabel}</Text>
                <Text style={styles.goalDropdownSub}>Goal Project</Text>
              </View>
              <Text style={styles.goalDropdownChevron}>{showGoalDropdown ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {showGoalDropdown && (
              <View style={styles.goalDropdownOptions}>
                {goals
                  .filter((g) => g.id !== activeGoal?.id)
                  .map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      style={styles.goalDropdownRow}
                      onPress={() => handleActivateGoal(g.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.goalDropdownTitle}>{GOAL_TYPE_LABEL[g.goal_type]}</Text>
                        <Text style={styles.goalDropdownSub}>
                          Started {fullDateForFormat(g.started_on, dateFormat)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                <TouchableOpacity style={styles.goalDropdownRow} onPress={openNewGoalModal}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.goalDropdownTitle, { color: C.accent }]}>Start new goal</Text>
                    <Text style={styles.goalDropdownSub}>Create a new goal project</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.mainContent}
        >
          {/* ── Summary tiles ── */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryValue}>
                {currentWeightKg != null ? formatWeight(currentWeightKg) : '–'}
              </Text>
              <Text style={styles.summaryLabel}>Current</Text>
            </View>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryValue}>
                {startKg != null ? formatWeight(startKg) : '–'}
              </Text>
              <Text style={styles.summaryLabel}>Starting</Text>
            </View>
            <View style={[styles.summaryTile, { borderColor: C.border }]}>
              <Text
                style={[
                  styles.summaryValue,
                  deltaKg != null && {
                    color: deltaKg < 0 ? '#4caf50' : deltaKg > 0 ? '#e57373' : C.textStrong,
                  },
                ]}
              >
                {deltaLabel ?? '–'}
              </Text>
              <Text style={styles.summaryLabel}>Change</Text>
            </View>
          </View>

          {/* ── Weight Chart ── */}
          {chartData.length >= 2 ? (
            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Weight History</Text>
              <LineChart
                data={chartData}
                width={SCREEN_WIDTH - 72}
                height={180}
                color={C.accent}
                thickness={2}
                curved
                noOfSections={4}
                yAxisOffset={chartRange?.yAxisOffset}
                maxValue={chartRange?.maxValue}
                initialSpacing={10}
                endSpacing={20}
                roundToDigits={1}
                yAxisTextStyle={{ color: C.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: C.textMuted, fontSize: 9 }}
                hideRules={false}
                rulesColor={C.border}
                yAxisColor={C.border}
                xAxisColor={C.border}
                isAnimated
                scrollToEnd
                showScrollIndicator={chartData.length > 20}
                dataPointsColor={C.accent}
                dataPointsRadius={chartData.length > 30 ? 0 : 3}
                yAxisLabelSuffix={` ${unit}`}
              />
            </View>
          ) : chartData.length === 1 ? (
            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Weight History</Text>
              <Text style={styles.emptyNote}>Log more entries to see your progress chart.</Text>
            </View>
          ) : null}

          {/* ── Entry Table ── */}
          {sortedEntries.length > 0 && (
            <View style={styles.tableCard}>
              <Text style={styles.sectionTitle}>Log</Text>
              {/* Table header */}
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, styles.tableCellDate, styles.tableHeaderText]}>
                  Date
                </Text>
                {showCols.weight   && <Text style={[styles.tableCell, styles.tableHeaderText]}>Weight</Text>}
                {showCols.steps    && <Text style={[styles.tableCell, styles.tableHeaderText]}>Steps</Text>}
                {showCols.calories && <Text style={[styles.tableCell, styles.tableHeaderText]}>Kcal</Text>}
              </View>

              {sortedEntries.map((entry) => (
                <TouchableOpacity key={entry.id} style={styles.tableRow} onPress={() => openLogModal(entry.entry_date)}>
                  <View style={[styles.tableCell, styles.tableCellDate]}>
                    <Text style={styles.tableCellDateText}>{fullDateForFormat(entry.entry_date, dateFormat)}</Text>
                  </View>
                  {showCols.weight && (
                    <Text style={styles.tableCell}>
                      {entry.weight_kg != null ? formatWeight(entry.weight_kg, 1) : '–'}
                    </Text>
                  )}
                  {showCols.steps && (
                    <Text style={styles.tableCell}>
                      {entry.steps != null ? entry.steps.toLocaleString() : '–'}
                    </Text>
                  )}
                  {showCols.calories && (
                    <Text style={styles.tableCell}>
                      {entry.calories != null ? entry.calories : '–'}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {entries.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons name="scale-outline" size={40} color={C.textMuted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyNote}>No entries yet. Tap "Log Entry" to start tracking.</Text>
            </View>
          )}

          {/* ── BMR & Calorie section ── */}
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => setShowBmr((v) => !v)}
          >
            <Text style={styles.accordionTitle}>BMR & Calorie Needs</Text>
            <Ionicons
              name={showBmr ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={C.textMuted}
            />
          </TouchableOpacity>

          {showBmr && (
            <View style={styles.accordionBody}>
              {!canBMR && (
                <Text style={styles.emptyNote}>
                  Complete your profile (height, age, gender) and log at least one weight entry
                  to see calorie estimates.
                </Text>
              )}

              {canBMR && bmrValue && (
                <>
                  {/* Formula picker */}
                  <Text style={styles.fieldLabel}>Formula</Text>
                  {BMR_FORMULAS.map((f) => (
                    <TouchableOpacity
                      key={f.key}
                      style={[styles.formulaOption, profile?.bmr_formula === f.key && styles.formulaOptionActive]}
                      onPress={async () => {
                        const updated = await api.upsertWeightTrackerProfile({ bmr_formula: f.key });
                        setProfile(updated);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.formulaLabel, profile?.bmr_formula === f.key && { color: C.accent }]}>
                          {f.label}
                        </Text>
                        <Text style={styles.formulaNote}>{f.note}</Text>
                      </View>
                      {profile?.bmr_formula === f.key && (
                        <Ionicons name="checkmark-circle" size={18} color={C.accent} />
                      )}
                    </TouchableOpacity>
                  ))}

                  {/* Activity level picker */}
                  <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Activity Level</Text>
                  {ACTIVITY_LEVELS.map((a) => (
                    <TouchableOpacity
                      key={a.key}
                      style={[styles.formulaOption, profile?.activity_level === a.key && styles.formulaOptionActive]}
                      onPress={async () => {
                        const updated = await api.upsertWeightTrackerProfile({ activity_level: a.key });
                        setProfile(updated);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.formulaLabel, profile?.activity_level === a.key && { color: C.accent }]}>
                          {a.label}
                        </Text>
                        <Text style={styles.formulaNote}>{a.sub}</Text>
                      </View>
                      {profile?.activity_level === a.key && (
                        <Ionicons name="checkmark-circle" size={18} color={C.accent} />
                      )}
                    </TouchableOpacity>
                  ))}

                  {/* Results */}
                  <View style={styles.bmrResults}>
                    <View style={styles.bmrResultRow}>
                      <Text style={styles.bmrResultLabel}>BMR</Text>
                      <Text style={styles.bmrResultValue}>{Math.round(bmrValue)} kcal</Text>
                    </View>
                    <View style={styles.bmrResultRow}>
                      <Text style={styles.bmrResultLabel}>TDEE</Text>
                      <Text style={styles.bmrResultValue}>{tdee ?? '–'} kcal</Text>
                    </View>

                    {tdee && activeGoal?.goal_type === 'lose' && (
                      <>
                        <View style={[styles.bmrResultRow, { marginTop: 8 }]}>
                          <Text style={styles.bmrResultLabel}>Mild deficit (−250 kcal)</Text>
                          <Text style={[styles.bmrResultValue, { color: '#4caf50' }]}>
                            {tdee - 250} kcal
                          </Text>
                        </View>
                        <View style={styles.bmrResultRow}>
                          <Text style={styles.bmrResultLabel}>Moderate deficit (−500 kcal)</Text>
                          <Text style={[styles.bmrResultValue, { color: '#4caf50' }]}>
                            {tdee - 500} kcal
                          </Text>
                        </View>
                      </>
                    )}

                    {tdee && activeGoal?.goal_type === 'gain' && (
                      <>
                        <View style={[styles.bmrResultRow, { marginTop: 8 }]}>
                          <Text style={styles.bmrResultLabel}>Lean surplus (+150 kcal)</Text>
                          <Text style={[styles.bmrResultValue, { color: C.accent }]}>
                            {tdee + 150} kcal
                          </Text>
                        </View>
                        <View style={styles.bmrResultRow}>
                          <Text style={styles.bmrResultLabel}>Standard surplus (+300 kcal)</Text>
                          <Text style={[styles.bmrResultValue, { color: C.accent }]}>
                            {tdee + 300} kcal
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                </>
              )}
            </View>
          )}

          {/* ── Health Info accordion ── */}
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => setShowHealthInfo((v) => !v)}
          >
            <Text style={styles.accordionTitle}>Health Info</Text>
            <Ionicons
              name={showHealthInfo ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={C.textMuted}
            />
          </TouchableOpacity>

          {showHealthInfo && (
            <View style={styles.accordionBody}>
              {HEALTH_INFO_TEXT.split('\n\n').map((para, i) => {
                const lines = para.split('\n');
                const firstLine = lines[0];
                const isBoldHeading = firstLine.startsWith('**');
                if (isBoldHeading) {
                  const heading = firstLine.replace(/\*\*/g, '');
                  const body = lines.slice(1).join('\n').trim();
                  return (
                    <View key={i}>
                      <Text style={styles.healthInfoHeading}>{heading}</Text>
                      {body ? <Text style={styles.healthInfoBody}>{body}</Text> : null}
                    </View>
                  );
                }
                return <Text key={i} style={styles.healthInfoBody}>{para}</Text>;
              })}
            </View>
          )}

          {/* ── Metric Settings accordion ── */}
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => {
              if (!showSettings && profile) seedSettingsMirrors(profile);
              setShowSettings((v) => !v);
            }}
          >
            <Text style={styles.accordionTitle}>Metric Settings</Text>
            <Ionicons
              name={showSettings ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={C.textMuted}
            />
          </TouchableOpacity>

          {showSettings && (
            <View style={styles.accordionBody}>
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Tracked Metrics</Text>
              {([
                { key: 'weight',   label: 'Weight',   val: editSWeight, set: setEditSWeight },
                { key: 'steps',    label: 'Steps',    val: editSSteps,  set: setEditSSteps  },
                { key: 'calories', label: 'Calories', val: editSCal,    set: setEditSCal    },
              ] as const).map(({ key, label, val, set }) => (
                <View key={key} style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>{label}</Text>
                  <Switch
                    value={val}
                    onValueChange={(v) => (set as (v: boolean) => void)(v)}
                    trackColor={{ true: C.accent }}
                    thumbColor="#fff"
                  />
                </View>
              ))}

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Custom Metrics</Text>
              <Text style={[styles.formulaNote, { marginBottom: 10 }]}>
                Add up to 3 custom metrics to track daily — e.g. Sleep Score, Creatine, or Alcohol.
              </Text>
              {customMetrics.map((m) => (
                <View key={m.id} style={styles.customMetricRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>{m.name}</Text>
                    <Text style={styles.formulaNote}>{m.type.charAt(0).toUpperCase() + m.type.slice(1)}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert('Remove Metric', `Remove "${m.name}"? All logged values for this metric will be deleted.`, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await api.deleteCustomMetric(m.id);
                              setCustomMetrics((prev) => prev.filter((x) => x.id !== m.id));
                              setCustomMetricValues((prev) => prev.filter((v) => v.metric_id !== m.id));
                            } catch {
                              Alert.alert('Error', 'Could not remove metric.');
                            }
                          },
                        },
                      ]);
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
              {customMetrics.length < 3 && (
                <TouchableOpacity
                  style={[styles.addMetricBtn]}
                  onPress={() => {
                    setNewMetricName('');
                    setNewMetricType('boolean');
                    setShowAddMetricModal(true);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={18} color={C.accent} />
                  <Text style={styles.addMetricBtnText}>Add Custom Metric</Text>
                </TouchableOpacity>
              )}
              {customMetrics.length >= 3 && (
                <Text style={[styles.formulaNote, { marginTop: 4 }]}>Maximum of 3 custom metrics reached.</Text>
              )}

              {savingSettings ? (
                <ActivityIndicator color={C.accent} style={{ marginTop: 16 }} />
              ) : (
                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 20 }]}
                  onPress={handleSaveSettings}
                >
                  <Text style={styles.primaryBtnText}>Save Settings</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.destructiveBtn, { marginTop: 24 }]}
                onPress={handleResetTracker}
              >
                <Text style={styles.destructiveBtnText}>Delete All Data</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* ── Bottom action bar ── */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            onPress={() => openLogModal()}
            style={styles.logEntryButton}
            activeOpacity={0.8}
          >
            <Text style={styles.logEntryButtonText}>Log Entry</Text>
          </TouchableOpacity>
        </View>

        {/* ── Log Entry Modal ── */}
        {renderLogModal()}

        {/* ── Add Custom Metric Modal ── */}
        {renderAddMetricModal()}

        {/* ── New Goal Modal ── */}
        {renderNewGoalModal()}
      </View>
    );
  }

  // ───────────────────────────────────────────────────────────
  function renderLogModal() {
    const showCols = {
      weight:   profile?.show_weight   ?? true,
      steps:    profile?.show_steps    ?? true,
      calories: profile?.show_calories ?? true,
    };

    return (
      <Modal
        visible={showLogModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLogModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Entry</Text>
              <TouchableOpacity onPress={() => setShowLogModal(false)}>
                <Ionicons name="close" size={24} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Date picker */}
              <Text style={styles.fieldLabel}>Date</Text>
              <View style={styles.dateWheelWrap}>
                <FlatList
                  ref={logDateWheelRef}
                  data={logDateOptions}
                  keyExtractor={(item) => item.iso}
                  style={styles.dateWheel}
                  contentContainerStyle={styles.dateWheelContent}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  snapToInterval={LOG_WHEEL_ROW_HEIGHT}
                  decelerationRate="fast"
                  getItemLayout={(_, index) => ({
                    length: LOG_WHEEL_ROW_HEIGHT,
                    offset: LOG_WHEEL_ROW_HEIGHT * index,
                    index,
                  })}
                  onMomentumScrollEnd={(event) => {
                    const offsetY = event.nativeEvent.contentOffset.y;
                    const index = Math.max(
                      0,
                      Math.min(
                        logDateOptions.length - 1,
                        Math.round(offsetY / LOG_WHEEL_ROW_HEIGHT),
                      ),
                    );
                    const option = logDateOptions[index];
                    if (!option || option.iso === logDate) return;
                    setLogDate(option.iso);
                    setLogFieldsFromDate(option.iso);
                  }}
                  renderItem={({ item }) => {
                    const selected = item.iso === logDate;
                    return (
                      <TouchableOpacity
                        style={[styles.dateWheelItem, selected && styles.dateWheelItemActive]}
                        onPress={() => {
                          setLogDate(item.iso);
                          setLogFieldsFromDate(item.iso);
                          const idx = logDateOptions.findIndex((d) => d.iso === item.iso);
                          if (idx >= 0) {
                            logDateWheelRef.current?.scrollToIndex({
                              index: idx,
                              animated: true,
                              viewPosition: 0,
                            });
                          }
                        }}
                      >
                        <Text style={[styles.dateWheelItemLabel, selected && styles.dateWheelItemLabelActive]}>
                          {item.label}
                        </Text>
                        <Text
                          style={[
                            styles.dateWheelItemMeta,
                            item.isMissingWeight ? styles.dateWheelItemMissing : styles.dateWheelItemHasWeight,
                          ]}
                        >
                          {item.isMissingWeight ? 'Missing' : 'Logged'}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>

              {showCols.weight && (
                <>
                  <Text style={styles.fieldLabel}>Weight ({unit})</Text>
                  <TextInput
                    style={styles.input}
                    value={logWeightInput}
                    onChangeText={setLogWeightInput}
                    placeholder="e.g. 75.4"
                    placeholderTextColor={C.textMuted}
                    keyboardType="decimal-pad"
                  />
                </>
              )}

              {showCols.steps && (
                <>
                  <Text style={styles.fieldLabel}>Steps</Text>
                  <TextInput
                    style={styles.input}
                    value={logSteps}
                    onChangeText={setLogSteps}
                    placeholder="e.g. 8000"
                    placeholderTextColor={C.textMuted}
                    keyboardType="number-pad"
                  />
                </>
              )}

              {showCols.calories && (
                <>
                  <Text style={styles.fieldLabel}>Calories (kcal)</Text>
                  <TextInput
                    style={styles.input}
                    value={logCalories}
                    onChangeText={setLogCalories}
                    placeholder="e.g. 2200"
                    placeholderTextColor={C.textMuted}
                    keyboardType="number-pad"
                  />
                </>
              )}

              {customMetrics.map((m) => (
                <View key={m.id}>
                  {m.type === 'boolean' ? (
                    <View style={styles.toggleRow}>
                      <Text style={styles.toggleLabel}>{m.name}</Text>
                      <Switch
                        value={(logCustomValues[m.id] as boolean) ?? false}
                        onValueChange={(v) => setLogCustomValues((prev) => ({ ...prev, [m.id]: v }))}
                        trackColor={{ true: C.accent }}
                        thumbColor="#fff"
                      />
                    </View>
                  ) : (
                    <>
                      <Text style={styles.fieldLabel}>{m.name}</Text>
                      <TextInput
                        style={styles.input}
                        value={(logCustomValues[m.id] as string) ?? ''}
                        onChangeText={(v) => setLogCustomValues((prev) => ({ ...prev, [m.id]: v }))}
                        placeholder={m.type === 'integer' ? 'e.g. 7' : 'e.g. 5.0'}
                        placeholderTextColor={C.textMuted}
                        keyboardType={m.type === 'integer' ? 'number-pad' : 'decimal-pad'}
                      />
                    </>
                  )}
                </View>
              ))}

              {savingLog ? (
                <ActivityIndicator color={C.accent} style={{ marginVertical: 20 }} />
              ) : (
                <>
                  <TouchableOpacity style={[styles.primaryBtn, { marginTop: 8, marginBottom: 8 }]} onPress={handleSaveLog}>
                    <Text style={styles.primaryBtnText}>Save</Text>
                  </TouchableOpacity>
                  {entries.find((e) => e.entry_date === logDate) && (
                    <TouchableOpacity
                      style={{ alignItems: 'center', paddingVertical: 10, marginBottom: 8 }}
                      onPress={() => {
                        const entry = entries.find((e) => e.entry_date === logDate);
                        if (entry) {
                          setShowLogModal(false);
                          handleDeleteEntry(entry);
                        }
                      }}
                    >
                      <Text style={{ color: '#e57373', fontSize: 14 }}>Delete this entry</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  // ───────────────────────────────────────────────────────────
  function renderAddMetricModal() {
    const handleCreate = async () => {
      if (!newMetricName.trim()) {
        Alert.alert('Name required', 'Please enter a name for the metric.');
        return;
      }
      setSavingNewMetric(true);
      try {
        const created = await api.createCustomMetric({ name: newMetricName.trim(), type: newMetricType });
        setCustomMetrics((prev) => [...prev, created]);
        setShowAddMetricModal(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not create metric.';
        Alert.alert('Error', msg);
      } finally {
        setSavingNewMetric(false);
      }
    };

    return (
      <Modal
        visible={showAddMetricModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddMetricModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Custom Metric</Text>
              <TouchableOpacity onPress={() => setShowAddMetricModal(false)}>
                <Ionicons name="close" size={24} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Metric Name</Text>
            <TextInput
              style={styles.input}
              value={newMetricName}
              onChangeText={setNewMetricName}
              placeholder="e.g. Sleep Score, Creatine, Alcohol"
              placeholderTextColor={C.textMuted}
              autoCapitalize="words"
            />

            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.pillRow}>
              {([
                { val: 'boolean' as const,  label: 'Yes / No'  },
                { val: 'integer' as const,  label: 'Integer'   },
                { val: 'decimal' as const,  label: 'Decimal'   },
              ]).map(({ val, label }) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.pill, newMetricType === val && styles.pillActive]}
                  onPress={() => setNewMetricType(val)}
                >
                  <Text style={[styles.pillText, newMetricType === val && styles.pillTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {savingNewMetric ? (
              <ActivityIndicator color={C.accent} style={{ marginTop: 16 }} />
            ) : (
              <TouchableOpacity style={[styles.primaryBtn, { marginTop: 16 }]} onPress={handleCreate}>
                <Text style={styles.primaryBtnText}>Create Metric</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  }

  function renderNewGoalModal() {
    return (
      <Modal
        visible={showNewGoalModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewGoalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Start New Goal</Text>
              <TouchableOpacity onPress={() => setShowNewGoalModal(false)}>
                <Ionicons name="close" size={24} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Goal Type</Text>
            <View style={styles.pillRow}>
              {([
                { value: 'lose' as WeightTrackerGoal, label: 'Lose Weight' },
                { value: 'gain' as WeightTrackerGoal, label: 'Gain Weight' },
                { value: 'track' as WeightTrackerGoal, label: 'Track Only' },
              ]).map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.pill, newGoalType === value && styles.pillActive]}
                  onPress={() => {
                    setNewGoalType(value);
                    if (value === 'track') setNewGoalWeeklyTarget(null);
                    if (value === 'lose' || value === 'gain') {
                      setNewGoalWeeklyTarget((prev) => prev ?? 0.5);
                    }
                  }}
                >
                  <Text style={[styles.pillText, newGoalType === value && styles.pillTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {(newGoalType === 'lose' || newGoalType === 'gain') && (
              <>
                <Text style={styles.fieldLabel}>Weekly Target</Text>
                <View style={styles.pillRow}>
                  {([0.25, 0.5, 0.75, 1.0] as const).map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[styles.pill, newGoalWeeklyTarget === value && styles.pillActive]}
                      onPress={() => setNewGoalWeeklyTarget(value)}
                    >
                      <Text
                        style={[styles.pillText, newGoalWeeklyTarget === value && styles.pillTextActive]}
                      >
                        {value} kg/wk
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.fieldLabel}>Starting Weight ({unit})</Text>
            <TextInput
              style={styles.input}
              value={newGoalStartWeight}
              onChangeText={setNewGoalStartWeight}
              placeholder={unit === 'kg' ? 'e.g. 80.0' : 'e.g. 176.4'}
              placeholderTextColor={C.textMuted}
              keyboardType="decimal-pad"
            />

            {savingNewGoal ? (
              <ActivityIndicator color={C.accent} style={{ marginTop: 16 }} />
            ) : (
              <TouchableOpacity style={[styles.primaryBtn, { marginTop: 12 }]} onPress={handleStartNewGoal}>
                <Text style={styles.primaryBtnText}>Start Goal</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const createStyles = (C: ReturnType<typeof usePreferences>['colors']) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: C.background,
    },

    // ── Header ──
    header: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      backgroundColor: C.background,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    goalDropdownWrap: {
      width: '100%',
    },
    goalDropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      ...shadow.card,
    },
    goalDropdownTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: C.textStrong,
    },
    goalDropdownSub: {
      fontSize: 12,
      color: C.textMuted,
      marginTop: 2,
    },
    goalDropdownChevron: {
      color: C.textMuted,
      fontSize: 11,
      marginLeft: 8,
    },
    goalDropdownOptions: {
      marginTop: 6,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: radius.md,
      overflow: 'hidden',
      backgroundColor: C.surface,
    },
    goalDropdownRow: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    logBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.accent,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: radius.md,
      gap: 6,
    },
    logBtnText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },

    mainContent: {
      padding: 16,
    },

    // ── Summary ──
    summaryRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    summaryTile: {
      flex: 1,
      backgroundColor: C.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: C.border,
      padding: 12,
      alignItems: 'center',
      ...shadow.card,
    },
    summaryValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: C.textStrong,
    },
    summaryLabel: {
      fontSize: 11,
      color: C.textMuted,
      marginTop: 4,
    },

    // ── Chart ──
    chartCard: {
      backgroundColor: C.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: C.border,
      padding: 16,
      marginBottom: 16,
      ...shadow.card,
    },

    // ── Table ──
    tableCard: {
      backgroundColor: C.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: C.border,
      padding: 16,
      marginBottom: 16,
      ...shadow.card,
    },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      paddingVertical: 8,
    },
    tableHeader: {
      paddingBottom: 6,
    },
    tableCell: {
      flex: 1,
      fontSize: 13,
      color: C.textStrong,
      textAlign: 'center',
    },
    tableCellDate: {
      flex: 1.2,
      textAlign: 'left',
    },
    tableCellDateText: {
      fontSize: 13,
      color: C.accent,
    },
    tableHeaderText: {
      fontSize: 11,
      color: C.textMuted,
      fontWeight: '600',
    },

    // ── Empty ──
    emptyCard: {
      alignItems: 'center',
      padding: 32,
      backgroundColor: C.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 16,
    },
    emptyNote: {
      fontSize: 13,
      color: C.textMuted,
      textAlign: 'center',
      fontStyle: 'italic',
    },

    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: C.textStrong,
      marginBottom: 12,
    },

    // ── Accordions ──
    accordionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: C.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: C.border,
      padding: 14,
      marginBottom: 4,
      ...shadow.card,
    },
    accordionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: C.textStrong,
    },
    accordionBody: {
      backgroundColor: C.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: C.border,
      padding: 16,
      marginBottom: 12,
    },

    // ── BMR results ──
    bmrResults: {
      marginTop: 16,
      backgroundColor: C.background,
      borderRadius: radius.sm,
      padding: 12,
    },
    bmrResultRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    bmrResultLabel: {
      fontSize: 13,
      color: C.textStrong,
    },
    bmrResultValue: {
      fontSize: 14,
      fontWeight: '700',
      color: C.textStrong,
    },

    formulaOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      marginBottom: 6,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: C.border,
    },
    formulaOptionActive: {
      borderColor: C.accent,
      backgroundColor: C.background,
    },
    formulaLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: C.textStrong,
    },
    formulaNote: {
      fontSize: 11,
      color: C.textMuted,
      marginTop: 2,
    },

    // ── Health info ──
    healthInfoHeading: {
      fontSize: 14,
      fontWeight: '700',
      color: C.textStrong,
      marginTop: 12,
      marginBottom: 4,
    },
    healthInfoBody: {
      fontSize: 13,
      color: C.textStrong,
      lineHeight: 20,
      marginBottom: 4,
    },

    // ── Onboarding ──
    obContent: {
      padding: 24,
      paddingBottom: 48,
    },
    obIconWrap: {
      alignItems: 'center',
      marginBottom: 20,
      marginTop: 12,
    },
    obTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: C.textStrong,
      textAlign: 'center',
      marginBottom: 8,
    },
    obSubtitle: {
      fontSize: 14,
      color: C.textMuted,
      textAlign: 'center',
      marginBottom: 28,
      lineHeight: 20,
    },
    obNote: {
      fontSize: 12,
      color: C.textMuted,
      textAlign: 'center',
      fontStyle: 'italic',
      marginBottom: 24,
      lineHeight: 18,
    },

    // ── Form elements ──
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: C.textStrong,
      marginBottom: 6,
    },
    input: {
      backgroundColor: C.surface,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: C.textStrong,
      marginBottom: 16,
    },
    pillRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
      flexWrap: 'wrap',
    },
    pill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
    },
    pillActive: {
      borderColor: C.accent,
      backgroundColor: C.accent + '22',
    },
    pillText: {
      fontSize: 14,
      color: C.textStrong,
    },
    pillTextActive: {
      color: C.accent,
      fontWeight: '600',
    },
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    toggleLabel: {
      fontSize: 15,
      color: C.textStrong,
    },
    primaryBtn: {
      ...getButtonStyles(C).mainButton,
    },
    primaryBtnText: {
      ...getButtonStyles(C).mainButtonText,
    },
    ghostBtn: {
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    ghostBtnText: {
      fontSize: 14,
      color: C.textMuted,
    },
    bottomActions: {
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 10,
      backgroundColor: C.background,
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    logEntryButton: {
      ...getButtonStyles(C).mainButton,
      width: '100%',
    },
    logEntryButtonText: {
      ...getButtonStyles(C).mainButtonText,
    },
    destructiveBtn: {
      ...getButtonStyles(C).deleteButton,
    },
    destructiveBtnText: {
      ...getButtonStyles(C).deleteButtonText,
    },
    goalCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      marginBottom: 10,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
    },
    goalCardActive: {
      borderColor: C.accent,
      backgroundColor: C.accent + '15',
    },
    goalCardText: {
      fontSize: 16,
      color: C.textStrong,
      fontWeight: '500',
    },

    // ── Custom metrics ──
    customMetricRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    addMetricBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      marginTop: 4,
    },
    addMetricBtnText: {
      fontSize: 14,
      color: C.accent,
      fontWeight: '600',
    },

    // ── Log modal ──
    modalOverlay: {
      flex: 1,
      backgroundColor: '#00000066',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: C.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: C.textStrong,
    },
    dateWheelWrap: {
      height: LOG_WHEEL_ROW_HEIGHT * 5,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      marginBottom: 16,
      overflow: 'hidden',
    },
    dateWheel: {
      flex: 1,
    },
    dateWheelContent: {
      paddingVertical: 0,
    },
    dateWheelItem: {
      height: LOG_WHEEL_ROW_HEIGHT,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      backgroundColor: C.surface,
    },
    dateWheelItemActive: {
      backgroundColor: C.accent + '16',
    },
    dateWheelItemLabel: {
      fontSize: 14,
      color: C.textStrong,
      fontWeight: '500',
    },
    dateWheelItemLabelActive: {
      color: C.accent,
      fontWeight: '700',
    },
    dateWheelItemMeta: {
      fontSize: 12,
      fontWeight: '600',
    },
    dateWheelItemMissing: {
      color: '#e57373',
    },
    dateWheelItemHasWeight: {
      color: '#4caf50',
    },
  });

