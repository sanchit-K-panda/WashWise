export const colors = {
  bg: '#FFFFFF',
  surface: '#F3F8FC',
  sky: {
    50: '#EAF4FB',
    200: '#BFDDF2',
    500: '#3B9AD9',
    700: '#1F6FA8',
  },
  ink: {
    DEFAULT: '#0F2230',
    muted: '#5B7083',
  },
  hairline: '#DCE7F0',
  status: {
    available: '#1E9E6A',
    in_use: '#3B9AD9',
    maintenance: '#C98A1B',
    broken: '#CF4B4B',
  },
} as const;

export const typography = {
  screenTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600' as const,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  section: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as const,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  body: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400' as const,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  monoTimer: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '600' as const,
    fontFamily: 'JetBrainsMono_600SemiBold',
  },
  monoMachineId: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '600' as const,
    fontFamily: 'JetBrainsMono_600SemiBold',
  },
} as const;

export const spacing = {
  screenPadding: 20,
  grid: 8,
  minTapTarget: 48,
} as const;

export const radius = {
  max: 12,
  input: 10,
  chip: 9999,
} as const;

export const theme = {
  colors,
  typography,
  spacing,
  radius,
} as const;

export default theme;
