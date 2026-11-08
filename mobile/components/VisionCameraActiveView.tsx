import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  CameraRuntimeError,
} from 'react-native-vision-camera';
import Icon from '@/components/Icon';
import Button from '@/components/Button';
import { useAlignment } from '@/hooks/useAlignment';
import { useColors, useTypography, useSpacing, useRadii } from '@/src/design/hooks';

export interface VisionCameraActiveViewProps {
  /** Callback invoked when the user exits the camera breathing session */
  onClose: () => void;
  /** Fallback callback invoked to switch to the standard breathing exercise */
  onFallbackToStandard: () => void;
}

/**
 * VisionCameraActiveView handles active front camera streaming and alignment UI
 * once NativeModules.CameraView is confirmed to be available.
 */
export const VisionCameraActiveView: React.FC<VisionCameraActiveViewProps> = ({
  onClose,
  onFallbackToStandard,
}) => {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Navigation & AppState tracking for camera lifecycle
  const isFocused = useIsFocused();
  const [appState, setAppState] = useState<AppStateStatus>(
    (AppState.currentState as AppStateStatus) ?? 'active'
  );

  // Camera permissions & device selection
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  const hasRequestedPermissionRef = useRef(false);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [isComponentMounted, setIsComponentMounted] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(
    Platform.OS === 'web' ? 'Camera-assisted breathing is only supported on mobile devices.' : null
  );

  // Alignment hook (Phase 1 mock state)
  const { isAligned, toggleAlignment } = useAlignment(false);

  // Reanimated shared values & reduced motion
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(isAligned ? 1 : 0);

  // Ensure component unmount halts camera streaming
  useEffect(() => {
    return () => {
      setIsComponentMounted(false);
    };
  }, []);

  // Update AppState listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
    });
    return () => subscription.remove();
  }, []);

  // Request camera permission once on component mount (user initiated by selecting session)
  useEffect(() => {
    let isMounted = true;

    if (Platform.OS === 'web') return;

    if (!hasPermission && !hasRequestedPermissionRef.current) {
      hasRequestedPermissionRef.current = true;

      (async () => {
        try {
          const granted = await requestPermission();
          if (!granted && isMounted) {
            setIsPermissionDenied(true);
          }
        } catch (error) {
          if (isMounted) {
            console.error('[VisionCameraActiveView] Error requesting camera permission:', error);
            setIsPermissionDenied(true);
            setCameraError(
              error instanceof Error ? error.message : 'Failed to request camera permission'
            );
          }
        }
      })();
    }

    return () => {
      isMounted = false;
    };
  }, [hasPermission, requestPermission]);

  // Synchronize Reanimated animation progress with alignment state
  useEffect(() => {
    if (reducedMotion) {
      progress.value = isAligned ? 1 : 0;
    } else {
      progress.value = withTiming(isAligned ? 1 : 0, { duration: 400 });
    }
  }, [isAligned, reducedMotion, progress]);

  // Accessibility announcement on alignment change
  useEffect(() => {
    const announcement = isAligned
      ? 'Perfect. Now, take a deep breath in...'
      : 'Please align your face and shoulders in the frame.';
    AccessibilityInfo.announceForAccessibility(announcement);
  }, [isAligned]);

  // Sizing for head-and-shoulders oval guide
  const guideWidth = Math.min(Math.max(windowWidth * 0.72, 220), 320);
  const guideHeight = guideWidth * 1.38;
  const guideRadius = guideWidth / 2;
  const guideX = (windowWidth - guideWidth) / 2;
  const guideY = (windowHeight - guideHeight) / 2 - 25;

  // Animated styles for oval border
  const animatedBorderStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(progress.value, [0, 1], [colors.warning, colors.success]);
    return {
      borderColor,
    };
  });

  // Cross-fading text opacities
  const notAlignedTextStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
  }));

  const alignedTextStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  // Camera isActive rule: screen is focused, app is active, has permission, and no fatal error
  const isCameraActive =
    isComponentMounted && isFocused && appState === 'active' && hasPermission && !cameraError;

  // Gracefully stop camera before triggering parent unmount
  const handleClose = () => {
    setIsComponentMounted(false);
    onClose();
  };

  // 1. Permission denied / restricted explanation state
  if (!hasPermission && isPermissionDenied) {
    return (
      <View
        style={[
          styles.fallbackContainer,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
            paddingHorizontal: spacing.xl,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fallbackCloseButton}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close camera session"
        >
          <Icon name="close" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.fallbackContent}>
          <View
            style={[
              styles.fallbackIconCircle,
              { backgroundColor: colors.warning + '20', marginBottom: spacing.lg },
            ]}
          >
            <Icon name="camera" size={44} color={colors.warning} />
          </View>

          <Text
            style={[
              typography.h2,
              { color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
            ]}
          >
            Camera Permission Needed
          </Text>

          <Text
            style={[
              typography.body,
              {
                color: colors.textMuted,
                textAlign: 'center',
                marginBottom: spacing.xxl,
                lineHeight: 22,
              },
            ]}
          >
            Camera access is required for Camera-Assisted Breathing to detect your posture and
            breathing movement. No photos or video recordings are ever stored or transmitted.
          </Text>

          <Button
            text="Open Settings"
            variant="primary"
            onPress={() => Linking.openSettings()}
            style={{ width: '100%', marginBottom: spacing.md }}
          />

          <Button
            text="Use Standard Breathing Instead"
            variant="outline"
            onPress={onFallbackToStandard}
            style={{ width: '100%' }}
          />
        </View>
      </View>
    );
  }

  // 2. Still waiting for initial permission response
  if (!hasPermission) {
    return (
      <View style={[styles.fallbackContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.md }]}>
          Requesting camera access...
        </Text>
      </View>
    );
  }

  // 3. No front camera device or camera hardware error fallback state
  if (!device || cameraError) {
    return (
      <View
        style={[
          styles.fallbackContainer,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
            paddingHorizontal: spacing.xl,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fallbackCloseButton}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close camera session"
        >
          <Icon name="close" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.fallbackContent}>
          <View
            style={[
              styles.fallbackIconCircle,
              { backgroundColor: colors.secondary + '20', marginBottom: spacing.lg },
            ]}
          >
            <Icon name="videocam" size={44} color={colors.secondary} />
          </View>

          <Text
            style={[
              typography.h2,
              { color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
            ]}
          >
            Front Camera Unavailable
          </Text>

          <Text
            style={[
              typography.body,
              {
                color: colors.textMuted,
                textAlign: 'center',
                marginBottom: spacing.xxl,
                lineHeight: 22,
              },
            ]}
          >
            {cameraError ||
              'No front-facing camera was detected on this device. You can practice with our standard guided breathing exercise instead.'}
          </Text>

          <Button
            text="Use Standard Breathing Instead"
            variant="primary"
            onPress={onFallbackToStandard}
            style={{ width: '100%' }}
          />
        </View>
      </View>
    );
  }

  // 4. Main Camera View + Dimmed Oval Cutout + Alignment Guide
  return (
    <View style={styles.container}>
      {/* Native Camera Preview */}
      <Camera
        device={device}
        isActive={isCameraActive}
        style={[StyleSheet.absoluteFill, styles.camera]}
        onError={(err: CameraRuntimeError) => {
          console.error('[VisionCameraActiveView] Camera runtime error:', err);
          setCameraError(err.message);
        }}
      />

      {/* Dimmed backdrop with transparent cutout oval */}
      <Svg
        width={windowWidth}
        height={windowHeight}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <Mask
            id="guideCutoutMask"
            x="0"
            y="0"
            width={windowWidth}
            height={windowHeight}
            maskUnits="userSpaceOnUse"
          >
            <Rect x="0" y="0" width={windowWidth} height={windowHeight} fill="#FFFFFF" />
            <Rect
              x={guideX}
              y={guideY}
              width={guideWidth}
              height={guideHeight}
              rx={guideRadius}
              ry={guideRadius}
              fill="#000000"
            />
          </Mask>
        </Defs>
        <Rect
          x="0"
          y="0"
          width={windowWidth}
          height={windowHeight}
          fill="rgba(0, 0, 0, 0.65)"
          mask="url(#guideCutoutMask)"
        />
      </Svg>

      {/* Animated Oval Alignment Guide Border */}
      <Animated.View
        style={[
          styles.guideBorder,
          {
            left: guideX,
            top: guideY,
            width: guideWidth,
            height: guideHeight,
            borderRadius: guideRadius,
          },
          animatedBorderStyle,
        ]}
        pointerEvents="none"
      />

      {/* Top Header with Back / Close Button */}
      <View
        style={[
          styles.topHeader,
          {
            top: insets.top + spacing.sm,
            left: spacing.lg,
            right: spacing.lg,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerCloseButton}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Exit camera breathing session"
          activeOpacity={0.8}
        >
          <Icon name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerBadge}>
          <Icon name="videocam" size={16} color="#FFFFFF" style={{ marginRight: spacing.xs }} />
          <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>
            Camera Guided
          </Text>
        </View>
      </View>

      {/* Instruction Pill (Semi-transparent dark pill with cross-fading text) */}
      <View
        style={[
          styles.pillContainer,
          {
            top: guideY + guideHeight + spacing.lg,
            borderRadius: radii.full,
          },
        ]}
        accessibilityLiveRegion="polite"
      >
        <View style={styles.textCrossfadeWrapper}>
          <Animated.Text
            style={[
              typography.bodySmall,
              styles.instructionText,
              { color: colors.warning },
              notAlignedTextStyle,
            ]}
          >
            Please align your face/shoulders in the frame.
          </Animated.Text>
          <Animated.Text
            style={[
              typography.bodySmall,
              styles.instructionText,
              { color: colors.success },
              alignedTextStyle,
            ]}
          >
            Perfect. Now, take a deep breath in...
          </Animated.Text>
        </View>
      </View>

      {/* Development Debug Toggle Button */}
      {__DEV__ && (
        <TouchableOpacity
          style={[
            styles.debugButton,
            {
              bottom: insets.bottom + spacing.lg,
              backgroundColor: isAligned ? 'rgba(16, 185, 129, 0.9)' : 'rgba(245, 158, 11, 0.9)',
              borderRadius: radii.full,
            },
          ]}
          onPress={toggleAlignment}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Toggle alignment mock"
        >
          <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>
            DEBUG: Toggle Alignment ({isAligned ? 'ALIGNED' : 'NOT ALIGNED'})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    zIndex: 999,
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  guideBorder: {
    position: 'absolute',
    borderWidth: 3.5,
    borderStyle: 'solid',
  },
  topHeader: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  headerCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pillContainer: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: '85%',
  },
  textCrossfadeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 22,
    width: '100%',
  },
  instructionText: {
    textAlign: 'center',
    fontWeight: '700',
    position: 'absolute',
  },
  debugButton: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  fallbackContainer: {
    ...StyleSheet.absoluteFill,
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  fallbackCloseButton: {
    alignSelf: 'flex-start',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  fallbackContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  fallbackIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default VisionCameraActiveView;
