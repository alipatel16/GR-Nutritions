// GR Nutritions "Midnight & Gold" design system.
// Legacy token names (obsidian, bone, lime, violet…) are kept as aliases so every
// screen picks up the new palette; new code should prefer the semantic names.
const palette = {
  midnight: '#0A1020',
  midnightRaised: '#121A2E',
  midnightLine: '#24304A',
  midnightMuted: '#97A3B8',
  gold: '#D4A537',
  goldPressed: '#BE8F26',
  goldSoft: '#F6EBCB',
  goldInk: '#7A5600',
  ivory: '#F6F4EF',
  paper: '#FFFFFF',
  sand: '#EEEAE1',
  ink: '#0A1020',
  inkMuted: '#3A4458',
  slate: '#5D677A',
  hairline: '#E3DED3',
  danger: '#B42318',
  dangerSoft: '#FDECEA',
  success: '#127A46',
  successSoft: '#E5F4EC',
} as const;

export const colors = {
  ...palette,
  // Page background
  obsidian: palette.ivory,
  // Card / raised surface
  obsidianRaised: palette.paper,
  // Subtle filled surface
  graphite: palette.sand,
  // Primary text
  bone: palette.ink,
  boneMuted: palette.inkMuted,
  // Accent (CTA fills). Use goldInk for accent text on light surfaces.
  lime: palette.gold,
  limePressed: palette.goldPressed,
  // Muted text
  mineral: palette.slate,
  // Brand dark (icons, links, dark panels)
  violet: palette.midnight,
  line: palette.hairline,
  onDark: '#F8FAFC',
  onDarkMuted: palette.midnightMuted,
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
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const typography = {
  display: 'BarlowCondensed_700Bold',
  displayHeavy: 'BarlowCondensed_800ExtraBold',
  displayMedium: 'DMSans_700Bold',
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
    title: 22,
    heading: 40,
    display: 60,
    hero: 84,
  },
  lineHeights: {
    caption: 17,
    label: 20,
    body: 25,
    bodyLarge: 28,
    title: 28,
    heading: 42,
    display: 60,
    hero: 80,
  },
} as const;

export const shadows = {
  card: {
    shadowColor: '#0A1020',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  raised: {
    shadowColor: '#0A1020',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
    elevation: 6,
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
  color: palette.gold,
  width: 2,
  offset: 2,
} as const;

export const layout = {
  pageMaxWidth: 1280,
  readableMaxWidth: 720,
  minimumPressTarget: 44,
} as const;
