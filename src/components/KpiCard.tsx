import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type KpiIconColor =
  | 'red' | 'blue' | 'orange' | 'green'
  | 'pinkAtlas' | 'navyDeep' | 'caramel' | 'sageGreen' | 'blueSlate'
  | string; // HEX (#RRGGBB) também aceito

const NAMED_COLORS: Record<string, string> = {
  // legacy → mapeado para a nova paleta oficial Atlas
  red: '#FB2B67',
  blue: '#5D7A9A',
  orange: '#B88746',
  green: '#7A9E7E',
  // nomeadas oficiais
  pinkAtlas: '#FB2B67',
  navyDeep: '#1E3A5F',
  caramel:  '#B88746',
  sageGreen:'#7A9E7E',
  blueSlate:'#5D7A9A',
};

export function resolveKpiColor(c?: KpiIconColor): string {
  if (!c) return NAMED_COLORS.blueSlate;
  if (typeof c === 'string' && c.startsWith('#')) return c;
  return NAMED_COLORS[c] ?? NAMED_COLORS.blueSlate;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface KpiCardProps {
  label: string;
  value: ReactNode;
  statusKey?: string | null;
  isActive?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  iconColor?: KpiIconColor;
  trendPlaceholder?: string;
  clickable?: boolean;
}

export function KpiCard({
  label,
  value,
  statusKey = null,
  isActive = false,
  onClick,
  icon,
  iconColor = 'blueSlate',
  trendPlaceholder,
  clickable = true,
}: KpiCardProps) {
  const hex = resolveKpiColor(iconColor);

  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      className={cn(
        'kpi-card text-left w-full bg-white border border-border rounded-lg shadow-sm p-4 flex flex-col justify-between min-h-[120px]',
        isActive && 'kpi-card-active',
        !clickable && 'cursor-default',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="inline-flex items-center justify-center h-9 w-9 rounded-lg shrink-0"
          style={{ backgroundColor: hexToRgba(hex, 0.12) }}
        >
          <span style={{ color: hex, display: 'inline-flex', opacity: 1 }}>
            {icon}
          </span>
        </span>
        <span
          className="title-style text-[11px] leading-tight text-right pt-1"
          style={{ fontWeight: 600 }}
        >
          {label}
        </span>
      </div>

      <div className="mt-3 text-3xl font-bold text-foreground tabular-nums">
        {value}
      </div>

      <div className="text-[11px] text-muted-foreground mt-1 min-h-[14px]">
        {trendPlaceholder ?? ' '}
      </div>
    </button>
  );
}
