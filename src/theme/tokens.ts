export const colors = {
  obsidian: '#F7F7F2',
  obsidianRaised: '#FFFFFF',
  graphite: '#EDF0E7',
  bone: '#161918',
  boneMuted: '#454E43',
  lime: '#EF4B32',
  limePressed: '#D63B25',
  mineral: '#6A7466',
  violet: '#214A33',
  danger: '#B33325',
  success: '#2B7046',
  line: '#DEE3D8',
  transparent: 'transparent',
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

export const typography = {
  display: 'BarlowCondensed_700Bold',
  displayHeavy: 'BarlowCondensed_800ExtraBold',
  displayMedium: 'DMSans_600SemiBold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemibold: 'DMSans_600SemiBold',
  bodyBold: 'DMSans_700Bold',
  bodyHeavy: 'DMSans_700Bold',
  sizes: {
    caption: 12,
    label: 14,
    body: 16,
    bodyLarge: 18,
    title: 24,
    heading: 34,
    display: 56,
    hero: 76,
  },
  lineHeights: {
    caption: 16,
    label: 20,
    body: 24,
    bodyLarge: 28,
    title: 30,
    heading: 40,
    display: 62,
    hero: 80,
  },
} as const;

export const breakpoints = {
  mobileMax: 767,
  tabletMin: 768,
  tabletMax: 1199,
  desktopMin: 1200,
} as const;

export const motion = {
  reduced: 0,
  quick: 160,
  standard: 220,
  expressive: 280,
} as const;

export const focus = {
  color: colors.violet,
  width: 2,
  offset: 2,
} as const;

export const layout = {
  pageMaxWidth: 1240,
  readableMaxWidth: 720,
  minimumPressTarget: 44,
} as const;
