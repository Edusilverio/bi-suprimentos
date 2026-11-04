import { Building2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  icon?: ReactNode;
}

export function PageHeader({ title, icon }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
          {icon || <Building2 className="h-5 w-5 text-primary-foreground" />}
        </div>
        <div>
          <h1 className="title-style text-2xl">{title}</h1>
          <p className="text-xs text-muted-foreground">BI Suprimentos – Atlas Engenharia</p>
        </div>
      </div>
    </div>
  );
}
