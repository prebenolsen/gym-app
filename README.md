# GymApp - Mobile Workout Tracker

GymApp is a mobile-first workout tracker built with Expo React Native, an Express backend, and Supabase.

## Features

- Programs → workouts → exercises hierarchy
- Active workout sessions with saved sets and history
- Custom exercises with optional muscle-group mapping
- Exercise notes and progress tracking
- Mobile app plus backend/shared workspace only

## Tech Stack

- Frontend: React Native + Expo
- Backend: Node.js + Express
- Database: Supabase PostgreSQL
- Shared package: types, exercise catalogs, and API client

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com)
2. Create a project
3. Copy the project URL, anon key, and service role key from Settings → API

### 3. Create the database tables used by the mobile app

`backend/sql/launch-schema-optimization.sql` is the single source of truth for the
schema. Paste it into the Supabase SQL editor and run it against a fresh database.
It creates every table, index, trigger and RLS policy in one pass — no migrations
to replay afterwards.

All objects are prefixed `weak_` so the app can share a database with other
schemas:

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

To start over, run `backend/sql/delete-all-tables.sql` and then the schema file
again. `backend/sql/test-seed-mobile-user.sql` fills one user with test data.

### 4. Configure `.env`

Create a root `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

`EXPO_PUBLIC_API_BASE_URL=http://localhost:3000` is the correct setting for Android USB debugging with `adb reverse`.

### 5. Start the backend

```bash
npm run backend:dev
```

### 6. Start the mobile app

```bash
npm run mobile:dev
```

For a connected Android phone over USB-C, use localhost mode instead:

```bash
cd mobile
npx expo start -c --localhost
```

### 7. Run it as an installable PWA

The same React Native codebase ships to the browser through `react-native-web`, and
is configured to install to a phone home screen as a standalone app.

Development:

```bash
npm run web:dev
```

Production build and local preview:

```bash
npm run web:build
```

```bash
npm run web:serve
```

`web:build` writes a static site to `mobile/dist/`, which any static host will serve
(Vercel, Netlify, Cloudflare Pages, `nginx`). Two hosting requirements:

- **Serve it over HTTPS.** Service workers and the install prompt are refused on
  plain HTTP, `localhost` excepted.
- **Rewrite unknown paths to `/index.html`, but serve real files first.** The build
  is a single-page app (`expo.web.output: "single"`), so deep links 404 without a
  SPA fallback — while `/offline.html`, `/sw.js` and `/manifest.json` must still be
  served as themselves. `mobile/serve.json` encodes both rules for the local
  `web:serve` preview; mirror them in your host's config.

Set `EXPO_PUBLIC_API_BASE_URL` to the deployed backend URL before building — the
bundle reads it at build time, and a browser cannot reach `localhost:3000` from a
phone. The backend also needs the web origin allowed in its CORS config.

#### What makes it a PWA

Everything the browser reads lives in `mobile/public/`, which Expo copies to the
root of the build output:

| File | Role |
|---|---|
| `manifest.json` | Install metadata: name, `standalone` display, portrait lock, theme colours, icon set |
| `index.html` | Expo's HTML template plus the manifest link, iOS meta tags, and launch splash |
| `sw.js` | Service worker: offline app shell, cached static bundles |
| `offline.html` | Fallback page when the shell is not cached and the network is gone |
| `icons/` | Icons generated from `shared/assets/logo-weak-cursiv-k-barbell-under.svg` |

`mobile/serve.json` sits outside `public/` — it configures the local preview server
only and is never part of the build output.

Icons are the brand wordmark drawn exactly as the app draws it — `#3D3D3D` on the
default light background `#F3F0ED` (`mobile/src/theme.ts`, light + auburn):

- `icon-192.png`, `icon-512.png` — standard manifest icons
- `icon-maskable-192.png`, `icon-maskable-512.png` — Android adaptive shapes, artwork
  kept inside the 80% safe circle
- `apple-touch-icon.png` (180px) — iOS home screen, which ignores the manifest
- `favicon-16.png`, `favicon-32.png`, `logo.svg` — browser tab

The manifest colours are static, so they follow the app's *default* theme (light +
auburn). If a user switches to dark mode in Settings, the installed splash and the
Android status bar stay light until the app updates `<meta name="theme-color">` at
runtime from `PreferencesContext`.

The service worker caches only the app shell and Expo's content-hashed bundles.
API traffic is cross-origin and passes straight through, so the app never shows
stale workout data — but it also means it is **not** offline-capable for reading or
writing training data. That needs a local write queue, which does not exist yet.

## Project Structure

```
gym/
├── mobile/                 # React Native app (also builds the PWA)
│   ├── src/
│   │   ├── screens/       # HomeScreen, ProgramsScreen, etc.
│   │   ├── components/    # NumberSpinner, etc.
│   │   ├── App.tsx
│   │   └── root.tsx
│   ├── public/            # PWA: manifest, service worker, icons, HTML shell
│   ├── app.json
│   ├── serve.json         # Local preview server rules
│   └── package.json
│
├── backend/                # Node.js Express API
│   ├── src/
│   │   └── index.ts       # All API routes
│   ├── tsconfig.json
│   └── package.json
│
├── shared/                 # Shared types & API client
│   ├── src/
│   │   ├── types.ts       # Data models
│   │   ├── api.ts         # ApiClient class
│   │   └── index.ts
│   ├── tsconfig.json
│   └── package.json
│
├── package.json            # Root monorepo config
├── .env                    # Environment variables
└── README.md
```

