import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApiClient, type Program, type Workout, type Exercise } from '@gym-app/shared';
import './ProgramDetailPage.css';

const ProgramDetailPage = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const [program, setProgram] = useState<Program | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewWorkout, setShowNewWorkout] = useState(false);
  const [newWorkoutName, setNewWorkoutName] = useState('');
  const [exercisesByWorkout, setExercisesByWorkout] = useState<Record<string, Exercise[]>>({});

  const api = new ApiClient('http://localhost:3000');

  useEffect(() => {
    if (!programId) return;
    fetchData();
  }, [programId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const programs = await api.getPrograms();
      const prog = programs.find((p) => p.id === programId);
      setProgram(prog || null);

      if (prog) {
        const wks = await api.getWorkouts(prog.id);
        setWorkouts(wks);

        const exercisesResults = await Promise.all(wks.map((w) => api.getExercises(w.id)));
        const ebw: Record<string, Exercise[]> = {};
        wks.forEach((w, i) => { ebw[w.id] = exercisesResults[i]; });
        setExercisesByWorkout(ebw);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRenameProgram = async (newName: string) => {
    if (!program || !newName.trim()) {
      setEditingName(null);
      return;
    }

    try {
      const updated = await api.updateProgram(program.id, { name: newName });
      setProgram(updated);
      setEditingName(null);
    } catch (err) {
      console.error('Failed to rename program:', err);
    }
  };

  const handleCreateWorkout = async () => {
    if (!program) return;

    try {
      const name = newWorkoutName.trim() || 'Workout 01';
      const newWorkout = await api.createWorkout(program.id, { name });
      setWorkouts([...workouts, newWorkout]);
      setShowNewWorkout(false);
      setNewWorkoutName('');
    } catch (err) {
      console.error('Failed to create workout:', err);
    }
  };

  const cancelNewWorkout = () => {
    setShowNewWorkout(false);
    setNewWorkoutName('');
  };

  const handleDeleteProgram = async () => {
    if (!program) return;
    if (!window.confirm('Delete this program and all its workouts?')) return;

    try {
      await api.deleteProgram(program.id);
      navigate('/programs');
    } catch (err) {
      console.error('Failed to delete program:', err);
    }
  };

  const handleToggleFavorite = async () => {
    if (!program) return;
    try {
      const updated = await api.favoriteProgramId(program.id);
      setProgram(updated);
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  if (loading) return <div className="program-detail-page">Loading...</div>;
  if (!program)
    return (
      <div className="program-detail-page">
        <p>Program not found</p>
      </div>
    );

  return (
    <div className="program-detail-page">
      <div className="detail-header">
        <button onClick={() => navigate('/programs')} className="btn-back">
          ← Back
        </button>

        <div className="title-section">
          {editingName !== null ? (
            <div className="edit-input-group">
              <input
                type="text"
                defaultValue={program.name}
                autoFocus
                onBlur={(e) => handleRenameProgram(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameProgram(e.currentTarget.value);
                  if (e.key === 'Escape') setEditingName(null);
                }}
              />
            </div>
          ) : (
            <h1 onClick={() => setEditingName(program.name)}>{program.name}</h1>
          )}
        </div>
      </div>

      <div className="workouts-section">
        <div className="section-header">
          <h2>Workouts</h2>
          {!showNewWorkout && (
            <button onClick={() => { setShowNewWorkout(true); setNewWorkoutName(''); }} className="btn-primary">
              + Add Workout
            </button>
          )}
        </div>

        {workouts.length === 0 && !showNewWorkout && (
          <p className="no-data">No workouts yet. Add one to get started!</p>
        )}

        {(workouts.length > 0 || showNewWorkout) && (
          <div className="workouts-list">
            {workouts.map((workout) => (
              <div
                key={workout.id}
                className="workout-item"
                onClick={() => navigate(`/programs/${programId}/workouts/${workout.id}`)}
              >
                <h3>{workout.name}</h3>
                <ul className="workout-exercises-list">
                  {(exercisesByWorkout[workout.id] ?? []).length === 0 ? (
                    <li className="workout-exercise-item workout-exercise-empty">No exercises yet</li>
                  ) : (
                    (exercisesByWorkout[workout.id] ?? []).map((ex) => (
                      <li key={ex.id} className="workout-exercise-item">{ex.name}</li>
                    ))
                  )}
                </ul>
              </div>
            ))}

            {showNewWorkout && (
              <div className="workout-item workout-item-new">
                <input
                  className="new-workout-input"
                  type="text"
                  value={newWorkoutName}
                  autoFocus
                  onChange={(e) => setNewWorkoutName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateWorkout();
                    if (e.key === 'Escape') cancelNewWorkout();
                  }}
                  placeholder="Workout name..."
                />
                <div className="workout-actions">
                  <button onClick={handleCreateWorkout} className="btn-view">
                    Create
                  </button>
                  <button onClick={cancelNewWorkout} className="btn-delete">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="program-danger-zone">
          <button onClick={handleDeleteProgram} className="btn-delete-program">
            Delete Program
          </button>
          <button
            onClick={handleToggleFavorite}
            className={`btn-favorite-program${program.is_favorite_program ? ' active' : ''}`}
          >
            {program.is_favorite_program ? '★ Remove from Favorites' : '☆ Add to Favorites'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgramDetailPage;
