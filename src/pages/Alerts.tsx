import { useCallback, useState, useMemo } from 'react';
import { AlertTriangle, Search, Tractor, Filter, Clock, CheckCircle2, XCircle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useFarmData, jdData } from '../hooks/useJohnDeere';
import type { MachineAlert, Equipment } from '../types/farm';

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: 'red', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  high: { label: 'High', color: 'orange', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  medium: { label: 'Medium', color: 'yellow', bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
  low: { label: 'Low', color: 'blue', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  info: { label: 'Info', color: 'stone', bg: 'bg-stone-50', text: 'text-stone-600', border: 'border-stone-200' },
};

export default function Alerts() {
  const alertFetch = useCallback(() => jdData.machineAlerts(), []);
  const equipmentFetch = useCallback(() => jdData.equipment(), []);

  const { data: alerts, loading: alertsLoading } = useFarmData<MachineAlert>(alertFetch);
  const { data: equipment, loading: equipmentLoading } = useFarmData<Equipment>(equipmentFetch);

  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const equipmentMap = useMemo(() => {
    const map = new Map<string, Equipment>();
    equipment.forEach(eq => map.set(eq.id, eq));
    return map;
  }, [equipment]);

  const severities = useMemo(() => {
    const set = new Set(alerts.map(a => a.severity?.toLowerCase()).filter(Boolean));
    return Array.from(set);
  }, [alerts]);

  const filtered = useMemo(() => {
    return alerts.filter(alert => {
      const q = search.toLowerCase();
      const eq = equipmentMap.get(alert.equipment_id);
      const matchesSearch =
        alert.description?.toLowerCase().includes(q) ||
        alert.dtc_code?.toLowerCase().includes(q) ||
        alert.alert_type?.toLowerCase().includes(q) ||
        eq?.name?.toLowerCase().includes(q);

      const matchesSeverity = severityFilter === 'all' || alert.severity?.toLowerCase() === severityFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && alert.active) ||
        (statusFilter === 'resolved' && !alert.active);

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [alerts, search, severityFilter, statusFilter, equipmentMap]);

  const sortedAlerts = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;

      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      const aSev = severityOrder[a.severity?.toLowerCase() as keyof typeof severityOrder] ?? 5;
      const bSev = severityOrder[b.severity?.toLowerCase() as keyof typeof severityOrder] ?? 5;

      if (aSev !== bSev) return aSev - bSev;

      return new Date(b.started_at || 0).getTime() - new Date(a.started_at || 0).getTime();
    });
  }, [filtered]);

  const activeCount = alerts.filter(a => a.active).length;
  const loading = alertsLoading || equipmentLoading;

  if (loading) return <LoadingSpinner message="Loading alerts..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Machine Alerts</h1>
        <p className="text-sm text-stone-400 mt-0.5">
          {activeCount} active alert{activeCount !== 1 ? 's' : ''} · {alerts.length} total
        </p>
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No Alerts Found"
          description="Sync your data from John Deere to see machine alerts and diagnostics."
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search alerts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 appearance-none transition-all"
              >
                <option value="all">All Severities</option>
                {severities.map(s => (
                  <option key={s} value={s}>{SEVERITY_CONFIG[s as keyof typeof SEVERITY_CONFIG]?.label || s}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 appearance-none transition-all"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {sortedAlerts.map((alert) => {
              const eq = equipmentMap.get(alert.equipment_id);
              const sevConfig = SEVERITY_CONFIG[alert.severity?.toLowerCase() as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info;

              return (
                <div
                  key={alert.id}
                  className={`bg-white rounded-xl border ${sevConfig.border} p-5 hover:shadow-md transition-shadow ${!alert.active ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`${sevConfig.bg} rounded-lg p-2`}>
                        <AlertTriangle className={`w-4 h-4 ${sevConfig.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-stone-800 truncate">
                            {alert.description || alert.alert_type || 'Unknown Alert'}
                          </h3>
                          {alert.active ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              Resolved
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-stone-500">
                          <Tractor className="w-3.5 h-3.5" />
                          <span>{eq?.name || 'Unknown Equipment'}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold uppercase tracking-wider ${sevConfig.bg} ${sevConfig.text} px-2.5 py-1 rounded-full whitespace-nowrap`}>
                      {sevConfig.label}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    {alert.dtc_code && (
                      <div className="flex items-center gap-2">
                        <span className="text-stone-400 min-w-20">DTC Code:</span>
                        <span className="font-mono text-stone-700">{alert.dtc_code}</span>
                      </div>
                    )}
                    {alert.alert_type && (
                      <div className="flex items-center gap-2">
                        <span className="text-stone-400 min-w-20">Type:</span>
                        <span className="text-stone-700">{alert.alert_type}</span>
                      </div>
                    )}
                    {alert.started_at && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span className="text-stone-500">
                          Started {new Date(alert.started_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {alert.ended_at && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-stone-500">
                          Resolved {new Date(alert.ended_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
