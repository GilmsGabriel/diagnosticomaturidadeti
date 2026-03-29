
-- Fix companies SELECT policy: restrict to owner or admin
DROP POLICY "Authenticated users can view companies" ON companies;
CREATE POLICY "Users can view own or admin companies"
  ON companies FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

-- Fix assessments SELECT policy: restrict to assessor or admin
DROP POLICY "Users can view assessments" ON assessments;
CREATE POLICY "Users can view own or admin assessments"
  ON assessments FOR SELECT TO authenticated
  USING (auth.uid() = assessor_id OR has_role(auth.uid(), 'admin'::app_role));

-- Fix assessment_answers SELECT policy: restrict to assessor or admin
DROP POLICY "Users can view answers" ON assessment_answers;
CREATE POLICY "Users can view own answers"
  ON assessment_answers FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM assessments
    WHERE assessments.id = assessment_answers.assessment_id
    AND (assessments.assessor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));
