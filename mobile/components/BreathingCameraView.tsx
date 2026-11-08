import React from 'react';
import { NativeModules, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import Button from '@/components/Button';
import { useColors, useTypography, useSpacing } from '@/src/design/hooks';

export interface BreathingCameraViewProps {
  /** Callback invoked when the user exits the camera breathing session */
  onClose: () => void;
  /** Fallback callback invoked to switch to the standard breathing exercise */
  onFallbackToStandard: () => void;
}

/**
 * Check whether the native VisionCamera module (NativeModules.CameraView) is linked
 * in the current runtime binary. This prevents crashes in Expo Go or before running
 * `npx expo run:android`.
 */
const isCameraModuleAvailable = Boolean(NativeModules.CameraView);

/**
 * BreathingCameraView serves as a resilient entry point for Camera-Assisted Breathing.
 * If the native CameraView module is missing (e.g. running in Expo Go or unbuilt binary),
 * it gracefully displays a friendly explanation and fallback rather than crashing on startup.
 * Once confirmed linked, it mounts VisionCameraActiveView for the full camera + alignment experience.
 */
export const BreathingCameraView: React.FC<BreathingCameraViewProps> = (props) => {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const insets = useSafeAreaInsets();

  if (!isCameraModuleAvailable) {
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
          onPress={props.onClose}
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
            <Icon name="videocam-off" size={44} color={colors.warning} />
          </View>

          <Text
            style={[
              typography.h2,
              { color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
            ]}
          >
            Development Build Required
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
            Camera-Assisted Breathing uses custom native C++ libraries (VisionCamera) which are not
            supported in standard Expo Go.
            {'\n\n'}
            To enable camera breathing, build a development client with:
            {'\n'}
            <Text style={{ fontWeight: '700', color: colors.text }}>npx expo run:android</Text>
            {'\n\n'}
            Alternatively, you can continue with our standard guided breathing exercise below.
          </Text>

          <Button
            text="Use Standard Breathing Instead"
            variant="primary"
            onPress={props.onFallbackToStandard}
            style={{ width: '100%' }}
          />
        </View>
      </View>
    );
  }

  // Dynamically require VisionCameraActiveView only when NativeModules.CameraView is present
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const VisionCameraActiveView = require('./VisionCameraActiveView').default;
  return (
    <View style={styles.container}>
      <VisionCameraActiveView {...props} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    flex: 1,
    width: '100%',
    height: '100%',
    zIndex: 999,
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

export default BreathingCameraView;
