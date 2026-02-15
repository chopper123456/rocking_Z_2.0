import { useCallback, useState, useMemo } from 'react';
import { Tractor, Search, Gauge, Hash, Wrench, Filter } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useFarmData, jdData } from '../hooks/useJohnDeere';
import type { Equipment } from '../types/farm';

const TYPE_LABELS: Record<string, string> = {
  tractor: 'Tractor',
  combine: 'Combine',
  sprayer: 'Sprayer',
  planter: 'Planter',
  implement: 'Implement',
};

export default function EquipmentPage() {
  const equipFetch = useCallback(() => jdData.equipment(), []);
  const { data: equipment, loading } = useFarmData<Equipment>(equipFetch);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const types = useMemo(() => {
    const set = new Set(equipment.map(e => e.equipment_type?.toLowerCase()).filter(Boolean));
    return Array.from(set);
  }, [equipment]);

  const filtered = useMemo(() => {
    return equipment.filter(e => {
      const q = search.toLowerCase();
      const matchesSearch =
        e.name?.toLowerCase().includes(q) ||
        e.make?.toLowerCase().includes(q) ||
        e.model?.toLowerCase().includes(q) ||
        e.serial_number?.toLowerCase().includes(q);

      const matchesType = typeFilter === 'all' || e.equipment_type?.toLowerCase() === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [equipment, search, typeFilter]);

  if (loading) return <LoadingSpinner message="Loading equipment..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Equipment</h1>
        <p className="text-sm text-stone-400 mt-0.5">{equipment.length} machines in your fleet</p>
      </div>

      {equipment.length === 0 ? (
        <EmptyState
          icon={Tractor}
          title="No Equipment Found"
          description="Sync your data from John Deere to see your equipment fleet."
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search equipment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 appearance-none transition-all"
              >
                <option value="all">All Types</option>
                {types.map(t => (
                  <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((eq) => (
              <div key={eq.id} className="bg-white rounded-xl border border-stone-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-sky-50 rounded-lg p-2.5">
                    <Tractor className="w-5 h-5 text-sky-600" />
                  </div>
                  {eq.equipment_type && (
                    <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider bg-stone-100 px-2 py-1 rounded-full">
                      {TYPE_LABELS[eq.equipment_type.toLowerCase()] || eq.equipment_type}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-stone-800 mb-3">{eq.name || 'Unnamed Equipment'}</h3>
                <div className="space-y-2">
                  {eq.make && (
                    <div className="flex items-center gap-2 text-sm">
                      <Wrench className="w-3.5 h-3.5 text-stone-400" />
                      <span className="text-stone-500">{eq.make} {eq.model}</span>
                    </div>
                  )}
                  {eq.serial_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <Hash className="w-3.5 h-3.5 text-stone-400" />
                      <span className="text-stone-500 font-mono text-xs">{eq.serial_number}</span>
                    </div>
                  )}
                  {eq.engine_hours > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Gauge className="w-3.5 h-3.5 text-stone-400" />
                      <span className="text-stone-500">{eq.engine_hours.toLocaleString()} hrs</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
