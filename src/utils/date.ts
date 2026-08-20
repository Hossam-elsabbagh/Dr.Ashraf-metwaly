import type { CalendarDay } from '../types';

export const WEEK_DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

const pad = (value: number): string => String(value).padStart(2, '0');

export const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const fromDateKey = (key: string): Date => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
};

export const startOfMonth = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);

export const addMonths = (date: Date, amount: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1, 12, 0, 0, 0);

export const daysInMonth = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

export const isSameDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const isSameMonth = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();

export const buildMonthGrid = (month: Date): CalendarDay[] => {
  const first = startOfMonth(month);
  // JavaScript: Sunday=0 ... Saturday=6. The planner starts on Saturday.
  const saturdayFirstOffset = (first.getDay() + 1) % 7;
  const gridStart = new Date(
    first.getFullYear(),
    first.getMonth(),
    1 - saturdayFirstOffset,
    12,
    0,
    0,
    0,
  );

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
      12,
      0,
      0,
      0,
    );

    return {
      date,
      key: toDateKey(date),
      inCurrentMonth: isSameMonth(date, month),
    };
  });
};

export const formatMonthTitle = (date: Date): string =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);

export const formatLongDate = (date: Date): string =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);

export const formatCompactDate = (date: Date): string =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);

export const monthKey = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

export const taskOccursOnDate = (
  task: { date: string; repeatDaily?: boolean },
  dateKey: string,
): boolean => (task.repeatDaily ? task.date <= dateKey : task.date === dateKey);

export const countTaskOccurrencesInMonth = (
  task: { date: string; repeatDaily?: boolean },
  month: Date,
): number => {
  const totalDays = daysInMonth(month);
  const startKey = `${monthKey(month)}-01`;
  const endKey = `${monthKey(month)}-${pad(totalDays)}`;

  if (!task.repeatDaily) {
    return task.date >= startKey && task.date <= endKey ? 1 : 0;
  }

  if (task.date > endKey) return 0;
  const firstOccurrenceKey = task.date > startKey ? task.date : startKey;
  const firstOccurrence = fromDateKey(firstOccurrenceKey);
  return totalDays - firstOccurrence.getDate() + 1;
};
