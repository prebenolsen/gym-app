# Implementation Notes

## Architecture

- `mobile/` contains the Expo React Native application.
- `backend/` exposes the API used by the mobile client.
- `shared/` contains exercise catalogs, shared types, and the API client.

## Request flow

1. The mobile app calls the shared `ApiClient`.
2. The backend validates the request and applies user scoping.
3. Supabase persists and returns the updated data.
4. The mobile app updates local state from the API response.

## Core environment variables

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_BASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

## Development commands

```bash
npm run backend:dev
npm run mobile:dev
npx tsc -p mobile/tsconfig.json --noEmit
```

## Current scope

This repository is maintained as a mobile app plus backend/shared packages. The previous dedicated web frontend has been removed.