## Available Scripts

```bash
# Backend
npm run backend:dev        # Start dev server (auto-reload)

# Mobile
npm run mobile:dev         # Start Expo
npm run mobile:android     # Launch Android flow
npm run mobile:ios         # Launch iOS flow

# Web / PWA
npm run web:dev            # Expo dev server in the browser
npm run web:build          # Static PWA build into mobile/dist
npm run web:serve          # Preview the build at http://localhost:8080

# Validation
npx tsc -p mobile/tsconfig.json --noEmit
```

## API Endpoints

### Programs
- `GET /programs` — List all programs
- `POST /programs` — Create new program (default name: "Program 01")
- `PUT /programs/:id` — Update program name
- `DELETE /programs/:id` — Delete program and all workouts

### Workouts
- `GET /programs/:programId/workouts` — List workouts in program
- `POST /programs/:programId/workouts` — Create new workout (default name: "Workout 01")
- `PUT /workouts/:id` — Update workout name
- `DELETE /workouts/:id` — Delete workout and all exercises
- `PATCH /programs/:programId/workouts/reorder` — Reorder workouts

### Exercises
- `GET /workouts/:workoutId/exercises` — List exercises in workout
- `POST /workouts/:workoutId/exercises` — Create new exercise
- `PUT /exercises/:id` — Update exercise (sets, rest, name)
- `DELETE /exercises/:id` — Delete exercise
- `PATCH /workouts/:workoutId/exercises/reorder` — Reorder exercises

### Stats
- `GET /stats` — Get total counts (programs, workouts, exercises)

## Data Model

### Program
```typescript
{
  id: string (UUID)
  name: string
  user_id: string ("user_mock_mvp" for MVP)
  order: number
  created_at: string (ISO timestamp)
}
```

### Workout
```typescript
{
  id: string (UUID)
  program_id: string (UUID)
  name: string
  user_id: string
  order: number
  created_at: string
}
```

### Exercise
```typescript
{
  id: string (UUID)
  workout_id: string (UUID)
  name: string
  sets: number (default: 1)
  rest_seconds: number (default: 120, increments by 5)
  user_id: string
  order: number
  created_at: string
}
```

## User Flow

1. **Homepage**: View stats (total programs/workouts/exercises)
2. **Programs Page**: Create programs, each defaults to "Program 01"
3. **Program Detail**: Create workouts, each defaults to "Workout 01"
4. **Workout Detail**: Add exercises with:
   - Custom names
   - Number of sets (adjustable with ▲/▼)
   - Rest timer in seconds (adjustable with 5-second intervals)
   - Reorder exercises with ▲/▼ buttons

## Known Limitations (MVP)

- **No authentication**: Uses mock user ID ("user_mock_mvp")
- **No offline support**: Requires backend connectivity
- **No real-time sync**: Uses polling (refresh to update)
- **No workout history**: Doesn't track completed workouts yet
- **Mobile**: Currently being auto-generated; UI may need refinement

## Next Steps (Post-MVP)

1. **Real authentication**: Add user login with Firebase/Auth0
2. **Workout history**: Track completed workouts and log performance
3. **Real-time updates**: Add WebSocket support for multi-device sync
4. **Offline support**: Implement local caching with sync on reconnect
5. **Performance metrics**: Add weight/reps tracking and charts
6. **Social features**: Share workouts with friends
7. **Mobile refinement**: Polish iOS/Android native feel

## Troubleshooting

### Supabase connection problems

- Verify `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_KEY` in `.env`
- Make sure the base schema above has been created
- If you upgraded from an older schema, run `backend/sql/add-custom-exercise-muscle-group.sql`

### Missing session or notes tables

If the mobile app reports missing `weak_workout_sessions`, `weak_workout_session_sets`, or `weak_exercise_notes`, rerun `backend/sql/launch-schema-optimization.sql` in the Supabase SQL editor.

### Android phone over USB-C

Use this flow when the phone is physically connected to the computer and you want the mobile app to talk to your local backend through the cable:

1. Start the backend:

  ```bash
  npm run backend:dev
  ```

2. Start Expo in localhost mode:

  ```bash
  cd mobile
  npx expo start -c --localhost
  ```

3. In another terminal, run `adb reverse` from your Android platform-tools directory:

  ```bash
  adb reverse --remove-all
  adb reverse tcp:8081 tcp:8081
  adb reverse tcp:3000 tcp:3000
  ```

4. Keep `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000` in the root `.env`

This matches the mobile API client behavior in `mobile/src/hooks/useApi.ts`.

### Expo Go LAN fallback

If you are not using USB-C, you can let Expo use LAN instead:

```bash
cd mobile
npx expo start --lan -c
```

### Clear stuck Expo sessions

```bash
Stop-Process -Name node -Force
cd mobile
npx expo start -c --localhost
```

