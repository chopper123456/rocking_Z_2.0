import { useCallback, useState, useMemo } from 'react';
import { Flag, Search, Filter, MapPin, MessageSquare, Tag } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useFarmData, jdData } from '../hooks/useJohnDeere';
import type { Flag as FlagType, Field } from '../types/farm';

export default function Flags() {
  const flagsFetch = useCallback(() => jdData.flags(), []);
  const fieldsFetch = useCallback(() => jdData.fields(), []);
  const { data: flags, loading } = useFarmData<FlagType>(flagsFetch);
  const { data: fields } = useFarmData<Field>(fieldsFetch);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fieldMap = useMemo(() => {
    const map = new Map<string, Field>();
    fields.forEach(f => map.set(f.id, f));
    return map;
  }, [fields]);

  const categories = useMemo(() => {
    const set = new Set(flags.map(f => f.category).filter(Boolean));
    return Array.from(set);
  }, [flags]);

  const filtered = useMemo(() => {
    return flags.filter(flag => {
      const q = search.toLowerCase();
      const field = fieldMap.get(flag.field_id);
      const matchesSearch =
        flag.notes?.toLowerCase().includes(q) ||
        flag.category?.toLowerCase().includes(q) ||
        field?.name?.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'all' || flag.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [flags, search, categoryFilter, fieldMap]);

  if (loading) return <LoadingSpinner message="Loading flags..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Flags</h1>
        <p className="text-sm text-stone-400 mt-0.5">
          {flags.length} field markers and scouting notes
        </p>
      </div>

      {flags.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No Flags Found"
          description="Sync your data from John Deere to see your field flags and scouting markers."
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search flags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>
            {categories.length > 0 && (
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="pl-10 pr-8 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 appearance-none transition-all"
                >
                  <option value="all">All Categories</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((flag, i) => {
              const field = fieldMap.get(flag.field_id);

              return (
                <div
                  key={flag.id}
                  className="bg-white rounded-xl border border-stone-200 p-5 hover:shadow-md transition-shadow animate-fade-in"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-rose-50 rounded-lg p-2.5">
                      <Flag className="w-5 h-5 text-rose-600" />
                    </div>
                    {flag.category && (
                      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider bg-stone-100 px-2 py-1 rounded-full flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" />
                        {flag.category}
                      </span>
                    )}
                  </div>

                  {field && (
                    <p className="text-xs text-stone-400 flex items-center gap-1 mb-2">
                      <MapPin className="w-3 h-3" />
                      {field.name}
                    </p>
                  )}

                  {flag.notes && (
                    <p className="text-sm text-stone-600 flex items-start gap-1.5 mb-3">
                      <MessageSquare className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
                      <span className="line-clamp-3">{flag.notes}</span>
                    </p>
                  )}

                  {(flag.latitude !== 0 || flag.longitude !== 0) && (
                    <p className="text-xs text-stone-400 font-mono">
                      {flag.latitude.toFixed(6)}, {flag.longitude.toFixed(6)}
                    </p>
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
