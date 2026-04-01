import { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  exercises,
  getMuscleGroups,
  getEquipment,
  filterExercises,
  type MuscleGroup,
  type Equipment,
  type Program,
  type Workout,
  ApiClient,
} from '@gym-app/shared';
import './ExercisesPage.css';
import { useTheme } from '../context/ThemeContext';
import {
  FrontTorso, BackTorso, ArmsView, FrontLegs, BackLegs, AbsView,
  type MuscleGroup as MapMuscle,
} from '../components/MuscleMap';

// Maps catalog MuscleGroup → SVG component
type MapComponent = React.ComponentType<{
  active?: MapMuscle[];
  size?: number;
  mutedColor?: string;
  highlightColor?: string;
}>;

const MUSCLE_VIEW: Record<string, MapComponent> = {
  'Chest':               FrontTorso,
  'Back':                BackTorso,
  'Shoulders':           FrontTorso,
  'Biceps':              ArmsView,
  'Triceps':             ArmsView,
  'Legs (Quads focus)':  FrontLegs,
  'Hamstrings / Glutes': BackLegs,
  'Calves':              BackLegs,
  'Core / Abs':          AbsView,
};

const MUSCLE_ACTIVE: Record<string, MapMuscle[]> = {
  'Chest':               ['chest'],
  'Back':                ['lats', 'rhomboids', 'traps', 'lower_back'],
  'Shoulders':           ['shoulders'],
  'Biceps':              ['biceps'],
  'Triceps':             ['triceps'],
  'Legs (Quads focus)':  ['quads', 'hip_flexors'],
  'Hamstrings / Glutes': ['hamstrings', 'glutes'],
  'Calves':              ['calves'],
  'Core / Abs':          ['upper_abs', 'lower_abs', 'obliques'],
};

