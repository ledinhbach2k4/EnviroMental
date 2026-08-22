import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import api from '../utils/api';

interface CortisolBreakdown {
  mood: { score: number; weight: number; trend?: 'improving' | 'worsening' | null } | null;
  habits: { score: number; weight: number; streak?: number } | null;
  environment: { score: number; weight: number } | null;
}

interface CortisolScoreData {
  score: number | null;
  category: 'low' | 'medium' | 'high' | 'unknown';
  label: string;
  breakdown: {
    mood: { score: number; weight: number; trend?: 'improving' | 'worsening' | null } | null;
    habits: { score: number; weight: number; streak?: number } | null;
    environment: { score: number; weight: number } | null;
  };
  message: string;
  warnings: string[];
  circadianMultiplier: number;
  timestamp: string;
}

interface UseCortisolScoreReturn {
  data: CortisolScoreData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// MODULE-LEVEL CACHE - persists across all component lifecycles
let cachedCortisolData: CortisolScoreData | null = null;
let lastCortisolFetch = 0;
let isFetchingCortisol = false;
const CORTISOL_CACHE_TTL = 60000; // 60 seconds

export const useCortisolScore = (): UseCortisolScoreReturn => {
  const [data, setData] = useState<CortisolScoreData | null>(cachedCortisolData);
  const [loading, setLoading] = useState(!cachedCortisolData);
  const [error, setError] = useState<string | null>(null);
  const { isLoaded, isSignedIn, getToken } = useAuth();

  // Use refs to avoid dependency issues
  const tokenRef = useRef(getToken);
  const isLoadedRef = useRef(isLoaded);
  const isSignedInRef = useRef(isSignedIn);
  
  useEffect(() => { tokenRef.current = getToken; }, [getToken]);
  useEffect(() => { isLoadedRef.current = isLoaded; }, [isLoaded]);
  useEffect(() => { isSignedInRef.current = isSignedIn; }, [isSignedIn]);

  // STABLE FETCH FUNCTION - empty deps, uses refs and module-level cache
  const fetchScore = useCallback(async (force = false) => {
    // Check auth using refs
    if (!isLoadedRef.current || !isSignedInRef.current) {
      setData(null);
      setLoading(false);
      return;
    }

    const now = Date.now();

    // 1. SERVE FROM CACHE if valid (60s TTL)
    if (!force && cachedCortisolData && now - lastCortisolFetch < 60000) {
      setData(cachedCortisolData);
      setLoading(false);
      return;
    }

    // 2. DEDUPLICATION - prevent concurrent fetches
    if (isFetchingCortisol) {
      return;
    }

    // 3. MARK AS FETCHING
    isFetchingCortisol = true;
    setLoading(true);
    setError(null);

    try {
      const token = await tokenRef.current();
      if (!token) throw new Error('Authentication token not available');

      const response = await api.get('/cortisol-score', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const freshData = response.data.data;
        // UPDATE CACHE
        cachedCortisolData = freshData;
        lastCortisolFetch = Date.now();
        setData(freshData);
      } else {
        throw new Error(response.data.error || 'Failed to fetch cortisol score');
      }
    } catch (err: any) {
      console.error('Error fetching cortisol score:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load cortisol score';
      setError(errorMessage);
      setData(null);
    } finally {
      isFetchingCortisol = false;
      setLoading(false);
    }
  }, []); // STRICTLY EMPTY DEPS - uses refs and module-level cache

  // SINGLE MOUNT EFFECT - RUNS ONCE
  useEffect(() => {
    fetchScore();
  }, []); // STRICTLY EMPTY ARRAY

  // STABLE REFETCH - MEMOIZED with useCallback
  const refetch = useCallback(async () => {
    await fetchScore(true);
  }, [fetchScore]);

  return {
    data,
    loading,
    error,
    refetch,
  };
};

export default useCortisolScore;