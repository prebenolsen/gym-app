/**
 * Exercise Catalog - Shared across web and mobile
 * This is a static list of exercises with filters: muscle group, equipment, movement type
 */

export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Legs (Quads focus)'
  | 'Hamstrings / Glutes'
  | 'Calves'
  | 'Core / Abs';

export type Equipment = 'Barbell' | 'Dumbbell' | 'Cable' | 'Machine' | 'Bodyweight';

export type MovementType = 'compound' | 'isolation' | 'isometric';

export interface CatalogExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  movementType: MovementType;
}

export const exercises: CatalogExercise[] = [
  // Chest
  {
    id: 'chest_001',
    name: 'Barbell Bench Press',
    muscleGroup: 'Chest',
    equipment: 'Barbell',
    movementType: 'compound',
  },
  {
    id: 'chest_002',
    name: 'Dumbbell Bench Press',
    muscleGroup: 'Chest',
    equipment: 'Dumbbell',
    movementType: 'compound',
  },
  {
    id: 'chest_003',
    name: 'Incline Barbell Bench Press',
    muscleGroup: 'Chest',
    equipment: 'Barbell',
    movementType: 'compound',
  },
  {
    id: 'chest_004',
    name: 'Incline Dumbbell Bench Press',
    muscleGroup: 'Chest',
    equipment: 'Dumbbell',
    movementType: 'compound',
  },
  {
    id: 'chest_005',
    name: 'Chest Dip',
    muscleGroup: 'Chest',
    equipment: 'Bodyweight',
    movementType: 'compound',
  },
  {
    id: 'chest_006',
    name: 'Machine Chest Press',
    muscleGroup: 'Chest',
    equipment: 'Machine',
    movementType: 'compound',
  },
  {
    id: 'chest_007',
    name: 'Cable Chest Fly',
    muscleGroup: 'Chest',
    equipment: 'Cable',
    movementType: 'isolation',
  },
  {
    id: 'chest_008',
    name: 'Pec Deck Fly',
    muscleGroup: 'Chest',
    equipment: 'Machine',
    movementType: 'isolation',
  },
  {
    id: 'chest_009',
    name: 'Push-Up',
    muscleGroup: 'Chest',
    equipment: 'Bodyweight',
    movementType: 'compound',
  },

  // Back
  {
    id: 'back_001',
    name: 'Pull-Up',
    muscleGroup: 'Back',
    equipment: 'Bodyweight',
    movementType: 'compound',
  },
  {
    id: 'back_002',
    name: 'Lat Pulldown',
    muscleGroup: 'Back',
    equipment: 'Machine',
    movementType: 'compound',
  },
  {
    id: 'back_003',
    name: 'Barbell Row',
    muscleGroup: 'Back',
    equipment: 'Barbell',
    movementType: 'compound',
  },
  {
    id: 'back_004',
    name: 'Seated Cable Row',
    muscleGroup: 'Back',
    equipment: 'Cable',
    movementType: 'compound',
  },
  {
    id: 'back_005',
    name: 'Dumbbell Row',
    muscleGroup: 'Back',
    equipment: 'Dumbbell',
    movementType: 'compound',
  },
  {
    id: 'back_006',
    name: 'T-Bar Row',
    muscleGroup: 'Back',
    equipment: 'Machine',
    movementType: 'compound',
  },
  {
    id: 'back_007',
    name: 'Straight Arm Pulldown',
    muscleGroup: 'Back',
    equipment: 'Cable',
    movementType: 'isolation',
  },
  {
    id: 'back_008',
    name: 'Back Extension',
    muscleGroup: 'Back',
    equipment: 'Bodyweight',
    movementType: 'isolation',
  },

  // Shoulders
  {
    id: 'shoulders_001',
    name: 'Overhead Press',
    muscleGroup: 'Shoulders',
    equipment: 'Barbell',
    movementType: 'compound',
  },
  {
    id: 'shoulders_002',
    name: 'Dumbbell Shoulder Press',
    muscleGroup: 'Shoulders',
    equipment: 'Dumbbell',
    movementType: 'compound',
  },
  {
    id: 'shoulders_003',
    name: 'Arnold Press',
    muscleGroup: 'Shoulders',
    equipment: 'Dumbbell',
    movementType: 'compound',
  },
  {
    id: 'shoulders_004',
    name: 'Lateral Raise',
    muscleGroup: 'Shoulders',
    equipment: 'Dumbbell',
    movementType: 'isolation',
  },
  {
    id: 'shoulders_005',
    name: 'Cable Lateral Raise',
    muscleGroup: 'Shoulders',
    equipment: 'Cable',
    movementType: 'isolation',
  },
  {
    id: 'shoulders_006',
    name: 'Rear Delt Fly',
    muscleGroup: 'Shoulders',
    equipment: 'Dumbbell',
    movementType: 'isolation',
  },
  {
    id: 'shoulders_007',
    name: 'Reverse Pec Deck',
    muscleGroup: 'Shoulders',
    equipment: 'Machine',
    movementType: 'isolation',
  },
  {
    id: 'shoulders_008',
    name: 'Front Raise',
    muscleGroup: 'Shoulders',
    equipment: 'Dumbbell',
    movementType: 'isolation',
  },

  // Biceps
  {
    id: 'biceps_001',
    name: 'Barbell Curl',
    muscleGroup: 'Biceps',
    equipment: 'Barbell',
    movementType: 'isolation',
  },
  {
    id: 'biceps_002',
    name: 'Dumbbell Curl',
    muscleGroup: 'Biceps',
    equipment: 'Dumbbell',
    movementType: 'isolation',
  },
  {
    id: 'biceps_003',
    name: 'Hammer Curl',
    muscleGroup: 'Biceps',
    equipment: 'Dumbbell',
    movementType: 'isolation',
  },
  {
    id: 'biceps_004',
    name: 'Preacher Curl',
    muscleGroup: 'Biceps',
    equipment: 'Machine',
    movementType: 'isolation',
  },
  {
    id: 'biceps_005',
    name: 'Cable Curl',
    muscleGroup: 'Biceps',
    equipment: 'Cable',
    movementType: 'isolation',
  },
  {
    id: 'biceps_006',
    name: 'Concentration Curl',
    muscleGroup: 'Biceps',
    equipment: 'Dumbbell',
    movementType: 'isolation',
  },

  // Triceps
  {
    id: 'triceps_001',
    name: 'Triceps Pushdown',
    muscleGroup: 'Triceps',
    equipment: 'Cable',
    movementType: 'isolation',
  },
  {
    id: 'triceps_002',
    name: 'Skullcrusher / Lying Triceps Extension',
    muscleGroup: 'Triceps',
    equipment: 'Barbell',
    movementType: 'isolation',
  },
  {
    id: 'triceps_003',
    name: 'Overhead Triceps Extension',
    muscleGroup: 'Triceps',
    equipment: 'Dumbbell',
    movementType: 'isolation',
  },
  {
    id: 'triceps_004',
    name: 'Close-Grip Bench Press',
    muscleGroup: 'Triceps',
    equipment: 'Barbell',
    movementType: 'compound',
  },
  {
    id: 'triceps_005',
    name: 'Bench Dip',
    muscleGroup: 'Triceps',
    equipment: 'Bodyweight',
    movementType: 'compound',
  },
  {
    id: 'triceps_006',
    name: 'Cable Overhead Extension',
    muscleGroup: 'Triceps',
    equipment: 'Cable',
    movementType: 'isolation',
  },

  // Legs (Quads focus)
  {
    id: 'legs_001',
    name: 'Barbell Back Squat',
    muscleGroup: 'Legs (Quads focus)',
    equipment: 'Barbell',
    movementType: 'compound',
  },
  {
    id: 'legs_002',
    name: 'Leg Press',
    muscleGroup: 'Legs (Quads focus)',
    equipment: 'Machine',
    movementType: 'compound',
  },
  {
    id: 'legs_003',
    name: 'Front Squat',
    muscleGroup: 'Legs (Quads focus)',
    equipment: 'Barbell',
    movementType: 'compound',
  },
  {
    id: 'legs_004',
    name: 'Bulgarian Split Squat',
    muscleGroup: 'Legs (Quads focus)',
    equipment: 'Dumbbell',
    movementType: 'compound',
  },
  {
    id: 'legs_005',
    name: 'Walking Lunge',
    muscleGroup: 'Legs (Quads focus)',
    equipment: 'Dumbbell',
    movementType: 'compound',
  },
  {
    id: 'legs_006',
    name: 'Leg Extension',
    muscleGroup: 'Legs (Quads focus)',
    equipment: 'Machine',
    movementType: 'isolation',
  },

  // Hamstrings / Glutes
  {
    id: 'ham_glute_001',
    name: 'Romanian Deadlift',
    muscleGroup: 'Hamstrings / Glutes',
    equipment: 'Barbell',
    movementType: 'compound',
  },
  {
    id: 'ham_glute_002',
    name: 'Deadlift',
    muscleGroup: 'Hamstrings / Glutes',
    equipment: 'Barbell',
    movementType: 'compound',
  },
  {
    id: 'ham_glute_003',
    name: 'Hip Thrust',
    muscleGroup: 'Hamstrings / Glutes',
    equipment: 'Barbell',
    movementType: 'compound',
  },
  {
    id: 'ham_glute_004',
    name: 'Lying Leg Curl',
    muscleGroup: 'Hamstrings / Glutes',
    equipment: 'Machine',
    movementType: 'isolation',
  },
  {
    id: 'ham_glute_005',
    name: 'Seated Leg Curl',
    muscleGroup: 'Hamstrings / Glutes',
    equipment: 'Machine',
    movementType: 'isolation',
  },
  {
    id: 'ham_glute_006',
    name: 'Glute Bridge',
    muscleGroup: 'Hamstrings / Glutes',
    equipment: 'Bodyweight',
    movementType: 'compound',
  },

  // Calves
  {
    id: 'calves_001',
    name: 'Standing Calf Raise',
    muscleGroup: 'Calves',
    equipment: 'Machine',
    movementType: 'isolation',
  },
  {
    id: 'calves_002',
    name: 'Seated Calf Raise',
    muscleGroup: 'Calves',
    equipment: 'Machine',
    movementType: 'isolation',
  },
  {
    id: 'calves_003',
    name: 'Calf Raise',
    muscleGroup: 'Calves',
    equipment: 'Bodyweight',
    movementType: 'isolation',
  },
  {
    id: 'calves_004',
    name: 'Leg Press Calf Raise',
    muscleGroup: 'Calves',
    equipment: 'Machine',
    movementType: 'isolation',
  },

  // Core / Abs
  {
    id: 'core_001',
    name: 'Hanging Leg Raise',
    muscleGroup: 'Core / Abs',
    equipment: 'Bodyweight',
    movementType: 'isolation',
  },
  {
    id: 'core_002',
    name: 'Cable Crunch',
    muscleGroup: 'Core / Abs',
    equipment: 'Cable',
    movementType: 'isolation',
  },
  {
    id: 'core_003',
    name: 'Ab Wheel Rollout',
    muscleGroup: 'Core / Abs',
    equipment: 'Bodyweight',
    movementType: 'compound',
  },
  {
    id: 'core_004',
    name: 'Plank',
    muscleGroup: 'Core / Abs',
    equipment: 'Bodyweight',
    movementType: 'isometric',
  },
  {
    id: 'core_005',
    name: 'Decline Sit-Up',
    muscleGroup: 'Core / Abs',
    equipment: 'Bodyweight',
    movementType: 'isolation',
  },
  {
    id: 'core_006',
    name: 'Russian Twist',
    muscleGroup: 'Core / Abs',
    equipment: 'Bodyweight',
    movementType: 'isolation',
  },
];

// Helper to get unique muscle groups sorted
export const getMuscleGroups = (): MuscleGroup[] => {
  const groups = new Set(exercises.map((e) => e.muscleGroup));
  return Array.from(groups).sort() as MuscleGroup[];
};

// Helper to get unique equipment
export const getEquipment = (): Equipment[] => {
  const equip = new Set(exercises.map((e) => e.equipment));
  return Array.from(equip).sort() as Equipment[];
};

// Helper to get unique movement types (for filtering UI)
export const getMovementTypes = (): MovementType[] => {
  return ['compound', 'isolation'];
};

// Filter exercises by criteria
export const filterExercises = (
  muscleGroup?: MuscleGroup | null,
  equipment?: Equipment | null,
  movementType?: MovementType | null,
): CatalogExercise[] => {
  return exercises.filter((ex) => {
    if (muscleGroup && ex.muscleGroup !== muscleGroup) return false;
    if (equipment && ex.equipment !== equipment) return false;
    if (movementType && ex.movementType !== movementType) return false;
    return true;
  });
};
