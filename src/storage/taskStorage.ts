import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import type { ContentTask, ContentType, TaskStatus } from '../types';

interface TaskRow {
  id: string;
  date: string;
  type: ContentType;
  title: string;
  notes: string;
  status: TaskStatus;
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
  created_at: task.createdAt,
  updated_at: task.updatedAt,
});

const toUpdateRow = (task: ContentTask) => ({
  date: task.date,
  type: task.type,
  title: task.title,
  notes: task.notes,
  status: task.status,
  updated_at: task.updatedAt,
});

export const loadTasks = async (): Promise<ContentTask[]> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('content_tasks')
    .select('id,date,type,title,notes,status,created_at,updated_at')
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as TaskRow[]).map(fromRow);
};

export const createTask = async (task: ContentTask): Promise<void> => {
  const client = getSupabaseClient();
  const { error } = await client.from('content_tasks').insert(toInsertRow(task));
  if (error) throw error;
};

export const updateTask = async (task: ContentTask): Promise<void> => {
  const client = getSupabaseClient();
  const { error } = await client
    .from('content_tasks')
    .update(toUpdateRow(task))
    .eq('id', task.id);
  if (error) throw error;
};

export const deleteTask = async (id: string): Promise<void> => {
  const client = getSupabaseClient();
  const { error } = await client.from('content_tasks').delete().eq('id', id);
  if (error) throw error;
};

export const subscribeToTaskChanges = (
  onChange: () => void,
  onError?: (error: Error) => void,
): (() => void) => {
  if (!isSupabaseConfigured) return () => undefined;

  const client = getSupabaseClient();
  const channel = client
    .channel('content-tasks-live-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'content_tasks' },
      () => onChange(),
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError?.(new Error(`Supabase realtime status: ${status}`));
      }
    });

  return () => {
    void client.removeChannel(channel);
  };
};
