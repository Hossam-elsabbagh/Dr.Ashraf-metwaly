import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  COLORS,
  CONTENT_TYPE_META,
  SHADOWS,
  STATUS_META,
} from '../theme';
import type {
  ContentTask,
  ContentType,
  TaskDraft,
  TaskStatus,
} from '../types';
import { formatCompactDate, fromDateKey } from '../utils/date';
import { AnimatedPressable } from './AnimatedPressable';

interface TaskSheetProps {
  visible: boolean;
  initialDate: Date;
  task: ContentTask | null;
  onClose: () => void;
  onSave: (draft: TaskDraft, taskId?: string) => void;
  onDelete: (task: ContentTask) => void;
}

const TYPES: ContentType[] = ['story', 'reel', 'educational'];
const STATUSES: TaskStatus[] = ['planned', 'in-progress', 'posted'];

export function TaskSheet({
  visible,
  initialDate,
  task,
  onClose,
  onSave,
  onDelete,
}: TaskSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(760)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  const initialType: ContentType = task?.type ?? 'reel';
  const [date, setDate] = useState<Date>(
    task ? fromDateKey(task.date) : initialDate,
  );
  const [type, setType] = useState<ContentType>(initialType);
  const [title, setTitle] = useState(
    task?.title ?? CONTENT_TYPE_META[initialType].defaultTitle,
  );
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'planned');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [titleError, setTitleError] = useState(false);

  const editing = Boolean(task);
  const heading = editing ? 'Edit content task' : 'Schedule new content';

  useEffect(() => {
    if (!visible) {
      closingRef.current = false;
      return;
    }

    closingRef.current = false;
    const nextType: ContentType = task?.type ?? 'reel';
    setDate(task ? fromDateKey(task.date) : initialDate);
    setType(nextType);
    setTitle(task?.title ?? CONTENT_TYPE_META[nextType].defaultTitle);
    setNotes(task?.notes ?? '');
    setStatus(task?.status ?? 'planned');
    setShowDatePicker(false);
    setTitleError(false);

    translateY.setValue(760);
    backdrop.setValue(0);

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 18,
          bounciness: 4,
        }),
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [backdrop, initialDate, task, translateY, visible]);

  const selectedTypeMeta = useMemo(() => CONTENT_TYPE_META[type], [type]);

  const closeAnimated = (afterClose?: () => void) => {
    if (closingRef.current) return;
    closingRef.current = true;
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 760,
        duration: 210,
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: 0,
        duration: 190,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        closingRef.current = false;
        return;
      }
      afterClose?.();
      onClose();
    });
  };

  const runShake = () => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -5, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 5, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  };

  const selectType = (nextType: ContentType) => {
    const currentDefault = CONTENT_TYPE_META[type].defaultTitle;
    const shouldReplaceTitle = !title.trim() || title === currentDefault;

    setType(nextType);
    if (shouldReplaceTitle) {
      setTitle(CONTENT_TYPE_META[nextType].defaultTitle);
    }
    setTitleError(false);
    void Haptics.selectionAsync();
  };

  const handleDateChange = (_event: DateTimePickerEvent, nextDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (nextDate) {
      setDate(nextDate);
      void Haptics.selectionAsync();
    }
  };

  const handleSave = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setTitleError(true);
      runShake();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const draft: TaskDraft = {
      date,
      type,
      title: cleanTitle,
      notes: notes.trim(),
      status,
    };

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeAnimated(() => onSave(draft, task?.id));
  };

  const requestDelete = () => {
    if (!task) return;

    Alert.alert(
      'Delete task?',
      `“${task.title}” will be removed from the schedule.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning,
            );
            closeAnimated(() => onDelete(task));
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => closeAnimated()}
    >
      <View style={styles.modalRoot}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close task form"
            style={StyleSheet.absoluteFill}
            onPress={() => closeAnimated()}
          />
        </Animated.View>

        <KeyboardAvoidingView
          pointerEvents="box-none"
          style={styles.keyboardRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View
            style={[
              styles.sheet,
              SHADOWS.floating,
              {
                paddingBottom: Math.max(insets.bottom, 18),
                transform: [{ translateY }],
              },
            ]}
          >
            <View style={styles.handle} />

            <View style={styles.sheetHeader}>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>CONTENT PLANNER</Text>
                <Text style={styles.heading}>{heading}</Text>
              </View>
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => closeAnimated()}
                style={styles.closeButton}
                scaleTo={0.88}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </AnimatedPressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.form}
            >
              <View>
                <Text style={styles.label}>Content type</Text>
                <View style={styles.typeGrid}>
                  {TYPES.map((item) => {
                    const meta = CONTENT_TYPE_META[item];
                    const active = item === type;
                    return (
                      <AnimatedPressable
                        key={item}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        onPress={() => selectType(item)}
                        style={[
                          styles.typeOption,
                          active && {
                            borderColor: meta.color,
                            backgroundColor: meta.softColor,
                          },
                        ]}
                        scaleTo={0.96}
                      >
                        <View
                          style={[
                            styles.typeOptionDot,
                            { backgroundColor: meta.color },
                          ]}
                        />
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.typeOptionText,
                            active && { color: meta.darkColor },
                          ]}
                        >
                          {meta.label}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text style={styles.label}>Date</Text>
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel="Choose date"
                  onPress={() => setShowDatePicker((current) => !current)}
                  style={styles.dateButton}
                >
                  <View>
                    <Text style={styles.dateValue}>{formatCompactDate(date)}</Text>
                    <Text style={styles.dateHelp}>Tap to change the publishing date</Text>
                  </View>
                  <View style={styles.calendarBadge}>
                    <Text style={styles.calendarMonth}>
                      {date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                    </Text>
                    <Text style={styles.calendarDay}>{date.getDate()}</Text>
                  </View>
                </AnimatedPressable>

                {showDatePicker ? (
                  <View style={styles.datePickerWrap}>
                    <DateTimePicker
                      value={date}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                      accentColor={COLORS.primary}
                    />
                    {Platform.OS === 'ios' ? (
                      <AnimatedPressable
                        onPress={() => setShowDatePicker(false)}
                        style={styles.dateDoneButton}
                      >
                        <Text style={styles.dateDoneText}>Done</Text>
                      </AnimatedPressable>
                    ) : null}
                  </View>
                ) : null}
              </View>

              <Animated.View style={{ transform: [{ translateX: shake }] }}>
                <Text style={styles.label}>Task title</Text>
                <TextInput
                  value={title}
                  onChangeText={(value) => {
                    setTitle(value);
                    if (value.trim()) setTitleError(false);
                  }}
                  placeholder={selectedTypeMeta.defaultTitle}
                  placeholderTextColor={COLORS.muted}
                  selectionColor={COLORS.primary}
                  style={[styles.input, titleError && styles.inputError]}
                  returnKeyType="next"
                />
                {titleError ? (
                  <Text style={styles.errorText}>Please add a task title.</Text>
                ) : null}
              </Animated.View>

              <View>
                <Text style={styles.label}>Notes or content idea</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Caption idea, hook, doctor’s notes, required shots…"
                  placeholderTextColor={COLORS.muted}
                  selectionColor={COLORS.primary}
                  multiline
                  textAlignVertical="top"
                  style={[styles.input, styles.notesInput]}
                />
              </View>

              <View>
                <Text style={styles.label}>Status</Text>
                <View style={styles.statusRow}>
                  {STATUSES.map((item) => {
                    const meta = STATUS_META[item];
                    const active = item === status;
                    return (
                      <AnimatedPressable
                        key={item}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        onPress={() => {
                          setStatus(item);
                          void Haptics.selectionAsync();
                        }}
                        style={[
                          styles.statusOption,
                          active && {
                            backgroundColor: meta.softColor,
                            borderColor: meta.color,
                          },
                        ]}
                        scaleTo={0.96}
                      >
                        <View
                          style={[
                            styles.statusOptionDot,
                            { backgroundColor: meta.color },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusOptionText,
                            active && { color: meta.color },
                          ]}
                        >
                          {meta.label}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.buttonRow}>
                {editing ? (
                  <AnimatedPressable
                    accessibilityRole="button"
                    onPress={requestDelete}
                    style={styles.deleteButton}
                    scaleTo={0.96}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </AnimatedPressable>
                ) : null}

                <AnimatedPressable
                  accessibilityRole="button"
                  onPress={handleSave}
                  style={[styles.saveButtonWrap, !editing && styles.saveButtonFull]}
                  scaleTo={0.97}
                >
                  <LinearGradient
                    colors={[COLORS.rose, COLORS.primary, COLORS.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.saveButton}
                  >
                    <Text style={styles.saveButtonText}>
                      {editing ? 'Save changes' : 'Add to schedule'}
                    </Text>
                    <Text style={styles.saveArrow}>→</Text>
                  </LinearGradient>
                </AnimatedPressable>
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(47, 32, 40, 0.42)',
  },
  keyboardRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '93%',
    overflow: 'hidden',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: COLORS.surface,
  },
  handle: {
    width: 46,
    height: 5,
    alignSelf: 'center',
    marginTop: 10,
    borderRadius: 99,
    backgroundColor: COLORS.borderStrong,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: COLORS.goldDark,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  heading: {
    marginTop: 4,
    color: COLORS.ink,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.45,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryMist,
  },
  closeButtonText: {
    marginTop: -2,
    color: COLORS.primaryDark,
    fontSize: 25,
    lineHeight: 28,
    fontWeight: '400',
  },
  form: {
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 19,
    paddingBottom: 18,
  },
  label: {
    marginBottom: 8,
    color: COLORS.inkSoft,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    minHeight: 57,
    flex: 1,
    paddingHorizontal: 9,
    paddingVertical: 9,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceRaised,
    justifyContent: 'center',
  },
  typeOptionDot: {
    width: 8,
    height: 8,
    marginBottom: 6,
    borderRadius: 99,
  },
  typeOptionText: {
    color: COLORS.inkSoft,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
  },
  dateButton: {
    minHeight: 74,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.primaryMist,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateValue: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  dateHelp: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '500',
  },
  calendarBadge: {
    width: 48,
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  calendarMonth: {
    width: '100%',
    paddingVertical: 3,
    textAlign: 'center',
    color: COLORS.white,
    fontSize: 8,
    fontWeight: '900',
    backgroundColor: COLORS.primary,
  },
  calendarDay: {
    paddingVertical: 4,
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  datePickerWrap: {
    marginTop: 9,
    padding: 8,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  dateDoneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
  },
  dateDoneText: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: COLORS.surfaceRaised,
  },
  inputError: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerSoft,
  },
  errorText: {
    marginTop: 6,
    color: COLORS.danger,
    fontSize: 10.5,
    fontWeight: '700',
  },
  notesInput: {
    minHeight: 104,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 7,
  },
  statusOption: {
    minHeight: 43,
    flex: 1,
    paddingHorizontal: 7,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceRaised,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  statusOptionDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
  },
  statusOptionText: {
    color: COLORS.inkSoft,
    fontSize: 9.5,
    fontWeight: '800',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 2,
  },
  deleteButton: {
    minHeight: 53,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.dangerSoft,
  },
  deleteButtonText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '800',
  },
  saveButtonWrap: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveButtonFull: {
    width: '100%',
  },
  saveButton: {
    minHeight: 55,
    paddingHorizontal: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '900',
  },
  saveArrow: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '400',
  },
});
