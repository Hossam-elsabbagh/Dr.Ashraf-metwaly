-- Dr. Ashraf Content Planner - Supabase setup
-- MVP MODE: anyone with the public/publishable key can read and edit this planner.
-- Add Supabase Auth later if the website will be public to untrusted users.

create table if not exists public.content_tasks (
  id text primary key,
  date date not null,
  type text not null check (type in ('story', 'reel', 'educational')),
  title text not null default '',
  notes text not null default '',
  status text not null default 'planned'
    check (status in ('planned', 'in-progress', 'posted')),
  repeat_daily boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe upgrade for existing planner databases.
alter table public.content_tasks
  add column if not exists repeat_daily boolean not null default false;

create index if not exists content_tasks_date_idx
  on public.content_tasks (date);

create or replace function public.set_content_tasks_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists content_tasks_set_updated_at on public.content_tasks;
create trigger content_tasks_set_updated_at
before update on public.content_tasks
for each row execute function public.set_content_tasks_updated_at();

-- Explicit API privileges
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.content_tasks to anon, authenticated;

-- Row Level Security
alter table public.content_tasks enable row level security;

drop policy if exists "planner public read" on public.content_tasks;
drop policy if exists "planner public insert" on public.content_tasks;
drop policy if exists "planner public update" on public.content_tasks;
drop policy if exists "planner public delete" on public.content_tasks;

create policy "planner public read"
on public.content_tasks
for select
to anon, authenticated
using (true);

create policy "planner public insert"
on public.content_tasks
for insert
to anon, authenticated
with check (true);

create policy "planner public update"
on public.content_tasks
for update
to anon, authenticated
using (true)
with check (true);

create policy "planner public delete"
on public.content_tasks
for delete
to anon, authenticated
using (true);

-- Enable Realtime so multiple open devices refresh when a task changes.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'content_tasks'
  ) then
    execute 'alter publication supabase_realtime add table public.content_tasks';
  end if;
end
$$;
