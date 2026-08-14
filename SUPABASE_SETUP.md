# Supabase setup

The project is already configured with the Supabase Project URL and frontend Publishable Key used for this planner.

## Database

Open Supabase -> SQL Editor and run `supabase/setup.sql` once.

The script creates `public.content_tasks`, enables RLS, and enables public CRUD for the current no-login MVP.

## Security note

The publishable key is safe for frontend use. Do not use a secret key or `service_role` key in this project.

Because this MVP has no login, anyone who can access the public app can currently modify the schedule. Add Supabase Auth before sharing it with untrusted users.
