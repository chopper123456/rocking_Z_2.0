import { useCallback, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Tractor,
  Search,
  Gauge,
  Hash,
  Wrench,
  MapPin,
  Fuel,
  Clock,
  ChevronRight,
  Truck,
  Package,
  Droplets,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useFarmData, jdData } from '../hooks/useJohnDeere';
import {
  isActiveEquipment,
  getEquipmentCategory,
  CATEGORY_LABELS,
  type EquipmentCategory,
} from '../config/equipment';
import type { Equipment, Implement } from '../types/farm';

const CATEGORY_ICONS: Record<EquipmentCategory, typeof Tractor> = {
  pickups: Truck,
  semis: Truck,
  sprayer: Droplets,
  tractors: Tractor,
  implements: Package,
};

function EquipmentCard({
  eq,
  to,
}: {
  eq: Equipment;
  to: string;
}) {
  const category = getEquipmentCategory(eq.name, eq.equipment_type, false);
  const Icon = CATEGORY_ICONS[category] || Tractor;

  return (
    <Link
      to={to}
      className="bg-white rounded-xl border border-stone-200 p-5 hover:shadow-lg hover:border-green-300 transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="bg-sky-50 rounded-lg p-2.5 group-hover:bg-sky-100 transition-colors">
          <Icon className="w-5 h-5 text-sky-600" />
        </div>
        <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider bg-stone-100 px-2 py-1 rounded-full">
          {CATEGORY_LABELS[category]}
        </span>
      </div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-stone-800 group-hover:text-green-700 transition-colors">
          {eq.name || 'Unnamed Equipment'}
        </h3>
        <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-green-600 transition-colors" />
      </div>
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
        {(eq.cumulative_operating_hours || eq.engine_hours) > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Gauge className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-stone-500">
              {(eq.cumulative_operating_hours || eq.engine_hours).toLocaleString()} hrs
            </span>
          </div>
        )}
        {(eq.fuel_remaining_ratio ?? 0) > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Fuel className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-stone-500">
              {Math.round((eq.fuel_remaining_ratio ?? 0) * 100)}% fuel
            </span>
          </div>
        )}
        {eq.last_location_time && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-stone-500">
              {eq.last_location_lat?.toFixed(4)}, {eq.last_location_lon?.toFixed(4)}
            </span>
          </div>
        )}
        {eq.last_telemetry_sync && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-stone-500 text-xs">
              {new Date(eq.last_telemetry_sync).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

function ImplementCard({ impl }: { impl: Implement }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="bg-amber-50 rounded-lg p-2.5">
          <Package className="w-5 h-5 text-amber-600" />
        </div>
        <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider bg-stone-100 px-2 py-1 rounded-full">
          Implement
        </span>
      </div>
      <h3 className="font-semibold text-stone-800 mb-3">{impl.name || 'Unnamed'}</h3>
      <div className="space-y-2">
        {(impl.make || impl.model) && (
          <div className="flex items-center gap-2 text-sm">
            <Wrench className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-stone-500">{impl.make} {impl.model}</span>
          </div>
        )}
        {impl.serial_number && (
          <div className="flex items-center gap-2 text-sm">
            <Hash className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-stone-500 font-mono text-xs">{impl.serial_number}</span>
          </div>
        )}
        {impl.width > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-stone-500">
              {impl.width} {impl.width_unit || 'ft'} width
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EquipmentPage() {
  const equipFetch = useCallback(() => jdData.equipment(), []);
  const implFetch = useCallback(() => jdData.implements(), []);

  const { data: allEquipment, loading: equipLoading } = useFarmData<Equipment>(equipFetch);
  const { data: allImplements, loading: implLoading } = useFarmData<Implement>(implFetch);

  const [activeTab, setActiveTab] = useState<EquipmentCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showOnlyWithLocation, setShowOnlyWithLocation] = useState(false);

  const activeEquipment = useMemo(() => {
    return allEquipment.filter((e) => isActiveEquipment(e.name));
  }, [allEquipment]);

  const equipmentByCategory = useMemo(() => {
    const map: Record<EquipmentCategory, Equipment[]> = {
      pickups: [],
      semis: [],
      sprayer: [],
      tractors: [],
      implements: [],
    };
    activeEquipment.forEach((e) => {
      const cat = getEquipmentCategory(e.name, e.equipment_type, false);
      map[cat].push(e);
    });
    return map;
  }, [activeEquipment]);

  const filteredEquipment = useMemo(() => {
    let list =
      activeTab === 'all'
        ? activeEquipment
        : activeTab === 'implements'
          ? []
          : equipmentByCategory[activeTab];

    return list.filter((e) => {
      const q = search.toLowerCase();
      const matchesSearch =
        e.name?.toLowerCase().includes(q) ||
        e.make?.toLowerCase().includes(q) ||
        e.model?.toLowerCase().includes(q) ||
        e.serial_number?.toLowerCase().includes(q);
      const matchesLocation =
        !showOnlyWithLocation ||
        ((e.last_location_lat ?? 0) !== 0 && (e.last_location_lon ?? 0) !== 0);
      return matchesSearch && matchesLocation;
    });
  }, [activeTab, activeEquipment, equipmentByCategory, search, showOnlyWithLocation]);

  const filteredImplements = useMemo(() => {
    if (activeTab !== 'implements' && activeTab !== 'all') return [];
    const q = search.toLowerCase();
    return allImplements.filter(
      (i) =>
        !q ||
        i.name?.toLowerCase().includes(q) ||
        i.make?.toLowerCase().includes(q) ||
        i.model?.toLowerCase().includes(q)
    );
  }, [activeTab, allImplements, search]);

  const loading = equipLoading || implLoading;

  const tabs: (EquipmentCategory | 'all')[] = [
    'all',
    'pickups',
    'semis',
    'sprayer',
    'tractors',
    'implements',
  ];

  if (loading) return <LoadingSpinner message="Loading equipment..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Equipment</h1>
        <p className="text-sm text-stone-400 mt-0.5">
          {activeEquipment.length} active machines · {allImplements.length} implements
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-green-600 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            {tab === 'all' ? 'All' : CATEGORY_LABELS[tab]}
          </button>
        ))}
      </div>

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
        {activeTab !== 'implements' && (
          <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 hover:bg-stone-50 transition-all cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyWithLocation}
              onChange={(e) => setShowOnlyWithLocation(e.target.checked)}
              className="w-4 h-4 text-green-600 border-stone-300 rounded focus:ring-2 focus:ring-green-500/20"
            />
            <MapPin className="w-4 h-4 text-stone-400" />
            <span>Has Location</span>
          </label>
        )}
      </div>

      {activeEquipment.length === 0 && allImplements.length === 0 ? (
        <EmptyState
          icon={Tractor}
          title="No Active Equipment"
          description="Sync from John Deere and ensure your equipment names match the active list (Chevy Kodiak, Dodge 2500, Fendt 1151, etc.). Edit src/config/equipment.ts to customize."
        />
      ) : (activeTab === 'implements' && filteredImplements.length === 0) ||
        (activeTab !== 'implements' && activeTab !== 'all' && filteredEquipment.length === 0) ||
        (activeTab === 'all' && filteredEquipment.length === 0 && filteredImplements.length === 0) ? (
        <EmptyState
          icon={Tractor}
          title="No Results"
          description="No equipment matches your search or filters."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTab === 'implements'
            ? filteredImplements.map((impl) => (
                <ImplementCard key={impl.id} impl={impl} />
              ))
            : activeTab === 'all'
              ? [
                  ...filteredEquipment.map((eq) => (
                    <EquipmentCard key={eq.id} eq={eq} to={`/equipment/${eq.id}`} />
                  )),
                  ...filteredImplements.map((impl) => (
                    <ImplementCard key={impl.id} impl={impl} />
                  )),
                ]
              : filteredEquipment.map((eq) => (
                  <EquipmentCard key={eq.id} eq={eq} to={`/equipment/${eq.id}`} />
                ))}
        </div>
      )}
    </div>
  );
}
