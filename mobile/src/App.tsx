import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import HomeScreen from './screens/HomeScreen';
import ProgramsScreen from './screens/ProgramsScreen';
import ProgramDetailScreen from './screens/ProgramDetailScreen';
import WorkoutDetailScreen from './screens/WorkoutDetailScreen';
import ExercisesCatalogScreen from './screens/ExercisesCatalogScreen';
import ExerciseProgressScreen from './screens/ExerciseProgressScreen';
import ProgramsCatalogScreen from './screens/ProgramsCatalogScreen';
import ProgramTemplateScreen from './screens/ProgramTemplateScreen';
import WorkoutsCatalogScreen from './screens/WorkoutsCatalogScreen';
import ActiveWorkoutScreen from './screens/ActiveWorkoutScreen';
import ExerciseHistoryScreen from './screens/ExerciseHistoryScreen';
import ExerciseNotesScreen from './screens/ExerciseNotesScreen';
import ExerciseProgressListScreen from './screens/ExerciseProgressListScreen';
import CalendarScreen from './screens/CalendarScreen';
import WorkoutHistoryDetailScreen from './screens/WorkoutHistoryDetailScreen';
import AuthScreen from './screens/AuthScreen';
import SettingsScreen from './screens/SettingsScreen';
import FeedbackScreen from './screens/FeedbackScreen';
import WeightTrackerScreen from './screens/WeightTrackerScreen';
import OnboardingSetupScreen from './screens/OnboardingSetupScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PreferencesProvider, usePreferences } from './context/PreferencesContext';
import { useApi } from './hooks/useApi';
import { AppToastProvider } from './components/ui/AppToastProvider';
import { ErrorDialogProvider } from './components/ui/ErrorDialogProvider';
import { ConfirmDialogProvider, useConfirmDialog } from './components/ui/ConfirmDialogProvider';
import { setConfirmDialogHook } from './components/ui/ConfirmDialog';
import { Ionicons } from '@expo/vector-icons';
import type { NavigationState, PartialState, Route } from '@react-navigation/native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const tabIconStyle = ({ color, opacity = 1 }: { color: string; opacity?: number }) => ({
  color,
  fontSize: 24,
  opacity,
});

const createTabIconWrapperStyle = (isFocused: boolean, accentColor: string) => ({
  borderBottomWidth: isFocused ? 2 : 0,
  borderBottomColor: accentColor,
  justifyContent: 'center' as const,
  minWidth: 28,
  minHeight: 30,
  alignItems: 'center' as const,
});

type NestedNavigationState = NavigationState | PartialState<NavigationState>;

const SCREEN_FILE_NAME_BY_ROUTE: Record<string, string> = {
  Home: 'HomeScreen.tsx',
  ProgramsStack: 'ProgramsScreen.tsx',
  ProgramsList: 'ProgramsScreen.tsx',
  ProgramDetail: 'ProgramDetailScreen.tsx',
  WorkoutDetail: 'WorkoutDetailScreen.tsx',
  ExercisesCatalog: 'ExercisesCatalogScreen.tsx',
  ExerciseProgress: 'ExerciseProgressScreen.tsx',
  ProgramsCatalog: 'ProgramsCatalogScreen.tsx',
  ProgramTemplate: 'ProgramTemplateScreen.tsx',
  WorkoutsCatalog: 'WorkoutsCatalogScreen.tsx',
  ExerciseProgressList: 'ExerciseProgressListScreen.tsx',
  ActiveWorkoutStack: 'ActiveWorkoutScreen.tsx',
  ActiveWorkout: 'ActiveWorkoutScreen.tsx',
  ExerciseHistory: 'ExerciseHistoryScreen.tsx',
  ExerciseNotes: 'ExerciseNotesScreen.tsx',
  CalendarStack: 'CalendarScreen.tsx',
  Calendar: 'CalendarScreen.tsx',
  WorkoutHistoryDetail: 'WorkoutHistoryDetailScreen.tsx',
  Settings: 'SettingsScreen.tsx',
  Feedback: 'FeedbackScreen.tsx',
  Auth: 'AuthScreen.tsx',
  WeightTrackerStack: 'WeightTrackerScreen.tsx',
  WeightTracker: 'WeightTrackerScreen.tsx',
  OnboardingSetup: 'OnboardingSetupScreen.tsx',
};

