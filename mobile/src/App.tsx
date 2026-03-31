import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './screens/HomeScreen';
import ProgramsScreen from './screens/ProgramsScreen';
import ProgramDetailScreen from './screens/ProgramDetailScreen';
import WorkoutDetailScreen from './screens/WorkoutDetailScreen';
import ExercisesScreen from './screens/ExercisesScreen';
import ExercisesCatalogScreen from './screens/ExercisesCatalogScreen';
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
    <NavigationContainer>
      <Tab.Navigator
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
            paddingBottom: 8,
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
            tabBarIcon: ({ color }) => <>{color === colors.accent ? '??' : '?'}</>,
          }}
        />
        <Tab.Screen
          name="ProgramsStack"
          component={ProgramsStackNavigator}
          options={{
            tabBarLabel: 'Programs',
            tabBarIcon: ({ color }) => <>{color === colors.accent ? '??' : '?'}</>,
          }}
        />
        <Tab.Screen
          name="ExercisesStack"
          component={ExercisesStackNavigator}
          options={{
            tabBarLabel: 'Exercises',
            tabBarIcon: ({ color }) => <>{color === colors.accent ? '??' : '?'}</>,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
