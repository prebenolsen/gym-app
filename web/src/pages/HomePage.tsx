import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ApiClient,
  type Program,
  type Workout,
  type WorkoutSession,
  type WorkoutStats,
  type ExerciseHistorySummary,
} from '@gym-app/shared';
import './HomePage.css';

type ProgramWithWorkouts = {
  program: Program;
  workouts: Workout[];
};

const HomePage = () => {
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [programTree, setProgramTree] = useState<ProgramWithWorkouts[]>([]);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [workouts7Days, setWorkouts7Days] = useState<number>(0);
  const [exercises, setExercises] = useState<ExerciseHistorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const api = new ApiClient('http://localhost:3000');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsData, programs, session, workouts7, exercisesData] = await Promise.all([
          api.getStats(),
          api.getPrograms(),
          api.getActiveSession(),
          api.getWorkouts7Days(),
          api.getExerciseHistory(),
        ]);

        const workoutsByProgram = await Promise.all(
          programs.map(async (program) => {
            const workouts = await api.getWorkouts(program.id);
            return {
              program,
              workouts,
            };
          })
        );

        setStats(statsData);
        setProgramTree(workoutsByProgram);
        setActiveSession(session);
        setWorkouts7Days(workouts7.count);
        setExercises(exercisesData);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleStartWorkout = (programId: string, workoutId: string) => {
    navigate(`/programs/${programId}/workouts/${workoutId}`);
  };

  if (loading) return <div className="home-page">Loading...</div>;

  if (!stats || stats.total_programs === 0) {
    return (
      <div className="home-page">
        <div className="onboarding-container">
          <div className="onboarding-content">
            <p className="onboarding-helper">Track your workouts, build your programs, crush your goals.</p>
            <button className="btn-get-started" onClick={() => navigate('/programs')}>
              Get started! 💪
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <h1>Dashboard</h1>

      {activeSession && (
        <div className="active-session-card">
          <p>You have an active workout session.</p>
          <button onClick={() => navigate('/active-workout')} className="btn-resume-session">
            Resume Active Workout
          </button>
        </div>
      )}

      <div className="stats-grid">
        <button className="stat-card" onClick={() => navigate('/programs')}>
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>{stats.total_programs}</h3>
            <p>Programs</p>
          </div>
        </button>

        <button className="stat-card" onClick={() => navigate('/active-workout')}>
          <div className="stat-icon">🏋️</div>
          <div className="stat-content">
            <h3>{stats.total_workouts}</h3>
            <p>Workout</p>
          </div>
        </button>

        <button className="stat-card" onClick={() => navigate('/exercises')}>
          <div className="stat-icon">💪</div>
          <div className="stat-content">
            <h3>{stats.total_exercises}</h3>
            <p>Exercises</p>
          </div>
        </button>

        <button className="stat-card" onClick={() => navigate('/calendar')}>
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3>{workouts7Days}</h3>
            <p>Last 7 Days</p>
          </div>
        </button>
      </div>

      <div className="start-workout-section">
        <h2>Start workout</h2>
        {programTree.length === 0 ? (
          <p className="no-data">No programs available yet.</p>
        ) : (
          <div className="program-tree">
            {programTree.map(({ program, workouts }) => (
              <div key={program.id} className="program-group">
                <h3>{program.name}</h3>
                {workouts.length === 0 ? (
                  <p className="no-data">No workouts in this program yet.</p>
                ) : (
                  <div className="workouts-grid">
                    {workouts.map((workout) => (
                      <button
                        key={workout.id}
                        className="workout-card"
                        onClick={() => handleStartWorkout(program.id, workout.id)}
                      >
                        <div className="workout-card-content">
                          <h4>{workout.name}</h4>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {exercises.length > 0 && (
        <div className="exercise-progress-section">
          <h2>Your Exercise Progress</h2>
          <p className="section-subtitle">Click an exercise to view your progress</p>
          <div className="exercises-grid">
            {exercises.map((exercise) => (
              <button
                key={exercise.exercise_id}
                className="exercise-card"
                onClick={() => navigate(`/exercise-progress/${exercise.exercise_id}`)}
              >
                <div className="exercise-card-content">
                  <h4>{exercise.exercise_name}</h4>
                  <div className="exercise-stats">
                    <span className="stat">Times: {exercise.times_done}</span>
                    <span className="stat">Best: {exercise.personal_best.toFixed(1)} kg</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