const onboardingSkipStorageKey = (userId: string) =>
  `gym-app.mobile.onboarding-skipped.${userId}`;

const isAuthError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    kind?: string;
    status?: number;
    message?: string;
  };

  if (candidate.kind === 'auth' || candidate.status === 401 || candidate.status === 403) {
    return true;
  }

  const message = candidate.message?.toLowerCase() ?? '';
  return (
    message.includes('invalid or expired authorization token') ||
    message.includes('jwt expired') ||
    message.includes('authentication failed')
  );
};

const getDeepestActiveRouteName = (state: NestedNavigationState): string => {
  const activeIndex = state.index ?? 0;
  const activeRoute = state.routes[activeIndex] as Route<string> & {
    state?: NestedNavigationState;
  };

  if (!activeRoute) {
    return 'UnknownScreen';
  }

  if (activeRoute.state) {
    return getDeepestActiveRouteName(activeRoute.state);
  }

  return activeRoute.name;
};

const getActiveScreenFileName = (state: NestedNavigationState): string => {
  const activeRouteName = getDeepestActiveRouteName(state);
  return SCREEN_FILE_NAME_BY_ROUTE[activeRouteName] ?? `${activeRouteName}.tsx`;
};

const ProgramsStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProgramsList" component={ProgramsScreen} />
      <Stack.Screen name="ProgramDetail" component={ProgramDetailScreen} />
      <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
      <Stack.Screen name="ExercisesCatalog" component={ExercisesCatalogScreen} />
      <Stack.Screen name="ProgramsCatalog" component={ProgramsCatalogScreen} />
      <Stack.Screen name="ProgramTemplate" component={ProgramTemplateScreen} />
      <Stack.Screen name="WorkoutsCatalog" component={WorkoutsCatalogScreen} />
      <Stack.Screen
        name="ExerciseProgressList"
        component={ExerciseProgressListScreen}
      />
      <Stack.Screen name="ExerciseProgress" component={ExerciseProgressScreen} />
    </Stack.Navigator>
  );
};

const ActiveWorkoutStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
      <Stack.Screen name="ExerciseHistory" component={ExerciseHistoryScreen} />
      <Stack.Screen name="ExerciseNotes" component={ExerciseNotesScreen} />
    </Stack.Navigator>
  );
};

const WeightTrackerStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WeightTracker" component={WeightTrackerScreen} />
    </Stack.Navigator>
  );
};

const CalendarStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="WorkoutHistoryDetail" component={WorkoutHistoryDetailScreen} />
    </Stack.Navigator>
  );
};

const SettingsStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PreferencesProvider>
        <AuthProvider>
          <AppToastProvider>
            <ErrorDialogProvider>
              <ConfirmDialogProvider>
                <ConfirmDialogInitializer>
                  <AppRoutes />
                </ConfirmDialogInitializer>
              </ConfirmDialogProvider>
            </ErrorDialogProvider>
          </AppToastProvider>
        </AuthProvider>
      </PreferencesProvider>
    </GestureHandlerRootView>
  );
}

function ConfirmDialogInitializer({ children }: { children: React.ReactNode }) {
  const confirmDialog = useConfirmDialog();
  useEffect(() => {
    setConfirmDialogHook(confirmDialog);
  }, [confirmDialog]);
  return <>{children}</>;
}

