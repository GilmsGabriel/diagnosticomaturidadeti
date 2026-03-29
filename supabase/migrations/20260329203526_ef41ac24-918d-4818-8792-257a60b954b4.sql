
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'assessor');

-- Create enum for maturity levels
CREATE TYPE public.maturity_level AS ENUM ('inicial', 'repetivel', 'definido', 'gerenciado', 'otimizado');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  sector TEXT,
  contact_name TEXT,
  contact_email TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view companies" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins can update companies" ON public.companies FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = created_by);
CREATE POLICY "Admins can delete companies" ON public.companies FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = created_by);

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  weight NUMERIC NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  description TEXT,
  weight NUMERIC NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view questions" ON public.questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage questions" ON public.questions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create assessments table
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  assessor_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  overall_score NUMERIC,
  maturity_level maturity_level,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assessments" ON public.assessments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create assessments" ON public.assessments FOR INSERT TO authenticated WITH CHECK (auth.uid() = assessor_id);
CREATE POLICY "Assessors can update own assessments" ON public.assessments FOR UPDATE TO authenticated USING (auth.uid() = assessor_id OR public.has_role(auth.uid(), 'admin'));

-- Create assessment_answers table
CREATE TABLE public.assessment_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  observation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view answers" ON public.assessment_answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert answers" ON public.assessment_answers FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.assessments WHERE id = assessment_id AND assessor_id = auth.uid())
);
CREATE POLICY "Users can update answers" ON public.assessment_answers FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.assessments WHERE id = assessment_id AND assessor_id = auth.uid())
);

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default categories
INSERT INTO public.categories (name, description, weight, sort_order) VALUES
  ('Governança de TI', 'Avalia a estrutura de governança, políticas e alinhamento estratégico da TI', 1, 1),
  ('Segurança da Informação', 'Avalia práticas de segurança, gestão de riscos e conformidade', 1, 2),
  ('Infraestrutura', 'Avalia a infraestrutura tecnológica, redes, servidores e cloud', 1, 3),
  ('Gestão de Serviços', 'Avalia processos ITIL, SLAs e suporte ao usuário', 1, 4),
  ('Desenvolvimento e Inovação', 'Avalia práticas de desenvolvimento, DevOps e inovação tecnológica', 1, 5),
  ('Gestão de Dados', 'Avalia práticas de gestão de dados, backup e recuperação', 1, 6);
