import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useState, useRef } from 'react';
import api from '../utils/api';
import { StressScanRequest, StressScanResult, StressScanHistoryItem } from '../types/stressScan';

export const useStressScan = () => {
  const [scans, setScans] = useState<StressScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isSignedIn, isLoaded, getToken } = useAuth();

  const tokenRef = useRef(getToken);
  useEffect(() => {
    tokenRef.current = getToken;
  }, [getToken]);

  const fetchScans = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const token = await tokenRef.current();
      if (!token) throw new Error('Authentication token not available.');

      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await api.get('/stress-scans', config);
      
      if (response.data && response.data.success) {
        setScans(response.data.data || []);
      } else {
        setScans([]);
      }
    } catch (err: any) {
      console.error('Error fetching stress scans:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch stress scans');
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  const submitScan = useCallback(async (requestData: StressScanRequest): Promise<StressScanResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const token = await tokenRef.current();
      if (!token) throw new Error('Authentication token not available.');

      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await api.post('/stress-scans', requestData, config);
      
      if (response.data && response.data.success) {
        // Refresh the scans history list
        await fetchScans();
        return response.data.data;
      }
      return null;
    } catch (err: any) {
      console.error('Error submitting stress scan:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to submit stress scan';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [fetchScans]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  return {
    scans,
    loading,
    error,
    submitScan,
    fetchScans,
  };
};