const AppRoutes = () => {
  const { session, loading, signOut } = useAuth();
  const { ready, colors, showFileDisplay } = usePreferences();
  const api = useApi();
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [loadingActiveSession, setLoadingActiveSession] = useState(true);
  const [recoveringAuth, setRecoveringAuth] = useState(false);
  const [onboardingState, setOnboardingState] = useState<
    'loading' | 'required' | 'skipped' | 'complete'
  >('loading');
  const styles = createStyles(colors, showFileDisplay);

  const clearStaleAuthState = useCallback(async () => {
    if (!session || recoveringAuth) {
      return;
    }

    setRecoveringAuth(true);
    try {
      if (session.user?.id) {
        await AsyncStorage.removeItem(onboardingSkipStorageKey(session.user.id));
      }
      await signOut();
    } catch (err) {
      console.error('Failed to clear stale auth session:', err);
    } finally {
      setRecoveringAuth(false);
    }
  }, [recoveringAuth, session, signOut]);

  useEffect(() => {
    let isMounted = true;

    const resolveOnboarding = async () => {
      if (!session?.user?.id) {
        if (isMounted) {
          setOnboardingState('loading');
        }
        return;
      }

      try {
        const [profile, skippedFlag] = await Promise.all([
          api.getWeightTrackerProfile(),
          AsyncStorage.getItem(onboardingSkipStorageKey(session.user.id)),
        ]);

        if (!isMounted) return;

        if (profile?.onboarding_complete) {
          setOnboardingState('complete');
          return;
        }

        setOnboardingState(skippedFlag === 'true' ? 'skipped' : 'required');
      } catch (err) {
        console.error('Failed to resolve onboarding state:', err);
        if (isAuthError(err)) {
          await clearStaleAuthState();
          return;
        }
        if (isMounted) {
          setOnboardingState('required');
        }
      }
    };

    resolveOnboarding();

    return () => {
      isMounted = false;
    };
  }, [api, clearStaleAuthState, session?.user?.id]);

  useEffect(() => {
    let isMounted = true;

    const fetchActiveSession = async () => {
      if (!session) {
        if (isMounted) {
          setHasActiveSession(false);
          setLoadingActiveSession(false);
        }
        return;
      }

      try {
        const activeSession = await api.getActiveSession();
        if (isMounted) {
          setHasActiveSession(!!activeSession);
        }
      } catch (err) {
        console.error('Failed to fetch active workout session:', err);
        if (isAuthError(err)) {
          await clearStaleAuthState();
          return;
        }
        if (isMounted) {
          setHasActiveSession(false);
        }
      } finally {
        if (isMounted) {
          setLoadingActiveSession(false);
        }
      }
    };

    fetchActiveSession();
    const interval = setInterval(fetchActiveSession, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [api, clearStaleAuthState, session]);

  const isActiveWorkoutEnabled = hasActiveSession && !loadingActiveSession;

  if (loading || !ready) {
    return null;
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (onboardingState === 'loading') {
    return null;
  }

  if (onboardingState === 'required') {
    return (
      <OnboardingSetupScreen
        onSkip={async () => {
          await AsyncStorage.setItem(onboardingSkipStorageKey(session.user.id), 'true');
          setOnboardingState('skipped');
        }}
        onComplete={async () => {
          await AsyncStorage.removeItem(onboardingSkipStorageKey(session.user.id));
          setOnboardingState('complete');
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <NavigationContainer>
        <Tab.Navigator
          tabBar={(props) => {
            const activeRouteName = props.state.routes[props.state.index]?.name;
            if (activeRouteName === 'OnboardingSetup') return null;
            return (
              <View style={[styles.tabBarWrapper, !showFileDisplay && styles.tabBarWrapperHidden]}>
                <BottomTabBar {...props} />
                <View style={[styles.tabBarFooter, !showFileDisplay && styles.tabBarFooterHidden]}>
                  <Text style={styles.versionText}>{getActiveScreenFileName(props.state)}</Text>
                </View>
              </View>
            );
          }}
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarShowLabel: false,
            tabBarStyle: {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              borderTopWidth: 1,
              height: 80,
              paddingTop: 0,
              paddingBottom: 0,
            },
            tabBarItemStyle: {
              alignItems: 'center',
              justifyContent: 'center',
            },
          }}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            listeners={({ navigation }) => ({
              tabPress: (event) => {
                event.preventDefault();
                navigation.navigate('Home');
              },
            })}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={createTabIconWrapperStyle(focused, colors.accent)}>
                  <Ionicons
                    name={focused ? 'flash' : 'flash-outline'}
                    size={28}
                    color={color}
                  />
                </View>
              ),
            }}
          />
          <Tab.Screen
            name="ProgramsStack"
            component={ProgramsStackNavigator}
            listeners={({ navigation }) => ({
              tabPress: (event) => {
                event.preventDefault();
                navigation.navigate('ProgramsStack', { screen: 'ProgramsList' });
              },
            })}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={createTabIconWrapperStyle(focused, colors.accent)}>
                  <Ionicons
                    name={focused ? 'clipboard' : 'clipboard-outline'}
                    size={28}
                    color={color}
                  />
                </View>
              ),
            }}
          />
          <Tab.Screen
            name="ActiveWorkoutStack"
            component={ActiveWorkoutStackNavigator}
            listeners={({ navigation }) => ({
              tabPress: (event) => {
                if (!isActiveWorkoutEnabled) {
                  event.preventDefault();
                  return;
                }

                event.preventDefault();
                navigation.navigate('ActiveWorkoutStack', { screen: 'ActiveWorkout' });
              },
            })}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={createTabIconWrapperStyle(focused, colors.accent)}>
                  <Ionicons
                    name={focused ? 'barbell' : 'barbell-outline'}
                    size={28}
                    color={isActiveWorkoutEnabled ? color : colors.textMuted}
                    style={{ opacity: isActiveWorkoutEnabled ? 1 : 0.45 }}
                  />
                </View>
              ),
              tabBarButton: (props) => {
                if (isActiveWorkoutEnabled) {
                  return <TouchableOpacity {...props} />;
                }
                return (
                  <TouchableOpacity
                    {...props}
                    disabled
                    activeOpacity={1}
                    style={[props.style, styles.disabledTabButton]}
                  />
                );
              },
            }}
          />
          <Tab.Screen
            name="CalendarStack"
            component={CalendarStackNavigator}
            listeners={({ navigation }) => ({
              tabPress: (event) => {
                event.preventDefault();
                navigation.navigate('CalendarStack', { screen: 'Calendar' });
              },
            })}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={createTabIconWrapperStyle(focused, colors.accent)}>
                  <Ionicons
                    name={focused ? 'calendar' : 'calendar-outline'}
                    size={28}
                    color={color}
                  />
                </View>
              ),
            }}
          />
          <Tab.Screen
            name="WeightTrackerStack"
            component={WeightTrackerStackNavigator}
            options={{
              tabBarButton: () => null,
            }}
          />
          <Tab.Screen
            name="OnboardingSetup"
            options={{
              tabBarButton: () => null,
              tabBarStyle: { display: 'none' },
            }}
          >
            {({ navigation }) => (
              <OnboardingSetupScreen
                onSkip={async () => {
                  await AsyncStorage.setItem(
                    onboardingSkipStorageKey(session.user.id),
                    'true',
                  );
                  setOnboardingState('skipped');
                  navigation.navigate('Home');
                }}
                onComplete={async () => {
                  await AsyncStorage.removeItem(onboardingSkipStorageKey(session.user.id));
                  setOnboardingState('complete');
                  navigation.navigate('Home');
                }}
              />
            )}
          </Tab.Screen>
          <Tab.Screen
            name="Settings"
            component={SettingsStackNavigator}
            listeners={({ navigation }) => ({
              tabPress: (event) => {
                event.preventDefault();
                navigation.navigate('Settings');
              },
            })}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={createTabIconWrapperStyle(focused, colors.accent)}>
                  <Ionicons
                    name={focused ? 'settings' : 'settings-outline'}
                    size={28}
                    color={color}
                  />
                </View>
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
};

const createStyles = (themeColors: ReturnType<typeof usePreferences>['colors'], showFileDisplay: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    tabBarWrapper: {
      backgroundColor: themeColors.surface,
      marginBottom: showFileDisplay ? 12 : 6,
    },
    tabBarWrapperHidden: {
      marginBottom: 0,
    },
    tabBarFooter: {
      width: '100%',
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
      paddingTop: 6,
      paddingBottom: 10,
      alignItems: 'center',
    },
    tabBarFooterHidden: {
      display: 'none',
    },
    versionText: {
      fontSize: 12,
      color: themeColors.textMuted,
      paddingTop: 2,
    },
    disabledTabButton: {
      opacity: 0.85,
    },
  });
