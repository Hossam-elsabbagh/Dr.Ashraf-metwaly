import React, { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { COLORS, CONTENT_TYPE_META } from '../theme';
import type { ContentTask } from '../types';
import { buildMonthGrid, isSameDay, WEEK_DAYS } from '../utils/date';
import { AnimatedPressable } from './AnimatedPressable';

interface CalendarGridProps {
  month: Date;
  selectedDate: Date;
  tasks: ContentTask[];
  onSelectDate: (date: Date) => void;
  onAddDate: (date: Date) => void;
}

export function CalendarGrid({
  month,
  selectedDate,
  tasks,
  onSelectDate,
  onAddDate,
}: CalendarGridProps) {
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const days = useMemo(() => buildMonthGrid(month), [month]);
  const today = new Date();

  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, ContentTask[]>();
    tasks.forEach((task) => {
      const existing = grouped.get(task.date) ?? [];
      existing.push(task);
      grouped.set(task.date, existing);
    });
    grouped.forEach((items) => {
      items.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    });
    return grouped;
  }, [tasks]);

  return (
    <View style={styles.container}>
      <View style={styles.weekRow}>
        {WEEK_DAYS.map((day) => (
          <View key={day} style={styles.weekCell}>
            <Text style={styles.weekText}>{compact ? day.slice(0, 1) : day}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const dayTasks = tasksByDate.get(day.key) ?? [];
          const selected = isSameDay(day.date, selectedDate);
          const isToday = isSameDay(day.date, today);
          const visibleTasks = dayTasks.slice(0, compact ? 1 : 2);
          const hiddenCount = dayTasks.length - visibleTasks.length;

          return (
            <View key={day.key} style={styles.cellSlot}>
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={`Select ${day.key}`}
                onPress={() => onSelectDate(day.date)}
                style={[
                  styles.dayCell,
                  compact && styles.dayCellCompact,
                  !day.inCurrentMonth && styles.dayCellOutside,
                  selected && styles.dayCellSelected,
                  isToday && !selected && styles.dayCellToday,
                ]}
                scaleTo={0.985}
              >
                <View style={styles.dayTopRow}>
                  <View
                    style={[
                      styles.dayNumberWrap,
                      compact && styles.dayNumberWrapCompact,
                      isToday && styles.todayNumberWrap,
                      selected && styles.selectedNumberWrap,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        !day.inCurrentMonth && styles.dayNumberOutside,
                        isToday && !selected && styles.dayNumberToday,
                        selected && styles.dayNumberSelected,
                      ]}
                    >
                      {day.date.getDate()}
                    </Text>
                  </View>

                </View>

                <View style={styles.taskArea}>
                  {visibleTasks.map((task) => {
                    const meta = CONTENT_TYPE_META[task.type];
                    return (
                      <View
                        key={task.id}
                        style={[styles.taskChip, { backgroundColor: meta.softColor }]}
                      >
                        <View style={[styles.taskDot, { backgroundColor: meta.color }]} />
                        <Text
                          numberOfLines={1}
                          style={[styles.taskChipText, { color: meta.darkColor }]}
                        >
                          {compact ? meta.shortLabel : task.title}
                        </Text>
                      </View>
                    );
                  })}

                  {dayTasks.length === 0 && selected ? (
                    <Text numberOfLines={1} style={styles.emptyHint}>
                      Add content
                    </Text>
                  ) : null}

                  {hiddenCount > 0 ? (
                    <Text style={styles.moreText}>+{hiddenCount} more</Text>
                  ) : null}
                </View>
              </AnimatedPressable>

              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={`Add task on ${day.key}`}
                hitSlop={8}
                onPress={() => onAddDate(day.date)}
                style={[
                  styles.miniAdd,
                  styles.miniAddFloating,
                  compact && styles.miniAddCompact,
                  compact && styles.miniAddFloatingCompact,
                ]}
                scaleTo={0.84}
              >
                <Text
                  style={[styles.miniAddText, compact && styles.miniAddTextCompact]}
                >
                  +
                </Text>
              </AnimatedPressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  weekRow: {
    flexDirection: 'row',
    paddingVertical: 11,
    backgroundColor: COLORS.primaryMist,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  weekCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
  },
  weekText: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 4,
  },
  cellSlot: {
    width: `${100 / 7}%`,
    padding: 3,
  },
  dayCell: {
    minHeight: 98,
    padding: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: COLORS.surfaceRaised,
  },
  dayCellCompact: {
    minHeight: 74,
    paddingHorizontal: 4,
    paddingVertical: 5,
    borderRadius: 13,
  },
  dayCellOutside: {
    opacity: 0.42,
    backgroundColor: COLORS.background,
  },
  dayCellSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMist,
  },
  dayCellToday: {
    borderColor: COLORS.borderStrong,
  },
  dayTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayNumberWrap: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberWrapCompact: {
    minWidth: 19,
    height: 19,
    paddingHorizontal: 3,
    borderRadius: 7,
  },
  todayNumberWrap: {
    backgroundColor: COLORS.goldSoft,
  },
  selectedNumberWrap: {
    backgroundColor: COLORS.primary,
  },
  dayNumber: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  dayNumberOutside: {
    color: COLORS.muted,
  },
  dayNumberToday: {
    color: COLORS.goldDark,
  },
  dayNumberSelected: {
    color: COLORS.white,
  },
  miniAdd: {
    width: 23,
    height: 23,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  miniAddCompact: {
    width: 17,
    height: 17,
    borderRadius: 6,
  },
  miniAddFloating: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 3,
  },
  miniAddFloatingCompact: {
    top: 8,
    right: 8,
  },
  miniAddText: {
    marginTop: -1,
    color: COLORS.primaryDark,
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '500',
  },
  miniAddTextCompact: {
    marginTop: -2,
    fontSize: 14,
    lineHeight: 16,
  },
  taskArea: {
    flex: 1,
    marginTop: 7,
    gap: 4,
  },
  taskChip: {
    minHeight: 20,
    paddingHorizontal: 5,
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskDot: {
    width: 5,
    height: 5,
    borderRadius: 99,
  },
  taskChipText: {
    flex: 1,
    fontSize: 8.5,
    fontWeight: '800',
  },
  emptyHint: {
    color: COLORS.muted,
    fontSize: 8.5,
    fontWeight: '600',
  },
  moreText: {
    color: COLORS.muted,
    fontSize: 8.5,
    fontWeight: '700',
  },
});
