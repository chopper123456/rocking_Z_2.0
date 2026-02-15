import { useState, useEffect, useCallback } from 'react';
import { jdAuth, jdData, jdSync } from '../lib/jd-api';
import type { ConnectionStatus } from '../types/farm';

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({ connected: false });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await jdAuth.getStatus();
      setStatus(data);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loading, refresh };
}

export function useFarmData<T>(fetchFn: () => Promise<{ data: T[]; total: number }>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useSyncAction() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(async (type: 'all' | 'organizations' | 'farms' | 'fields' | 'boundaries' | 'equipment' | 'aemp' | 'fieldOperations' | 'products' | 'operators' | 'flags' | 'locationHistory' | 'breadcrumbs' | 'measurements' | 'alerts' | 'deviceStates' | 'engineHours' | 'operationalHours' | 'implements') => {
    try {
      setSyncing(true);
      setError(null);
      const result = await jdSync[type as keyof typeof jdSync]();
      setSyncResult(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
      return null;
    } finally {
      setSyncing(false);
    }
  }, []);

  return { sync, syncing, syncResult, error };
}

export { jdAuth, jdData, jdSync };
