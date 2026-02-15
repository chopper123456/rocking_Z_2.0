import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Search,
  Satellite,
  MapIcon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Sprout,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useFarmData, jdData } from '../hooks/useJohnDeere';
import type { Field, Boundary, FieldOperation } from '../types/farm';

const CROP_COLORS: Record<string, string> = {
  corn: '#16a34a',
  soybeans: '#eab308',
  wheat: '#f97316',
  cotton: '#94a3b8',
  rice: '#06b6d4',
  sorghum: '#ef4444',
  alfalfa: '#10b981',
  default: '#3b82f6',
};

const TILE_URLS = {
  street: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

function parseBoundaryCoords(geojson: Record<string, unknown>): L.LatLngExpression[][] | null {
  try {
    if (geojson.type === 'MultiPolygon' && Array.isArray(geojson.coordinates)) {
      return (geojson.coordinates as number[][][][]).flatMap((polygon) =>
        polygon.map((ring) =>
          ring.map(([lng, lat]) => [lat, lng] as L.LatLngExpression)
        )
      );
    }
    if (geojson.type === 'Polygon' && Array.isArray(geojson.coordinates)) {
      return (geojson.coordinates as number[][][]).map((ring) =>
        ring.map(([lng, lat]) => [lat, lng] as L.LatLngExpression)
      );
    }
    if (Array.isArray(geojson.rings)) {
      return (geojson.rings as Array<Array<{ lat: number; lon: number }>>).map((ring) =>
        ring.map((pt) => [pt.lat, pt.lon] as L.LatLngExpression)
      );
    }
    return null;
  } catch {
    return null;
  }
}

function getFieldColor(field: Field): string {
  const crop = field.crop_type?.toLowerCase() || '';
  return CROP_COLORS[crop] || CROP_COLORS.default;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polygonsRef = useRef<L.Polygon[]>([]);

  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState('');

  const fieldsFetch = useCallback(() => jdData.fields(), []);
  const boundariesFetch = useCallback(() => jdData.boundaries(), []);
  const opsFetch = useCallback(() => jdData.fieldOperations(), []);

  const { data: fields, loading: fieldsLoading } = useFarmData<Field>(fieldsFetch);
  const { data: boundaries, loading: boundariesLoading } = useFarmData<Boundary>(boundariesFetch);
  const { data: operations } = useFarmData<FieldOperation>(opsFetch);

  const boundaryMap = useMemo(() => {
    const map = new Map<string, Boundary>();
    boundaries.forEach(b => map.set(b.field_id, b));
    return map;
  }, [boundaries]);

  const opsMap = useMemo(() => {
    const map = new Map<string, FieldOperation[]>();
    operations.forEach(op => {
      const existing = map.get(op.field_id) || [];
      existing.push(op);
      map.set(op.field_id, existing);
    });
    return map;
  }, [operations]);

  const filteredFields = useMemo(() => {
    const q = sidebarSearch.toLowerCase();
    return fields.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.crop_type?.toLowerCase().includes(q)
    );
  }, [fields, sidebarSearch]);

  const cropTypes = useMemo(() => {
    const set = new Set(fields.map(f => f.crop_type?.toLowerCase()).filter(Boolean));
    return Array.from(set) as string[];
  }, [fields]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([39.8283, -98.5795], 5);

    const tile = L.tileLayer(TILE_URLS.street, { maxZoom: 19 }).addTo(map);
    tileLayerRef.current = tile;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(TILE_URLS[mapStyle]);
    }
  }, [mapStyle]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || boundaries.length === 0) return;

    polygonsRef.current.forEach(p => map.removeLayer(p));
    polygonsRef.current = [];

    const allBounds: L.LatLngBounds[] = [];

    boundaries.forEach((boundary) => {
      const coords = parseBoundaryCoords(boundary.geojson as Record<string, unknown>);
      if (!coords || coords.length === 0) return;

      const field = fields.find(f => f.id === boundary.field_id);
      const color = field ? getFieldColor(field) : CROP_COLORS.default;

      const polygon = L.polygon(coords, {
        color,
        fillColor: color,
        fillOpacity: 0.2,
        weight: 2.5,
      }).addTo(map);

      if (field) {
        polygon.bindTooltip(field.name, {
          permanent: false,
          direction: 'center',
          className: 'field-tooltip',
        });
        polygon.on('click', () => {
          setSelectedField(field);
          map.fitBounds(polygon.getBounds(), { padding: [80, 80], maxZoom: 15 });
        });
      }

      polygonsRef.current.push(polygon);
      allBounds.push(polygon.getBounds());
    });

    if (allBounds.length > 0 && !selectedField) {
      const combined = allBounds.reduce((acc, b) => acc.extend(b), L.latLngBounds(allBounds[0]));
      map.fitBounds(combined, { padding: [40, 40] });
    }
  }, [boundaries, fields]);

  const handleSelectField = useCallback((field: Field) => {
    setSelectedField(field);
    const boundary = boundaryMap.get(field.id);
    if (boundary && mapInstanceRef.current) {
      const coords = parseBoundaryCoords(boundary.geojson as Record<string, unknown>);
      if (coords && coords.length > 0) {
        const polygon = L.polygon(coords);
        mapInstanceRef.current.fitBounds(polygon.getBounds(), { padding: [80, 80], maxZoom: 15 });
      }
    }
  }, [boundaryMap]);

  const handleFitAll = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || polygonsRef.current.length === 0) return;
    const bounds = polygonsRef.current.map(p => p.getBounds());
    const combined = bounds.reduce((acc, b) => acc.extend(b), L.latLngBounds(bounds[0]));
    map.fitBounds(combined, { padding: [40, 40] });
    setSelectedField(null);
  }, []);

  const loading = fieldsLoading || boundariesLoading;

  if (loading) return <LoadingSpinner message="Loading map data..." />;

  if (boundaries.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Farm Map</h1>
          <p className="text-sm text-stone-400 mt-0.5">{fields.length} fields</p>
        </div>
        <EmptyState
          icon={Layers}
          title="No Boundaries Available"
          description="Sync your field boundaries from John Deere to see them on the map."
        />
      </div>
    );
  }

  const selectedOps = selectedField
    ? (opsMap.get(selectedField.id) || [])
        .sort((a, b) => {
          const dA = a.start_date ? new Date(a.start_date).getTime() : 0;
          const dB = b.start_date ? new Date(b.start_date).getTime() : 0;
          return dB - dA;
        })
        .slice(0, 5)
    : [];

  return (
    <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-white shadow-sm" style={{ height: 'calc(100vh - 120px)' }}>
      {showSidebar && (
        <div className="absolute top-0 left-0 z-[1001] w-72 h-full bg-white border-r border-stone-200 flex flex-col animate-slide-in">
          <div className="p-3 border-b border-stone-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
              <input
                type="text"
                placeholder="Search fields..."
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              />
            </div>
            <p className="text-[10px] text-stone-400 mt-2 font-medium uppercase tracking-wider">
              {filteredFields.length} of {fields.length} fields
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredFields.map(field => {
              const isSelected = selectedField?.id === field.id;
              const hasBoundary = boundaryMap.has(field.id);
              return (
                <button
                  key={field.id}
                  onClick={() => handleSelectField(field)}
                  className={`w-full text-left px-3 py-2.5 border-b border-stone-50 hover:bg-stone-50 transition-colors ${
                    isSelected ? 'bg-green-50 border-l-2 border-l-green-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: hasBoundary ? getFieldColor(field) : '#d6d3d1' }}
                    />
                    <span className="text-xs font-medium text-stone-700 truncate">{field.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 ml-[18px]">
                    <span className="text-[10px] text-stone-400">{field.acreage?.toFixed(1) || '-'} ac</span>
                    {field.crop_type && (
                      <span className="text-[10px] text-stone-400 capitalize">{field.crop_type}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div ref={mapRef} className="w-full h-full" />

      <button
        onClick={() => {
          setShowSidebar(!showSidebar);
          setTimeout(() => mapInstanceRef.current?.invalidateSize(), 350);
        }}
        className="absolute top-4 z-[1002] bg-white shadow-lg rounded-lg p-2 hover:bg-stone-50 transition-colors border border-stone-200"
        style={{ left: showSidebar ? '296px' : '16px' }}
      >
        {showSidebar ? <ChevronLeft className="w-4 h-4 text-stone-600" /> : <ChevronRight className="w-4 h-4 text-stone-600" />}
      </button>

      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-1.5">
        <button
          onClick={() => setMapStyle(mapStyle === 'street' ? 'satellite' : 'street')}
          className="bg-white shadow-lg rounded-lg p-2 hover:bg-stone-50 transition-colors border border-stone-200"
          title={mapStyle === 'street' ? 'Switch to satellite' : 'Switch to street'}
        >
          {mapStyle === 'street' ? (
            <Satellite className="w-4 h-4 text-stone-600" />
          ) : (
            <MapIcon className="w-4 h-4 text-stone-600" />
          )}
        </button>
        <button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="bg-white shadow-lg rounded-lg p-2 hover:bg-stone-50 transition-colors border border-stone-200"
        >
          <ZoomIn className="w-4 h-4 text-stone-600" />
        </button>
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="bg-white shadow-lg rounded-lg p-2 hover:bg-stone-50 transition-colors border border-stone-200"
        >
          <ZoomOut className="w-4 h-4 text-stone-600" />
        </button>
        <button
          onClick={handleFitAll}
          className="bg-white shadow-lg rounded-lg p-2 hover:bg-stone-50 transition-colors border border-stone-200"
        >
          <Maximize2 className="w-4 h-4 text-stone-600" />
        </button>
      </div>

      {cropTypes.length > 0 && (
        <div
          className="absolute bottom-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-stone-200 px-3 py-2"
          style={{ left: showSidebar ? '304px' : '16px' }}
        >
          <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Crops</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {cropTypes.map(crop => (
              <div key={crop} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CROP_COLORS[crop] || CROP_COLORS.default }} />
                <span className="text-[10px] text-stone-600 capitalize">{crop}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedField && (
        <div className="absolute bottom-4 right-4 z-[1000] w-80 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-stone-200 overflow-hidden animate-scale-in">
          <div className="flex items-start justify-between p-4 pb-3">
            <div>
              <h3 className="font-semibold text-stone-800">{selectedField.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-stone-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {selectedField.acreage?.toFixed(1) || '-'} acres
                </span>
                {selectedField.crop_type && (
                  <span className="text-xs text-stone-400 capitalize flex items-center gap-1">
                    <Sprout className="w-3 h-3" />
                    {selectedField.crop_type}
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => setSelectedField(null)} className="p-1 hover:bg-stone-100 rounded-md">
              <X className="w-4 h-4 text-stone-400" />
            </button>
          </div>
          {selectedOps.length > 0 && (
            <div className="border-t border-stone-100 px-4 py-3">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-2">Recent Operations</p>
              <div className="space-y-1.5">
                {selectedOps.map(op => (
                  <div key={op.id} className="flex items-center justify-between text-xs">
                    <span className="text-stone-600 capitalize">{op.operation_type}</span>
                    <span className="text-stone-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(op.start_date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
