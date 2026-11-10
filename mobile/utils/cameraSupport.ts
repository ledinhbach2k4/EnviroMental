import React from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export interface BreathingCameraViewProps {
  onClose: () => void;
  onFallbackToStandard: () => void;
}

export type CameraSupportResult =
  | {
      ok: true;
      Component: React.ComponentType<BreathingCameraViewProps>;
    }
  | {
      ok: false;
      reason: 'expo-go' | 'native-module-missing';
      error?: unknown;
    };

function checkCameraSupport(): CameraSupportResult {
  try {
    // 1. In Expo Go, native C++ Nitro modules cannot run; avoid importing VisionCamera
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      return { ok: false, reason: 'expo-go' };
    }

    // 2. In standalone/dev-client, require the camera component within a try/catch
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@/components/BreathingCameraView');
    const Component = (mod && (mod.default || mod.BreathingCameraView)) as
      React.ComponentType<BreathingCameraViewProps> | undefined;

    if (!Component) {
      return { ok: false, reason: 'native-module-missing' };
    }

    return { ok: true, Component };
  } catch (error) {
    return { ok: false, reason: 'native-module-missing', error };
  }
}

// Call once at module scope
export const cameraSupport: CameraSupportResult = checkCameraSupport();
export default cameraSupport;
