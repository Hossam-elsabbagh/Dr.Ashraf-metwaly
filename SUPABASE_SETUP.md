# Supabase setup

## Existing project

Open **Supabase -> SQL Editor** and run:

`supabase/20260821_daily_tasks_only.sql`

This keeps only the `repeat_daily` database field required by the **Every day** checkbox.

## New project

Run `supabase/setup.sql`.

## Security note

The publishable key is safe for frontend use. Do not use a secret key or `service_role` key in this project.

Because this MVP has no login, anyone who can access the public app can currently modify the schedule. Add Supabase Auth before sharing it with untrusted users.
