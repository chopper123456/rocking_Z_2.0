import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Wheat,
  Tractor,
  ClipboardList,
  Map,
  RefreshCw,
  ArrowRight,
  Sprout,
  Bug,
  Scissors,
  Clock,
  Building2,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useFarmData, useSyncAction, jdData } from '../hooks/useJohnDeere';
import type { Field, Equipment, FieldOperation, Farm } from '../types/farm';

const OP_TYPE_CONFIG: Record<string, { icon: typeof Sprout; color: string; bg: string }> = {
  seeding: { icon: Sprout, color: 'text-green-600', bg: 'bg-green-500' },
  planting: { icon: Sprout, color: 'text-green-600', bg: 'bg-green-500' },
  application: { icon: Bug, color: 'text-sky-600', bg: 'bg-sky-500' },
  spraying: { icon: Bug, color: 'text-sky-600', bg: 'bg-sky-500' },
  harvest: { icon: Scissors, color: 'text-amber-600', bg: 'bg-amber-500' },
  tillage: { icon: Scissors, color: 'text-stone-600', bg: 'bg-stone-400' },
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Dashboard() {
  const fieldsFetch = useCallback(() => jdData.fields(), []);
  const equipFetch = useCallback(() => jdData.equipment(), []);
  const opsFetch = useCallback(() => jdData.fieldOperations(), []);
  const farmsFetch = useCallback(() => jdData.farms(), []);

  const { data: fields, loading: fieldsLoading, refresh: refreshFields } = useFarmData<Field>(fieldsFetch);
  const { data: equipment, loading: equipLoading, refresh: refreshEquip } = useFarmData<Equipment>(equipFetch);
  const { data: operations, loading: opsLoading, refresh: refreshOps } = useFarmData<FieldOperation>(opsFetch);
  const { data: farms, loading: farmsLoading, refresh: refreshFarms } = useFarmData<Farm>(farmsFetch);
  const { sync, syncing } = useSyncAction();

  const totalAcres = useMemo(
    () => fields.reduce((sum, f) => sum + (f.acreage || 0), 0),
    [fields]
  );

  const recentOps = useMemo(
    () =>
      [...operations]
        .sort((a, b) => {
          const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
          const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 8),
    [operations]
  );

  const opBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    operations.forEach(op => {
      const type = op.operation_type?.toLowerCase() || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);
  }, [operations]);

  const maxOpCount = opBreakdown.length > 0 ? opBreakdown[0][1] : 1;

  const loading = fieldsLoading || equipLoading || opsLoading || farmsLoading;

  const handleFullSync = async () => {
    await sync('all');
    refreshFields();
    refreshEquip();
    refreshOps();
    refreshFarms();
  };

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;

  const hasData = fields.length > 0 || equipment.length > 0 || operations.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
          <p className="text-sm text-stone-400 mt-0.5">Overview of your farm operation</p>
        </div>
        <button
          onClick={handleFullSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Data'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="animate-fade-in" style={{ animationDelay: '0ms' }}>
          <StatCard label="Total Fields" value={fields.length} icon={Wheat} color="green" subtitle={`${totalAcres.toLocaleString()} total acres`} />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '60ms' }}>
          <StatCard label="Farms" value={farms.length} icon={Building2} color="blue" />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '120ms' }}>
          <StatCard label="Operations" value={operations.length.toLocaleString()} icon={ClipboardList} color="amber" subtitle="All time" />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '180ms' }}>
          <StatCard label="Equipment" value={equipment.length} icon={Tractor} color="rose" />
        </div>
      </div>

      {!hasData ? (
        <EmptyState
          icon={Map}
          title="No Farm Data Yet"
          description="Connect to John Deere Operations Center and sync your farm data to get started."
          action={{ label: 'Go to Settings', onClick: () => window.location.href = '/settings' }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {opBreakdown.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden animate-fade-in" style={{ animationDelay: '200ms' }}>
                <div className="px-5 py-4 border-b border-stone-100">
                  <h2 className="font-semibold text-stone-800 text-sm">Operations by Type</h2>
                </div>
                <div className="p-5 space-y-3">
                  {opBreakdown.map(([type, count]) => {
                    const config = OP_TYPE_CONFIG[type] || { bg: 'bg-stone-400' };
                    const pct = (count / maxOpCount) * 100;
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <span className="text-xs font-medium text-stone-600 capitalize w-24 shrink-0">{type}</span>
                        <div className="flex-1 h-6 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${config.bg} rounded-full transition-all duration-700 ease-out`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-stone-700 w-12 text-right tabular-nums">{count.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden animate-fade-in" style={{ animationDelay: '250ms' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                <h2 className="font-semibold text-stone-800 text-sm">Recent Operations</h2>
                <Link to="/operations" className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {recentOps.length === 0 ? (
                <div className="p-8 text-center text-sm text-stone-400">No operations recorded yet</div>
              ) : (
                <div className="divide-y divide-stone-50">
                  {recentOps.map((op) => {
                    const type = op.operation_type?.toLowerCase() || 'unknown';
                    const config = OP_TYPE_CONFIG[type];
                    const OpIcon = config?.icon || ClipboardList;
                    const field = fields.find(f => f.id === op.field_id);
                    return (
                      <div key={op.id} className="flex items-center gap-4 px-5 py-3 hover:bg-stone-50/50 transition-colors">
                        <div className="bg-stone-100 rounded-lg p-2">
                          <OpIcon className={`w-4 h-4 ${config?.color || 'text-stone-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-700 truncate capitalize">
                            {op.operation_type || 'Unknown'} {field ? `- ${field.name}` : ''}
                          </p>
                          <p className="text-xs text-stone-400">
                            {op.area ? `${op.area.toFixed(1)} acres` : ''}
                            {(op.products as unknown[])?.length ? ` / ${(op.products as unknown[]).length} product(s)` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-stone-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(op.start_date)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {farms.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-200 animate-fade-in" style={{ animationDelay: '300ms' }}>
                <div className="px-5 py-4 border-b border-stone-100">
                  <h2 className="font-semibold text-stone-800 text-sm">Farms</h2>
                </div>
                <div className="p-3 space-y-1">
                  {farms.map(farm => {
                    const farmFields = fields.filter(f => f.farm_id === farm.id);
                    const farmAcres = farmFields.reduce((sum, f) => sum + (f.acreage || 0), 0);
                    return (
                      <div key={farm.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-stone-50 transition-colors">
                        <div className="bg-sky-50 rounded-lg p-2">
                          <Building2 className="w-4 h-4 text-sky-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-700 truncate">{farm.name}</p>
                          <p className="text-xs text-stone-400">
                            {farmFields.length} fields / {farmAcres.toLocaleString()} acres
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-stone-200 animate-fade-in" style={{ animationDelay: '350ms' }}>
              <div className="px-5 py-4 border-b border-stone-100">
                <h2 className="font-semibold text-stone-800 text-sm">Quick Actions</h2>
              </div>
              <div className="p-3 space-y-1">
                {[
                  { to: '/map', label: 'View Farm Map', icon: Map, desc: 'See all fields on the map' },
                  { to: '/fields', label: 'Manage Fields', icon: Wheat, desc: 'View field details and history' },
                  { to: '/operations', label: 'Operations Log', icon: ClipboardList, desc: 'Full operation history' },
                  { to: '/equipment', label: 'Equipment Fleet', icon: Tractor, desc: 'Track machines and hours' },
                  { to: '/settings', label: 'Sync Settings', icon: RefreshCw, desc: 'Manage JD connection' },
                ].map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-stone-50 transition-colors group"
                  >
                    <div className="bg-stone-100 rounded-lg p-2 group-hover:bg-green-50 transition-colors">
                      <link.icon className="w-4 h-4 text-stone-400 group-hover:text-green-600 transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-700">{link.label}</p>
                      <p className="text-xs text-stone-400">{link.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
