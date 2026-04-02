import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROGRAM_TEMPLATES, type ProgramTemplate } from '@gym-app/shared';
import { useApi } from '../hooks/useApi';
import './ProgramsCatalogPage.css';

const TIME_PER_SET_SECONDS = {
  low: 30,
  high: 45,
};

const roundDownToNearestFive = (value: number): number =>
  Math.floor(value / 5) * 5;

const roundUpToNearestFive = (value: number): number =>
  Math.ceil(value / 5) * 5;

const getExerciseTimeSecondsRange = (
  sets: number,
  restSeconds: number,
  timePerSetSecondsRange = TIME_PER_SET_SECONDS
): { low: number; high: number } => {
  const low =
    sets * timePerSetSecondsRange.low +
    Math.max(sets - 1, 0) * restSeconds;
  const high =
    sets * timePerSetSecondsRange.high +
    Math.max(sets - 1, 0) * restSeconds;

  return { low, high };
};

const getProgramAverageWorkoutEstimateMinutes = (
  template: ProgramTemplate
): { low: number; high: number } => {
  if (template.workouts.length === 0) {
    return { low: 0, high: 0 };
  }

  const totalRangeSeconds = template.workouts.reduce(
    (programTotal, workout) => {
      const workoutRangeSeconds = workout.exercises.reduce(
        (workoutTotal, exercise) => {
          const exerciseRange = getExerciseTimeSecondsRange(
            exercise.sets,
            exercise.rest_seconds
          );

          return {
            low: workoutTotal.low + exerciseRange.low,
            high: workoutTotal.high + exerciseRange.high,
          };
        },
        { low: 0, high: 0 }
      );

      return {
        low: programTotal.low + workoutRangeSeconds.low,
        high: programTotal.high + workoutRangeSeconds.high,
      };
    },
    { low: 0, high: 0 }
  );

  const avgLowMinutes = totalRangeSeconds.low / template.workoutCount / 60;
  const avgHighMinutes = totalRangeSeconds.high / template.workoutCount / 60;

  return {
    low: roundDownToNearestFive(avgLowMinutes),
    high: roundUpToNearestFive(avgHighMinutes),
  };
};

const ProgramsCatalogPage = () => {
  const navigate = useNavigate();
  const api = useApi();

  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleImportTemplate = async (templateId: string) => {
    setImporting(templateId);
    setError(null);
    try {
      const template = PROGRAM_TEMPLATES.find(
        (t: ProgramTemplate) => t.id === templateId
      );
      if (!template) {
        throw new Error('Template not found');
      }

      await api.createProgramWithWorkouts(template);
      setSuccess(true);

      // Redirect back to programs page after short delay to show success feedback
      setTimeout(() => {
        navigate('/programs');
      }, 1000);
    } catch (err) {
      console.error('Failed to import template:', err);
      setError('Failed to import program template. Please try again.');
      setImporting(null);
    }
  };

  return (
    <div className="programs-catalog-page">
      <div className="catalog-header">
        <button onClick={() => navigate('/programs')} className="btn-back">
          ← Back to Programs
        </button>
        <div className="header-content">
          <h1>Program Templates</h1>
          <p className="catalog-subtitle">
            Choose a program template to add all workouts and exercises at once
          </p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && (
        <div className="success-message">Program imported successfully! Redirecting...</div>
      )}

      <div className="templates-grid">
        {PROGRAM_TEMPLATES.map((template: ProgramTemplate) => {
          const estimatedTime = getProgramAverageWorkoutEstimateMinutes(template);

          return (
            <div key={template.id} className="template-card">
            <div className="template-header">
              <h2 className="template-name">{template.name}</h2>
            </div>

            <p className="template-description">{template.description}</p>

            <div className="template-stats">
              <div className="stat-item">
                <span className="stat-label">Exercises</span>
                <span className="stat-value">
                  {template.workouts.reduce((sum, w) => sum + w.exercises.length, 0)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Estimated Time</span>
                <span className="stat-value stat-value-time">
                  {estimatedTime.low}-{estimatedTime.high} minutes
                </span>
              </div>
            </div>

            <div className="template-workouts">
              <h3 className="workouts-title">Workouts in this Program</h3>
              <ul className="workouts-list">
                {template.workouts.map((workout, idx) => (
                  <li key={idx} className="workout-item">
                    <div className="workout-name">{workout.name}</div>
                    <div className="exercise-count">
                      {workout.exercises.length} exercises
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <button
              className="btn-import"
              onClick={() => handleImportTemplate(template.id)}
              disabled={importing !== null}
            >
              {importing === template.id ? 'Importing...' : 'Import Program'}
            </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgramsCatalogPage;
