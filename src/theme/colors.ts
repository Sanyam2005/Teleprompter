/**
 * Dark, high-contrast theme tuned for a teleprompter / pro-camera UX.
 */
export const colors = {
  background: '#0A0A0C',
  surface: '#141418',
  surfaceElevated: '#1C1C22',
  surfaceHighlight: '#26262E',
  border: '#2A2A33',

  primary: '#4F8CFF',
  primaryPressed: '#3D72D6',
  primaryMuted: '#22304D',

  danger: '#FF453A',
  dangerMuted: '#3A1F1F',
  success: '#32D74B',
  warning: '#FFD60A',
  recording: '#FF3B30',

  text: '#F5F5F7',
  textSecondary: '#A1A1AA',
  textTertiary: '#6B6B73',

  scrim: 'rgba(0,0,0,0.38)',
  glass: 'rgba(18,18,22,0.72)',
  glassBorder: 'rgba(255,255,255,0.08)',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const typography = {
  kicker: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 2 },
  title: { fontSize: 30, fontWeight: '800' as const },
  heading: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
} as const;
