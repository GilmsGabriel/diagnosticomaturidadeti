
ALTER TABLE public.action_plans
  ADD COLUMN IF NOT EXISTS reach numeric NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS impact_score numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS confidence integer NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS effort numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rice_score numeric GENERATED ALWAYS AS ((reach * impact_score * confidence) / NULLIF(effort, 0)) STORED,
  ADD COLUMN IF NOT EXISTS cobit_domain text NOT NULL DEFAULT 'APO',
  ADD COLUMN IF NOT EXISTS cia_indicators text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS kanban_status text NOT NULL DEFAULT 'backlog',
  ADD COLUMN IF NOT EXISTS due_date date;

ALTER TABLE public.action_plans
  ADD CONSTRAINT action_plans_reach_chk CHECK (reach >= 100 AND reach <= 1600),
  ADD CONSTRAINT action_plans_impact_chk CHECK (impact_score >= 0.25 AND impact_score <= 3),
  ADD CONSTRAINT action_plans_confidence_chk CHECK (confidence >= 20 AND confidence <= 100),
  ADD CONSTRAINT action_plans_effort_chk CHECK (effort >= 1 AND effort <= 15),
  ADD CONSTRAINT action_plans_cobit_chk CHECK (cobit_domain IN ('EDM','APO','BAI','DSS','MEA')),
  ADD CONSTRAINT action_plans_kanban_chk CHECK (kanban_status IN ('backlog','todo','doing','done'));

CREATE INDEX IF NOT EXISTS idx_action_plans_kanban ON public.action_plans(company_id, kanban_status);
CREATE INDEX IF NOT EXISTS idx_action_plans_rice ON public.action_plans(company_id, rice_score DESC);
