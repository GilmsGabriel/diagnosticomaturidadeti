import { z } from 'zod';

const trimmedString = (max: number, label = 'campo') =>
  z.string().trim().max(max, { message: `${label} deve ter no máximo ${max} caracteres` });

const requiredString = (max: number, label = 'campo') =>
  trimmedString(max, label).min(1, { message: `${label} é obrigatório` });

const optionalString = (max: number, label = 'campo') =>
  trimmedString(max, label).optional().or(z.literal(''));

const emailField = z
  .string()
  .trim()
  .email({ message: 'E-mail inválido' })
  .max(255, { message: 'E-mail muito longo' });

// ===== Auth =====
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres' }).max(72),
});

export const signupSchema = loginSchema.extend({
  fullName: requiredString(100, 'Nome'),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres' }).max(72),
    confirmPassword: z.string().min(6).max(72),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

// ===== Company =====
export const companySchema = z.object({
  name: requiredString(120, 'Nome'),
  cnpj: optionalString(20, 'CNPJ'),
  sector: optionalString(80, 'Setor'),
  contact_name: optionalString(120, 'Contato'),
  contact_email: z.union([z.literal(''), emailField]).optional(),
  mission: optionalString(1000, 'Missão'),
  vision: optionalString(1000, 'Visão'),
  values: optionalString(1000, 'Valores'),
  strategic_context: optionalString(2000, 'Contexto estratégico'),
  sponsor: optionalString(120, 'Patrocinador'),
  plan_horizon: optionalString(40, 'Horizonte'),
});

// ===== Question / Category =====
export const categorySchema = z.object({
  name: requiredString(120, 'Nome'),
  description: optionalString(1000, 'Descrição'),
  weight: z.number({ invalid_type_error: 'Peso inválido' }).min(0.1).max(10),
});

export const questionSchema = z.object({
  text: requiredString(500, 'Pergunta'),
  description: optionalString(1000, 'Descrição'),
  category_id: z.string().uuid({ message: 'Selecione uma categoria' }),
  weight: z.number({ invalid_type_error: 'Peso inválido' }).min(0.1).max(10),
});

// ===== Risk =====
export const riskSchema = z.object({
  description: requiredString(500, 'Descrição'),
  category: optionalString(80, 'Categoria'),
  probability: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  mitigation: optionalString(2000, 'Mitigação'),
  contingency: optionalString(2000, 'Contingência'),
  responsible: optionalString(120, 'Responsável'),
  risk_type: z.enum(['threat', 'opportunity']),
  response_strategy: z.enum(['mitigate', 'transfer', 'accept', 'avoid', 'explore', 'enhance']),
  status: z.enum(['identified', 'mitigated', 'accepted', 'resolved']),
});

// ===== KPI =====
export const kpiSchema = z.object({
  name: requiredString(120, 'Nome'),
  description: optionalString(500, 'Descrição'),
  category: optionalString(80, 'Categoria'),
  unit: optionalString(20, 'Unidade'),
  target_value: z.number().nullable().optional(),
  current_value: z.number().nullable().optional(),
  status: z.enum(['on_track', 'at_risk', 'off_track']),
});

// ===== Action Plan (5W2H + RICE) =====
export const actionPlanSchema = z.object({
  what: requiredString(500, 'O quê'),
  why: optionalString(1000, 'Por quê'),
  where: optionalString(200, 'Onde'),
  when: optionalString(200, 'Quando'),
  who: requiredString(200, 'Quem'),
  how: optionalString(1000, 'Como'),
  how_much: optionalString(200, 'Quanto'),
  due_date: z
    .string()
    .min(1, { message: 'Data limite é obrigatória' })
    .refine((v) => !isNaN(new Date(v).getTime()), { message: 'Data inválida' }),
  priority: z.enum(['low', 'medium', 'high']),
  kanban_status: z.enum(['backlog', 'todo', 'doing', 'done']),
  cobit_domain: z.enum(['EDM', 'APO', 'BAI', 'DSS', 'MEA']),
  reach: z.number().min(1),
  impact_score: z.number().min(0.25),
  confidence: z.number().min(0).max(100),
  effort: z.number().min(1),
  kpi_success: optionalString(500, 'KPI'),
  department: optionalString(80, 'Departamento'),
  action_code: optionalString(40, 'Código'),
});

// ===== RACI =====
export const raciSchema = z.object({
  process: requiredString(200, 'Processo'),
  responsible: optionalString(200, 'Responsável'),
  accountable: optionalString(200, 'Aprovador'),
  consulted: optionalString(200, 'Consultado'),
  informed: optionalString(200, 'Informado'),
});

/**
 * Run a Zod schema and toast the first error. Returns parsed data or null.
 */
export function validateOrToast<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
  toastFn: (msg: string) => void,
): z.infer<T> | null {
  const r = schema.safeParse(input);
  if (!r.success) {
    const first = r.error.errors[0];
    toastFn(first?.message || 'Dados inválidos');
    return null;
  }
  return r.data;
}