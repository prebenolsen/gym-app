/**
 * Static catalog of pre-built workout templates
 * Users can import these templates to instantly populate a workout with exercises
 */

export interface TemplateExercise {
  name: string;
  sets: number;
  rest_seconds: number;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  category: 'push' | 'pull' | 'legs' | 'fullbody';
  exercises: TemplateExercise[];
}

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'ppl_push',
    name: 'Push Day',
    description: 'Chest, shoulders, and triceps focused workout',
    category: 'push',
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
    id: 'ppl_pull',
    name: 'Pull Day',
    description: 'Back and biceps focused workout',
    category: 'pull',
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
    id: 'ppl_legs',
    name: 'Leg Day',
    description: 'Quads, hamstrings, calves, and glutes focused workout',
    category: 'legs',
    exercises: [
      { name: 'Barbell Back Squats', sets: 4, rest_seconds: 120 },
      { name: 'Romanian Deadlifts', sets: 4, rest_seconds: 120 },
      { name: 'Leg Press', sets: 3, rest_seconds: 90 },
      { name: 'Leg Curls', sets: 3, rest_seconds: 90 },
      { name: 'Leg Extensions', sets: 3, rest_seconds: 60 },
      { name: 'Calf Raises', sets: 3, rest_seconds: 60 },
    ],
  },
];
