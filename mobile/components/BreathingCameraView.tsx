import React from 'react';
import { StyleSheet, View } from 'react-native';
import VisionCameraActiveView, { VisionCameraActiveViewProps } from './VisionCameraActiveView';

export type BreathingCameraViewProps = VisionCameraActiveViewProps;

/**
 * BreathingCameraView serves as the active container for Camera-Assisted Breathing.
 * Dynamic loading and runtime environment safety (Expo Go vs development client)
 * is coordinated via `utils/cameraSupport.ts`.
 */
export const BreathingCameraView: React.FC<BreathingCameraViewProps> = (props) => {
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
});

export default BreathingCameraView;
