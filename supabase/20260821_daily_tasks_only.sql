-- Dr. Ashraf Content Planner - daily task recurrence only
-- Safe to run on the existing project.

alter table public.content_tasks
  add column if not exists repeat_daily boolean not null default false;
