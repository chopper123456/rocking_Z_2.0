import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Settings,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Database,
  Building2,
  Check,
  ArrowRight,
  Loader2,
  History,
} from 'lucide-react';
import { useConnectionStatus, useSyncAction, useFarmData, jdData } from '../hooks/useJohnDeere';
import { jdAuth } from '../lib/jd-api';
import LoadingSpinner from '../components/LoadingSpinner';
import type { SyncLogEntry } from '../types/farm';

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function SettingsPage() {
  const { status, loading, refresh: refreshStatus } = useConnectionStatus();
  const { sync, syncing, error: syncError } = useSyncAction();
  const [syncResults, setSyncResults] = useState<Record<string, { synced: number }>>({});
  const [orgChecking, setOrgChecking] = useState(false);
  const [orgConnected, setOrgConnected] = useState<boolean | null>(null);
  const [orgCount, setOrgCount] = useState(0);

  const checkOrgStatus = useCallback(async () => {
    if (!status.connected) return;
    try {
      setOrgChecking(true);
      const data = await jdAuth.checkOrg();
      const orgs = data.organizations || [];
      setOrgConnected(orgs.length > 0);
      setOrgCount(orgs.length);
    } catch {
      setOrgConnected(false);
    } finally {
      setOrgChecking(false);
    }
  }, [status.connected]);

  useEffect(() => {
    if (status.connected && orgConnected === null && !orgChecking) {
      checkOrgStatus();
    }
  }, [status.connected, orgConnected, orgChecking, checkOrgStatus]);

  useEffect(() => {
    const handleFocus = () => {
      if (status.connected) {
        checkOrgStatus();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [status.connected, checkOrgStatus]);

  const handleConnect = useCallback(() => {
    const params = new URLSearchParams({
      response_type: 'code',
      scope: 'ag1 ag2 eq1 eq2 org1 org2 work1 work2 files offline_access',
      client_id: '0oaspkya0q35SA0H25d7',
      state: crypto.randomUUID(),
      redirect_uri:
        'https://ufvxhrvgwntzjdigdxqp.supabase.co/functions/v1/jd-auth/callback',
    });
    window.open(
      `https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/authorize?${params.toString()}`,
      '_blank'
    );
  }, []);

  const handleConnectOrg = useCallback(() => {
    const redirectUri = encodeURIComponent(
      'https://ufvxhrvgwntzjdigdxqp.supabase.co/functions/v1/jd-auth/callback'
    );
    window.open(
      `https://connections.deere.com/connections/0oaspkya0q35SA0H25d7/select-organizations?redirect_uri=${redirectUri}`,
      '_blank'
    );
  }, []);

  const handleRefreshToken = useCallback(async () => {
    try {
      await jdAuth.refreshToken();
      refreshStatus();
    } catch (err) {
      console.error('Failed to refresh token:', err);
    }
  }, [refreshStatus]);

  const syncLogFetch = useCallback(() => jdData.syncLog(), []);
  const { data: syncLogRaw, refresh: refreshSyncLog } = useFarmData<SyncLogEntry>(syncLogFetch);

  const syncLog = useMemo(
    () => syncLogRaw.slice(0, 20),
    [syncLogRaw]
  );

  const handleSync = useCallback(
    async (
      type:
        | 'all'
        | 'organizations'
        | 'farms'
        | 'fields'
        | 'boundaries'
        | 'equipment'
        | 'aemp'
        | 'fieldOperations'
        | 'products'
        | 'operators'
        | 'flags'
        | 'locationHistory'
        | 'breadcrumbs'
    ) => {
      const result = await sync(type);
      if (result) {
        setSyncResults((prev) => ({ ...prev, [type]: result }));
        refreshSyncLog();
      }
    },
    [sync, refreshSyncLog]
  );

  if (loading) return <LoadingSpinner message="Checking connection..." />;

  const step1Done = status.connected === true;
  const step2Done = orgConnected === true;
  const step2Loading = orgChecking;
  const currentStep = !step1Done ? 1 : !step2Done ? 2 : 3;
  const setupComplete = step1Done && step2Done;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Settings</h1>
        <p className="text-sm text-stone-400 mt-0.5">
          Manage your John Deere connection and data sync
        </p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-800 text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-stone-400" />
            {setupComplete ? 'John Deere Connection' : 'Setup Your Connection'}
          </h2>
          {!setupComplete && (
            <p className="text-xs text-stone-400 mt-1">
              Complete these steps to start syncing your farm data
            </p>
          )}
        </div>
        <div className="p-5">
          <SetupStep
            number={1}
            done={step1Done}
            active={currentStep === 1}
            lastStep={false}
          >
            <StepHeader
              done={step1Done}
              active={currentStep === 1}
              title="Authenticate with John Deere"
              badge={
                step1Done
                  ? status.isExpired
                    ? { label: 'Expired', color: 'amber' }
                    : { label: 'Connected', color: 'green' }
                  : undefined
              }
            />
            {step1Done ? (
              <div className="mt-1 space-y-1">
                <p className="text-xs text-stone-400 flex items-center gap-1.5">
                  {status.isExpired ? (
                    <AlertCircle className="w-3 h-3 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  )}
                  Token {status.isExpired ? 'expired' : 'active'} - expires{' '}
                  {formatDate(status.expiresAt)}
                </p>
                <p className="text-xs text-stone-400 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Last updated: {formatDate(status.lastUpdated)}
                </p>
                <div className="flex gap-3 mt-2">
                  {status.isExpired && (
                    <button
                      onClick={handleRefreshToken}
                      className="text-xs text-amber-600 hover:text-amber-700 font-medium underline underline-offset-2"
                    >
                      Refresh token
                    </button>
                  )}
                  <button
                    onClick={handleConnect}
                    className="text-xs text-stone-400 hover:text-stone-600 font-medium underline underline-offset-2"
                  >
                    Re-authorize
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-sm text-stone-500 mb-3">
                  Sign in with your John Deere Operations Center account to get started.
                </p>
                <button
                  onClick={handleConnect}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-all shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Connect to John Deere
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </SetupStep>

          <SetupStep
            number={2}
            done={step2Done}
            active={currentStep === 2}
            loading={step2Loading && currentStep === 2}
            lastStep={false}
          >
            <StepHeader
              done={step2Done}
              active={currentStep === 2}
              title="Connect Your Organization"
              badge={
                step2Done
                  ? {
                      label: `${orgCount} org${orgCount !== 1 ? 's' : ''} connected`,
                      color: 'green',
                    }
                  : undefined
              }
            />
            {currentStep === 2 ? (
              <div className="mt-2">
                <p className="text-sm text-stone-500 mb-3">
                  Grant this application access to your organization's farm data in the John
                  Deere Operations Center.
                </p>
                {step2Loading ? (
                  <p className="text-sm text-stone-400 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking organization status...
                  </p>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={handleConnectOrg}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-all shadow-sm"
                    >
                      <Building2 className="w-4 h-4" />
                      Connect Organization
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={checkOrgStatus}
                      className="block text-xs text-stone-400 hover:text-stone-600 font-medium underline underline-offset-2"
                    >
                      I've already connected -- check again
                    </button>
                  </div>
                )}
              </div>
            ) : step2Done ? (
              <div className="mt-1">
                <p className="text-xs text-stone-400">
                  Your organization is connected and sharing data.
                </p>
                <button
                  onClick={handleConnectOrg}
                  className="text-xs text-stone-400 hover:text-stone-600 font-medium underline underline-offset-2 mt-1"
                >
                  Manage connections
                </button>
              </div>
            ) : (
              <p className="text-xs text-stone-400 mt-1">Complete Step 1 first.</p>
            )}
          </SetupStep>

          <SetupStep number={3} done={false} active={currentStep === 3} lastStep={true}>
            <StepHeader
              done={false}
              active={currentStep === 3}
              title="Sync Your Data"
            />
            {currentStep === 3 ? (
              <div className="mt-2">
                <p className="text-sm text-stone-500 mb-3">
                  Pull your fields, equipment, and operations from John Deere.
                </p>
                {syncError && (
                  <div className="mb-3 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 text-sm text-rose-700">
                    {syncError}
                  </div>
                )}
                <button
                  onClick={() => handleSync('all')}
                  disabled={syncing}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all shadow-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing All Data...' : 'Sync All Data'}
                </button>
                {Object.keys(syncResults).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-green-600">
                    {Object.entries(syncResults).map(([key, val]) => (
                      <span key={key} className="capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}: {val.synced}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-stone-400 mt-1">
                Complete the steps above to start syncing.
              </p>
            )}
          </SetupStep>
        </div>
      </div>

      {setupComplete && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h2 className="font-semibold text-stone-800 text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-stone-400" />
              Individual Sync
            </h2>
          </div>
          <div className="p-5">
            {syncError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 text-sm text-rose-700">
                {syncError}
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(
                [
                  'organizations',
                  'farms',
                  'fields',
                  'boundaries',
                  'equipment',
                  'aemp',
                  'fieldOperations',
                  'products',
                  'operators',
                  'flags',
                  'locationHistory',
                  'breadcrumbs',
                ] as const
              ).map((type) => (
                <button
                  key={type}
                  onClick={() => handleSync(type)}
                  disabled={syncing}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-stone-200 text-stone-600 text-xs font-medium rounded-lg hover:bg-stone-50 disabled:opacity-50 transition-all capitalize"
                >
                  <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                  {type.replace(/([A-Z])/g, ' $1').trim()}
                  {syncResults[type] && (
                    <span className="text-green-600 font-semibold">
                      ({syncResults[type].synced})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {syncLog.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h2 className="font-semibold text-stone-800 text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-stone-400" />
              Sync History
            </h2>
          </div>
          <div className="divide-y divide-stone-50">
            {syncLog.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-5 py-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  entry.status === 'completed' ? 'bg-green-500' :
                  entry.status === 'in_progress' ? 'bg-amber-500 animate-pulse' :
                  entry.status === 'failed' ? 'bg-rose-500' : 'bg-stone-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-700 capitalize">{entry.sync_type} sync</p>
                  <p className="text-xs text-stone-400">
                    {entry.started_at ? formatDate(entry.started_at) : '-'}
                    {entry.records_synced != null && entry.records_synced > 0 && (
                      <span className="ml-2 text-green-600">{entry.records_synced} records</span>
                    )}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  entry.status === 'completed' ? 'bg-green-50 text-green-600' :
                  entry.status === 'in_progress' ? 'bg-amber-50 text-amber-600' :
                  entry.status === 'failed' ? 'bg-rose-50 text-rose-600' : 'bg-stone-50 text-stone-500'
                }`}>
                  {entry.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-800 text-sm flex items-center gap-2">
            <Settings className="w-4 h-4 text-stone-400" />
            App Info
          </h2>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-stone-400">Application</span>
            <span className="text-stone-700 font-medium">Rocking Z Acres</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-400">Environment</span>
            <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full text-xs">
              Sandbox
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-400">Organization ID</span>
            <span className="text-stone-700 font-mono text-xs">31328</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-400">Client ID</span>
            <span className="text-stone-700 font-mono text-xs">0oaspkya0q35SA0H25d7</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SetupStep({
  number,
  done,
  active,
  loading,
  lastStep,
  children,
}: {
  number: number;
  done: boolean;
  active: boolean;
  loading?: boolean;
  lastStep: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            done
              ? 'bg-green-100'
              : active
              ? 'bg-green-600 ring-4 ring-green-100'
              : 'bg-stone-100'
          }`}
        >
          {done ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : loading ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            <span
              className={`text-sm font-bold ${active ? 'text-white' : 'text-stone-400'}`}
            >
              {number}
            </span>
          )}
        </div>
        {!lastStep && (
          <div className={`w-0.5 flex-1 my-2 ${done ? 'bg-green-200' : 'bg-stone-200'}`} />
        )}
      </div>
      <div className={`flex-1 ${lastStep ? '' : 'pb-6'}`}>{children}</div>
    </div>
  );
}

function StepHeader({
  done,
  active,
  title,
  badge,
}: {
  done: boolean;
  active: boolean;
  title: string;
  badge?: { label: string; color: 'green' | 'amber' };
}) {
  return (
    <div className="flex items-center gap-2">
      <h3
        className={`font-semibold text-sm ${
          done ? 'text-green-700' : active ? 'text-stone-800' : 'text-stone-400'
        }`}
      >
        {title}
      </h3>
      {badge && (
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            badge.color === 'green'
              ? 'text-green-600 bg-green-50'
              : 'text-amber-600 bg-amber-50'
          }`}
        >
          {badge.label}
        </span>
      )}
    </div>
  );
}
