import { X } from 'lucide-react';

interface ActiveFilterBadgeProps {
  label: string;
  onRemove: () => void;
}

export function ActiveFilterBadge({ label, onRemove }: ActiveFilterBadgeProps) {
  return (
    <div className="badge-filter mb-3">
      <span>Filtro ativo: <strong>{label}</strong></span>
      <button onClick={onRemove} className="ml-1 hover:opacity-70">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
