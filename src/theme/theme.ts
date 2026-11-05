/**
 * Püre Design System — React Native / Expo tema dosyası
 * Kaynak: docs/DESIGN.md ("Püre" açık tema)
 *
 * Font kurulumu:
 *   npx expo install @expo-google-fonts/plus-jakarta-sans @expo-google-fonts/inter expo-font
 * _layout.tsx içinde:
 *   const [fontsLoaded] = useFonts({
 *     PlusJakartaSans_600SemiBold,
 *     PlusJakartaSans_700Bold,
 *     Inter_400Regular,
 *     Inter_600SemiBold,
 *     Inter_700Bold,
 *   });
 */

export const colors = {
  // Yüzeyler (açık tema)
  background: '#f8f9fa',
  surface: '#f8f9fa',
  surfaceContainerLowest: '#ffffff', // Kartlar için saf beyaz
  surfaceContainerLow: '#f3f4f5',
  surfaceContainer: '#edeeef',
  surfaceContainerHigh: '#e7e8e9',
  surfaceContainerHighest: '#e1e3e4',
  surfaceVariant: '#e1e3e4',
  headerSurface: '#E8F3ED',

  // Metin / ikon üstü renkler
  onSurface: '#191c1d',       // Ana metin
  onSurfaceVariant: '#414846', // İkincil metin
  onBackground: '#191c1d',
  inverseSurface: '#2e3132',
  inverseOnSurface: '#f0f1f2',

  outline: '#717976',
  outlineVariant: '#c1c8c4',

  // Birincil — Koyu Orman Yeşili
  primary: '#01261f',
  onPrimary: '#ffffff',
  primaryContainer: '#1a3c34',
  onPrimaryContainer: '#83a69c',
  inversePrimary: '#aacec3',
  primaryFixed: '#c5eadf',
  primaryFixedDim: '#aacec3',
  onPrimaryFixed: '#00201a',
  onPrimaryFixedVariant: '#2b4d44',
  surfaceTint: '#43655c',

  // İkincil — Nane Yeşili
  secondary: '#416656',
  onSecondary: '#ffffff',
  secondaryContainer: '#c3ecd7',
  onSecondaryContainer: '#476c5b',
  secondaryFixed: '#c3ecd7',
  secondaryFixedDim: '#a8cfbc',
  onSecondaryFixed: '#002115',
  onSecondaryFixedVariant: '#294e3f',

  // Üçüncül — Turuncu (uyarı)
  tertiary: '#3c1500',
  onTertiary: '#ffffff',
  tertiaryContainer: '#5e2500',
  onTertiaryContainer: '#ff781c',
  tertiaryFixed: '#ffdbca',
  tertiaryFixedDim: '#ffb690',
  onTertiaryFixed: '#341100',
  onTertiaryFixedVariant: '#783200',

  // Hata / yüksek risk
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  // Risk semantik sistemi — trafik ışığı mantığı
  risk: {
    safe: '#01261f',   // Güvenli — Koyu Orman Yeşili
    medium: '#ff781c', // Uyarı / Tartışmalı — Turuncu
    high: '#ba1a1a',   // Yüksek Risk — Kırmızı
  },
} as const;

export const typography = {
  // --- Başlıklar: Plus Jakarta Sans ---
  headlineLg: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.64, // -0.02em × 32px
  },
  headlineLgMobile: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 26,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: -0.52, // -0.02em × 26px
  },
  headlineMd: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 30,
  },
  headlineSm: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 26,
  },

  // --- Gövde: Inter ---
  bodyLg: {
    fontFamily: 'Inter_400Regular',
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 28,
  },
  bodyMd: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySm: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  labelMd: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.6, // 0.05em × 12px
  },
  labelSm: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    fontWeight: '600' as const,
    lineHeight: 14,
  },
  dataDisplay: {
    fontFamily: 'Inter_700Bold',
    fontSize: 48,
    fontWeight: '700' as const,
    lineHeight: 48,
    letterSpacing: -1.92, // -0.04em × 48px
  },
} as const;

export const radius = {
  sm: 4,    // 0.25rem
  md: 8,    // 0.5rem (DEFAULT)
  lg: 12,   // 0.75rem — butonlar, input'lar
  xl: 16,   // 1rem
  xxl: 24,  // 1.5rem — kartlar, bottom sheet
  full: 9999, // pill-shape butonlar/chip'ler
} as const;

export const spacing = {
  containerPadding: 20, // container-margin
  stackGap: 16,
  inlineGap: 12,        // gutter
  cardInternal: 20,
  gutter: 12,
  mobileMargin: 20,
  tabletMargin: 32,
} as const;

// Elevation & Depth — DESIGN.md açık tema gölgeleri
export const elevation = {
  // Level 1: Kartlar — saf beyaz üzerinde hafif yükselme
  level1Card: {
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2, // Android karşılığı
    backgroundColor: colors.surfaceContainerLowest,
  },
  // Level 2: Aktif elemanlar / modaller
  level2Active: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6, // Android karşılığı
  },
} as const;

export const theme = {
  colors,
  typography,
  radius,
  spacing,
  elevation,
} as const;

export type Theme = typeof theme;
export default theme;
