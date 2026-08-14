import { Platform } from 'react-native';
import type { ContentType, TaskStatus } from './types';

export const COLORS = {
  background: '#FFF9FB',
  backgroundWarm: '#FBF5F0',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFCFD',
  primary: '#E42A68',
  primaryDark: '#B81750',
  primaryDeep: '#8E123D',
  primarySoft: '#FDE8F0',
  primaryMist: '#FFF2F6',
  rose: '#F06B95',
  roseSoft: '#FCE9F0',
  gold: '#B49361',
  goldDark: '#8E6F43',
  goldSoft: '#F7F0E5',
  ink: '#2F2028',
  inkSoft: '#5C4D55',
  muted: '#8B7B83',
  border: '#F0DCE4',
  borderStrong: '#E7C4D1',
  success: '#16856B',
  successSoft: '#E7F6F1',
  warning: '#B9791D',
  warningSoft: '#FFF4D9',
  danger: '#D64B62',
  dangerSoft: '#FDECEF',
  shadow: '#5B2137',
  white: '#FFFFFF',
} as const;

export const CONTENT_TYPE_META: Record<
  ContentType,
  {
    label: string;
    shortLabel: string;
    defaultTitle: string;
    color: string;
    darkColor: string;
    softColor: string;
  }
> = {
  story: {
    label: 'Story',
    shortLabel: 'Story',
    defaultTitle: 'Daily Story',
    color: COLORS.rose,
    darkColor: '#B6325C',
    softColor: COLORS.roseSoft,
  },
  reel: {
    label: 'Reel',
    shortLabel: 'Reel',
    defaultTitle: 'New Reel',
    color: COLORS.primary,
    darkColor: COLORS.primaryDark,
    softColor: COLORS.primarySoft,
  },
  educational: {
    label: 'Educational Video',
    shortLabel: 'Education',
    defaultTitle: 'Educational Video',
    color: COLORS.gold,
    darkColor: COLORS.goldDark,
    softColor: COLORS.goldSoft,
  },
};

export const STATUS_META: Record<
  TaskStatus,
  { label: string; color: string; softColor: string }
> = {
  planned: {
    label: 'Planned',
    color: COLORS.primaryDark,
    softColor: COLORS.primarySoft,
  },
  'in-progress': {
    label: 'In progress',
    color: COLORS.warning,
    softColor: COLORS.warningSoft,
  },
  posted: {
    label: 'Posted',
    color: COLORS.success,
    softColor: COLORS.successSoft,
  },
};

export const SHADOWS = Platform.OS === 'web'
  ? ({
      card: {
        boxShadow: '0 8px 18px rgba(91, 33, 55, 0.08)',
      },
      floating: {
        boxShadow: '0 12px 18px rgba(142, 18, 61, 0.25)',
      },
    } as const)
  : ({
      card: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
        elevation: 4,
      },
      floating: {
        shadowColor: COLORS.primaryDeep,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 18,
        elevation: 9,
      },
    } as const);
