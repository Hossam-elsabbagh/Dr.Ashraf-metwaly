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

export interface CalendarDay {
  date: Date;
  key: string;
  inCurrentMonth: boolean;
}
