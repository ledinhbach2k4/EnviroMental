import { useDesignSystem } from './index';

export const useColors = () => {
  const { tokens } = useDesignSystem();
  return tokens.colors;
};

export const useTypography = () => {
  const { tokens } = useDesignSystem();
  return tokens.typography;
};

export const useSpacing = () => {
  const { tokens } = useDesignSystem();
  return tokens.spacing;
};

export const useRadii = () => {
  const { tokens } = useDesignSystem();
  return tokens.radii;
};

export const useShadows = () => {
  const { tokens } = useDesignSystem();
  return tokens.shadows;
};

export { useDesignSystem, DesignSystemProvider, createStyles, useStyles } from './index';
export type { DesignTokens, ThemeConfig, ThemeName } from './tokens';