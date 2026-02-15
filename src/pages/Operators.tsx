import { useCallback, useState, useMemo } from 'react';
import { Users, Search, Mail, Hash } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useFarmData, jdData } from '../hooks/useJohnDeere';
import type { Operator } from '../types/farm';

export default function Operators() {
  const operatorsFetch = useCallback(() => jdData.operators(), []);
  const { data: operators, loading } = useFarmData<Operator>(operatorsFetch);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return operators.filter(op =>
      op.name?.toLowerCase().includes(q) ||
      op.id?.toLowerCase().includes(q)
    );
  }, [operators, search]);

  if (loading) return <LoadingSpinner message="Loading operators..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Operators</h1>
        <p className="text-sm text-stone-400 mt-0.5">{operators.length} operators in your organization</p>
      </div>

      {operators.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Operators Found"
          description="Sync your data from John Deere to see your farm operators here."
        />
      ) : (
        <>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search operators..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((operator, i) => {
              const rawData = operator.raw_data || {};
              const email = rawData.email as string || '';

              return (
                <div
                  key={operator.id}
                  className="bg-white rounded-xl border border-stone-200 p-5 hover:shadow-md transition-shadow animate-fade-in"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-teal-50 rounded-lg p-2.5">
                      <Users className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-stone-800 truncate">
                        {operator.name || 'Unnamed Operator'}
                      </h3>
                      {email && (
                        <p className="text-xs text-stone-400 flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3" />
                          {email}
                        </p>
                      )}
                      <p className="text-xs text-stone-400 flex items-center gap-1 mt-1">
                        <Hash className="w-3 h-3" />
                        <span className="font-mono">{operator.id}</span>
                      </p>
                    </div>
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