const ExercisesPage = () => {
  const navigate = useNavigate();
  const { accent } = useTheme();
  const highlightColor = accent === 'auburn' ? '#c65a1e' : '#10b981';
  const [searchParams] = useSearchParams();
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<
    MuscleGroup | null
  >(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Set<Equipment>>(
    new Set()
  );
  const [selectedMovementType, setSelectedMovementType] = useState<
    Set<string>
  >(new Set());
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(
    new Set()
  );
  const [isAdding, setIsAdding] = useState(false);

  // Data for program/workout selection
  const [programs, setPrograms] = useState<Program[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedWorkout, setSelectedWorkout] = useState<string>('');

  // Workout context from query params (fallback)
  const paramProgramId = searchParams.get('programId');
  const paramWorkoutId = searchParams.get('workoutId');
  const paramWorkoutName = searchParams.get('workoutName');
  
  // Use selected from dropdowns if available, otherwise use query params
  const activeWorkoutId = selectedWorkout || paramWorkoutId;
  const activeWorkoutName = workouts.find(w => w.id === selectedWorkout)?.name || paramWorkoutName;
  const activeProgramId = selectedProgram || paramProgramId;
  const isActiveWorkout = !!activeWorkoutId;

  const api = new ApiClient('http://localhost:3000');

  // Fetch programs on mount
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const data = await api.getPrograms();
        setPrograms(data);
        
        // Auto-select if only 1 program, unless param was provided
        if (data.length === 1 && !paramProgramId) {
          setSelectedProgram(data[0].id);
        } else if (paramProgramId) {
          setSelectedProgram(paramProgramId);
        }
      } catch (err) {
        console.error('Failed to fetch programs:', err);
      }
    };
    fetchPrograms();
  }, []);

  // Fetch workouts when selected program changes
  useEffect(() => {
    if (!selectedProgram) {
      setWorkouts([]);
      setSelectedWorkout('');
      return;
    }

    const fetchWorkouts = async () => {
      try {
        const data = await api.getWorkouts(selectedProgram);
        setWorkouts(data);
        
        // Auto-select if only 1 workout, unless param was provided
        if (data.length === 1 && !paramWorkoutId) {
          setSelectedWorkout(data[0].id);
        } else if (paramWorkoutId && data.some(w => w.id === paramWorkoutId)) {
          setSelectedWorkout(paramWorkoutId);
        } else {
          setSelectedWorkout('');
        }
      } catch (err) {
        console.error('Failed to fetch workouts:', err);
      }
    };
    fetchWorkouts();
  }, [selectedProgram]);

  // Filter exercises based on current selections
  let filteredExercises = exercises;
  if (selectedMuscleGroup) {
    filteredExercises = filteredExercises.filter(
      (e) => e.muscleGroup === selectedMuscleGroup
    );
  }
  if (selectedEquipment.size > 0) {
    filteredExercises = filteredExercises.filter((e) =>
      selectedEquipment.has(e.equipment)
    );
  }
  if (selectedMovementType.size > 0) {
    filteredExercises = filteredExercises.filter((e) => {
      // Map 'isometric' to 'isolation' for filter purposes
      const type = e.movementType === 'isometric' ? 'isolation' : e.movementType;
      return selectedMovementType.has(type);
    });
  }

  const toggleEquipment = (equip: Equipment) => {
    const newSet = new Set(selectedEquipment);
    if (newSet.has(equip)) {
      newSet.delete(equip);
    } else {
      newSet.add(equip);
    }
    setSelectedEquipment(newSet);
  };

  const toggleMovementType = (type: string) => {
    const newSet = new Set(selectedMovementType);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setSelectedMovementType(newSet);
  };

  const toggleExerciseSelection = (exerciseId: string) => {
    const newSet = new Set(selectedExercises);
    if (newSet.has(exerciseId)) {
      newSet.delete(exerciseId);
    } else {
      newSet.add(exerciseId);
    }
    setSelectedExercises(newSet);
  };

  const handleAddSelected = async () => {
    if (!activeWorkoutId) return;

    setIsAdding(true);
    try {
      const selectedExerciseIds = Array.from(selectedExercises);
      const selectedExerciseList = exercises.filter((e) =>
        selectedExerciseIds.includes(e.id)
      );

      for (const ex of selectedExerciseList) {
        await api.createExercise(activeWorkoutId, {
          name: ex.name,
          sets: 4,
          rest_seconds: 120,
        });
      }

      navigate(`/programs/${activeProgramId}/workouts/${activeWorkoutId}`);
    } catch (err) {
      console.error('Failed to add exercises:', err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="exercises-page">
      {isActiveWorkout && (
        <div className="active-workout-banner">
          <p>Active workout: <strong>{activeWorkoutName}</strong></p>
        </div>
      )}

      <h1>Exercises</h1>

      {/* Program and Workout Selection */}
      <div className="filter-section">
        <h3>Select Workout</h3>
        <div className="selector-row">
          <div className="selector-group">
            <label>Program:</label>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="selector"
            >
              <option value="">Choose a program...</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>

          {selectedProgram && (
            <div className="selector-group">
              <label>Workout:</label>
              <select
                value={selectedWorkout}
                onChange={(e) => setSelectedWorkout(e.target.value)}
                className="selector"
              >
                <option value="">Choose a workout...</option>
                {workouts.map((workout) => (
                  <option key={workout.id} value={workout.id}>
                    {workout.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      <div className="filter-section">
        <h3>Muscle Groups</h3>
        <div className="chips-row">
          <button
            className={`chip ${!selectedMuscleGroup ? 'active' : ''}`}
            onClick={() => setSelectedMuscleGroup(null)}
          >
            All
          </button>
          {getMuscleGroups().map((group) => (
            <button
              key={group}
              className={`chip ${selectedMuscleGroup === group ? 'active' : ''}`}
              onClick={() => setSelectedMuscleGroup(group)}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment Filter */}
      <div className="filter-section">
        <h3>Equipment</h3>
        <div className="chips-row">
          <button
            className={`chip ${selectedEquipment.size === 0 ? 'active' : ''}`}
            onClick={() => setSelectedEquipment(new Set())}
          >
            All
          </button>
          {getEquipment().map((equip) => (
            <button
              key={equip}
              className={`chip ${selectedEquipment.has(equip) ? 'active' : ''}`}
              onClick={() => toggleEquipment(equip)}
            >
              {equip}
            </button>
          ))}
        </div>
      </div>

      {/* Movement Type Filter */}
      <div className="filter-section">
        <h3>Movement Type</h3>
        <div className="chips-row">
          <button
            className={`chip ${selectedMovementType.size === 0 ? 'active' : ''}`}
            onClick={() => setSelectedMovementType(new Set())}
          >
            All
          </button>
          {['compound', 'isolation'].map((type) => (
            <button
              key={type}
              className={`chip ${selectedMovementType.has(type) ? 'active' : ''}`}
              onClick={() => toggleMovementType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Exercises List */}
      <div className="exercises-list-section">
        <div className="exercises-header">
          <h2>
            {filteredExercises.length} Exercise{filteredExercises.length !== 1 ? 's' : ''}
            {selectedExercises.size > 0 && ` (${selectedExercises.size} selected)`}
          </h2>
          {isActiveWorkout && selectedExercises.size > 0 && (
            <button
              onClick={handleAddSelected}
              disabled={isAdding}
              className="btn-add-selected"
            >
              {isAdding ? 'Adding...' : `Add Selected (${selectedExercises.size})`}
            </button>
          )}
        </div>

        {filteredExercises.length === 0 ? (
          <p className="no-data">No exercises match your filters.</p>
        ) : (
          <div className="checkbox-list">
            {filteredExercises.map((exercise) => (
              <label key={exercise.id} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={selectedExercises.has(exercise.id)}
                  onChange={() => toggleExerciseSelection(exercise.id)}
                  disabled={!isActiveWorkout}
                />
                <div className="exercise-muscle-map">
                  {(() => {
                    const View = MUSCLE_VIEW[exercise.muscleGroup];
                    return View ? (
                      <View
                        size={52}
                        active={MUSCLE_ACTIVE[exercise.muscleGroup]}
                        highlightColor={highlightColor}
                      />
                    ) : null;
                  })()}
                </div>
                <div className="exercise-content">
                  <span className="exercise-name">{exercise.name}</span>
                  <span className="exercise-meta">
                    {exercise.muscleGroup} · {exercise.equipment}
                  </span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExercisesPage;
