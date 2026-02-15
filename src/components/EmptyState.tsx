import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-stone-100 rounded-full p-4 mb-4">
        <Icon className="w-8 h-8 text-stone-400" />
      </div>
      <h3 className="text-lg font-semibold text-stone-700">{title}</h3>
      <p className="text-sm text-stone-400 mt-1 max-w-sm">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
