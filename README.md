# Dr. Ashraf Content Planner

Expo/React Native content planner with persistent Supabase storage.

## Retained update

- Optional **Every day** checkbox for a task.
- A checked task repeats on every calendar day from its selected start date onward.
- No Material Link, Final Result, media partition, upload, download, or conversion features are included.

## Existing Supabase project

Run `supabase/20260821_daily_tasks_only.sql` once in the Supabase SQL Editor.

## Recommended local web command

```powershell
npm install
npm run local
```

Then open `http://localhost:8081`.

The local server serves the exported Expo web app and the `/api/tasks` endpoint from the same origin.

## Vercel

The repo includes `api/tasks.js`, which provides the `/api/tasks` endpoint in production, and `vercel.json`, which exports Expo web to `dist`.

## Supabase

For a new Supabase project, run `supabase/setup.sql`. The current MVP policies allow public CRUD. Add authentication before sharing the planner with untrusted users.
