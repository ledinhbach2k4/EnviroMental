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
    primary: string[];
    secondary: string[];
    accent: string[];
    wellness: string[];
    calm: string[];
    surface: string[];
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