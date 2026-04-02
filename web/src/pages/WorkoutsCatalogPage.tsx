import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { WORKOUT_TEMPLATES, type WorkoutTemplate } from '@gym-app/shared';
import { useApi } from '../hooks/useApi';
import './WorkoutsCatalogPage.css';

const WorkoutsCatalogPage = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const api = useApi();

  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!programId) {
    return (
      <div className="workouts-catalog-page">
        <div className="error-message">Invalid program. Please go back and try again.</div>
      </div>
    );
  }

  const handleImportTemplate = async (templateId: string) => {
    setImporting(templateId);
    setError(null);
    try {
      const template = WORKOUT_TEMPLATES.find((t: WorkoutTemplate) => t.id === templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      await api.createWorkoutWithExercises(programId, template);
      setSuccess(true);

      // Redirect back to program detail after short delay to show success feedback
      setTimeout(() => {
        navigate(`/programs/${programId}`);
      }, 800);
    } catch (err) {
      console.error('Failed to import template:', err);
      setError('Failed to import workout template. Please try again.');
      setImporting(null);
    }
  };

  return (
    <div className="workouts-catalog-page">
      <div className="catalog-header">
        <h1>Workout Templates</h1>
        <p className="catalog-subtitle">Choose a workout template to add to your program</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">Workout imported successfully! Redirecting...</div>}

      <div className="templates-grid">
        {WORKOUT_TEMPLATES.map((template: WorkoutTemplate) => (
          <div key={template.id} className="template-card">
            <div className="template-header">
              <h2 className="template-name">{template.name}</h2>
              <span className="template-category">{template.category}</span>
            </div>

            <p className="template-description">{template.description}</p>

            <div className="template-exercises">
              <h3 className="exercises-title">
                {template.exercises.length} Exercises
              </h3>
              <ul className="exercises-list">
                {template.exercises.map((exercise, idx) => (
                  <li key={idx} className="exercise-item">
                    <div className="exercise-name">{exercise.name}</div>
                    <div className="exercise-meta">
                      <span className="sets-badge">{exercise.sets} sets</span>
                      <span className="rest-badge">{exercise.rest_seconds}s rest</span>
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
              {importing === template.id ? 'Importing...' : 'Import Template'}
            </button>
          </div>
        ))}
      </div>

      <button
        className="btn-back"
        onClick={() => navigate(`/programs/${programId}`)}
        disabled={success}
      >
        Back to Program
      </button>
    </div>
  );
};

export default WorkoutsCatalogPage;
