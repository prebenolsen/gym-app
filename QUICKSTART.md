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

Add a root `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
PORT=3000
NODE_ENV=development
```

## 4. Start the backend

```bash
npm run backend:dev
```

## 5. Start Expo

```bash
npm run mobile:dev
```

## 6. Open the app

- Android: `npm run mobile:android`
- iOS: `npm run mobile:ios`
- Physical device: scan the Expo QR code

## 7. Android USB-C testing

For a phone connected by USB-C, use localhost mode and `adb reverse`:

```bash
cd mobile
npx expo start -c --localhost
adb reverse --remove-all
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000
```

Keep `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000` in `.env` for this mode.

## 8. Verify TypeScript

```bash
npx tsc -p mobile/tsconfig.json --noEmit
```
