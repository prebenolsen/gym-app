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
    description: 'A classic 3-day split focusing on muscle groups. Push (chest, shoulders, triceps), Pull (back, biceps), and Legs (quads, hamstrings, calves, glutes).',
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
];
