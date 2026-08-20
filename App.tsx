import * as Haptics from 'expo-haptics';
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  LayoutAnimation,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
} from 'react-native-safe-area-context';

import { AnimatedPressable } from './src/components/AnimatedPressable';
import { CalendarGrid } from './src/components/CalendarGrid';
import { ProgressCard } from './src/components/ProgressCard';
import { TaskCard } from './src/components/TaskCard';
import { TaskSheet } from './src/components/TaskSheet';
import { isSupabaseConfigured } from './src/lib/supabase';
import {
  createTask,
  deleteTask,
  loadTasks,
  subscribeToTaskChanges,
  updateTask,
} from './src/storage/taskStorage';
import {
  COLORS,
  CONTENT_TYPE_META,
  SHADOWS,
} from './src/theme';
import type { ContentTask, TaskDraft } from './src/types';
import {
  addMonths,
  countTaskOccurrencesInMonth,
  daysInMonth,
  formatLongDate,
  formatMonthTitle,
  fromDateKey,
  isSameMonth,
  monthKey,
  startOfMonth,
  taskOccursOnDate,
  toDateKey,
} from './src/utils/date';

SplashScreen.setOptions({ duration: 500, fade: true });

const createTaskId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

type SyncState = 'loading' | 'syncing' | 'synced' | 'error' | 'not-configured';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Could not sync with Supabase.';

