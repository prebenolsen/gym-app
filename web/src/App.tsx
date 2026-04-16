import React from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import HomePage from './pages/HomePage';
import ProgramsPage from './pages/ProgramsPage';
import ProgramDetailPage from './pages/ProgramDetailPage';
import ProgramsCatalogPage from './pages/ProgramsCatalogPage';
import ProgramTemplatePage from './pages/ProgramTemplatePage';
import WorkoutDetailPage from './pages/WorkoutDetailPage';
import WorkoutsCatalogPage from './pages/WorkoutsCatalogPage';
import ExercisesPage from './pages/ExercisesPage';
import ActiveWorkoutPage from './pages/ActiveWorkoutPage';
import CalendarPage from './pages/CalendarPage';
import WorkoutHistoryDetail from './pages/WorkoutHistoryDetail';
import ExerciseProgressPage from './pages/ExerciseProgressPage';
import SettingsPage from './pages/SettingsPage';
import { UnitProvider } from './context/UnitContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

function AppContent() {
  const { loading, session, isPasswordRecovery } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="app" />;
  }

  if (isPasswordRecovery || location.pathname === '/reset-password') {
    return <ResetPasswordPage />;
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <div className="app">
      <div className="app-shell">
        <Navigation />
        <div className="app-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/programs" element={<ProgramsPage />} />
            <Route path="/programs-catalog" element={<ProgramsCatalogPage />} />
            <Route
              path="/programs-catalog/:templateId"
              element={<ProgramTemplatePage />}
            />
            <Route path="/programs/:programId" element={<ProgramDetailPage />} />
            <Route
              path="/programs/:programId/workouts-catalog"
              element={<WorkoutsCatalogPage />}
            />
            <Route
              path="/programs/:programId/workouts/:workoutId"
              element={<WorkoutDetailPage />}
            />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="/active-workout" element={<ActiveWorkoutPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route
              path="/workout-history/:sessionId"
              element={<WorkoutHistoryDetail />}
            />
            <Route
              path="/exercise-progress/:exerciseId"
              element={<ExerciseProgressPage />}
            />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <UnitProvider>
            <AppContent />
          </UnitProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
