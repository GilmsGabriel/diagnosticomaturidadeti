
-- PDTI v2: enrich data model for high-quality export
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS mission text,
  ADD COLUMN IF NOT EXISTS vision text,
  ADD COLUMN IF NOT EXISTS values text,
  ADD COLUMN IF NOT EXISTS strategic_context text,
  ADD COLUMN IF NOT EXISTS sponsor text,
  ADD COLUMN IF NOT EXISTS plan_horizon text;

ALTER TABLE public.risks
  ADD COLUMN IF NOT EXISTS risk_type text NOT NULL DEFAULT 'threat',
  ADD COLUMN IF NOT EXISTS response_strategy text NOT NULL DEFAULT 'mitigate',
  ADD COLUMN IF NOT EXISTS contingency text DEFAULT '',
  ADD COLUMN IF NOT EXISTS responsible text DEFAULT '';

ALTER TABLE public.action_plans
  ADD COLUMN IF NOT EXISTS risk_id uuid,
  ADD COLUMN IF NOT EXISTS kpi_success text DEFAULT '',
  ADD COLUMN IF NOT EXISTS department text DEFAULT '',
  ADD COLUMN IF NOT EXISTS action_code text DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_action_plans_risk_id ON public.action_plans(risk_id);

ALTER TABLE public.kpis
  ADD COLUMN IF NOT EXISTS target_year_1 numeric,
  ADD COLUMN IF NOT EXISTS target_year_2 numeric;

-- SWOT entries
CREATE TABLE IF NOT EXISTS public.swot_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('strength','weakness','opportunity','threat')),
  description text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.swot_entries TO authenticated;
GRANT ALL ON public.swot_entries TO service_role;

ALTER TABLE public.swot_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own swot" ON public.swot_entries
  FOR SELECT TO authenticated
  USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert swot" ON public.swot_entries
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users update own swot" ON public.swot_entries
  FOR UPDATE TO authenticated
  USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users delete own swot" ON public.swot_entries
  FOR DELETE TO authenticated
  USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_swot_entries_updated_at
  BEFORE UPDATE ON public.swot_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
