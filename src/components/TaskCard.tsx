import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS, CONTENT_TYPE_META, SHADOWS, STATUS_META } from '../theme';
import type { ContentTask } from '../types';
import { AnimatedPressable } from './AnimatedPressable';

interface TaskCardProps {
  task: ContentTask;
  onEdit: (task: ContentTask) => void;
  onMarkPosted: (task: ContentTask) => void;
}

export function TaskCard({ task, onEdit, onMarkPosted }: TaskCardProps) {
  const typeMeta = CONTENT_TYPE_META[task.type];
  const statusMeta = STATUS_META[task.status];

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${task.title}`}
      onPress={() => onEdit(task)}
      style={[styles.card, SHADOWS.card]}
      scaleTo={0.985}
    >
      <View style={[styles.accent, { backgroundColor: typeMeta.color }]} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.typeBadge, { backgroundColor: typeMeta.softColor }]}>
            <Text style={[styles.typeText, { color: typeMeta.darkColor }]}>
              {typeMeta.label}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.softColor }]}>
            <View style={[styles.statusDot, { backgroundColor: statusMeta.color }]} />
            <Text style={[styles.statusText, { color: statusMeta.color }]}>
              {statusMeta.label}
            </Text>
          </View>
        </View>

        <Text numberOfLines={2} style={styles.title}>
          {task.title}
        </Text>

        {task.notes.trim() ? (
          <Text numberOfLines={2} style={styles.notes}>
            {task.notes}
          </Text>
        ) : (
          <Text style={styles.notesMuted}>No notes added</Text>
        )}

        <View style={styles.actions}>
          <Text style={styles.editHint}>Tap card to edit</Text>
          {task.status === 'posted' ? (
            <View style={styles.postedButton}>
              <Text style={styles.postedButtonText}>Posted ✓</Text>
            </View>
          ) : (
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={`Mark ${task.title} as posted`}
              onPress={(event) => {
                event.stopPropagation();
                onMarkPosted(task);
              }}
              style={styles.markButton}
              scaleTo={0.94}
            >
              <Text style={styles.markButtonText}>Mark posted</Text>
            </AnimatedPressable>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  accent: {
    width: 5,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  typeBadge: {
    maxWidth: '62%',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  title: {
    marginTop: 12,
    color: COLORS.ink,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },
  notes: {
    marginTop: 6,
    color: COLORS.inkSoft,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  notesMuted: {
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  editHint: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  markButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
  },
  markButtonText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },
  postedButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: COLORS.successSoft,
  },
  postedButtonText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '800',
  },
});
