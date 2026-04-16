import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
import CalendarScreen from './screens/CalendarScreen';
import WorkoutHistoryDetailScreen from './screens/WorkoutHistoryDetailScreen';
import AuthScreen from './screens/AuthScreen';
import SettingsScreen from './screens/SettingsScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PreferencesProvider, usePreferences } from './context/PreferencesContext';
import { useApi } from './hooks/useApi';
import { Ionicons } from '@expo/vector-icons';
import { APP_INFO } from './constants/appInfo';

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

const CalendarStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="WorkoutHistoryDetail" component={WorkoutHistoryDetailScreen} />
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <PreferencesProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </PreferencesProvider>
  );
}

const AppRoutes = () => {
  const { session, loading } = useAuth();
  const { ready, colors } = usePreferences();
  const api = useApi();
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [loadingActiveSession, setLoadingActiveSession] = useState(true);
  const styles = createStyles(colors);

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
  }, [api, session]);

  const isActiveWorkoutEnabled = hasActiveSession && !loadingActiveSession;

  if (loading || !ready) {
    return null;
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <NavigationContainer>
        <Tab.Navigator
          tabBar={(props) => (
            <View style={styles.tabBarWrapper}>
              <BottomTabBar {...props} />
              <View style={styles.tabBarFooter}>
                <Text style={styles.versionText}>
                  Version {APP_INFO.version} ({APP_INFO.stage})
                </Text>
              </View>
            </View>
          )}
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
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={createTabIconWrapperStyle(focused, colors.accent)}>
                  <Ionicons name="flash" size={28} color={color} />
                </View>
              ),
            }}
          />
          <Tab.Screen
            name="ProgramsStack"
            component={ProgramsStackNavigator}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={createTabIconWrapperStyle(focused, colors.accent)}>
                  <Ionicons name="clipboard-outline" size={28} color={color} />
                </View>
              ),
            }}
          />
          <Tab.Screen
            name="ActiveWorkoutStack"
            component={ActiveWorkoutStackNavigator}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={createTabIconWrapperStyle(focused, colors.accent)}>
                  <Ionicons
                    name="barbell-outline"
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
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={createTabIconWrapperStyle(focused, colors.accent)}>
                  <Ionicons name="calendar-outline" size={28} color={color} />
                </View>
              ),
            }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={createTabIconWrapperStyle(focused, colors.accent)}>
                  <Ionicons name="settings-outline" size={28} color={color} />
                </View>
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
};

const createStyles = (themeColors: ReturnType<typeof usePreferences>['colors']) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    tabBarWrapper: {
      backgroundColor: themeColors.surface,
      marginBottom: 12,
    },
    tabBarFooter: {
      width: '100%',
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
      paddingTop: 6,
      paddingBottom: 10,
      alignItems: 'center',
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
