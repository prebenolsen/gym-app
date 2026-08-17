# Quickstart

## 1. Install dependencies

```bash
npm install
```

## 2. Create the database tables

Create a Supabase project first, then open the SQL editor and run
`backend/sql/launch-schema-optimization.sql` against the fresh database. That one
file creates every table the app needs:

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

## 3. Configure environment

Add a `mobile/.env` file — the app talks straight to Supabase, so that is all it needs:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 4. Start Expo

```bash
npm run mobile:dev
```

## 5. Open the app

- Android: `npm run mobile:android`
- iOS: `npm run mobile:ios`
- Physical device: scan the Expo QR code

## 6. Android USB-C testing

For a phone connected by USB-C, use localhost mode and `adb reverse`:

```bash
cd mobile
npx expo start -c --localhost
adb reverse --remove-all
adb reverse tcp:8081 tcp:8081
```

## 8. Verify TypeScript

```bash
npx tsc -p mobile/tsconfig.json --noEmit
```
