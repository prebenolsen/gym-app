/**
 * Static catalog of pre-built program templates
 * Users can import these programs to instantly create a complete training program with all workouts and exercises
 */

export interface ProgramTemplateExercise {
  name: string;
  sets: number;
  rest_seconds: number;
}

export interface ProgramTemplateWorkout {
  name: string;
  exercises: ProgramTemplateExercise[];
}

export interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  workoutCount: number;
  workouts: ProgramTemplateWorkout[];
}

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    id: 'ppl_program',
    name: 'Push, Pull, Legs',
    description: '3-day split: Push, Pull, Legs.',
    workoutCount: 3,
    workouts: [
      {
        name: 'Push',
        exercises: [
          { name: 'Barbell Bench Press', sets: 4, rest_seconds: 120 },
          { name: 'Incline Dumbbell Press', sets: 3, rest_seconds: 90 },
          { name: 'Cable Flyes', sets: 3, rest_seconds: 60 },
          { name: 'Overhead Press', sets: 4, rest_seconds: 120 },
          { name: 'Lateral Raises', sets: 3, rest_seconds: 60 },
          { name: 'Tricep Dips', sets: 3, rest_seconds: 90 },
          { name: 'Rope Pushdowns', sets: 3, rest_seconds: 60 },
        ],
      },
      {
        name: 'Pull',
        exercises: [
          { name: 'Barbell Rows', sets: 4, rest_seconds: 120 },
          { name: 'Pull-Ups', sets: 4, rest_seconds: 120 },
          { name: 'Lat Pulldowns', sets: 3, rest_seconds: 90 },
          { name: 'Barbell Curls', sets: 3, rest_seconds: 90 },
          { name: 'Face Pulls', sets: 3, rest_seconds: 60 },
          { name: 'Dumbbell Curls', sets: 3, rest_seconds: 60 },
        ],
      },
      {
        name: 'Legs',
        exercises: [
          { name: 'Barbell Back Squats', sets: 4, rest_seconds: 120 },
          { name: 'Romanian Deadlifts', sets: 4, rest_seconds: 120 },
          { name: 'Leg Press', sets: 3, rest_seconds: 90 },
          { name: 'Leg Curls', sets: 3, rest_seconds: 90 },
          { name: 'Leg Extensions', sets: 3, rest_seconds: 60 },
          { name: 'Calf Raises', sets: 3, rest_seconds: 60 },
        ],
      },
    ],
  },
  {
    id: 'upper_lower',
    name: 'Upper/Lower Split',
    description: 'Alternate upper and lower body days.',
    workoutCount: 4,
    workouts: [
      {
        name: 'Upper',
        exercises: [
          { name: 'Barbell Bench Press', sets: 4, rest_seconds: 120 },
          { name: 'Pull-Ups', sets: 4, rest_seconds: 120 },
          { name: 'Overhead Press', sets: 3, rest_seconds: 90 },
          { name: 'Barbell Curls', sets: 3, rest_seconds: 60 },
          { name: 'Face Pulls', sets: 3, rest_seconds: 60 },
        ],
      },
      {
        name: 'Lower',
        exercises: [
          { name: 'Squats', sets: 4, rest_seconds: 120 },
          { name: 'Romanian Deadlifts', sets: 4, rest_seconds: 120 },
          { name: 'Leg Press', sets: 3, rest_seconds: 90 },
          { name: 'Calf Raises', sets: 3, rest_seconds: 60 },
        ],
      },
      {
        name: 'Upper',
        exercises: [
          { name: 'Incline Dumbbell Press', sets: 4, rest_seconds: 120 },
          { name: 'Barbell Rows', sets: 4, rest_seconds: 120 },
          { name: 'Lateral Raises', sets: 3, rest_seconds: 60 },
          { name: 'Dumbbell Curls', sets: 3, rest_seconds: 60 },
          { name: 'Tricep Rope Pushdowns', sets: 3, rest_seconds: 60 },
        ],
      },
      {
        name: 'Lower',
        exercises: [
          { name: 'Deadlifts', sets: 3, rest_seconds: 180 },
          { name: 'Lunges', sets: 3, rest_seconds: 90 },
          { name: 'Leg Curls', sets: 3, rest_seconds: 60 },
          { name: 'Leg Extensions', sets: 3, rest_seconds: 60 },
          { name: 'Calf Raises', sets: 3, rest_seconds: 60 },
        ],
      },
    ],
  },
  {
    id: 'full_body',
    name: 'Full-Body',
    description: 'All muscles each session.',
    workoutCount: 3,
    workouts: [
      {
        name: 'Full Body',
        exercises: [
          { name: 'Squats', sets: 4, rest_seconds: 120 },
          { name: 'Bench Press', sets: 4, rest_seconds: 120 },
          { name: 'Barbell Rows', sets: 4, rest_seconds: 120 },
          { name: 'Overhead Press', sets: 3, rest_seconds: 90 },
          { name: 'Pull-Ups', sets: 3, rest_seconds: 90 },
          { name: 'Calf Raises', sets: 3, rest_seconds: 60 },
        ],
      },
      {
        name: 'Full Body',
        exercises: [
          { name: 'Deadlifts', sets: 3, rest_seconds: 180 },
          { name: 'Incline Dumbbell Press', sets: 4, rest_seconds: 120 },
          { name: 'Lat Pulldowns', sets: 4, rest_seconds: 120 },
          { name: 'Lateral Raises', sets: 3, rest_seconds: 60 },
          { name: 'Dumbbell Curls', sets: 3, rest_seconds: 60 },
          { name: 'Tricep Rope Pushdowns', sets: 3, rest_seconds: 60 },
        ],
      },
      {
        name: 'Full Body',
        exercises: [
          { name: 'Front Squats', sets: 4, rest_seconds: 120 },
          { name: 'Barbell Bench Press', sets: 4, rest_seconds: 120 },
          { name: 'Barbell Rows', sets: 4, rest_seconds: 120 },
          { name: 'Overhead Press', sets: 3, rest_seconds: 90 },
          { name: 'Pull-Ups', sets: 3, rest_seconds: 90 },
          { name: 'Calf Raises', sets: 3, rest_seconds: 60 },
        ],
      },
    ],
  },
  {
    id: 'bro_split',
    name: 'Bro Split',
    description: 'One muscle group per day.',
    workoutCount: 5,
    workouts: [
      {
        name: 'Chest',
        exercises: [
          { name: 'Barbell Bench Press', sets: 4, rest_seconds: 120 },
          { name: 'Incline Dumbbell Press', sets: 3, rest_seconds: 90 },
          { name: 'Cable Flyes', sets: 3, rest_seconds: 60 },
        ],
      },
      {
        name: 'Back',
        exercises: [
          { name: 'Deadlifts', sets: 3, rest_seconds: 180 },
          { name: 'Barbell Rows', sets: 4, rest_seconds: 120 },
          { name: 'Pull-Ups', sets: 3, rest_seconds: 120 },
        ],
      },
      {
        name: 'Legs',
        exercises: [
          { name: 'Squats', sets: 4, rest_seconds: 120 },
          { name: 'Leg Press', sets: 3, rest_seconds: 90 },
          { name: 'Leg Curls', sets: 3, rest_seconds: 60 },
          { name: 'Calf Raises', sets: 3, rest_seconds: 60 },
        ],
      },
      {
        name: 'Shoulders',
        exercises: [
          { name: 'Overhead Press', sets: 4, rest_seconds: 120 },
          { name: 'Lateral Raises', sets: 3, rest_seconds: 60 },
          { name: 'Face Pulls', sets: 3, rest_seconds: 60 },
        ],
      },
      {
        name: 'Arms',
        exercises: [
          { name: 'Barbell Curls', sets: 3, rest_seconds: 60 },
          { name: 'Dumbbell Curls', sets: 3, rest_seconds: 60 },
          { name: 'Tricep Dips', sets: 3, rest_seconds: 90 },
          { name: 'Rope Pushdowns', sets: 3, rest_seconds: 60 },
        ],
      },
    ],
  },
  {
    id: '5x5',
    name: '5x5 Strength',
    description: 'Heavy compounds, low reps.',
    workoutCount: 3,
    workouts: [
      {
        name: 'Workout A',
        exercises: [
          { name: 'Squats', sets: 5, rest_seconds: 180 },
          { name: 'Bench Press', sets: 5, rest_seconds: 180 },
          { name: 'Barbell Rows', sets: 5, rest_seconds: 180 },
        ],
      },
      {
        name: 'Workout B',
        exercises: [
          { name: 'Squats', sets: 5, rest_seconds: 180 },
          { name: 'Overhead Press', sets: 5, rest_seconds: 180 },
          { name: 'Deadlifts', sets: 1, rest_seconds: 300 },
        ],
      },
    ],
  },
  {
    id: 'phul',
    name: 'PHUL',
    description: 'Power + hypertrophy, upper/lower split.',
    workoutCount: 4,
    workouts: [
      {
        name: 'Upper Power',
        exercises: [
          { name: 'Bench Press', sets: 3, rest_seconds: 180 },
          { name: 'Barbell Rows', sets: 3, rest_seconds: 180 },
          { name: 'Overhead Press', sets: 3, rest_seconds: 180 },
          { name: 'Pull-Ups', sets: 3, rest_seconds: 120 },
        ],
      },
      {
        name: 'Lower Power',
        exercises: [
          { name: 'Squats', sets: 3, rest_seconds: 180 },
          { name: 'Deadlifts', sets: 2, rest_seconds: 300 },
          { name: 'Leg Press', sets: 3, rest_seconds: 120 },
          { name: 'Calf Raises', sets: 3, rest_seconds: 60 },
        ],
      },
      {
        name: 'Upper Hypertrophy',
        exercises: [
          { name: 'Incline Dumbbell Press', sets: 3, rest_seconds: 90 },
          { name: 'Lat Pulldowns', sets: 3, rest_seconds: 90 },
          { name: 'Lateral Raises', sets: 3, rest_seconds: 60 },
          { name: 'Dumbbell Curls', sets: 3, rest_seconds: 60 },
          { name: 'Rope Pushdowns', sets: 3, rest_seconds: 60 },
        ],
      },
      {
        name: 'Lower Hypertrophy',
        exercises: [
          { name: 'Front Squats', sets: 3, rest_seconds: 90 },
          { name: 'Romanian Deadlifts', sets: 3, rest_seconds: 90 },
          { name: 'Leg Curls', sets: 3, rest_seconds: 60 },
          { name: 'Leg Extensions', sets: 3, rest_seconds: 60 },
          { name: 'Calf Raises', sets: 3, rest_seconds: 60 },
        ],
      },
    ],
  },
  {
    id: 'phat',
    name: 'PHAT',
    description: 'Hybrid powerlifting & bodybuilding.',
    workoutCount: 5,
    workouts: [
      {
        name: 'Upper Power',
        exercises: [
          { name: 'Bench Press', sets: 3, rest_seconds: 180 },
          { name: 'Barbell Rows', sets: 3, rest_seconds: 180 },
          { name: 'Overhead Press', sets: 3, rest_seconds: 180 },
          { name: 'Pull-Ups', sets: 3, rest_seconds: 120 },
        ],
      },
      {
        name: 'Lower Power',
        exercises: [
          { name: 'Squats', sets: 3, rest_seconds: 180 },
          { name: 'Deadlifts', sets: 2, rest_seconds: 300 },
          { name: 'Leg Press', sets: 3, rest_seconds: 120 },
          { name: 'Calf Raises', sets: 3, rest_seconds: 60 },
        ],
      },
      {
        name: 'Back & Shoulders',
        exercises: [
          { name: 'Pull-Ups', sets: 4, rest_seconds: 120 },
          { name: 'Barbell Rows', sets: 4, rest_seconds: 120 },
          { name: 'Lateral Raises', sets: 3, rest_seconds: 60 },
          { name: 'Face Pulls', sets: 3, rest_seconds: 60 },
        ],
      },
      {
        name: 'Lower Hypertrophy',
        exercises: [
          { name: 'Squats', sets: 4, rest_seconds: 90 },
          { name: 'Romanian Deadlifts', sets: 4, rest_seconds: 90 },
          { name: 'Leg Curls', sets: 3, rest_seconds: 60 },
          { name: 'Leg Extensions', sets: 3, rest_seconds: 60 },
          { name: 'Calf Raises', sets: 3, rest_seconds: 60 },
        ],
      },
      {
        name: 'Chest & Arms',
        exercises: [
          { name: 'Incline Dumbbell Press', sets: 4, rest_seconds: 90 },
          { name: 'Barbell Curls', sets: 3, rest_seconds: 60 },
          { name: 'Dumbbell Curls', sets: 3, rest_seconds: 60 },
          { name: 'Tricep Dips', sets: 3, rest_seconds: 90 },
          { name: 'Rope Pushdowns', sets: 3, rest_seconds: 60 },
        ],
      },
    ],
  },
  {
    id: 'gvt',
    name: 'German Volume Training',
    description: '10x10 high-volume method.',
    workoutCount: 3,
    workouts: [
      {
        name: 'Workout A',
        exercises: [
          { name: 'Squats', sets: 10, rest_seconds: 90 },
          { name: 'Bench Press', sets: 10, rest_seconds: 90 },
          { name: 'Barbell Rows', sets: 10, rest_seconds: 90 },
        ],
      },
      {
        name: 'Workout B',
        exercises: [
          { name: 'Romanian Deadlifts', sets: 10, rest_seconds: 90 },
          { name: 'Overhead Press', sets: 10, rest_seconds: 90 },
          { name: 'Pull-Ups', sets: 10, rest_seconds: 90 },
        ],
      },
      {
        name: 'Workout C',
        exercises: [
          { name: 'Leg Press', sets: 10, rest_seconds: 90 },
          { name: 'Incline Dumbbell Press', sets: 10, rest_seconds: 90 },
          { name: 'Barbell Curls', sets: 10, rest_seconds: 90 },
        ],
      },
    ],
  },
  {
    id: 'westside',
    name: 'Westside/Conjugate',
    description: 'Advanced powerlifting method.',
    workoutCount: 4,
    workouts: [
      {
        name: 'Max Effort Upper',
        exercises: [
          { name: 'Bench Press', sets: 5, rest_seconds: 180 },
          { name: 'Barbell Rows', sets: 5, rest_seconds: 180 },
          { name: 'Overhead Press', sets: 4, rest_seconds: 120 },
        ],
      },
      {
        name: 'Max Effort Lower',
        exercises: [
          { name: 'Squats', sets: 5, rest_seconds: 180 },
          { name: 'Deadlifts', sets: 3, rest_seconds: 300 },
          { name: 'Leg Press', sets: 4, rest_seconds: 120 },
        ],
      },
      {
        name: 'Dynamic Upper',
        exercises: [
          { name: 'Speed Bench Press', sets: 6, rest_seconds: 90 },
          { name: 'Pull-Ups', sets: 5, rest_seconds: 120 },
          { name: 'Lateral Raises', sets: 4, rest_seconds: 60 },
        ],
      },
      {
        name: 'Dynamic Lower',
        exercises: [
          { name: 'Speed Squats', sets: 6, rest_seconds: 90 },
          { name: 'Romanian Deadlifts', sets: 5, rest_seconds: 120 },
          { name: 'Calf Raises', sets: 4, rest_seconds: 60 },
        ],
      },
    ],
  },
];
