// GR Nutritions "HK2" design system: graphite + mint at the top of every page,
// a warm sand shelf below. Legacy names (obsidian, bone, lime, violet…) stay as
// aliases so older components follow the palette; new code uses semantic names.
const palette = {
  graphite: '#121417',
  graphiteRaised: '#1B1F24',
  graphiteLine: '#2A2F36',
  graphiteMuted: '#9BA3AE',
  mint: '#3EE6B0',
  mintPressed: '#2FCF9C',
  mintSoft: '#DDF7EE',
  // Mint text/icons on light surfaces (AA on sand and white).
  mintInk: '#0B7A5C',
  // Text on solid mint fills.
  onMint: '#0B2A21',
  olive: '#5C6B2E',
  sand: '#F2EEE6',
  sandSoft: '#F7F4EE',
  paper: '#FFFFFF',
  ink: '#1C1C17',
  inkMuted: '#3F3D35',
  slate: '#6B6658',
  hairline: '#E2DCCF',
  danger: '#B42318',
  dangerSoft: '#FDECEA',
  success: '#0B7A5C',
  successSoft: '#DDF7EE',
} as const;

export const colors = {
  ...palette,
  // Page background
  obsidian: palette.sand,
  // Card / raised surface
  obsidianRaised: palette.paper,
  // Subtle filled surface
  graphiteSurface: palette.sandSoft,
  // Primary text
  bone: palette.ink,
  boneMuted: palette.inkMuted,
  // Accent fill (CTAs). Pair with onMint text.
  lime: palette.mint,
  limePressed: palette.mintPressed,
  // Muted text
  mineral: palette.slate,
  // Brand dark (icons, links, dark panels)
  violet: palette.graphite,
  line: palette.hairline,
  onDark: '#F2F4F7',
  onDarkMuted: palette.graphiteMuted,
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
    heading: 30,
    display: 60,
    hero: 84,
  },
  lineHeights: {
    caption: 17,
    label: 20,
    body: 25,
    bodyLarge: 28,
    title: 28,
    heading: 36,
    display: 60,
    hero: 80,
  },
} as const;

export const shadows = {
  card: {
    shadowColor: '#121417',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  raised: {
    shadowColor: '#121417',
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
  color: palette.mintInk,
  width: 2,
  offset: 2,
} as const;

export const layout = {
  pageMaxWidth: 1280,
  readableMaxWidth: 720,
  minimumPressTarget: 44,
} as const;
