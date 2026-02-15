import { useCallback, useState, useMemo } from 'react';
import {
  Wheat,
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Sprout,
  Filter,
  Package,
  ArrowUpDown,
  Calendar,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useFarmData, jdData } from '../hooks/useJohnDeere';
import type { Field, FieldOperation, Farm } from '../types/farm';

type SortKey = 'name' | 'acreage' | 'ops';

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Fields() {
  const fieldsFetch = useCallback(() => jdData.fields(), []);
  const opsFetch = useCallback(() => jdData.fieldOperations(), []);
  const farmsFetch = useCallback(() => jdData.farms(), []);

  const { data: fields, loading } = useFarmData<Field>(fieldsFetch);
  const { data: operations } = useFarmData<FieldOperation>(opsFetch);
  const { data: farms } = useFarmData<Farm>(farmsFetch);

  const [search, setSearch] = useState('');
  const [cropFilter, setCropFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [expandedField, setExpandedField] = useState<string | null>(null);

  const opsMap = useMemo(() => {
    const map = new Map<string, FieldOperation[]>();
    operations.forEach(op => {
      const existing = map.get(op.field_id) || [];
      existing.push(op);
      map.set(op.field_id, existing);
    });
    for (const [key, ops] of map) {
      map.set(key, ops.sort((a, b) => {
        const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
        const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
        return dateB - dateA;
      }));
    }
    return map;
  }, [operations]);

  const farmMap = useMemo(() => {
    const map = new Map<string, Farm>();
    farms.forEach(f => map.set(f.id, f));
    return map;
  }, [farms]);

  const cropTypes = useMemo(() => {
    const set = new Set(fields.map(f => f.crop_type?.toLowerCase()).filter(Boolean));
    return Array.from(set).sort();
  }, [fields]);

  const totalAcres = useMemo(
    () => fields.reduce((sum, f) => sum + (f.acreage || 0), 0),
    [fields]
  );

  const filteredFields = useMemo(() => {
    const q = search.toLowerCase();
    return fields
      .filter(f => {
        const matchesSearch =
          f.name.toLowerCase().includes(q) ||
          f.crop_type?.toLowerCase().includes(q);
        const matchesCrop = cropFilter === 'all' || f.crop_type?.toLowerCase() === cropFilter;
        return matchesSearch && matchesCrop;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'acreage') return (b.acreage || 0) - (a.acreage || 0);
        if (sortBy === 'ops') {
          const aOps = opsMap.get(a.id)?.length || 0;
          const bOps = opsMap.get(b.id)?.length || 0;
          return bOps - aOps;
        }
        return 0;
      });
  }, [fields, search, cropFilter, sortBy, opsMap]);

  if (loading) return <LoadingSpinner message="Loading fields..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Fields</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            {fields.length} fields / {totalAcres.toLocaleString()} total acres
          </p>
        </div>
      </div>

      {fields.length === 0 ? (
        <EmptyState
          icon={Wheat}
          title="No Fields Found"
          description="Sync your data from John Deere to see your fields here."
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search fields by name or crop..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>
            {cropTypes.length > 0 && (
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <select
                  value={cropFilter}
                  onChange={(e) => setCropFilter(e.target.value)}
                  className="pl-10 pr-8 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 appearance-none transition-all capitalize"
                >
                  <option value="all">All Crops</option>
                  {cropTypes.map(c => (
                    <option key={c} value={c} className="capitalize">{c}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="pl-10 pr-8 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 appearance-none transition-all"
              >
                <option value="name">Sort by Name</option>
                <option value="acreage">Sort by Acreage</option>
                <option value="ops">Sort by Operations</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-stone-400">{filteredFields.length} fields shown</p>

          <div className="space-y-3">
            {filteredFields.map((field, i) => {
              const fieldOps = opsMap.get(field.id) || [];
              const isExpanded = expandedField === field.id;
              const lastOp = fieldOps[0];
              const farm = field.farm_id ? farmMap.get(field.farm_id) : null;

              return (
                <div
                  key={field.id}
                  className="bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-sm transition-shadow animate-fade-in"
                  style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                >
                  <button
                    onClick={() => setExpandedField(isExpanded ? null : field.id)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-green-50 rounded-lg p-2.5">
                        <Wheat className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-stone-800">{field.name}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-0.5">
                          <span className="text-xs text-stone-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {field.acreage?.toFixed(1) || '-'} acres
                          </span>
                          {field.crop_type && (
                            <span className="text-xs text-stone-400 flex items-center gap-1">
                              <Sprout className="w-3 h-3" />
                              <span className="capitalize">{field.crop_type}</span>
                            </span>
                          )}
                          {farm && (
                            <span className="text-xs text-stone-400">{farm.name}</span>
                          )}
                          {lastOp && (
                            <span className="text-xs text-stone-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Last: <span className="capitalize">{lastOp.operation_type}</span> {formatDate(lastOp.start_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-stone-400 bg-stone-100 px-2 py-1 rounded-full">
                        {fieldOps.length} ops
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-stone-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-stone-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-stone-100 p-4 bg-stone-50/50 animate-fade-in">
                      <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Operation History</h4>
                      {fieldOps.length === 0 ? (
                        <p className="text-sm text-stone-400">No operations recorded for this field.</p>
                      ) : (
                        <div className="space-y-2">
                          {fieldOps.slice(0, 15).map(op => {
                            const products = op.products as Array<{ name?: string }>;
                            return (
                              <div key={op.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-stone-100">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-medium text-stone-700 capitalize w-24">{op.operation_type}</span>
                                  <span className="text-xs text-stone-400 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(op.start_date)}
                                  </span>
                                  {products && products.length > 0 && (
                                    <span className="text-xs text-stone-400 flex items-center gap-1">
                                      <Package className="w-3 h-3" />
                                      {products.length} product(s)
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-stone-400 tabular-nums">
                                  {op.area ? `${op.area.toFixed(1)} ac` : '-'}
                                </div>
                              </div>
                            );
                          })}
                          {fieldOps.length > 15 && (
                            <p className="text-xs text-stone-400 text-center mt-2">
                              +{fieldOps.length - 15} more operations
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
