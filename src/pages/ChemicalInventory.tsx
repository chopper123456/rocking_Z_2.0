import { useCallback, useState, useMemo } from 'react';
import {
  Beaker,
  Search,
  AlertTriangle,
  Plus,
  Package,
  Droplets,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useFarmData, jdData } from '../hooks/useJohnDeere';
import { updateChemicalInventory, logSprayApplication } from '../lib/jd-api';
import type { Product, Equipment, Field } from '../types/farm';

interface ChemicalInventoryItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  last_updated: string;
}

export default function ChemicalInventory() {
  const invFetch = useCallback(() => jdData.chemicalInventory(), []);
  const appsFetch = useCallback(() => jdData.sprayApplications(), []);
  const productsFetch = useCallback(() => jdData.products(), []);
  const equipmentFetch = useCallback(() => jdData.equipment(), []);
  const fieldsFetch = useCallback(() => jdData.fields(), []);

  const { data: inventory, loading: invLoading, refresh: refreshInv } = useFarmData<ChemicalInventoryItem>(invFetch);
  const { data: applications, refresh: refreshApps } = useFarmData<Record<string, unknown>>(appsFetch);
  const { data: products } = useFarmData<Product>(productsFetch);
  const { data: equipment } = useFarmData<Equipment>(equipmentFetch);
  const { data: fields } = useFarmData<Field>(fieldsFetch);

  const [search, setSearch] = useState('');
  const [showLogForm, setShowLogForm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [logProduct, setLogProduct] = useState('');
  const [logAmount, setLogAmount] = useState('');
  const [logEquipment, setLogEquipment] = useState('');
  const [logField, setLogField] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [addProduct, setAddProduct] = useState('');
  const [addQuantity, setAddQuantity] = useState('');
  const [addThreshold, setAddThreshold] = useState('');
  const [addUnit, setAddUnit] = useState('gal');

  const lowStock = useMemo(() => {
    return inventory.filter(
      (i) => i.low_stock_threshold > 0 && i.quantity <= i.low_stock_threshold
    );
  }, [inventory]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return inventory.filter(
      (i) =>
        i.product_name?.toLowerCase().includes(q) ||
        i.product_id?.toLowerCase().includes(q)
    );
  }, [inventory, search]);

  const chemicals = useMemo(() => {
    return products.filter(
      (p) =>
        p.product_type === 'chemical' ||
        p.product_type === 'fertilizer' ||
        p.name?.toLowerCase().includes('herbicide') ||
        p.name?.toLowerCase().includes('insecticide')
    );
  }, [products]);

  const sprayers = useMemo(() => {
    return equipment.filter(
      (e) =>
        e.name?.toLowerCase().includes('spray') ||
        e.equipment_type?.toLowerCase().includes('sprayer') ||
        e.name?.toLowerCase().includes('w235')
    );
  }, [equipment]);

  const handleLogApplication = async () => {
    if (!logProduct || !logAmount || parseFloat(logAmount) <= 0) return;
    setSubmitting(true);
    try {
      await logSprayApplication({
        product_name: logProduct,
        amount_applied: parseFloat(logAmount),
        unit: addUnit,
        equipment_id: logEquipment || undefined,
        equipment_name: sprayers.find((e) => e.id === logEquipment)?.name,
        field_id: logField || undefined,
        field_name: fields.find((f) => f.id === logField)?.name,
      });
      const invItem = inventory.find(
        (i) =>
          i.product_name === logProduct ||
          i.product_id === chemicals.find((c) => c.name === logProduct)?.id
      );
      if (invItem) {
        await updateChemicalInventory({
          id: invItem.id,
          product_id: invItem.product_id,
          product_name: invItem.product_name,
          quantity: Math.max(0, invItem.quantity - parseFloat(logAmount)),
          unit: invItem.unit,
          low_stock_threshold: invItem.low_stock_threshold,
        });
      }
      setLogProduct('');
      setLogAmount('');
      setLogEquipment('');
      setLogField('');
      setShowLogForm(false);
      refreshInv();
      refreshApps();
    } catch (err) {
      console.error(err);
      alert('Failed to log application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddInventory = async () => {
    if (!addProduct || parseFloat(addQuantity) < 0) return;
    setSubmitting(true);
    try {
      await updateChemicalInventory({
        product_name: addProduct,
        quantity: parseFloat(addQuantity),
        unit: addUnit,
        low_stock_threshold: parseFloat(addThreshold) || 0,
      });
      setAddProduct('');
      setAddQuantity('');
      setAddThreshold('');
      setShowAddForm(false);
      refreshInv();
    } catch (err) {
      console.error(err);
      alert('Failed to add inventory');
    } finally {
      setSubmitting(false);
    }
  };

  if (invLoading) return <LoadingSpinner message="Loading inventory..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Chemical Inventory</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            Track chemicals and get low-stock alerts. Log spray applications to auto-deduct.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLogForm(!showLogForm)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-all"
          >
            <Droplets className="w-4 h-4" />
            Log Application
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-stone-200 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-50 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add / Update
          </button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-semibold text-amber-900 flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" />
            Low Stock Alert
          </h3>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((i) => (
              <span
                key={i.id}
                className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium"
              >
                {i.product_name}: {i.quantity} {i.unit} left
              </span>
            ))}
          </div>
        </div>
      )}

      {(showLogForm || showAddForm) && (
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="font-semibold text-stone-800 mb-4">
            {showLogForm ? 'Log Spray Application' : 'Add / Update Inventory'}
          </h3>
          {showLogForm ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Product</label>
                <select
                  value={logProduct}
                  onChange={(e) => setLogProduct(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                >
                  <option value="">Select product</option>
                  {chemicals.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                  {inventory
                    .filter((i) => !chemicals.some((c) => c.name === i.product_name))
                    .map((i) => (
                      <option key={i.id} value={i.product_name}>
                        {i.product_name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Amount used</label>
                <input
                  type="number"
                  step="0.1"
                  value={logAmount}
                  onChange={(e) => setLogAmount(e.target.value)}
                  placeholder="e.g. 25"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Sprayer (optional)</label>
                <select
                  value={logEquipment}
                  onChange={(e) => setLogEquipment(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                >
                  <option value="">Select sprayer</option>
                  {sprayers.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Field (optional)</label>
                <select
                  value={logField}
                  onChange={(e) => setLogField(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                >
                  <option value="">Select field</option>
                  {fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Product name</label>
                <input
                  type="text"
                  value={addProduct}
                  onChange={(e) => setAddProduct(e.target.value)}
                  placeholder="e.g. Roundup"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                  list="products-list"
                />
                <datalist id="products-list">
                  {chemicals.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Quantity</label>
                <input
                  type="number"
                  step="0.1"
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Low stock alert at</label>
                <input
                  type="number"
                  step="0.1"
                  value={addThreshold}
                  onChange={(e) => setAddThreshold(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Unit</label>
                <select
                  value={addUnit}
                  onChange={(e) => setAddUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                >
                  <option value="gal">gal</option>
                  <option value="L">L</option>
                  <option value="oz">oz</option>
                  <option value="lb">lb</option>
                </select>
              </div>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <button
              onClick={showLogForm ? handleLogApplication : handleAddInventory}
              disabled={submitting}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setShowLogForm(false);
                setShowAddForm(false);
              }}
              className="px-4 py-2 border border-stone-200 text-stone-600 text-sm rounded-lg hover:bg-stone-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search inventory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm"
          />
        </div>
      </div>

      {inventory.length === 0 ? (
        <EmptyState
          icon={Beaker}
          title="No Chemical Inventory"
          description="Add chemicals to track inventory. Sync products from John Deere first, then add quantities and set low-stock alerts."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const isLow =
              item.low_stock_threshold > 0 &&
              item.quantity <= item.low_stock_threshold;
            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border p-5 ${
                  isLow ? 'border-amber-300 bg-amber-50/30' : 'border-stone-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="bg-sky-50 rounded-lg p-2.5">
                    <Beaker className="w-5 h-5 text-sky-600" />
                  </div>
                  {isLow && (
                    <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                      Low Stock
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-stone-800">{item.product_name}</h3>
                <p className="text-2xl font-bold text-stone-900 mt-2">
                  {item.quantity} {item.unit}
                </p>
                {item.low_stock_threshold > 0 && (
                  <p className="text-xs text-stone-400 mt-1">
                    Alert when below {item.low_stock_threshold} {item.unit}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
