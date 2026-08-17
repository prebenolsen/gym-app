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

## Create `mobile/.env`

The app talks straight to Supabase, so these two are all it needs:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Start services

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

1. Start Expo with:

	```bash
	cd mobile
	npx expo start -c --localhost
	```

2. Run:

	```bash
	adb reverse --remove-all
	adb reverse tcp:8081 tcp:8081
	```

Only the Metro bundler port needs forwarding — the app reaches Supabase over the
phone's own network connection.

## Database notes

- Run the SQL files in `backend/sql/` against Supabase when new schema changes are introduced.
- Keep backend and mobile pointed at the same Supabase project while developing.

## Validation

```bash
npx tsc -p mobile/tsconfig.json --noEmit
```
