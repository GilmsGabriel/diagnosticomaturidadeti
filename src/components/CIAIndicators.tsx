import { Shield, Database, Activity } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { CIAIndicator } from '@/lib/cobit-framework';

const META: Record<CIAIndicator, { icon: typeof Shield; label: string; desc: string; cls: string }> = {
  C: { icon: Shield, label: 'Confidencialidade', desc: 'ISO 27001 — proteção contra acesso não autorizado.', cls: 'text-info' },
  I: { icon: Database, label: 'Integridade', desc: 'ISO 27001 — exatidão e completude da informação.', cls: 'text-accent' },
  A: { icon: Activity, label: 'Disponibilidade', desc: 'ISO 27001 — informação acessível quando necessária.', cls: 'text-[hsl(var(--warning))]' },
};

export const CIAIndicators = ({ indicators }: { indicators: CIAIndicator[] }) => (
  <div className="flex items-center gap-1.5">
    {indicators.map(key => {
      const m = META[key];
      const Icon = m.icon;
      return (
        <Tooltip key={key}>
          <TooltipTrigger asChild>
            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md bg-secondary/60 ${m.cls}`}>
              <Icon className="h-3.5 w-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="font-medium text-xs">{m.label}</p>
            <p className="text-xs text-muted-foreground">{m.desc}</p>
          </TooltipContent>
        </Tooltip>
      );
    })}
  </div>
);
