import { useCallback, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Tractor,
  ArrowLeft,
  Gauge,
  MapPin,
  Fuel,
  Clock,
  Activity,
  AlertTriangle,
  Wrench,
  TrendingUp,
  Calendar,
  Hash,
  Droplet
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useFarmData, jdData } from '../hooks/useJohnDeere';
import type { Equipment, MachineAlert, MachineEngineHours, MachineOperationalHours } from '../types/farm';

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: 'red', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  high: { label: 'High', color: 'orange', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  medium: { label: 'Medium', color: 'yellow', bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
  low: { label: 'Low', color: 'blue', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  info: { label: 'Info', color: 'stone', bg: 'bg-stone-50', text: 'text-stone-600', border: 'border-stone-200' },
};

type TabType = 'summary' | 'alerts' | 'maintenance';

export default function EquipmentDetail() {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  const equipmentFetch = useCallback(() => jdData.equipment(), []);
  const alertFetch = useCallback(() => jdData.machineAlerts(), []);
  const engineHoursFetch = useCallback(() => jdData.machineEngineHours(), []);
  const operationalHoursFetch = useCallback(() => jdData.machineOperationalHours(), []);

  const { data: allEquipment, loading: equipmentLoading } = useFarmData<Equipment>(equipmentFetch);
  const { data: allAlerts, loading: alertsLoading } = useFarmData<MachineAlert>(alertFetch);
  const { data: allEngineHours, loading: engineHoursLoading } = useFarmData<MachineEngineHours>(engineHoursFetch);
  const { data: allOperationalHours, loading: operationalHoursLoading } = useFarmData<MachineOperationalHours>(operationalHoursFetch);

  const equipment = useMemo(() =>
    allEquipment.find(e => e.id === equipmentId),
    [allEquipment, equipmentId]
  );

  const alerts = useMemo(() =>
    allAlerts.filter(a => a.equipment_id === equipmentId).sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return new Date(b.started_at || 0).getTime() - new Date(a.started_at || 0).getTime();
    }),
    [allAlerts, equipmentId]
  );

  const engineHours = useMemo(() =>
    allEngineHours
      .filter(h => h.equipment_id === equipmentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [allEngineHours, equipmentId]
  );

  const operationalHours = useMemo(() =>
    allOperationalHours
      .filter(h => h.equipment_id === equipmentId)
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()),
    [allOperationalHours, equipmentId]
  );

  const activeAlerts = alerts.filter(a => a.active);
  const recentAlerts = alerts.slice(0, 5);

  const loading = equipmentLoading || alertsLoading || engineHoursLoading || operationalHoursLoading;

  if (loading) return <LoadingSpinner message="Loading equipment details..." />;

  if (!equipment) {
    return (
      <EmptyState
        icon={Tractor}
        title="Equipment Not Found"
        description="The requested equipment could not be found."
      />
    );
  }

  const latestEngineHours = engineHours[0]?.engine_hours || equipment.cumulative_operating_hours || equipment.engine_hours || 0;
  const totalOperationalTime = operationalHours.reduce((sum, h) => sum + (h.duration_hours || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/equipment"
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-stone-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-stone-900">{equipment.name || 'Unnamed Equipment'}</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            {equipment.make} {equipment.model} {equipment.serial_number && `· SN: ${equipment.serial_number}`}
          </p>
        </div>
        {activeAlerts.length > 0 && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-semibold text-sm">{activeAlerts.length} Active Alert{activeAlerts.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === 'summary'
              ? 'text-green-600'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Summary
          {activeTab === 'summary' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === 'alerts'
              ? 'text-green-600'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Alerts {alerts.length > 0 && `(${alerts.length})`}
          {activeTab === 'alerts' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === 'maintenance'
              ? 'text-green-600'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Maintenance
          {activeTab === 'maintenance' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />
          )}
        </button>
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-50 rounded-lg p-2">
                  <Gauge className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm text-stone-500">Engine Hours</span>
              </div>
              <p className="text-2xl font-bold text-stone-900">{latestEngineHours.toLocaleString()}</p>
              <p className="text-xs text-stone-400 mt-1">Total operating time</p>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-green-50 rounded-lg p-2">
                  <Activity className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm text-stone-500">Idle Hours</span>
              </div>
              <p className="text-2xl font-bold text-stone-900">{equipment.cumulative_idle_hours?.toLocaleString() || 0}</p>
              <p className="text-xs text-stone-400 mt-1">Time engine running idle</p>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-amber-50 rounded-lg p-2">
                  <Fuel className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-sm text-stone-500">Fuel Level</span>
              </div>
              <p className="text-2xl font-bold text-stone-900">
                {equipment.fuel_remaining_ratio ? Math.round(equipment.fuel_remaining_ratio * 100) : 0}%
              </p>
              <p className="text-xs text-stone-400 mt-1">Current fuel remaining</p>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-sky-50 rounded-lg p-2">
                  <Droplet className="w-4 h-4 text-sky-600" />
                </div>
                <span className="text-sm text-stone-500">DEF Level</span>
              </div>
              <p className="text-2xl font-bold text-stone-900">
                {equipment.def_remaining_ratio ? Math.round(equipment.def_remaining_ratio * 100) : 0}%
              </p>
              <p className="text-xs text-stone-400 mt-1">Diesel exhaust fluid</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
                <Tractor className="w-4 h-4 text-stone-400" />
                Equipment Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-sm text-stone-500">Type</span>
                  <span className="text-sm font-medium text-stone-800">{equipment.equipment_type || 'Unknown'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-sm text-stone-500">Make & Model</span>
                  <span className="text-sm font-medium text-stone-800">{equipment.make} {equipment.model}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-sm text-stone-500">Serial Number</span>
                  <span className="text-sm font-mono text-stone-800">{equipment.serial_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-sm text-stone-500">Total Distance</span>
                  <span className="text-sm font-medium text-stone-800">
                    {equipment.cumulative_distance ? `${equipment.cumulative_distance.toLocaleString()} mi` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-sm text-stone-500">Fuel Consumed</span>
                  <span className="text-sm font-medium text-stone-800">
                    {equipment.cumulative_fuel_used ? `${equipment.cumulative_fuel_used.toLocaleString()} gal` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-stone-500">Telemetry Status</span>
                  <span className={`text-sm font-medium ${equipment.telemetry_state === 'active' ? 'text-green-600' : 'text-stone-400'}`}>
                    {equipment.telemetry_state || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-stone-400" />
                Location & Status
              </h3>
              <div className="space-y-4">
                {equipment.last_location_lat !== 0 && equipment.last_location_lon !== 0 ? (
                  <>
                    <div>
                      <p className="text-xs text-stone-500 mb-1">Current Location</p>
                      <p className="text-sm font-mono text-stone-800">
                        {equipment.last_location_lat.toFixed(6)}, {equipment.last_location_lon.toFixed(6)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500 mb-1">Last Position Update</p>
                      <p className="text-sm text-stone-800">
                        {equipment.last_location_time
                          ? new Date(equipment.last_location_time).toLocaleString()
                          : 'Unknown'}
                      </p>
                    </div>
                    <div className="pt-3">
                      <a
                        href={`https://www.google.com/maps?q=${equipment.last_location_lat},${equipment.last_location_lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium"
                      >
                        <MapPin className="w-4 h-4" />
                        View on Google Maps
                      </a>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-stone-400">No location data available</p>
                )}
              </div>
            </div>
          </div>

          {recentAlerts.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-stone-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-stone-400" />
                  Recent Alerts
                </h3>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  View All
                </button>
              </div>
              <div className="space-y-2">
                {recentAlerts.slice(0, 3).map(alert => {
                  const sevConfig = SEVERITY_CONFIG[alert.severity?.toLowerCase() as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info;
                  return (
                    <div key={alert.id} className={`flex items-center justify-between p-3 rounded-lg border ${sevConfig.border}`}>
                      <div className="flex items-center gap-3">
                        <div className={`${sevConfig.bg} rounded p-1.5`}>
                          <AlertTriangle className={`w-3.5 h-3.5 ${sevConfig.text}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-stone-800">{alert.description || alert.alert_type}</p>
                          {alert.dtc_code && (
                            <p className="text-xs text-stone-500 font-mono">{alert.dtc_code}</p>
                          )}
                        </div>
                      </div>
                      {alert.active && (
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="No Alerts"
              description="This equipment has no recorded alerts."
            />
          ) : (
            alerts.map(alert => {
              const sevConfig = SEVERITY_CONFIG[alert.severity?.toLowerCase() as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info;
              return (
                <div
                  key={alert.id}
                  className={`bg-white rounded-xl border ${sevConfig.border} p-5 ${!alert.active ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`${sevConfig.bg} rounded-lg p-2`}>
                        <AlertTriangle className={`w-4 h-4 ${sevConfig.text}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-stone-800">
                            {alert.description || alert.alert_type || 'Unknown Alert'}
                          </h3>
                          {alert.active ? (
                            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                              Resolved
                            </span>
                          )}
                        </div>
                        {alert.dtc_code && (
                          <p className="text-sm text-stone-500 font-mono">{alert.dtc_code}</p>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-semibold uppercase ${sevConfig.bg} ${sevConfig.text} px-2.5 py-1 rounded-full`}>
                      {sevConfig.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-stone-100">
                    <div>
                      <p className="text-xs text-stone-400 mb-1">Started</p>
                      <p className="text-sm text-stone-700">
                        {alert.started_at ? new Date(alert.started_at).toLocaleString() : 'Unknown'}
                      </p>
                    </div>
                    {alert.ended_at && (
                      <div>
                        <p className="text-xs text-stone-400 mb-1">Resolved</p>
                        <p className="text-sm text-stone-700">
                          {new Date(alert.ended_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-stone-400" />
                Maintenance Metrics
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Gauge className="w-4 h-4 text-stone-400" />
                    <span className="text-sm text-stone-600">Engine Hours</span>
                  </div>
                  <span className="text-sm font-semibold text-stone-900">{latestEngineHours.toLocaleString()} hrs</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-stone-400" />
                    <span className="text-sm text-stone-600">Operational Sessions</span>
                  </div>
                  <span className="text-sm font-semibold text-stone-900">{operationalHours.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-4 h-4 text-stone-400" />
                    <span className="text-sm text-stone-600">Total Operating Time</span>
                  </div>
                  <span className="text-sm font-semibold text-stone-900">{totalOperationalTime.toFixed(1)} hrs</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Fuel className="w-4 h-4 text-stone-400" />
                    <span className="text-sm text-stone-600">Total Fuel Used</span>
                  </div>
                  <span className="text-sm font-semibold text-stone-900">
                    {equipment.cumulative_fuel_used?.toLocaleString() || 0} gal
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-stone-400" />
                Maintenance Recommendations
              </h3>
              <div className="space-y-3">
                {latestEngineHours > 250 && latestEngineHours % 250 < 50 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm font-medium text-amber-900">Oil Change Due Soon</p>
                    <p className="text-xs text-amber-700 mt-1">Recommended every 250 hours</p>
                  </div>
                )}
                {latestEngineHours > 500 && latestEngineHours % 500 < 50 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">Service Inspection Due</p>
                    <p className="text-xs text-blue-700 mt-1">Recommended every 500 hours</p>
                  </div>
                )}
                {equipment.fuel_remaining_ratio && equipment.fuel_remaining_ratio < 0.25 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-900">Low Fuel Warning</p>
                    <p className="text-xs text-red-700 mt-1">Fuel level below 25%</p>
                  </div>
                )}
                {equipment.def_remaining_ratio && equipment.def_remaining_ratio < 0.25 && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm font-medium text-orange-900">Low DEF Warning</p>
                    <p className="text-xs text-orange-700 mt-1">DEF level below 25%</p>
                  </div>
                )}
                {(!latestEngineHours || (latestEngineHours % 250 >= 50 && latestEngineHours % 500 >= 50)) &&
                 (!equipment.fuel_remaining_ratio || equipment.fuel_remaining_ratio >= 0.25) &&
                 (!equipment.def_remaining_ratio || equipment.def_remaining_ratio >= 0.25) && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-900">All Systems Normal</p>
                    <p className="text-xs text-green-700 mt-1">No maintenance required at this time</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {engineHours.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
                <Hash className="w-4 h-4 text-stone-400" />
                Engine Hours History
              </h3>
              <div className="space-y-2">
                {engineHours.slice(0, 10).map(record => (
                  <div key={record.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                    <span className="text-sm text-stone-600">
                      {new Date(record.timestamp).toLocaleString()}
                    </span>
                    <span className="text-sm font-semibold text-stone-900">
                      {record.engine_hours.toLocaleString()} hrs
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {operationalHours.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-stone-400" />
                Recent Operating Sessions
              </h3>
              <div className="space-y-2">
                {operationalHours.slice(0, 10).map(record => (
                  <div key={record.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                    <div>
                      <p className="text-sm text-stone-800">
                        {new Date(record.start_time).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-stone-500">
                        {new Date(record.start_time).toLocaleTimeString()} - {record.end_time ? new Date(record.end_time).toLocaleTimeString() : 'Ongoing'}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-stone-900">
                      {record.duration_hours.toFixed(1)} hrs
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
