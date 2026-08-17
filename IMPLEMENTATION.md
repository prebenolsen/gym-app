# Implementation Notes

## Architecture

- `mobile/` contains the Expo React Native application, which also builds the PWA.
- `shared/` contains exercise catalogs, shared types, and the Supabase-backed `ApiClient`.
- `backend/` is a legacy Express server the app no longer calls. Its `backend/sql/`
  files remain the schema source of truth.

There is no application server in the request path. The client holds the Supabase
anon key, and Row Level Security on the `weak_*` tables scopes every row to the
signed-in user (`auth.uid() = user_id`).

## Request flow

1. A screen calls the shared `ApiClient` through the `useApi()` hook.
2. `ApiClient` reads the user id from the cached Supabase session.
3. It queries Supabase directly; RLS enforces ownership server-side.
4. The screen updates local state from the returned rows.

The one exception is `deleteAccount()`, which calls the `weak_delete_account()`
security-definer function — removing an `auth.users` row needs privileges the anon
key does not have.

## Core environment variables

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Both are compiled into the client bundle and are safe to expose. `SUPABASE_URL` and
`SUPABASE_SERVICE_KEY` are needed only by the legacy `backend/`; the service key
bypasses RLS and must never reach a client.

## Development commands

```bash
npm run mobile:dev
npm run web:dev
npm run build:web
npx tsc -p mobile/tsconfig.json --noEmit
```

## Current scope

An Expo app targeting native and an installable PWA, deployed to GitHub Pages, with
Supabase as the only backing service. The database is shared with other apps, hence
the `weak_` prefix on every object this one owns.
