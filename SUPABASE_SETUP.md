# Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase/setup.sql`.
3. Copy your **Project URL** and **Publishable key**. Do not use the service-role key.
4. Copy `.env.example` to `.env` and replace the placeholders:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

5. Install/update packages:

```bash
npm install
```

6. Run locally:

```bash
npm run web
```

7. For Vercel, add the same two environment variables in Project Settings > Environment Variables, then redeploy.

## Important security note

The included SQL is an MVP configuration that allows anonymous CRUD so the current app works without a login screen. Anyone who can load the deployed app can change planner data. Before making the URL public, add Supabase Auth and change the RLS policies to authenticated users only.
