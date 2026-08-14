import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { COLORS, SHADOWS } from '../theme';

interface ProgressCardProps {
  label: string;
  value: number;
  target: number;
  posted: number;
  color: string;
  softColor: string;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export function ProgressCard({
  label,
  value,
  target,
  posted,
  color,
  softColor,
  delay = 0,
  style,
}: ProgressCardProps) {
  const entry = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const ratio = Math.min(value / Math.max(target, 1), 1);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(entry, {
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
        speed: 15,
        bounciness: 5,
      }),
    ]).start();
  }, [delay, entry]);

  useEffect(() => {
    Animated.spring(progress, {
      toValue: ratio,
      useNativeDriver: false,
      speed: 16,
      bounciness: 2,
    }).start();
  }, [progress, ratio]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.card,
        SHADOWS.card,
        style,
        {
          opacity: entry,
          transform: [
            {
              translateY: entry.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.icon, { backgroundColor: softColor }]}>
          <View style={[styles.iconDot, { backgroundColor: color }]} />
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>

      <View style={styles.countRow}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.target}> / {target}</Text>
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: color, width }]} />
      </View>

      <Text style={styles.meta}>{posted} posted</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 166,
    padding: 16,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  icon: {
    width: 27,
    height: 27,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  label: {
    flex: 1,
    color: COLORS.inkSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 14,
  },
  value: {
    color: COLORS.ink,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  target: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  track: {
    height: 7,
    marginTop: 12,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: COLORS.primaryMist,
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  meta: {
    marginTop: 8,
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
  },
});
