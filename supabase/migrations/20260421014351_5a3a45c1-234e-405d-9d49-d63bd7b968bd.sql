
-- Fix UPDATE policies: add WITH CHECK to prevent ownership reassignment

-- companies
DROP POLICY IF EXISTS "Admins can update companies" ON public.companies;
CREATE POLICY "Admins can update companies" ON public.companies
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR (auth.uid() = created_by))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR (auth.uid() = created_by));

-- assessments
DROP POLICY IF EXISTS "Assessors can update own assessments" ON public.assessments;
CREATE POLICY "Assessors can update own assessments" ON public.assessments
  FOR UPDATE TO authenticated
  USING ((auth.uid() = assessor_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((auth.uid() = assessor_id) OR has_role(auth.uid(), 'admin'::app_role));

-- assessment_answers
DROP POLICY IF EXISTS "Users can update answers" ON public.assessment_answers;
CREATE POLICY "Users can update answers" ON public.assessment_answers
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM assessments WHERE assessments.id = assessment_answers.assessment_id AND assessments.assessor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM assessments WHERE assessments.id = assessment_answers.assessment_id AND assessments.assessor_id = auth.uid()));

-- raci_entries
DROP POLICY IF EXISTS "Users can update own RACI" ON public.raci_entries;
CREATE POLICY "Users can update own RACI" ON public.raci_entries
  FOR UPDATE TO authenticated
  USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- action_plans
DROP POLICY IF EXISTS "Users can update own action plans" ON public.action_plans;
CREATE POLICY "Users can update own action plans" ON public.action_plans
  FOR UPDATE TO authenticated
  USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- risks
DROP POLICY IF EXISTS "Users can update own risks" ON public.risks;
CREATE POLICY "Users can update own risks" ON public.risks
  FOR UPDATE TO authenticated
  USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- kpis
DROP POLICY IF EXISTS "Users can update own KPIs" ON public.kpis;
CREATE POLICY "Users can update own KPIs" ON public.kpis
  FOR UPDATE TO authenticated
  USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Restrict profiles SELECT to own profile only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for assessment_answers
CREATE POLICY "Users can delete own answers" ON public.assessment_answers
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM assessments WHERE assessments.id = assessment_answers.assessment_id AND (assessments.assessor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))));

-- Restrictive policy on user_roles: only admins can INSERT/UPDATE/DELETE
CREATE POLICY "Only admins can modify roles" ON public.user_roles
  AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
