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

In the Supabase SQL editor, run this base schema first:

```sql
create extension if not exists pgcrypto;

create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id text not null,
  "order" integer not null default 1,
  is_favorite_program boolean not null default false,
  created_at timestamptz not null default now(),
  constraint programs_user_order_unique unique (user_id, "order")
);

create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  name text not null,
  user_id text not null,
  "order" integer not null default 1,
  created_at timestamptz not null default now(),
  constraint workouts_program_order_unique unique (program_id, "order")
);

create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  name text not null,
  sets integer not null default 1,
  rest_seconds integer not null default 120,
  custom_muscle_groups text[] null,
  is_custom boolean not null default false,
  user_id text not null,
  "order" integer not null default 1,
  created_at timestamptz not null default now(),
  constraint exercises_workout_order_unique unique (workout_id, "order")
);

create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  user_id text not null,
  status text not null check (status in ('active', 'cancelled', 'finished')),
  current_exercise_index integer not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists workout_session_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workout_sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  set_number integer not null,
  weight numeric not null default 0,
  reps integer not null,
  is_deleted boolean not null default false,
  user_id text not null,
  saved_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint workout_session_sets_unique unique (session_id, exercise_id, set_number)
);

create table if not exists exercise_notes (
  exercise_id uuid not null references exercises(id) on delete cascade,
  user_id text not null,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (exercise_id, user_id)
);

create index if not exists idx_programs_user_id on programs(user_id);
create index if not exists idx_workouts_program_id on workouts(program_id);
create index if not exists idx_workouts_user_id on workouts(user_id);
create index if not exists idx_exercises_workout_id on exercises(workout_id);
create index if not exists idx_exercises_user_id on exercises(user_id);
create index if not exists idx_workout_sessions_user_id on workout_sessions(user_id);
create index if not exists idx_workout_sessions_workout_id on workout_sessions(workout_id);
create index if not exists idx_workout_session_sets_session_id on workout_session_sets(session_id);
create index if not exists idx_workout_session_sets_exercise_id on workout_session_sets(exercise_id);
create index if not exists idx_workout_session_sets_user_id on workout_session_sets(user_id);
```

If you are upgrading an older schema, also run:

- `backend/sql/add-custom-exercise-muscle-group.sql`
- `backend/sql/enable-rls.sql`

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

## Project Structure

```
gym/
├── mobile/                 # React Native app
│   ├── src/
│   │   ├── screens/       # HomeScreen, ProgramsScreen, etc.
│   │   ├── components/    # NumberSpinner, etc.
│   │   ├── App.tsx
│   │   └── root.tsx
│   ├── app.json
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

If the mobile app reports missing `workout_sessions`, `workout_session_sets`, or `exercise_notes`, rerun the base schema SQL in the Supabase SQL editor.

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

