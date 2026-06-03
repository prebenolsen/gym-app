# Quickstart

## 1. Install dependencies

```bash
npm install
```

## 2. Create the database tables

Create a Supabase project first, then open the SQL editor and create the tables used by the mobile app.

At minimum you need:

- `programs`
- `workouts`
- `exercises`
- `workout_sessions`
- `workout_session_sets`
- `exercise_notes`

Use the full SQL block in `README.md` for the base schema.

If you are upgrading an older database, also run:

- `backend/sql/add-custom-exercise-muscle-group.sql`
- `backend/sql/enable-rls.sql`

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
