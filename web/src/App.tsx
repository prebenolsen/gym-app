import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import ProgramsPage from './pages/ProgramsPage';
import ProgramDetailPage from './pages/ProgramDetailPage';
import WorkoutDetailPage from './pages/WorkoutDetailPage';
import ExercisesPage from './pages/ExercisesPage';
import ActiveWorkoutPage from './pages/ActiveWorkoutPage';
import CalendarPage from './pages/CalendarPage';
import WorkoutHistoryDetail from './pages/WorkoutHistoryDetail';
import ExerciseProgressPage from './pages/ExerciseProgressPage';
import SettingsPage from './pages/SettingsPage';
import { UnitProvider } from './context/UnitContext';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

function AppContent() {
  return (
    <div className="app">
      <div className="app-shell">
        <Navigation />
        <div className="app-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/programs" element={<ProgramsPage />} />
            <Route path="/programs/:programId" element={<ProgramDetailPage />} />
            <Route
              path="/programs/:programId/workouts/:workoutId"
              element={<WorkoutDetailPage />}
            />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="/active-workout" element={<ActiveWorkoutPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/workout-history/:sessionId" element={<WorkoutHistoryDetail />} />
            <Route path="/exercise-progress/:exerciseId" element={<ExerciseProgressPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <UnitProvider>
          <AppContent />
        </UnitProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;

