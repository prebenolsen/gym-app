import { NavigationContainer } from '@react-navigation/native';
import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import HomeScreen from './screens/HomeScreen';
import ProgramsScreen from './screens/ProgramsScreen';
import ProgramDetailScreen from './screens/ProgramDetailScreen';
import WorkoutDetailScreen from './screens/WorkoutDetailScreen';
import ExercisesScreen from './screens/ExercisesScreen';
import ExercisesCatalogScreen from './screens/ExercisesCatalogScreen';
import AuthScreen from './screens/AuthScreen';
import SettingsScreen from './screens/SettingsScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { colors } from './theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ProgramsStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="ProgramsList"
        component={ProgramsScreen}
      />
      <Stack.Screen
        name="ProgramDetail"
        component={ProgramDetailScreen}
      />
      <Stack.Screen
        name="WorkoutDetail"
        component={WorkoutDetailScreen}
      />
      <Stack.Screen
        name="ExercisesCatalog"
        component={ExercisesCatalogScreen}
      />
    </Stack.Navigator>
  );
};

const ExercisesStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="ExercisesList"
        component={ExercisesScreen}
      />
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

const AppRoutes = () => {
  const { session, loading } = useAuth();

  if (loading) {
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
              <Text style={styles.versionText}>GymApp - version 0.1</Text>
            </View>
          )}
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarStyle: {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              borderTopWidth: 1,
              height: 64,
              paddingTop: 6,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
            },
          }}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              tabBarLabel: 'Home',
              tabBarIcon: ({ color }) => (
                <Text style={{ color, fontSize: 16, fontWeight: '700' }}>H</Text>
              ),
            }}
          />
          <Tab.Screen
            name="ProgramsStack"
            component={ProgramsStackNavigator}
            options={{
              tabBarLabel: 'Programs',
              tabBarIcon: ({ color }) => (
                <Text style={{ color, fontSize: 16, fontWeight: '700' }}>P</Text>
              ),
            }}
          />
          <Tab.Screen
            name="ExercisesStack"
            component={ExercisesStackNavigator}
            options={{
              tabBarLabel: 'Exercises',
              tabBarIcon: ({ color }) => (
                <Text style={{ color, fontSize: 16, fontWeight: '700' }}>E</Text>
              ),
            }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              tabBarLabel: 'Settings',
              tabBarIcon: ({ color }) => (
                <Text style={{ color, fontSize: 16, fontWeight: '700' }}>S</Text>
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBarWrapper: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 10,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: colors.textMuted,
    paddingTop: 2,
  },
});
