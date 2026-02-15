import { useCallback, useState, useMemo } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  Calendar,
  Sprout,
  Bug,
  Scissors,
  MapPin,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useFarmData, jdData } from '../hooks/useJohnDeere';
import type { FieldOperation, Field } from '../types/farm';

const ITEMS_PER_PAGE = 25;

const OP_ICONS: Record<string, typeof Sprout> = {
  seeding: Sprout,
  planting: Sprout,
  application: Bug,
  spraying: Bug,
  harvest: Scissors,
  tillage: Scissors,
};

const OP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  seeding: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  planting: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  application: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  spraying: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  harvest: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  tillage: { bg: 'bg-stone-50', text: 'text-stone-700', border: 'border-stone-200' },
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Operations() {
  const opsFetch = useCallback(() => jdData.fieldOperations(), []);
  const fieldsFetch = useCallback(() => jdData.fields(), []);

  const { data: operations, loading } = useFarmData<FieldOperation>(opsFetch);
  const { data: fields } = useFarmData<Field>(fieldsFetch);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [fieldFilter, setFieldFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const fieldMap = useMemo(() => {
    const map = new Map<string, Field>();
    fields.forEach(f => map.set(f.id, f));
    return map;
  }, [fields]);

  const opTypes = useMemo(() => {
    const set = new Set(operations.map(o => o.operation_type?.toLowerCase()).filter(Boolean));
    return Array.from(set).sort();
  }, [operations]);

  const fieldNames = useMemo(() => {
    const set = new Set<string>();
    operations.forEach(op => {
      const field = fieldMap.get(op.field_id);
      if (field) set.add(field.name);
    });
    return Array.from(set).sort();
  }, [operations, fieldMap]);

  const filtered = useMemo(() => {
    return operations
      .filter(op => {
        const field = fieldMap.get(op.field_id);
        const q = search.toLowerCase();
        const matchesSearch =
          op.operation_type?.toLowerCase().includes(q) ||
          field?.name?.toLowerCase().includes(q);
        const matchesType = typeFilter === 'all' || op.operation_type?.toLowerCase() === typeFilter;
        const matchesField = fieldFilter === 'all' || field?.name === fieldFilter;
        return matchesSearch && matchesType && matchesField;
      })
      .sort((a, b) => {
        const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
        const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
        return dateB - dateA;
      });
  }, [operations, search, typeFilter, fieldFilter, fieldMap]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const paginatedOps = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const resetPage = () => setCurrentPage(1);

  if (loading) return <LoadingSpinner message="Loading operations..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Field Operations</h1>
        <p className="text-sm text-stone-400 mt-0.5">{operations.length.toLocaleString()} operations recorded</p>
      </div>

      {operations.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No Operations Found"
          description="Sync your data from John Deere to see your field operations."
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search by type or field name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); resetPage(); }}
                className="pl-10 pr-8 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 appearance-none transition-all capitalize"
              >
                <option value="all">All Types</option>
                {opTypes.map(t => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <select
                value={fieldFilter}
                onChange={(e) => { setFieldFilter(e.target.value); resetPage(); }}
                className="pl-10 pr-8 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 appearance-none transition-all"
              >
                <option value="all">All Fields</option>
                {fieldNames.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-400">
              Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filtered.length)}-{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length.toLocaleString()}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-stone-600" />
                </button>
                <span className="text-xs text-stone-500 font-medium px-2 tabular-nums">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-stone-600" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {paginatedOps.map((op, i) => {
              const field = fieldMap.get(op.field_id);
              const type = op.operation_type?.toLowerCase() || 'default';
              const OpIcon = OP_ICONS[type] || ClipboardList;
              const colors = OP_COLORS[type] || OP_COLORS.tillage;
              const products = op.products as Array<{ name?: string }>;

              return (
                <div
                  key={op.id}
                  className="bg-white rounded-xl border border-stone-200 p-4 hover:shadow-sm transition-shadow animate-fade-in"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`${colors.bg} rounded-lg p-2.5 mt-0.5`}>
                      <OpIcon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-stone-800 capitalize">{op.operation_type || 'Unknown'}</h3>
                          <div className="flex flex-wrap items-center gap-3 mt-1">
                            {field && (
                              <span className="text-xs text-stone-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {field.name}
                              </span>
                            )}
                            <span className="text-xs text-stone-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(op.start_date)}
                              {op.end_date && op.end_date !== op.start_date ? ` - ${formatDate(op.end_date)}` : ''}
                            </span>
                            {op.area > 0 && (
                              <span className="text-xs text-stone-400">{op.area.toFixed(1)} acres</span>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${colors.bg} ${colors.text} ${colors.border} border shrink-0`}>
                          {op.operation_type}
                        </span>
                      </div>

                      {products && products.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {products.map((p, idx) => (
                            <span key={idx} className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-md flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              {p.name || 'Unknown product'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-30 transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                let page: number;
                if (totalPages <= 5) {
                  page = idx + 1;
                } else if (currentPage <= 3) {
                  page = idx + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + idx;
                } else {
                  page = currentPage - 2 + idx;
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      page === currentPage
                        ? 'bg-green-600 text-white'
                        : 'border border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-30 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
