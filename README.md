# Gym App - Workout Tracker

A full-stack three-tier gym workout management app with web and mobile frontends.

## Features

- **Three-tier hierarchy**: Programs → Workouts → Exercises
- **Exercise management**: Add, edit, delete exercises with customizable sets and rest times
- **Reordering**: Drag exercises up/down to customize workout order
- **Stats dashboard**: View total programs, workouts, and exercises
- **Cross-platform**: Web (React) + Mobile (React Native)
- **Cloud storage**: Supabase PostgreSQL backend

## Tech Stack

- **Frontend**: React (web) + React Native (mobile)
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Structure**: Monorepo with shared types and API client

## Quick Start

### 1. Clone & Install Dependencies

```bash
npm install
```

This installs all workspaces: `/web`, `/mobile`, `/backend`, `/shared`

### 2. Set Up Supabase (MANUAL SETUP REQUIRED)

This is the critical step. You'll need to manually create a Supabase project and schema:

#### A. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Create a new project (choose any region)
4. Wait for it to provision
5. Copy your **Project URL** and **Anon Key** from the API settings

#### B. Create Database Schema

In the Supabase SQL Editor, run the following SQL to create the three tables:

```sql
-- Programs table
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT programs_user_order_unique UNIQUE(user_id, "order")
);

-- Workouts table
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
  CONSTRAINT workouts_program_order_unique UNIQUE(program_id, "order")
);

-- Exercises table
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 1,
  rest_seconds INTEGER NOT NULL DEFAULT 120,
  user_id TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
  CONSTRAINT exercises_workout_order_unique UNIQUE(workout_id, "order")
);

-- Create indexes
CREATE INDEX idx_programs_user_id ON programs(user_id);
CREATE INDEX idx_workouts_program_id ON workouts(program_id);
CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_exercises_workout_id ON exercises(workout_id);
CREATE INDEX idx_exercises_user_id ON exercises(user_id);

-- Enable RLS (Row Level Security) - Optional for MVP
-- ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
```

#### C. Get Your Service Role Key

1. In Supabase, go to **Settings → API**
2. Copy your **Service Role Key** (this is for backend use only)

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Backend Configuration
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here
```

Replace with your actual Supabase Project URL and keys.

### 4. Start the Backend Server

```bash
npm run backend:dev
```

Server runs on `http://localhost:3000`

### 5. Start the Web App

In a new terminal:

```bash
npm run web:dev
```

Web app runs on `http://localhost:5173`

### 6. Start the Mobile App (Optional)

In a new terminal:

```bash
npm run mobile:dev
```

This starts Expo. You can:
- Press `w` for web
- Press `a` for Android
- Press `i` for iOS

## Project Structure

```
gym/
├── web/                    # React web app
│   ├── src/
│   │   ├── pages/         # HomePage, ProgramsPage, etc.
│   │   ├── components/    # NumberSpinner, Navigation, etc.
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
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
npm run backend:build      # Compile TypeScript

# Web
npm run web:dev            # Start dev server
npm run web:build          # Build for production

# Mobile
npm run mobile:dev         # Start Expo
npm run mobile:start       # Alternative Expo start

# Shared
npm run shared:build       # Compile shared types
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

### Backend port already in use
```bash
# Change PORT in .env
PORT=3001
```

### Supabase connection error
- Verify `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env`
- Ensure Supabase project is active
- Check network connectivity

### React/React Native import errors
```bash
# Rebuild workspace
npm install
npm run shared:build
```

### TypeScript errors
```bash
npm run backend:build  # Check backend compilation
npm run web:build      # Check web compilation
npm run shared:build   # Check shared compilation
```

## Support

For issues or questions, check the terminal output for detailed error messages.

---

**Happy lifting! 💪**

npm run backend:dev
npm run -w shared build
npx expo start --lan # i mobile
npm run web:dev # i app, denne trengs for mobil

Expo Go troubleshooting steps (LAN)

1️⃣ Start backend
npm run backend:dev

2️⃣ Start web
npm run web:dev

3️⃣ Start Expo (initial attempt)
cd mobile
npx expo start --lan

4️⃣ If Expo Go shows “Something went wrong”, clear caches
Kill node processes:
Stop-Process -Name node -Force

✅ This command fixed the issue:
npx expo start --lan -c