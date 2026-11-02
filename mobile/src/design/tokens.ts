export interface ColorTokens {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  border: string;
  borderLight: string;
  divider: string;
  shadow: string;
  shadowStrong: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  danger: string;
  dangerLight: string;
  info: string;
  infoLight: string;
  mood: {
    veryHappy: string;
    happy: string;
    neutral: string;
    sad: string;
    verySad: string;
  };
  gradients: {
    primary: [string, string, ...string[]];
    secondary: [string, string, ...string[]];
    accent: [string, string, ...string[]];
    wellness: [string, string, ...string[]];
    calm: [string, string, ...string[]];
    surface: [string, string, ...string[]];
  };
}

export interface TypographyTokens {
  h1: TextStyle;
  h2: TextStyle;
  h3: TextStyle;
  h4: TextStyle;
  body: TextStyle;
  bodyLarge: TextStyle;
  bodySmall: TextStyle;
  caption: TextStyle;
  captionSmall: TextStyle;
  button: TextStyle;
  buttonSmall: TextStyle;
  label: TextStyle;
  overline: TextStyle;
}

export interface SpacingTokens {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
}

export interface RadiusTokens {
  none: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

export interface ShadowTokens {
  none: ShadowStyle;
  xs: ShadowStyle;
  sm: ShadowStyle;
  md: ShadowStyle;
  lg: ShadowStyle;
  xl: ShadowStyle;
}

export interface AnimationDurationTokens {
  instant: number;
  fast: number;
  normal: number;
  moderate: number;
  slow: number;
  deliberate: number;
}

export interface AnimationEasingTokens {
  standard: [number, number, number, number];
  decelerate: [number, number, number, number];
  accelerate: [number, number, number, number];
  sharp: [number, number, number, number];
}

export interface AnimationSpringTokens {
  bouncy: { damping: number; stiffness: number; mass: number };
  snappy: { damping: number; stiffness: number; mass: number };
  gentle: { damping: number; stiffness: number; mass: number };
  subtle: { damping: number; stiffness: number; mass: number };
  wobbly: { damping: number; stiffness: number; mass: number };
}

export interface AnimationMicroTokens {
  buttonPressScale: number;
  cardPressScale: number;
  tabPressScale: number;
  activeOpacity: number;
}

export interface AnimationStaggerTokens {
  fast: number;
  normal: number;
  slow: number;
  maxDelay: number;
}

export interface AnimationSkeletonTokens {
  pulseDuration: number;
  minOpacity: number;
  maxOpacity: number;
}

export interface AnimationTokens {
  durations: AnimationDurationTokens;
  easings: AnimationEasingTokens;
  springs: AnimationSpringTokens;
  micro: AnimationMicroTokens;
  stagger: AnimationStaggerTokens;
  skeleton: AnimationSkeletonTokens;
}

export const baseAnimationTokens: AnimationTokens = {
  durations: {
    instant: 100,
    fast: 200,
    normal: 300,
    moderate: 450,
    slow: 600,
    deliberate: 1000,
  },
  easings: {
    standard: [0.2, 0.0, 0.0, 1.0],
    decelerate: [0.0, 0.0, 0.2, 1.0],
    accelerate: [0.4, 0.0, 1.0, 1.0],
    sharp: [0.4, 0.0, 0.6, 1.0],
  },
  springs: {
    bouncy: { damping: 10, stiffness: 160, mass: 0.8 },
    snappy: { damping: 18, stiffness: 220, mass: 0.9 },
    gentle: { damping: 24, stiffness: 140, mass: 1.0 },
    subtle: { damping: 28, stiffness: 180, mass: 1.0 },
    wobbly: { damping: 8, stiffness: 180, mass: 0.7 },
  },
  micro: {
    buttonPressScale: 0.96,
    cardPressScale: 0.98,
    tabPressScale: 0.92,
    activeOpacity: 0.85,
  },
  stagger: {
    fast: 35,
    normal: 55,
    slow: 85,
    maxDelay: 400,
  },
  skeleton: {
    pulseDuration: 1200,
    minOpacity: 0.35,
    maxOpacity: 0.8,
  },
};

export const animationTokens = baseAnimationTokens;

export interface TextStyle {
  fontSize: number;
  fontWeight: '300' | '400' | '500' | '600' | '700' | '800';
  lineHeight: number;
  letterSpacing?: number;
  color?: string;
}

export interface ShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface DesignTokens {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radii: RadiusTokens;
  shadows: ShadowTokens;
  animation: AnimationTokens;
  breakpoints: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  zIndex: {
    base: number;
    dropdown: number;
    sticky: number;
    modal: number;
    toast: number;
    tooltip: number;
  };
}

// prettier-ignore
export type ThemeName =
  | 'ocean'
  | 'forest'
  | 'mint'
  | 'sunset'
  | 'roseGold'
  | 'coffee'
  | 'midnight'
  | 'lavender';

export interface ThemeConfig {
  name: ThemeName;
  displayName: string;
  isDark: boolean;
  colors: ColorTokens;
}
