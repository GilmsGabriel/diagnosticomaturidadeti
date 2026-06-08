
ALTER TABLE public.swot_entries ADD COLUMN IF NOT EXISTS code text DEFAULT '';
ALTER TABLE public.risks ADD COLUMN IF NOT EXISTS swot_origin text DEFAULT '';
ALTER TABLE public.action_plans ADD COLUMN IF NOT EXISTS capex numeric;
ALTER TABLE public.action_plans ADD COLUMN IF NOT EXISTS opex numeric;
ALTER TABLE public.action_plans ADD COLUMN IF NOT EXISTS swot_trace text DEFAULT '';
