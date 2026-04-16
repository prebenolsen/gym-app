import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PROGRAM_TEMPLATES,
  type ProgramTemplateExercise,
  type ProgramTemplateWorkout,
} from '@gym-app/shared';
import NumberSpinner from '../components/NumberSpinner';
import { useApi } from '../hooks/useApi';
import './ProgramTemplatePage.css';

interface EditableExercise {
  name: string;
  sets: number;
  rest_seconds: number;
}

interface EditableWorkout {
  name: string;
  exercises: EditableExercise[];
}

const deepCopyWorkouts = (workouts: ProgramTemplateWorkout[]): EditableWorkout[] =>
  workouts.map((w) => ({
    name: w.name,
    exercises: w.exercises.map((e: ProgramTemplateExercise) => ({
      name: e.name,
      sets: e.sets,
      rest_seconds: e.rest_seconds,
    })),
  }));

const ProgramTemplatePage = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const api = useApi();

  const template = PROGRAM_TEMPLATES.find((t) => t.id === templateId);

  const [workouts, setWorkouts] = useState<EditableWorkout[]>(
    template ? deepCopyWorkouts(template.workouts) : [],
  );
  const [newExerciseNames, setNewExerciseNames] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!template) {
    return (
      <div className="template-edit-page">
        <p>Template not found.</p>
        <button className="btn-back" onClick={() => navigate('/programs-catalog')}>
          ← Back to Templates
        </button>
      </div>
    );
  }

  const updateExercise = (
    workoutIndex: number,
    exerciseIndex: number,
    updates: Partial<EditableExercise>,
  ) => {
    setWorkouts((prev) =>
      prev.map((w, wi) =>
        wi !== workoutIndex
          ? w
          : {
              ...w,
              exercises: w.exercises.map((e, ei) =>
                ei !== exerciseIndex ? e : { ...e, ...updates },
              ),
            },
      ),
    );
  };

  const removeExercise = (workoutIndex: number, exerciseIndex: number) => {
    setWorkouts((prev) =>
      prev.map((w, wi) =>
        wi !== workoutIndex
          ? w
          : {
              ...w,
              exercises: w.exercises.filter((_, ei) => ei !== exerciseIndex),
            },
      ),
    );
  };

  const addExercise = (workoutIndex: number) => {
    const name = (newExerciseNames[workoutIndex] ?? '').trim();
    if (!name) return;

    setWorkouts((prev) =>
      prev.map((w, wi) =>
        wi !== workoutIndex
          ? w
          : {
              ...w,
              exercises: [...w.exercises, { name, sets: 4, rest_seconds: 120 }],
            },
      ),
    );
    setNewExerciseNames((prev) => ({ ...prev, [workoutIndex]: '' }));
  };

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    try {
      await api.createProgramWithWorkouts({
        name: template.name,
        workouts: workouts.map((w) => ({
          name: w.name,
          exercises: w.exercises.map((e) => ({
            name: e.name,
            sets: e.sets,
            rest_seconds: e.rest_seconds,
          })),
        })),
      });
      navigate('/programs');
    } catch (err) {
      console.error('Failed to import template:', err);
      setError('Failed to import program. Please try again.');
      setImporting(false);
    }
  };

  return (
    <div className="template-edit-page">
      <div className="template-edit-header">
        <button className="btn-back" onClick={() => navigate('/programs-catalog')}>
          ← Back to Templates
        </button>
        <div className="template-edit-title">
          <h1>{template.name}</h1>
          <p className="template-edit-subtitle">{template.description}</p>
        </div>
        <button className="btn-import-final" onClick={handleImport} disabled={importing}>
          {importing ? 'Importing...' : 'Import Program'}
        </button>
      </div>

      {error && <div className="template-edit-error">{error}</div>}

      <div className="template-workouts-list">
        {workouts.map((workout, wi) => (
          <div key={wi} className="template-workout-card">
            <h2 className="template-workout-name">{workout.name}</h2>

            <div className="template-exercises-list">
              {workout.exercises.length === 0 && (
                <p className="template-no-exercises">No exercises. Add one below.</p>
              )}
              {workout.exercises.map((exercise, ei) => (
                <div key={ei} className="template-exercise-row">
                  <span className="template-exercise-name">{exercise.name}</span>

                  <div className="template-exercise-controls">
                    <NumberSpinner
                      value={exercise.sets}
                      onChange={(v) => updateExercise(wi, ei, { sets: v })}
                      min={1}
                      max={100}
                      step={1}
                      label="Sets"
                    />
                    <NumberSpinner
                      value={exercise.rest_seconds}
                      onChange={(v) => updateExercise(wi, ei, { rest_seconds: v })}
                      min={0}
                      max={600}
                      step={5}
                      label="Rest (sec)"
                    />
                    <button
                      className="btn-remove-exercise"
                      onClick={() => removeExercise(wi, ei)}
                      title="Remove exercise"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="template-add-exercise">
              <input
                type="text"
                placeholder="Add exercise..."
                value={newExerciseNames[wi] ?? ''}
                onChange={(e) =>
                  setNewExerciseNames((prev) => ({
                    ...prev,
                    [wi]: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addExercise(wi);
                }}
              />
              <button className="btn-add-exercise" onClick={() => addExercise(wi)}>
                + Add
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="template-edit-footer">
        <button className="btn-import-final" onClick={handleImport} disabled={importing}>
          {importing ? 'Importing...' : 'Import Program'}
        </button>
      </div>
    </div>
  );
};

export default ProgramTemplatePage;
