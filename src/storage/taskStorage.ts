import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ContentTask } from '../types';

const STORAGE_KEY = '@dr_ashraf_content_planner/tasks/v1';

interface StoredPayload {
  version: 1;
  tasks: ContentTask[];
}

export const loadTasks = async (): Promise<ContentTask[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Partial<StoredPayload>;
    return Array.isArray(parsed.tasks) ? parsed.tasks : [];
  } catch (error) {
    console.warn('Could not load saved content tasks.', error);
    return [];
  }
};

export const saveTasks = async (tasks: ContentTask[]): Promise<void> => {
  const payload: StoredPayload = {
    version: 1,
    tasks,
  };

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Could not save content tasks.', error);
  }
};
