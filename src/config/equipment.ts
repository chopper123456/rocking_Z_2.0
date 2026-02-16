/**
 * Active equipment configuration for Rocking Z Acres.
 * Only equipment matching these names (partial match) will be shown.
 * Edit this list to add/remove active equipment.
 */
export const ACTIVE_EQUIPMENT_NAMES = [
  'Chevy Kodiak',
  'Chevy Kodiac',
  'Dodge 2500',
  'Fendt 1151',
  'Service Truck',
  'T7-210',
  'W235',
  'X9 - 1',
  'X9 - 2',
  'X9-1',
  'X9-2',
];

export type EquipmentCategory = 'pickups' | 'semis' | 'sprayer' | 'tractors' | 'implements';

/**
 * Maps equipment names (partial match) to categories.
 * Add patterns here to categorize your equipment.
 */
export const EQUIPMENT_CATEGORY_MAP: Record<string, EquipmentCategory> = {
  'chevy kodiak': 'pickups',
  'chevy kodiac': 'pickups',
  'dodge 2500': 'pickups',
  'service truck': 'pickups',
  'fendt 1151': 'tractors',
  't7-210': 'tractors',
  'w235': 'sprayer',
  'x9': 'tractors',
};

export const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  pickups: 'Pickups',
  semis: 'Semis',
  sprayer: 'Sprayer',
  tractors: 'Tractors',
  implements: 'Implements',
};

export function isActiveEquipment(name: string): boolean {
  const n = (name || '').trim().toLowerCase();
  if (!n) return false;
  return ACTIVE_EQUIPMENT_NAMES.some(
    (active) => n.includes(active.toLowerCase()) || active.toLowerCase().includes(n)
  );
}

export function getEquipmentCategory(
  name: string,
  equipmentType?: string,
  isImplement?: boolean
): EquipmentCategory {
  if (isImplement) return 'implements';
  const n = (name || '').trim().toLowerCase();
  const type = (equipmentType || '').toLowerCase();

  for (const [pattern, category] of Object.entries(EQUIPMENT_CATEGORY_MAP)) {
    if (n.includes(pattern)) return category;
  }

  if (type.includes('sprayer')) return 'sprayer';
  if (type.includes('tractor') || type.includes('combine')) return 'tractors';
  if (type.includes('truck') || type.includes('pickup')) return 'pickups';
  if (type.includes('semi') || type.includes('haul')) return 'semis';

  return 'tractors';
}
