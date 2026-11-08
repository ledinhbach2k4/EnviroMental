import { useState, useCallback } from 'react';

export interface AlignmentState {
  /** Whether the user's face and shoulders are currently aligned in the frame */
  isAligned: boolean;
  /** Setter for alignment state */
  setIsAligned: (aligned: boolean) => void;
  /** Debug toggle helper to switch between aligned and unaligned states */
  toggleAlignment: () => void;
}

/**
 * Hook to manage face and shoulder alignment state for camera-assisted breathing.
 *
 * In Phase 1, this returns a mock `isAligned` state driven by `useState(false)`
 * with a debug toggle for testing. Phase 2 will replace this mock with real
 * on-device ML detection while preserving the exact same interface.
 */
export function useAlignment(initialAligned = false): AlignmentState {
  const [isAligned, setIsAligned] = useState<boolean>(initialAligned);

  const toggleAlignment = useCallback(() => {
    setIsAligned((prev) => !prev);
  }, []);

  return {
    isAligned,
    setIsAligned,
    toggleAlignment,
  };
}

export default useAlignment;
