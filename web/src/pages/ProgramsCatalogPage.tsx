import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROGRAM_TEMPLATES, type ProgramTemplate } from '@gym-app/shared';
import { useApi } from '../hooks/useApi';
import './ProgramsCatalogPage.css';

const ProgramsCatalogPage = () => {
  const navigate = useNavigate();
  const api = useApi();

  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successProgramId, setSuccessProgramId] = useState<string | null>(null);

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
        {PROGRAM_TEMPLATES.map((template: ProgramTemplate) => (
          <div key={template.id} className="template-card">
            <div className="template-header">
              <h2 className="template-name">{template.name}</h2>
            </div>

            <p className="template-description">{template.description}</p>

            <div className="template-stats">
              <div className="stat-item">
                <span className="stat-label">Workouts</span>
                <span className="stat-value">{template.workoutCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Exercises</span>
                <span className="stat-value">
                  {template.workouts.reduce((sum, w) => sum + w.exercises.length, 0)}
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
        ))}
      </div>
    </div>
  );
};

export default ProgramsCatalogPage;
