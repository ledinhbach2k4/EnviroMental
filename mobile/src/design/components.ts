import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { createStyles } from './index';

export const createButtonStyles = createStyles(({ colors, spacing, radii, shadows, typography }) => ({
  base: {
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primary: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    ...shadows.sm,
  },
  secondary: {
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    ...shadows.sm,
  },
  accent: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    ...shadows.sm,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    paddingVertical: spacing.md - 1,
    paddingHorizontal: spacing.xl,
  },
  ghost: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  danger: {
    backgroundColor: colors.danger,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    ...shadows.sm,
  },
  dangerOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.danger,
    paddingVertical: spacing.md - 1,
    paddingHorizontal: spacing.xl,
  },
  small: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  large: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.xl,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.button,
    color: colors.textInverse,
  },
  textOutline: {
    ...typography.button,
    color: colors.primary,
  },
  textDanger: {
    ...typography.button,
    color: colors.danger,
  },
  textGhost: {
    ...typography.button,
    color: colors.primary,
  },
}));

export const createCardStyles = createStyles(({ colors, spacing, radii, shadows }) => ({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  elevated: {
    ...shadows.sm,
  },
  elevatedStrong: {
    ...shadows.md,
  },
  flat: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 0,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  padding: {
    padding: spacing.lg,
  },
  paddingSm: {
    padding: spacing.md,
  },
  paddingLg: {
    padding: spacing.xl,
  },
  interactive: {
    ...shadows.xs,
  },
}));

export const createInputStyles = createStyles(({ colors, spacing, radii, shadows, typography }) => ({
  container: {
    width: '100%',
  },
  label: {
    ...typography.label,
    marginBottom: spacing.xs,
    color: colors.textSecondary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    ...shadows.xs,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    ...shadows.sm,
  },
  inputWrapperError: {
    borderColor: colors.danger,
    ...shadows.xs,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  inputPlaceholder: {
    color: colors.textMuted,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  icon: {
    marginHorizontal: spacing.sm,
    color: colors.textMuted,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  helperText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
}));

export const createTabBarStyles = createStyles(({ colors, spacing, radii, shadows }) => ({
  tabBar: {
    backgroundColor: colors.backgroundAlt,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    height: 70,
    ...shadows.lg,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  tabIcon: {
    fontSize: 24,
  },
  indicator: {
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
}));

export const createModalStyles = createStyles(({ colors, spacing, radii, shadows }) => ({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.xl,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.sm,
  },
}));

export const createListStyles = createStyles(({ colors, spacing, radii }) => ({
  container: {
    backgroundColor: colors.background,
  },
  item: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemFirst: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  itemLast: {
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    borderBottomWidth: 0,
  },
  separator: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.lg,
  },
}));

export const createAvatarStyles = createStyles(({ colors, spacing, radii }) => ({
  base: {
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xs: { width: 24, height: 24, borderRadius: 12 },
  sm: { width: 32, height: 32, borderRadius: 16 },
  md: { width: 40, height: 40, borderRadius: 20 },
  lg: { width: 56, height: 56, borderRadius: 28 },
  xl: { width: 72, height: 72, borderRadius: 36 },
  text: {
    fontWeight: '600',
    color: colors.primary,
  },
  textXs: { fontSize: 10 },
  textSm: { fontSize: 12 },
  textMd: { fontSize: 16 },
  textLg: { fontSize: 20 },
  textXl: { fontSize: 24 },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textInverse,
  },
}));

export const createChipStyles = createStyles(({ colors, spacing, radii, typography }) => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    gap: spacing.xs,
  },
  primary: {
    backgroundColor: colors.primaryLight,
  },
  secondary: {
    backgroundColor: colors.secondaryLight,
  },
  accent: {
    backgroundColor: colors.accentLight,
  },
  success: {
    backgroundColor: colors.successLight,
  },
  warning: {
    backgroundColor: colors.warningLight,
  },
  danger: {
    backgroundColor: colors.dangerLight,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    ...typography.caption,
    fontWeight: '500',
  },
  textPrimary: { color: colors.primaryDark },
  textSecondary: { color: colors.secondaryDark },
  textAccent: { color: colors.accentDark },
  textSuccess: { color: colors.success },
  textWarning: { color: colors.warning },
  textDanger: { color: colors.danger },
  icon: { fontSize: 12 },
}));

export const createSkeletonStyles = createStyles(({ colors, spacing, radii }) => ({
  base: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
  },
  text: {
    height: 16,
    borderRadius: radii.sm,
    marginVertical: spacing.xs,
  },
  textLarge: {
    height: 24,
    borderRadius: radii.sm,
    marginVertical: spacing.xs,
  },
  circle: {
    borderRadius: radii.full,
  },
  rect: {
    borderRadius: radii.md,
  },
  card: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radii.lg,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
  },
}));

export type { ViewStyle, TextStyle, ImageStyle } from 'react-native';