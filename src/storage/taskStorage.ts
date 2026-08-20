import { Platform } from 'react-native';
import {
  isSupabaseConfigured,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from '../lib/supabase';
import type { ContentTask, ContentType, TaskStatus } from '../types';

interface TaskRow {
  id: string;
  date: string;
  type: ContentType;
  title: string;
  notes: string;
  status: TaskStatus;
  repeat_daily: boolean;
  created_at: string;
  updated_at: string;
}

const fromRow = (row: TaskRow): ContentTask => ({
  id: row.id,
  date: row.date,
  type: row.type,
  title: row.title,
  notes: row.notes,
  status: row.status,
  repeatDaily: Boolean(row.repeat_daily),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toInsertRow = (task: ContentTask) => ({
  id: task.id,
  date: task.date,
  type: task.type,
  title: task.title,
  notes: task.notes,
  status: task.status,
  repeat_daily: task.repeatDaily,
  created_at: task.createdAt,
  updated_at: task.updatedAt,
});

const toUpdateRow = (task: ContentTask) => ({
  date: task.date,
  type: task.type,
  title: task.title,
  notes: task.notes,
  status: task.status,
  repeat_daily: task.repeatDaily,
  updated_at: task.updatedAt,
});

const parseApiError = async (response: Response): Promise<string> => {
  const text = await response.text();
  if (!text) return `Request failed (${response.status})`;
  try {
    const parsed = JSON.parse(text) as { error?: string; message?: string };
    return parsed.error || parsed.message || text;
  } catch {
    return text;
  }
};

const getWebApiBase = (): string =>
  process.env.EXPO_PUBLIC_PLANNER_API_URL?.trim() || '/api/tasks';

async function webApi<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
  id?: string,
): Promise<T> {
  const base = getWebApiBase();
  const target = id ? `${base}?id=${encodeURIComponent(id)}` : base;
  const response = await fetch(target, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const text = await response.text();
  if (!text || text === 'null') return undefined as T;
  return JSON.parse(text) as T;
}

async function nativeSupabaseRest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = SUPABASE_URL.replace(/\/$/, '');
  const key = SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured.');

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const loadTasks = async (): Promise<ContentTask[]> => {
  const rows = Platform.OS === 'web'
    ? await webApi<TaskRow[]>('GET')
    : await nativeSupabaseRest<TaskRow[]>(
        'content_tasks?select=id,date,type,title,notes,status,repeat_daily,created_at,updated_at&order=date.asc,created_at.asc',
      );
  return (rows ?? []).map(fromRow);
};

export const createTask = async (task: ContentTask): Promise<void> => {
  const row = toInsertRow(task);
  if (Platform.OS === 'web') {
    await webApi<TaskRow[]>('POST', row);
    return;
  }
  await nativeSupabaseRest<TaskRow[]>('content_tasks', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
};

export const updateTask = async (task: ContentTask): Promise<void> => {
  const row = toUpdateRow(task);
  if (Platform.OS === 'web') {
    await webApi<TaskRow[]>('PATCH', row, task.id);
    return;
  }
  await nativeSupabaseRest<TaskRow[]>(
    `content_tasks?id=eq.${encodeURIComponent(task.id)}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(row),
    },
  );
};

export const deleteTask = async (id: string): Promise<void> => {
  if (Platform.OS === 'web') {
    await webApi<TaskRow[]>('DELETE', undefined, id);
    return;
  }
  await nativeSupabaseRest<TaskRow[]>(
    `content_tasks?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' },
    },
  );
};

export const subscribeToTaskChanges = (
  onChange: () => void,
  _onError?: (error: Error) => void,
): (() => void) => {
  if (!isSupabaseConfigured) return () => undefined;
  const interval = setInterval(onChange, 8000);
  return () => clearInterval(interval);
};
