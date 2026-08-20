export type ContentType = 'story' | 'reel' | 'educational';

export type TaskStatus = 'planned' | 'in-progress' | 'posted';

export interface ContentTask {
  id: string;
  date: string;
  type: ContentType;
  title: string;
  notes: string;
  status: TaskStatus;
  repeatDaily: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDraft {
  date: Date;
  type: ContentType;
  title: string;
  notes: string;
  status: TaskStatus;
  repeatDaily: boolean;
}

export type MediaWorkspaceType = 'material' | 'final';

export interface MediaSection {
  id: string;
  taskId: string;
  workspace: MediaWorkspaceType;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaFile {
  id: string;
  taskId: string;
  sectionId: string;
  workspace: MediaWorkspaceType;
  originalName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface CalendarDay {
  date: Date;
  key: string;
  inCurrentMonth: boolean;
}
