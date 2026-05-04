import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, GripVertical, Calendar, User, Target } from 'lucide-react';
import { CIAIndicators } from '@/components/CIAIndicators';
import type { CIAIndicator } from '@/lib/cobit-framework';

export type KanbanStatus = 'backlog' | 'todo' | 'doing' | 'done';

export interface ActionPlan {
  id: string;
  what: string;
  who?: string | null;
  due_date?: string | null;
  kanban_status: KanbanStatus;
  rice_score?: number | null;
  cobit_domain?: string | null;
  cia_indicators?: string[] | null;
  priority: string;
}

const COLUMNS: { key: KanbanStatus; label: string; tone: string }[] = [
  { key: 'backlog', label: 'Backlog', tone: 'bg-muted/40 border-muted' },
  { key: 'todo', label: 'A Fazer', tone: 'bg-secondary/30 border-secondary' },
  { key: 'doing', label: 'Em Progresso', tone: 'bg-[hsl(var(--info))]/10 border-[hsl(var(--info))]/40' },
  { key: 'done', label: 'Concluído', tone: 'bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/40' },
];

const isLate = (p: ActionPlan) => p.due_date && p.kanban_status !== 'done' && new Date(p.due_date) < new Date(new Date().toDateString());

const PlanCard = ({ plan, onEdit, onDelete, dragging }: { plan: ActionPlan; onEdit: (p: ActionPlan) => void; onDelete: (id: string) => void; dragging?: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: plan.id });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const late = isLate(plan);
  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`glass-card ${isDragging || dragging ? 'opacity-50' : ''} ${late ? 'border-destructive/60' : ''}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <button {...listeners} {...attributes} className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing mt-0.5">
            <GripVertical className="h-4 w-4" />
          </button>
          <p className="text-sm font-medium flex-1 line-clamp-3">{plan.what}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {plan.cobit_domain && <Badge variant="outline" className="text-[10px] h-5">{plan.cobit_domain}</Badge>}
          {typeof plan.rice_score === 'number' && (
            <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-primary/10 text-primary border-primary/30">
              <Target className="h-3 w-3" /> RICE {Math.round(plan.rice_score)}
            </Badge>
          )}
          {late && <Badge variant="outline" className="text-[10px] h-5 bg-destructive/20 text-destructive border-destructive/40">Atrasada</Badge>}
        </div>
        {(plan.cia_indicators?.length ?? 0) > 0 && (
          <CIAIndicators indicators={(plan.cia_indicators as CIAIndicator[]) || []} />
        )}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            {plan.who && <span className="flex items-center gap-1"><User className="h-3 w-3" />{plan.who}</span>}
            {plan.due_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(plan.due_date).toLocaleDateString('pt-BR')}</span>}
          </div>
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(plan)}><Pencil className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(plan.id)}><Trash2 className="h-3 w-3" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Column = ({ col, plans, onEdit, onDelete }: { col: typeof COLUMNS[number]; plans: ActionPlan[]; onEdit: (p: ActionPlan) => void; onDelete: (id: string) => void }) => {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div className="flex flex-col min-w-[260px] flex-1">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-sm font-semibold">{col.label}</h3>
        <Badge variant="outline" className="h-5 text-[10px]">{plans.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 p-2 rounded-lg border-2 border-dashed min-h-[400px] transition-colors ${col.tone} ${isOver ? 'ring-2 ring-primary' : ''}`}
      >
        {plans.map(p => <PlanCard key={p.id} plan={p} onEdit={onEdit} onDelete={onDelete} />)}
        {plans.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Arraste cards aqui</p>}
      </div>
    </div>
  );
};

interface Props {
  plans: ActionPlan[];
  onMove: (id: string, status: KanbanStatus) => void;
  onEdit: (p: ActionPlan) => void;
  onDelete: (id: string) => void;
}

export const KanbanBoard = ({ plans, onMove, onEdit, onDelete }: Props) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = plans.find(p => p.id === activeId);

  const handleEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const status = e.over?.id as KanbanStatus | undefined;
    if (!status || !e.active.id) return;
    const plan = plans.find(p => p.id === e.active.id);
    if (plan && plan.kanban_status !== status) onMove(plan.id, status);
  };

  return (
    <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)} onDragEnd={handleEnd} onDragCancel={() => setActiveId(null)}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map(col => (
          <Column key={col.key} col={col} plans={plans.filter(p => p.kanban_status === col.key)} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
      <DragOverlay>{active ? <PlanCard plan={active} onEdit={onEdit} onDelete={onDelete} dragging /> : null}</DragOverlay>
    </DndContext>
  );
};