# 🏋️ QUICK START - GymApp

**⏱️ 5-minute setup to get the app running**

---

## Prerequisites

✅ Node.js 18+ (`node --version`)  
✅ Supabase account (free at [supabase.com](https://supabase.com))

---

## Step 1: Supabase Setup (3 min)

### Create Project
1. Go to supabase.com → **New Project**
2. Enter name & password
3. Wait for provisioning
4. Copy **Project URL** and **Anon Key** from Settings → API

### Create Schema (Copy/Paste into SQL Editor)

```sql
CREATE TABLE programs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, user_id TEXT NOT NULL, "order" INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT NOW(), CONSTRAINT programs_user_order_unique UNIQUE(user_id, "order"));

CREATE TABLE workouts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE, name TEXT NOT NULL, user_id TEXT NOT NULL, "order" INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT NOW(), CONSTRAINT workouts_program_order_unique UNIQUE(program_id, "order"));

CREATE TABLE exercises (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE, name TEXT NOT NULL, sets INTEGER NOT NULL DEFAULT 1, rest_seconds INTEGER NOT NULL DEFAULT 120, user_id TEXT NOT NULL, "order" INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT NOW(), CONSTRAINT exercises_workout_order_unique UNIQUE(workout_id, "order"));

CREATE INDEX idx_programs_user_id ON programs(user_id);
CREATE INDEX idx_workouts_program_id ON workouts(program_id);
CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_exercises_workout_id ON exercises(workout_id);
CREATE INDEX idx_exercises_user_id ON exercises(user_id);
```

4. Also copy **Service Role Secret** from Settings → API

---

## Step 2: Configure App (1 min)

Create `.env` file in `c:\GitHub\gym\`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

Replace with YOUR project URL and keys from Step 1.

---

## Step 3: Install & Run (1 min)

```bash
# Terminal 1: Install dependencies
cd C:\GitHub\gym
npm install

# Terminal 2: Start backend (keep running)
npm run backend:dev
# Should show: 🏋️ GymApp backend running on port 3000

# Terminal 3: Start web app (keep running)
npm run web:dev
# Should show: Local: http://localhost:5173/
```

---

## Step 4: Open Browser (10 sec)

Go to: **http://localhost:5173**

---

## Test It

1. Click **Programs** in sidebar
2. Click **+ Create Program** → "Program 01" appears
3. Click **View** → Click **+ Add Workout** → "Workout 01" appears
4. Click **Manage** → Enter "Bench Press" → Click **+ Add Exercise**
5. Adjust sets/rest with ▲/▼ buttons
6. Click **Home** → Stats show 1 program, 1 workout, 1 exercise
7. **Close browser, reopen** → Data persists! ✅

---

## What You Built

| Component | Location | Purpose |
|-----------|----------|---------|
| API Server | `backend/src/index.ts` | REST API (12+ endpoints) |
| Web App | `web/src/` | React UI (4 pages) |
| Mobile App | `mobile/src/` | React Native UI (mirrors web) |
| Shared Types | `shared/src/` | TypeScript interfaces + API client |
| Database | Supabase PostgreSQL | 3 tables: programs, workouts, exercises |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Connection refused" | Is backend running? `npm run backend:dev` |
| "SUPABASE_URL undefined" | Create `.env` file (see Step 2) |
| "Cannot find module @gym-app/shared" | Run `npm run shared:build` |
| "Module not found" | Run `npm install` again |

---

## Next: Try Mobile

```bash
npm run mobile:dev
# Press 'w' for web version
```

---

## Documentation

- **Full setup**: `SETUP.md`
- **Architecture**: `README.md`
- **Implementation details**: `IMPLEMENTATION.md`

---

## What's Included

✅ Create/edit/delete programs  
✅ Create/edit/delete workouts  
✅ Add exercises with custom sets & rest  
✅ Reorder exercises with ▲/▼  
✅ Edit sets (1-100) with spinners  
✅ Edit rest (0-600s) with spinners  
✅ Stats dashboard  
✅ Cloud storage (Supabase)  
✅ Both web & mobile apps  

---

## What's Not Yet (v2+)

❌ Real user login (uses mock user now)  
❌ Workout history/logging  
❌ Offline mode  
❌ Production deployment  

---

**You're live! 🎉 Time to build some workouts! 💪**
