# Dr. Ashraf Content Planner

Expo / React Native Web content planner with Supabase persistence and Supabase Storage media workspaces.

## Features

- Calendar-based content tasks (Story, Reel, Educational Video)
- Optional **Every day** recurrence from the selected start date onward
- Per-task **Material Link** workspace
- Per-task **Final Result** workspace
- Unlimited custom partitions inside each workspace: add, rename and delete
- Multi-file uploads to Supabase Storage with the original file preserved (no resize/re-encode/compression in app code)
- Original file download for all stored files
- Browser-side image export to PNG, JPG and WEBP while keeping the stored original untouched
- Vercel-ready Expo web build

## Local web

```powershell
npm install
npm run local
```

Open `http://localhost:8081`.

## Supabase upgrade required

If this planner already exists in Supabase, run:

`supabase/20260821_daily_tasks_and_media.sql`

For a completely new Supabase project, run:

`supabase/setup.sql`

The migration adds `content_tasks.repeat_daily`, `media_sections`, `media_files`, the `planner-media` Storage bucket and the required RLS policies.

## Vercel / GitHub deployment

1. Push the source project to GitHub (do not commit `.env`, `node_modules`, `dist` or `.expo`).
2. Import the GitHub repository into Vercel.
3. Add these Vercel environment variables:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Deploy. `vercel.json` already uses `npm run build:web` and publishes `dist`.

Large media uploads are sent directly from the browser to Supabase Storage instead of passing through `/api/tasks` or a Vercel Function, so original media is not subject to the Vercel Function request-body limit.

## Security

The current planner intentionally uses public/anonymous CRUD policies because the existing app has no login. Anyone who can access the admin planner can modify tasks and media. Add Supabase Auth and tighten RLS before making this tool publicly accessible.
