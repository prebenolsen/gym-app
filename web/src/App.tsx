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
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
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
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;

