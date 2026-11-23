export const colors = {
  bg: '#E3F1FB',
  surface: 'rgba(255, 255, 255, 0.78)',
  glass: 'rgba(255, 255, 255, 0.78)',
  glassBorder: 'rgba(255, 255, 255, 0.85)',
  sky: {
    50: '#EAF4FB',
    200: '#B3DDF7',
    500: '#2F8BD0',
    700: '#1F6FA8',
  },
  ink: {
    DEFAULT: '#0B2233',
    muted: '#4F6A80',
  },
  hairline: 'rgba(15, 34, 48, 0.07)',
  status: {
    available: '#1E9E6A',
    in_use: '#1F6FA8',
    maintenance: '#C07A1A',
    broken: '#CF4B4B',
  },
  warn: {
    bg: 'rgba(255, 244, 222, 0.9)',
    border: '#E9C98A',
    text: '#6B4A0E',
  },
  destructive: '#CF4B4B',
  ghostText: '#B83A3A',
} as const;

export const typography = {
  screenTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '500' as const,
    fontFamily: 'PlusJakartaSans_500Medium',
    letterSpacing: -0.4,
  },
  section: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500' as const,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  monoTimer: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '500' as const,
    fontFamily: 'JetBrainsMono_500Medium',
  },
  monoMachineId: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '500' as const,
    fontFamily: 'JetBrainsMono_500Medium',
  },
  monoMachineIdSmall: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '500' as const,
    fontFamily: 'JetBrainsMono_500Medium',
  },
} as const;

export const spacing = {
  screenPadding: 16,
  grid: 8,
  minTapTarget: 48,
} as const;

export const radius = {
  max: 20,
  card: 20,
  sheet: 28,
  input: 16,
  chip: 99,
  tab: 24,
  button: 16,
} as const;

export const theme = {
  colors,
  typography,
  spacing,
  radius,
} as const;

export default theme;
