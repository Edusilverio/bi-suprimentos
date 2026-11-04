import { Zap, FileSearch, BarChart3 } from 'lucide-react';

export function QuickNavButtons() {
  const buttons = [
    { icon: <Zap className="h-4 w-4" />, tooltip: 'Ação Rápida' },
    { icon: <FileSearch className="h-4 w-4" />, tooltip: 'Busca Avançada' },
    { icon: <BarChart3 className="h-4 w-4" />, tooltip: 'Relatórios' },
  ];

  return (
    <div className="flex flex-col gap-2">
      {buttons.map((btn, i) => (
        <button
          key={i}
          title={btn.tooltip}
          className="h-10 w-10 rounded-lg border bg-card flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
}
