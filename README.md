# Dr. Ashraf Content Planner

Expo/React Native content planner with persistent Supabase storage.

## Recommended local web command

```powershell
npm install
npm run local
```

Then open `http://localhost:8081`.

The local server serves the exported Expo web app and the `/api/tasks` endpoint from the **same origin**. The API endpoint talks to Supabase server-side, avoiding browser-level `Failed to fetch` / CORS / extension problems.

## Vercel

The repo includes `api/tasks.js`, which provides the same `/api/tasks` endpoint in production, and `vercel.json`, which exports Expo web to `dist`.

## Supabase

Run `supabase/setup.sql` once in the Supabase SQL Editor. The current MVP policies allow public CRUD. Add authentication before sharing the planner with untrusted users.
