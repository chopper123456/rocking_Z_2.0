import { useCallback, useState, useMemo } from 'react';
import { Package, Search, Filter, Beaker, Leaf, FlaskConical } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useFarmData, jdData } from '../hooks/useJohnDeere';
import type { Product } from '../types/farm';

const TYPE_ICONS: Record<string, typeof Beaker> = {
  variety: Leaf,
  chemical: Beaker,
  fertilizer: FlaskConical,
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  variety: { bg: 'bg-green-50', text: 'text-green-600' },
  chemical: { bg: 'bg-sky-50', text: 'text-sky-600' },
  fertilizer: { bg: 'bg-amber-50', text: 'text-amber-600' },
};

export default function ProductsPage() {
  const productsFetch = useCallback(() => jdData.products(), []);
  const { data: products, loading } = useFarmData<Product>(productsFetch);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const types = useMemo(() => {
    const set = new Set(products.map(p => p.product_type).filter(Boolean));
    return Array.from(set);
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const q = search.toLowerCase();
      const matchesSearch =
        p.name?.toLowerCase().includes(q) ||
        p.manufacturer?.toLowerCase().includes(q);
      const matchesType = typeFilter === 'all' || p.product_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [products, search, typeFilter]);

  if (loading) return <LoadingSpinner message="Loading products..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Products</h1>
        <p className="text-sm text-stone-400 mt-0.5">{products.length} products in inventory</p>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No Products Found"
          description="Sync your data from John Deere to see your product catalog."
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search products..."
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
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((product) => {
              const TypeIcon = TYPE_ICONS[product.product_type] || Package;
              const colors = TYPE_COLORS[product.product_type] || { bg: 'bg-stone-50', text: 'text-stone-600' };

              return (
                <div key={product.id} className="bg-white rounded-xl border border-stone-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`${colors.bg} rounded-lg p-2.5`}>
                      <TypeIcon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider bg-stone-100 px-2 py-1 rounded-full capitalize">
                      {product.product_type}
                    </span>
                  </div>
                  <h3 className="font-semibold text-stone-800 mb-1">{product.name}</h3>
                  {product.manufacturer && (
                    <p className="text-xs text-stone-400">{product.manufacturer}</p>
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
