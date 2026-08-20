-- Upgrade migration: daily recurrence + per-task Material Link / Final Result media workspaces.
-- Safe to run once on the existing Dr. Ashraf planner Supabase project.

alter table public.content_tasks
  add column if not exists repeat_daily boolean not null default false;

create table if not exists public.media_sections (
  id text primary key,
  task_id text not null references public.content_tasks(id) on delete cascade,
  workspace text not null check (workspace in ('material', 'final')),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_files (
  id text primary key,
  task_id text not null references public.content_tasks(id) on delete cascade,
  section_id text not null references public.media_sections(id) on delete cascade,
  workspace text not null check (workspace in ('material', 'final')),
  original_name text not null,
  storage_path text not null unique,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  created_at timestamptz not null default now()
);

create index if not exists media_sections_task_workspace_idx
  on public.media_sections (task_id, workspace, sort_order);
create index if not exists media_files_task_workspace_idx
  on public.media_files (task_id, workspace, created_at);
create index if not exists media_files_section_idx
  on public.media_files (section_id, created_at);

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

drop trigger if exists media_sections_set_updated_at on public.media_sections;
create trigger media_sections_set_updated_at
before update on public.media_sections
for each row execute function public.set_content_tasks_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('planner-media', 'planner-media', true, null, null)
on conflict (id) do update
set public = true,
    file_size_limit = null,
    allowed_mime_types = null;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.media_sections to anon, authenticated;
grant select, insert, update, delete on public.media_files to anon, authenticated;

alter table public.media_sections enable row level security;
alter table public.media_files enable row level security;

drop policy if exists "planner media sections read" on public.media_sections;
drop policy if exists "planner media sections insert" on public.media_sections;
drop policy if exists "planner media sections update" on public.media_sections;
drop policy if exists "planner media sections delete" on public.media_sections;
create policy "planner media sections read" on public.media_sections for select to anon, authenticated using (true);
create policy "planner media sections insert" on public.media_sections for insert to anon, authenticated with check (true);
create policy "planner media sections update" on public.media_sections for update to anon, authenticated using (true) with check (true);
create policy "planner media sections delete" on public.media_sections for delete to anon, authenticated using (true);

drop policy if exists "planner media files read" on public.media_files;
drop policy if exists "planner media files insert" on public.media_files;
drop policy if exists "planner media files update" on public.media_files;
drop policy if exists "planner media files delete" on public.media_files;
create policy "planner media files read" on public.media_files for select to anon, authenticated using (true);
create policy "planner media files insert" on public.media_files for insert to anon, authenticated with check (true);
create policy "planner media files update" on public.media_files for update to anon, authenticated using (true) with check (true);
create policy "planner media files delete" on public.media_files for delete to anon, authenticated using (true);

drop policy if exists "planner media storage read" on storage.objects;
drop policy if exists "planner media storage insert" on storage.objects;
drop policy if exists "planner media storage update" on storage.objects;
drop policy if exists "planner media storage delete" on storage.objects;
create policy "planner media storage read" on storage.objects for select to anon, authenticated using (bucket_id = 'planner-media');
create policy "planner media storage insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'planner-media');
create policy "planner media storage update" on storage.objects for update to anon, authenticated using (bucket_id = 'planner-media') with check (bucket_id = 'planner-media');
create policy "planner media storage delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'planner-media');
