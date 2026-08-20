# Supabase setup / migration

## Existing project

Open **Supabase → SQL Editor**, paste the contents of:

`supabase/20260821_daily_tasks_and_media.sql`

and run it before deploying the updated frontend.

It adds:

- `repeat_daily` to `public.content_tasks`
- `public.media_sections`
- `public.media_files`
- `planner-media` Storage bucket
- CRUD/RLS policies required by the current no-login planner

## New project

Run `supabase/setup.sql` instead. It contains the complete schema from scratch.

## Storage quality

The application stores the original upload as-is. It does not resize images, reduce JPEG quality, transcode video, or overwrite the original when the download-conversion controls are used. PNG/JPG/WEBP conversion happens in the browser only when the user asks for a converted download.

Supabase account/project storage quotas and global upload-size settings still apply. If you need very large source videos, check **Storage → Settings → Global file size limit** in the Supabase dashboard.

## Environment variables

```text
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Never put a Supabase secret key or service-role key in the frontend.
