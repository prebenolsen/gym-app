# Setup

## Requirements

- Node.js 20+
- npm 10+
- Supabase project
- Expo Go or emulator/simulator

## Install dependencies

```bash
npm install
```

## Create the Supabase tables

Run `backend/sql/launch-schema-optimization.sql` in the Supabase SQL editor against a
fresh database. It creates the full schema in one pass, so these tables exist:

- `weak_programs`
- `weak_workouts`
- `weak_exercises`
- `weak_workout_sessions`
- `weak_workout_session_sets`
- `weak_exercise_notes`
- `weak_weight_tracker_profile`
- `weak_weight_tracker_goals`
- `weak_weight_tracker_entries`
- `weak_weight_tracker_custom_metrics`
- `weak_weight_tracker_custom_metric_values`

## Create `.env`

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
PORT=3000
NODE_ENV=development
```

## Start services

Backend:

```bash
npm run backend:dev
```

Mobile app:

```bash
npm run mobile:dev
```

Platform shortcuts:

```bash
npm run mobile:android
npm run mobile:ios
```

## Android USB-C workflow

When testing on a physical Android phone over USB-C:

1. Keep `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000` in `.env`
2. Start Expo with:

	```bash
	cd mobile
	npx expo start -c --localhost
	```

3. Run:

	```bash
	adb reverse --remove-all
	adb reverse tcp:8081 tcp:8081
	adb reverse tcp:3000 tcp:3000
	```

This is required because the mobile API client treats localhost as the explicit USB-debug mode.

## Database notes

- Run the SQL files in `backend/sql/` against Supabase when new schema changes are introduced.
- Keep backend and mobile pointed at the same Supabase project while developing.

## Validation

```bash
npx tsc -p mobile/tsconfig.json --noEmit
```
