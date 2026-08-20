import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DesignSystemProvider, useDesignSystem, THEMES, DEFAULT_THEME, type ThemeName } from './index';

interface LegacyThemeContextValue {
  theme: typeof THEMES[keyof typeof THEMES];
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
  availableThemes: typeof THEMES;
}

const LegacyThemeContext = createContext<LegacyThemeContextValue | null>(null);

export const useTheme = (): LegacyThemeContextValue => {
  const context = useContext(LegacyThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeName;
}

export const ThemeProvider = ({ children, initialTheme = DEFAULT_THEME }: ThemeProviderProps) => {
  const { theme, tokens, setTheme, availableThemes } = useDesignSystem();

  const legacyTheme = React.useMemo(() => ({
    primary: theme.colors.primary,
    background: theme.colors.background,
    text: theme.colors.text,
    border: theme.colors.border,
    white: theme.colors.textInverse,
    textLight: theme.colors.textMuted,
    card: theme.colors.surface,
    shadow: theme.colors.shadow,
  }), [theme.colors]);

  const value = React.useMemo(() => ({
    theme: legacyTheme,
    themeName: theme.name,
    setTheme,
    availableThemes: THEMES,
  }), [theme.name, legacyTheme, setTheme]);

  return (
    <LegacyThemeContext.Provider value={value}>
      {children}
    </LegacyThemeContext.Provider>
  );
};

export const ThemeProviderWithDesignSystem = ({ children, initialTheme = DEFAULT_THEME }: ThemeProviderProps) => {
  return (
    <DesignSystemProvider initialTheme={initialTheme}>
      <ThemeProvider initialTheme={initialTheme}>
        {children}
      </ThemeProvider>
    </DesignSystemProvider>
  );
};

export { THEMES, DEFAULT_THEME };
export type { ThemeName };