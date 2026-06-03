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
  | 'Legs'
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

  // Legs
  {
    id: 'legs_001',
    name: 'Barbell Back Squat',
    muscleGroup: 'Legs',
    equipment: 'Barbell',
    movementType: 'compound',
  },
  {
    id: 'legs_002',
    name: 'Leg Press',
    muscleGroup: 'Legs',
    equipment: 'Machine',
    movementType: 'compound',
  },
  {
    id: 'legs_003',
    name: 'Front Squat',
    muscleGroup: 'Legs',
    equipment: 'Barbell',
    movementType: 'compound',
  },
  {
    id: 'legs_004',
    name: 'Bulgarian Split Squat',
    muscleGroup: 'Legs',
    equipment: 'Dumbbell',
    movementType: 'compound',
  },
  {
    id: 'legs_005',
    name: 'Walking Lunge',
    muscleGroup: 'Legs',
    equipment: 'Dumbbell',
    movementType: 'compound',
  },
  {
    id: 'legs_006',
    name: 'Leg Extension',
    muscleGroup: 'Legs',
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

const EXERCISE_NAME_CANONICAL_ALIASES: Record<string, string> = {
  'bench press': 'barbell bench press',
  'incline dumbbell press': 'incline dumbbell bench press',
  'incline barbell press': 'incline barbell bench press',
  'cable flyes': 'cable chest fly',
  'push ups': 'push up',
  'push up': 'push up',
  'pull ups': 'pull up',
  'pull up': 'pull up',
  'lat pulldowns': 'lat pulldown',
  'barbell rows': 'barbell row',
  'seated cable rows': 'seated cable row',
  'dumbbell rows': 'dumbbell row',
  'barbell back squats': 'barbell back squat',
  squats: 'barbell back squat',
  squat: 'barbell back squat',
  'front squats': 'front squat',
  'bulgarian split squats': 'bulgarian split squat',
  'walking lunges': 'walking lunge',
  'romanian deadlifts': 'romanian deadlift',
  deadlifts: 'deadlift',
  deadlift: 'deadlift',
  'hip thrusts': 'hip thrust',
  'leg curls': 'lying leg curl',
  'leg extensions': 'leg extension',
  'calf raises': 'calf raise',
  'lateral raises': 'lateral raise',
  'barbell curls': 'barbell curl',
  'dumbbell curls': 'dumbbell curl',
  'tricep dips': 'bench dip',
  'tricep rope pushdowns': 'triceps pushdown',
  'rope pushdowns': 'triceps pushdown',
  'face pulls': 'reverse pec deck',
  'rear delt flies': 'rear delt fly',
  'rear delt flyes': 'rear delt fly',
  'decline sit ups': 'decline sit-up',
};

const normalizeExerciseName = (name: string): string => {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return EXERCISE_NAME_CANONICAL_ALIASES[normalized] ?? normalized;
};

const EXERCISE_NAME_TO_MUSCLE_GROUP = new Map<string, MuscleGroup>(
  exercises.map((exercise) => [
    normalizeExerciseName(exercise.name),
    exercise.muscleGroup,
  ]),
);

const EXERCISE_NAME_GROUP_ALIASES: Record<string, MuscleGroup> = {
  'speed bench press': 'Chest',
  'incline dumbbell press': 'Chest',
  'cable flyes': 'Chest',
  'pull ups': 'Back',
  'lat pulldowns': 'Back',
  'barbell rows': 'Back',
  'face pulls': 'Shoulders',
  'lateral raises': 'Shoulders',
  squats: 'Legs',
  'barbell back squats': 'Legs',
  'front squats': 'Legs',
  lunges: 'Legs',
  'speed squats': 'Legs',
  'leg extensions': 'Legs',
  'romanian deadlifts': 'Hamstrings / Glutes',
  deadlifts: 'Hamstrings / Glutes',
  'leg curls': 'Hamstrings / Glutes',
  'calf raises': 'Calves',
  'tricep dips': 'Triceps',
  'rope pushdowns': 'Triceps',
  'tricep rope pushdowns': 'Triceps',
};

export const resolveExerciseMuscleGroup = (
  name: string,
): MuscleGroup | undefined => {
  const normalizedName = normalizeExerciseName(name);
  const directMatch = (
    EXERCISE_NAME_TO_MUSCLE_GROUP.get(normalizedName) ??
    EXERCISE_NAME_GROUP_ALIASES[normalizedName]
  );
  if (directMatch) {
    return directMatch;
  }

  if (
    normalizedName.includes('bench') ||
    normalizedName.includes('chest') ||
    normalizedName.includes('fly')
  ) {
    return 'Chest';
  }
  if (
    normalizedName.includes('row') ||
    normalizedName.includes('pull up') ||
    normalizedName.includes('pulldown') ||
    normalizedName.includes('back extension')
  ) {
    return 'Back';
  }
  if (
    normalizedName.includes('overhead press') ||
    normalizedName.includes('lateral raise') ||
    normalizedName.includes('front raise') ||
    normalizedName.includes('rear delt') ||
    normalizedName.includes('face pull')
  ) {
    return 'Shoulders';
  }
  if (normalizedName.includes('leg curl') || normalizedName.includes('deadlift')) {
    return 'Hamstrings / Glutes';
  }
  if (
    normalizedName.includes('squat') ||
    normalizedName.includes('lunge') ||
    normalizedName.includes('leg press') ||
    normalizedName.includes('leg extension')
  ) {
    return 'Legs';
  }
  if (normalizedName.includes('calf raise')) {
    return 'Calves';
  }
  if (normalizedName.includes('curl')) {
    return 'Biceps';
  }
  if (
    normalizedName.includes('tricep') ||
    normalizedName.includes('triceps') ||
    normalizedName.includes('pushdown')
  ) {
    return 'Triceps';
  }
  if (
    normalizedName.includes('plank') ||
    normalizedName.includes('ab ') ||
    normalizedName.includes('sit up') ||
    normalizedName.includes('crunch') ||
    normalizedName.includes('twist') ||
    normalizedName.includes('leg raise')
  ) {
    return 'Core / Abs';
  }

  return undefined;
};

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
