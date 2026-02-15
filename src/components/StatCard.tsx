import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: 'green' | 'blue' | 'amber' | 'rose';
  subtitle?: string;
}

const colorMap = {
  green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-100' },
  blue: { bg: 'bg-sky-50', icon: 'text-sky-600', border: 'border-sky-100' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100' },
  rose: { bg: 'bg-rose-50', icon: 'text-rose-600', border: 'border-rose-100' },
};

export default function StatCard({ label, value, icon: Icon, color, subtitle }: StatCardProps) {
  const colors = colorMap[color];

  return (
    <div className={`bg-white rounded-xl border ${colors.border} p-5 hover:shadow-md transition-shadow duration-200`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-stone-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-stone-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`${colors.bg} rounded-lg p-2.5`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>
      </div>
    </div>
  );
}
