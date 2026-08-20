import { createContext, useContext, useMemo, ReactNode, useState, useEffect } from 'react';
import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { DesignTokens, ThemeConfig, ThemeName } from './tokens';
import { THEMES, DEFAULT_THEME, getTheme } from './themes';

const baseTypography = {
  h1: { fontSize: 34, fontWeight: '700' as const, lineHeight: 42, letterSpacing: -0.5 },
  h2: { fontSize: 28, fontWeight: '600' as const, lineHeight: 36, letterSpacing: -0.3 },
  h3: { fontSize: 22, fontWeight: '600' as const, lineHeight: 30, letterSpacing: -0.2 },
  h4: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26, letterSpacing: 0 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24, letterSpacing: 0 },
  bodyLarge: { fontSize: 18, fontWeight: '400' as const, lineHeight: 28, letterSpacing: 0 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 22, letterSpacing: 0 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 20, letterSpacing: 0 },
  captionSmall: { fontSize: 11, fontWeight: '400' as const, lineHeight: 16, letterSpacing: 0.2 },
  button: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24, letterSpacing: 0.3 },
  buttonSmall: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20, letterSpacing: 0.2 },
  label: { fontSize: 13, fontWeight: '500' as const, lineHeight: 20, letterSpacing: 0.1 },
  overline: { fontSize: 11, fontWeight: '600' as const, lineHeight: 16, letterSpacing: 0.5, textTransform: 'uppercase' as const },
};

const baseSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

const baseRadii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

const baseShadows = {
  none: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  xs: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
  xl: { shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
};

const createDesignTokens = (theme: ThemeConfig): DesignTokens => ({
  colors: theme.colors,
  typography: {
    h1: { ...baseTypography.h1, color: theme.colors.text },
    h2: { ...baseTypography.h2, color: theme.colors.text },
    h3: { ...baseTypography.h3, color: theme.colors.text },
    h4: { ...baseTypography.h4, color: theme.colors.text },
    body: { ...baseTypography.body, color: theme.colors.text },
    bodyLarge: { ...baseTypography.bodyLarge, color: theme.colors.text },
    bodySmall: { ...baseTypography.bodySmall, color: theme.colors.textSecondary },
    caption: { ...baseTypography.caption, color: theme.colors.textMuted },
    captionSmall: { ...baseTypography.captionSmall, color: theme.colors.textMuted },
    button: { ...baseTypography.button, color: theme.colors.textInverse },
    buttonSmall: { ...baseTypography.buttonSmall, color: theme.colors.textInverse },
    label: { ...baseTypography.label, color: theme.colors.textSecondary },
    overline: { ...baseTypography.overline, color: theme.colors.textMuted },
  },
  spacing: baseSpacing,
  radii: baseRadii,
  shadows: {
    none: baseShadows.none,
    xs: { ...baseShadows.xs, shadowColor: theme.colors.shadow },
    sm: { ...baseShadows.sm, shadowColor: theme.colors.shadow },
    md: { ...baseShadows.md, shadowColor: theme.colors.shadow },
    lg: { ...baseShadows.lg, shadowColor: theme.colors.shadowStrong },
    xl: { ...baseShadows.xl, shadowColor: theme.colors.shadowStrong },
  },
  breakpoints: { sm: 320, md: 480, lg: 768, xl: 1024 },
  zIndex: { base: 0, dropdown: 100, sticky: 200, modal: 300, toast: 400, tooltip: 500 },
});

export interface DesignSystemContextValue {
  theme: ThemeConfig;
  tokens: DesignTokens;
  setTheme: (name: ThemeName) => void;
  availableThemes: ThemeConfig[];
}

const DesignSystemContext = createContext<DesignSystemContextValue | null>(null);

export const useDesignSystem = (): DesignSystemContextValue => {
  const context = useContext(DesignSystemContext);
  if (!context) {
    throw new Error('useDesignSystem must be used within a DesignSystemProvider');
  }
  return context;
};

interface DesignSystemProviderProps {
  children: ReactNode;
  initialTheme?: ThemeName;
}

export const DesignSystemProvider = ({ children, initialTheme = DEFAULT_THEME }: DesignSystemProviderProps) => {
  const [currentThemeName, setCurrentThemeName] = useState<ThemeName>(() => {
    try {
      const stored = localStorage.getItem('enviromental-theme');
      if (stored && Object.keys(THEMES).includes(stored)) {
        return stored as ThemeName;
      }
    } catch {}
    return initialTheme;
  });

  const theme = useMemo(() => getTheme(currentThemeName), [currentThemeName]);
  const tokens = useMemo(() => createDesignTokens(theme), [theme]);
  const availableThemes = useMemo(() => Object.values(THEMES), []);

  const setTheme = (name: ThemeName) => {
    setCurrentThemeName(name);
    try {
      localStorage.setItem('enviromental-theme', name);
    } catch {}
  };

  return (
    <DesignSystemContext.Provider value={{ theme, tokens, setTheme, availableThemes }}>
      {children}
    </DesignSystemContext.Provider>
  );
};

export const createStyles = <T extends Record<string, ViewStyle | TextStyle | ImageStyle>>(
  styleFn: (tokens: DesignTokens) => T
) => {
  return (tokens: DesignTokens) => StyleSheet.create(styleFn(tokens));
};

export const useStyles = <T extends Record<string, ViewStyle | TextStyle | ImageStyle>>(
  styleFn: (tokens: DesignTokens) => T
): T => {
  const { tokens } = useDesignSystem();
  return useMemo(() => StyleSheet.create(styleFn(tokens)), [tokens]);
};

export { THEMES, DEFAULT_THEME, getTheme } from './themes';
export type { DesignTokens, ThemeConfig, ThemeName } from './tokens';