function PlannerApp() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 760;
  const compact = width < 520;

  const today = useMemo(() => new Date(), []);
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [tasks, setTasks] = useState<ContentTask[]>([]);
  const [syncState, setSyncState] = useState<SyncState>(
    isSupabaseConfigured ? 'loading' : 'not-configured',
  );
  const [syncError, setSyncError] = useState('');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<ContentTask | null>(null);

  const heroEntry = useRef(new Animated.Value(0)).current;
  const calendarEntry = useRef(new Animated.Value(0)).current;
  const fabEntry = useRef(new Animated.Value(0)).current;

  const refreshTasks = useCallback(async (showLoading = false) => {
    if (!isSupabaseConfigured) {
      setSyncState('not-configured');
      return;
    }

    if (showLoading) setSyncState('loading');

    try {
      const remoteTasks = await loadTasks();
      setTasks(remoteTasks);
      setSyncState('synced');
      setSyncError('');
    } catch (error) {
      setSyncState('error');
      setSyncError(errorMessage(error));
      console.warn('Could not load tasks from Supabase.', error);
    }
  }, []);

  useEffect(() => {
    void refreshTasks(true);

    const unsubscribe = subscribeToTaskChanges(
      () => {
        void refreshTasks(false);
      },
      (error) => {
        setSyncState('error');
        setSyncError(error.message);
      },
    );

    return unsubscribe;
  }, [refreshTasks]);

  useEffect(() => {
    Animated.stagger(110, [
      Animated.spring(heroEntry, {
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
        speed: 15,
        bounciness: 5,
      }),
      Animated.spring(fabEntry, {
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
        speed: 15,
        bounciness: 8,
      }),
    ]).start();
  }, [fabEntry, heroEntry]);

  useEffect(() => {
    calendarEntry.setValue(0);
    Animated.spring(calendarEntry, {
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
      speed: 17,
      bounciness: 3,
    }).start();
  }, [calendarEntry, displayMonth]);


  const monthTasks = useMemo(
    () => tasks.filter((task) => countTaskOccurrencesInMonth(task, displayMonth) > 0),
    [displayMonth, tasks],
  );

  const selectedTasks = useMemo(
    () =>
      tasks
        .filter((task) => taskOccursOnDate(task, toDateKey(selectedDate)))
        .sort((left, right) => {
          if (left.status === right.status) {
            return left.createdAt.localeCompare(right.createdAt);
          }
          if (left.status === 'posted') return 1;
          if (right.status === 'posted') return -1;
          return 0;
        }),
    [selectedDate, tasks],
  );

  const progress = useMemo(() => {
    const reelTasks = monthTasks.filter((task) => task.type === 'reel');
    const educationTasks = monthTasks.filter(
      (task) => task.type === 'educational',
    );
    const storyTasks = monthTasks.filter((task) => task.type === 'story');
    const totalDays = daysInMonth(displayMonth);
    const monthPrefix = monthKey(displayMonth);

    const storyDays = Array.from({ length: totalDays }, (_, index) =>
      `${monthPrefix}-${String(index + 1).padStart(2, '0')}`,
    );
    const scheduledStoryDays = storyDays.filter((dayKey) =>
      storyTasks.some((task) => taskOccursOnDate(task, dayKey)),
    ).length;
    const postedStoryDays = storyDays.filter((dayKey) =>
      storyTasks.some(
        (task) => task.status === 'posted' && taskOccursOnDate(task, dayKey),
      ),
    ).length;

    const countOccurrences = (items: ContentTask[]) =>
      items.reduce(
        (sum, task) => sum + countTaskOccurrencesInMonth(task, displayMonth),
        0,
      );

    return {
      reels: {
        value: countOccurrences(reelTasks),
        target: 8,
        posted: countOccurrences(reelTasks.filter((task) => task.status === 'posted')),
      },
      stories: {
        value: scheduledStoryDays,
        target: totalDays,
        posted: postedStoryDays,
      },
      education: {
        value: countOccurrences(educationTasks),
        target: 4,
        posted: countOccurrences(
          educationTasks.filter((task) => task.status === 'posted'),
        ),
      },
    };
  }, [displayMonth, monthTasks]);

  const syncMeta = useMemo(() => {
    switch (syncState) {
      case 'synced':
        return { label: 'Supabase synced', color: COLORS.success };
      case 'syncing':
        return { label: 'Syncing…', color: COLORS.primary };
      case 'error':
        return { label: 'Sync error', color: COLORS.danger };
      case 'not-configured':
        return { label: 'Supabase setup needed', color: COLORS.warning };
      default:
        return { label: 'Loading plan', color: COLORS.warning };
    }
  }, [syncState]);

  const configureLayout = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const openAddSheet = (date: Date) => {
    setSelectedDate(date);
    if (!isSameMonth(date, displayMonth)) {
      setDisplayMonth(startOfMonth(date));
    }
    setEditingTask(null);
    setSheetVisible(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openEditSheet = (task: ContentTask) => {
    const taskDate = fromDateKey(task.date);
    setSelectedDate(taskDate);
    if (!isSameMonth(taskDate, displayMonth)) {
      setDisplayMonth(startOfMonth(taskDate));
    }
    setEditingTask(task);
    setSheetVisible(true);
    void Haptics.selectionAsync();
  };

  const closeSheet = () => {
    setSheetVisible(false);
    setEditingTask(null);
  };

  const handleSaveTask = (draft: TaskDraft, taskId?: string) => {
    configureLayout();
    const now = new Date().toISOString();
    const date = toDateKey(draft.date);

    const existingTask = taskId
      ? tasks.find((task) => task.id === taskId)
      : undefined;

    const taskToSave: ContentTask = existingTask
      ? {
          ...existingTask,
          ...draft,
          date,
          updatedAt: now,
        }
      : {
          id: createTaskId(),
          ...draft,
          date,
          createdAt: now,
          updatedAt: now,
        };

    setSelectedDate(draft.date);
    setDisplayMonth(startOfMonth(draft.date));
    setSyncState('syncing');
    setSyncError('');

    void (async () => {
      try {
        if (existingTask) {
          await updateTask(taskToSave);
          setTasks((current) =>
            current.map((task) =>
              task.id === taskToSave.id ? taskToSave : task,
            ),
          );
        } else {
          await createTask(taskToSave);
          setTasks((current) =>
            current.some((task) => task.id === taskToSave.id)
              ? current.map((task) =>
                  task.id === taskToSave.id ? taskToSave : task,
                )
              : [...current, taskToSave],
          );
        }

        setSyncState('synced');
      } catch (error) {
        setSyncState('error');
        setSyncError(errorMessage(error));
        console.warn('Could not save task to Supabase.', error);
      }
    })();
  };

  const handleDeleteTask = (taskToDelete: ContentTask) => {
    configureLayout();
    setSyncState('syncing');
    setSyncError('');

    void (async () => {
      try {
        await deleteTask(taskToDelete.id);
        setTasks((current) =>
          current.filter((task) => task.id !== taskToDelete.id),
        );
        setSyncState('synced');
      } catch (error) {
        setSyncState('error');
        setSyncError(errorMessage(error));
        console.warn('Could not delete task from Supabase.', error);
      }
    })();
  };

  const handleMarkPosted = (taskToUpdate: ContentTask) => {
    configureLayout();
    const updatedTask: ContentTask = {
      ...taskToUpdate,
      status: 'posted',
      updatedAt: new Date().toISOString(),
    };

    setSyncState('syncing');
    setSyncError('');

    void (async () => {
      try {
        await updateTask(updatedTask);
        setTasks((current) =>
          current.map((task) =>
            task.id === updatedTask.id ? updatedTask : task,
          ),
        );
        setSyncState('synced');
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      } catch (error) {
        setSyncState('error');
        setSyncError(errorMessage(error));
        console.warn('Could not mark task as posted in Supabase.', error);
      }
    })();
  };

  const moveMonth = (amount: number) => {
    const nextMonth = addMonths(displayMonth, amount);
    setDisplayMonth(nextMonth);
    setSelectedDate(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1, 12));
    void Haptics.selectionAsync();
  };

  const goToToday = () => {
    const now = new Date();
    setDisplayMonth(startOfMonth(now));
    setSelectedDate(now);
    void Haptics.selectionAsync();
  };

  return (
    <LinearGradient
      colors={[COLORS.background, '#FFF4F8', COLORS.backgroundWarm]}
      locations={[0, 0.58, 1]}
      style={styles.appBackground}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.pageShell}>
            <Animated.View
              style={[
                styles.hero,
                SHADOWS.card,
                {
                  opacity: heroEntry,
                  transform: [
                    {
                      translateY: heroEntry.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-22, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['#FFFFFF', '#FFF4F8', '#FCEAF1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroCircleLarge} />
              <View style={styles.heroCircleSmall} />

              <View style={[styles.heroInner, isTablet && styles.heroInnerTablet]}>
                <View
                  style={[
                    styles.logoCard,
                    compact && styles.logoCardCompact,
                    isTablet && styles.logoCardTablet,
                  ]}
                >
                  <Image
                    source={require('./assets/logo.png')}
                    resizeMode="contain"
                    style={styles.logo}
                    accessibilityLabel="Dr. Ashraf Metwally Cosmetic Surgery Center logo"
                  />
                </View>

                <View style={styles.heroCopy}>
                  <View style={styles.brandPill}>
                    <View style={styles.brandPillDot} />
                    <Text style={styles.brandPillText}>SOCIAL MEDIA PLAN</Text>
                  </View>
                  <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>
                    Content Planner
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    Schedule each story, reel and educational video by its publishing date.
                  </Text>
                  <View style={styles.planLine}>
                    <Text style={styles.planLineStrong}>Monthly target:</Text>
                    <Text style={styles.planLineText}>
                      {' '}8 reels (2/week) · daily stories · 4 educational videos (1/week)
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            <View style={styles.sectionHeadingRow}>
              <View>
                <Text style={styles.sectionEyebrow}>MONTHLY OVERVIEW</Text>
                <Text style={styles.sectionTitle}>Plan progress</Text>
              </View>
              <View style={styles.savedPill}>
                <View
                  style={[styles.savedDot, { backgroundColor: syncMeta.color }]}
                />
                <Text style={styles.savedText}>{syncMeta.label}</Text>
              </View>
            </View>

            {syncState === 'error' || syncState === 'not-configured' ? (
              <View style={styles.syncNotice}>
                <Text style={styles.syncNoticeText}>
                  {syncState === 'not-configured'
                    ? 'Connect Supabase by adding the Project URL and Publishable key to your environment variables.'
                    : syncError || 'Could not connect to Supabase. Check the project URL, key and RLS policies.'}
                </Text>
              </View>
            ) : null}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.progressRow}
            >
              <ProgressCard
                label="Reels"
                value={progress.reels.value}
                target={progress.reels.target}
                posted={progress.reels.posted}
                color={CONTENT_TYPE_META.reel.color}
                softColor={CONTENT_TYPE_META.reel.softColor}
                delay={120}
                style={styles.progressCard}
              />
              <ProgressCard
                label="Story days"
                value={progress.stories.value}
                target={progress.stories.target}
                posted={progress.stories.posted}
                color={CONTENT_TYPE_META.story.color}
                softColor={CONTENT_TYPE_META.story.softColor}
                delay={210}
                style={styles.progressCard}
              />
              <ProgressCard
                label="Educational videos"
                value={progress.education.value}
                target={progress.education.target}
                posted={progress.education.posted}
                color={CONTENT_TYPE_META.educational.color}
                softColor={CONTENT_TYPE_META.educational.softColor}
                delay={300}
                style={styles.progressCard}
              />
            </ScrollView>

            <View style={styles.calendarHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>PUBLISHING CALENDAR</Text>
                <Text style={styles.monthTitle}>{formatMonthTitle(displayMonth)}</Text>
              </View>

              <View style={styles.monthActions}>
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                  onPress={() => moveMonth(-1)}
                  style={styles.monthArrow}
                  scaleTo={0.88}
                >
                  <Text style={styles.monthArrowText}>‹</Text>
                </AnimatedPressable>

                {!compact ? (
                  <AnimatedPressable
                    accessibilityRole="button"
                    onPress={goToToday}
                    style={styles.todayButton}
                    scaleTo={0.95}
                  >
                    <Text style={styles.todayButtonText}>Today</Text>
                  </AnimatedPressable>
                ) : null}

                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  onPress={() => moveMonth(1)}
                  style={styles.monthArrow}
                  scaleTo={0.88}
                >
                  <Text style={styles.monthArrowText}>›</Text>
                </AnimatedPressable>
              </View>
            </View>

            <Animated.View
              style={[
                SHADOWS.card,
                {
                  opacity: calendarEntry,
                  transform: [
                    {
                      translateY: calendarEntry.interpolate({
                        inputRange: [0, 1],
                        outputRange: [14, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <CalendarGrid
                month={displayMonth}
                selectedDate={selectedDate}
                tasks={tasks}
                onSelectDate={setSelectedDate}
                onAddDate={openAddSheet}
              />
            </Animated.View>

            {compact ? (
              <AnimatedPressable
                accessibilityRole="button"
                onPress={goToToday}
                style={styles.mobileTodayButton}
              >
                <Text style={styles.todayButtonText}>Jump to today</Text>
              </AnimatedPressable>
            ) : null}

            <View style={styles.agendaHeader}>
              <View style={styles.agendaHeaderCopy}>
                <Text style={styles.sectionEyebrow}>SELECTED DATE</Text>
                <Text style={styles.agendaTitle}>{formatLongDate(selectedDate)}</Text>
                <Text style={styles.agendaCount}>
                  {selectedTasks.length === 0
                    ? 'No content scheduled yet'
                    : `${selectedTasks.length} task${selectedTasks.length === 1 ? '' : 's'} scheduled`}
                </Text>
              </View>

              <AnimatedPressable
                accessibilityRole="button"
                onPress={() => openAddSheet(selectedDate)}
                style={styles.inlineAddButton}
                scaleTo={0.96}
              >
                <Text style={styles.inlineAddPlus}>+</Text>
                <Text style={styles.inlineAddText}>Add task</Text>
              </AnimatedPressable>
            </View>

            {selectedTasks.length > 0 ? (
              <View style={[styles.taskGrid, isTablet && styles.taskGridTablet]}>
                {selectedTasks.map((task) => (
                  <View
                    key={task.id}
                    style={isTablet ? styles.taskCardTablet : styles.taskCardMobile}
                  >
                    <TaskCard
                      task={task}
                      onEdit={openEditSheet}
                      onMarkPosted={handleMarkPosted}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.emptyState, SHADOWS.card]}>
                <View style={styles.emptyIcon}>
                  <Text style={styles.emptyIconText}>+</Text>
                </View>
                <Text style={styles.emptyTitle}>This day is ready for content</Text>
                <Text style={styles.emptyText}>
                  Add a story, reel or educational video and it will be saved automatically.
                </Text>
                <AnimatedPressable
                  accessibilityRole="button"
                  onPress={() => openAddSheet(selectedDate)}
                  style={styles.emptyButton}
                  scaleTo={0.96}
                >
                  <Text style={styles.emptyButtonText}>Schedule the first task</Text>
                </AnimatedPressable>
              </View>
            )}
          </View>
        </ScrollView>

        <Animated.View
          style={[
            styles.fabPosition,
            { pointerEvents: 'box-none' },
            {
              opacity: fabEntry,
              transform: [
                {
                  translateY: fabEntry.interpolate({
                    inputRange: [0, 1],
                    outputRange: [60, 0],
                  }),
                },
                {
                  scale: fabEntry.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Add content task"
            onPress={() => openAddSheet(selectedDate)}
            style={[styles.fab, SHADOWS.floating]}
            scaleTo={0.9}
          >
            <LinearGradient
              colors={[COLORS.rose, COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}
            >
              <Text style={styles.fabPlus}>+</Text>
            </LinearGradient>
          </AnimatedPressable>
        </Animated.View>

        <TaskSheet
          visible={sheetVisible}
          initialDate={selectedDate}
          task={editingTask}
          onClose={closeSheet}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <PlannerApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appBackground: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 128,
  },
  pageShell: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  hero: {
    minHeight: 220,
    overflow: 'hidden',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroCircleLarge: {
    position: 'absolute',
    width: 260,
    height: 260,
    right: -96,
    top: -112,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(228, 42, 104, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.23)',
  },
  heroCircleSmall: {
    position: 'absolute',
    width: 118,
    height: 118,
    right: 40,
    bottom: -70,
    borderRadius: 999,
    backgroundColor: 'rgba(180, 147, 97, 0.08)',
  },
  heroInner: {
    flex: 1,
    padding: 18,
    gap: 16,
  },
  heroInnerTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    gap: 26,
  },
  logoCard: {
    width: '100%',
    height: 132,
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(180, 147, 97, 0.22)',
    backgroundColor: '#F7F0E9',
  },
  logoCardCompact: {
    height: 112,
  },
  logoCardTablet: {
    width: 330,
    height: 196,
    flexShrink: 0,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  heroCopy: {
    flex: 1,
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  brandPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.76)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  brandPillDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: COLORS.primary,
  },
  brandPillText: {
    color: COLORS.primaryDark,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.05,
  },
  heroTitle: {
    marginTop: 13,
    color: COLORS.ink,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '900',
    letterSpacing: -1.15,
  },
  heroTitleCompact: {
    fontSize: 29,
    lineHeight: 34,
  },
  heroSubtitle: {
    maxWidth: 590,
    marginTop: 8,
    color: COLORS.inkSoft,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  planLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  planLineStrong: {
    color: COLORS.goldDark,
    fontSize: 11,
    fontWeight: '900',
  },
  planLineText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 28,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionEyebrow: {
    color: COLORS.goldDark,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.35,
  },
  sectionTitle: {
    marginTop: 4,
    color: COLORS.ink,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.45,
  },
  savedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  savedDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
  },
  savedText: {
    color: COLORS.inkSoft,
    fontSize: 9.5,
    fontWeight: '800',
  },
  progressRow: {
    gap: 10,
    paddingHorizontal: 1,
    paddingBottom: 8,
  },
  progressCard: {
    width: 177,
  },
  syncNotice: {
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.primaryMist,
  },
  syncNoticeText: {
    color: COLORS.inkSoft,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 27,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  monthTitle: {
    marginTop: 4,
    color: COLORS.ink,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.55,
  },
  monthActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  monthArrow: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  monthArrowText: {
    marginTop: -3,
    color: COLORS.primaryDark,
    fontSize: 28,
    lineHeight: 31,
    fontWeight: '400',
  },
  todayButton: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  todayButtonText: {
    color: COLORS.primaryDark,
    fontSize: 10.5,
    fontWeight: '900',
  },
  mobileTodayButton: {
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  agendaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 30,
    marginBottom: 13,
    paddingHorizontal: 2,
  },
  agendaHeaderCopy: {
    flex: 1,
  },
  agendaTitle: {
    marginTop: 4,
    color: COLORS.ink,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: -0.35,
  },
  agendaCount: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 10.5,
    fontWeight: '600',
  },
  inlineAddButton: {
    minHeight: 42,
    paddingHorizontal: 13,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.primary,
  },
  inlineAddPlus: {
    marginTop: -1,
    color: COLORS.white,
    fontSize: 18,
    lineHeight: 19,
    fontWeight: '500',
  },
  inlineAddText: {
    color: COLORS.white,
    fontSize: 10.5,
    fontWeight: '900',
  },
  taskGrid: {
    gap: 11,
  },
  taskGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  taskCardMobile: {
    width: '100%',
  },
  taskCardTablet: {
    width: '50%',
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 28,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  emptyIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  emptyIconText: {
    marginTop: -2,
    color: COLORS.primary,
    fontSize: 27,
    lineHeight: 30,
    fontWeight: '400',
  },
  emptyTitle: {
    marginTop: 13,
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyText: {
    maxWidth: 460,
    marginTop: 7,
    color: COLORS.muted,
    fontSize: 11.5,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 16,
    paddingHorizontal: 17,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: 10.5,
    fontWeight: '900',
  },
  fabPosition: {
    position: 'absolute',
    right: 20,
    bottom: 24,
  },
  fab: {
    width: 62,
    height: 62,
    overflow: 'hidden',
    borderRadius: 22,
  },
  fabGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPlus: {
    marginTop: -4,
    color: COLORS.white,
    fontSize: 35,
    lineHeight: 39,
    fontWeight: '300',
  },
});
