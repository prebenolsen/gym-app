import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import ProgramsPage from './pages/ProgramsPage';
import ProgramDetailPage from './pages/ProgramDetailPage';
import WorkoutDetailPage from './pages/WorkoutDetailPage';
import ExercisesPage from './pages/ExercisesPage';
import ActiveWorkoutPage from './pages/ActiveWorkoutPage';
import CalendarPage from './pages/CalendarPage';
import WorkoutHistoryDetail from './pages/WorkoutHistoryDetail';
import SettingsPage from './pages/SettingsPage';
import { UnitProvider } from './context/UnitContext';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <UnitProvider>
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
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </div>
            </div>
          </div>
        </UnitProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;

