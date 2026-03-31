# Gym App - Setup Guide

Complete step-by-step guide to get the gym app running locally.

## Prerequisites

- **Node.js 18+** ([download](https://nodejs.org/))
- **Git** (for version control)
- **Supabase account** ([sign up free](https://supabase.com))
- **Terminal/Command prompt** (PowerShell, bash, or similar)

---

## Step 1: Verify Node.js Installation

```bash
node --version   # Should be v18.0.0 or higher
npm --version    # Should be v9.0.0 or higher
```

---

## Step 2: Create Supabase Project (CRITICAL)

This must be done BEFORE starting the backend.

### A. Create Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Fill in:
   - **Project Name**: `gym-app` (or any name)
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to you
4. Click **"Create new project"** and wait 2-3 minutes for provisioning

### B. Create Database Schema

1. Once project is ready, go to **SQL Editor**
2. Click **"New Query"**
3. Paste the entire SQL schema below and run it:

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
```

4. Check that all tables appear in the **"Table Editor"** left sidebar

### C. Get Your API Keys

1. Go to **Settings → API**
2. Under **"Project API keys"**, copy:
   - **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - **Anon Key** (starts with `eyJ...`)
   - **Service Role Secret** (hidden by default; click eye icon)

Keep these safe! You'll need them in Step 3.

---

## Step 3: Clone and Install

```bash
# Navigate to the gym directory
cd C:\GitHub\gym

# Install all dependencies (web, mobile, backend, shared)
npm install

# This takes 2-3 minutes; it installs packages for all 4 workspaces
```

---

## Step 4: Configure Environment Variables

1. In the gym root directory, create a `.env` file:

```
VITE_SUPABASE_URL=<your_project_url>
VITE_SUPABASE_ANON_KEY=<your_anon_key>
PORT=3000
NODE_ENV=development
SUPABASE_URL=<your_project_url>
SUPABASE_SERVICE_KEY=<your_service_role_secret>
```

2. Replace the placeholders with values from Step 2C:
   - `<your_project_url>` → Your Project URL from Supabase
   - `<your_anon_key>` → Your Anon Key
   - `<your_service_role_secret>` → Your Service Role Secret

**Example:**
```
VITE_SUPABASE_URL=https://abc123xyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://abc123xyz.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Step 5: Start the Backend

Open a **new terminal** and run:

```bash
npm run backend:dev
```

You should see:
```
🏋️ Gym app backend running on port 3000
```

**Keep this terminal open!**

---

## Step 6: Start the Web App

Open a **second terminal** and run:

```bash
npm run web:dev
```

You should see:
```
  VITE v5.0.0  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

---

## Step 7: Open in Browser

Go to **http://localhost:5173** in your browser.

You should see:
- **Navigation** on the left: "Home" and "Programs"
- **Sidebar** with title "💪 Gym App"
- **Home page** with stats showing 0 programs/workouts/exercises

---

## Step 8: Test the App

### A. Create a Program

1. Click **"Programs"** in the sidebar
2. Click **"+ Create Program"**
3. New card appears: "Program 01" (default name)

### B. Create a Workout

1. Click **"View"** on the program
2. Click **"+ Add Workout"**
3. New row appears: "Workout 01" (default name)

### C. Add Exercises

1. Click **"Manage"** on the workout
2. Enter exercise name (e.g., "Bench Press") and click **"+ Add Exercise"**
3. Adjust **Sets** and **Rest** using ▲/▼ buttons
4. Click ▲/▼ buttons under **Reorder** to move exercises up/down

### D. Check Dashboard

1. Click **"Home"** in sidebar
2. Should now show: 1 Program, 1 Workout, 1 Exercise

### E. Persistence Check

1. **Close and reopen** browser
2. Go to **http://localhost:5173** again
3. Data should still be there (stored in Supabase)

---

## Step 9: Try the Mobile App (Optional)

Open a **third terminal**:

```bash
npm run mobile:dev
```

You'll see options:
```
  w - open web
  a - open android
  i - open ios
```

Press `w` to open mobile web version, or install Expo Go app on your phone to scan the QR code.

---

## Troubleshooting

### "Cannot find module @gym-app/shared"

```bash
# Rebuild shared package
npm run shared:build

# Then restart backend
npm run backend:dev
```

### "Connection refused" on localhost:3000

- Backend not running? Start it in a new terminal: `npm run backend:dev`
- Port 3000 in use? Change PORT in .env to 3001

### "SUPABASE_URL is not defined"

- Your `.env` file isn't being read
- Ensure `.env` file is in root gym directory
- Restart backend: `npm run backend:dev`

### "Supabase connection error"

- Check your keys in `.env` are correct
- Verify Supabase project is active
- Try this in browser: `https://your-project-url.supabase.co` (should show JSON response)

### Tables not showing in Supabase

- Re-run the SQL schema from Step 2B
- Go to **SQL Editor → History** to see if query succeeded
- Check **Table Editor** on left sidebar

### WebSocket connection failed (mobile)

This is normal for now (MVP doesn't use WebSockets). The app still works fine.

---

## File Structure Quick Reference

```
gym/
├── web/           → React web app (http://localhost:5173)
├── mobile/        → React Native (http://localhost:5173 via Expo)
├── backend/       → API server (http://localhost:3000)
├── shared/        → TypeScript types & API client
├── .env           → Your Supabase credentials
└── README.md      → Full documentation
```

---

## Next Steps

After successfully running the app:

1. **Explore all CRUD operations** (Create, Read, Update, Delete)
2. **Test on both web and mobile** to verify features work
3. **Check Supabase dashboard** to see your data in real-time:
   - Go to **Table Editor**
   - View programs, workouts, exercises you created
4. **Read the main README.md** for API endpoints and future roadmap

---

## Need Help?

1. **Check terminal output** for detailed error messages
2. **Review the README.md** in root directory
3. **Verify .env variables** are correctly set (no typos, extra spaces, or quotes)
4. **Restart all servers** if making changes to .env

---

**You're all set! Create some amazing workouts! 💪**
