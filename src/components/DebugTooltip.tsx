import { useAuthStore } from '@/stores/useAuthStore';
import { useDebugStore } from '@/stores/useDebugStore';
import { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface DebugInfo {
  source: string;
  aggregation?: string;
  filters: string[];
  notes?: string;
}

interface DebugTooltipProps {
  info: DebugInfo;
  children: ReactNode;
}

export const DebugTooltip = ({ info, children }: DebugTooltipProps) => {
  const { user } = useAuthStore();
  const { debugAtivo } = useDebugStore();

  if (user?.nivel !== 0 || !debugAtivo) return <>{children}</>;

  const conteudo = [
    `Origem: ${info.source}`,
    info.aggregation ? `Agregação: ${info.aggregation}` : null,
    '',
    'Filtros aplicados:',
    ...(info.filters.length > 0
      ? info.filters.map((f) => `  • ${f}`)
      : ['  • Nenhum']),
    info.notes ? `\n${info.notes}` : null,
  ]
    .filter((v) => v !== null)
    .join('\n');

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help border border-dashed border-yellow-400/40 rounded relative">
            {children}
            <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-w-sm whitespace-pre font-mono text-[11px] bg-yellow-50 text-yellow-900 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-100 dark:border-yellow-700"
        >
          {conteudo}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default DebugTooltip;
