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

export const useAnimation = () => {
  const { tokens } = useDesignSystem();
  return tokens.animation;
};

export {
  useDesignSystem,
  DesignSystemProvider,
  createStyles,
  useStyles,
  baseAnimationTokens,
  animationTokens,
} from './index';
export type { DesignTokens, ThemeConfig, ThemeName, AnimationTokens } from './tokens';
