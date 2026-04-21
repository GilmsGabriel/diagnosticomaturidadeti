/**
 * Maps raw database/Supabase errors to user-friendly messages.
 * Prevents leaking RLS policy names, constraint names, and internal schema details.
 */
export function getReadableError(error: unknown, fallback = 'Ocorreu um erro. Tente novamente.'): string {
  if (!error) return fallback;

  // Log full detail to console for developer debugging
  // eslint-disable-next-line no-console
  console.error('[error]', error);

  const raw = (error as { message?: string; code?: string })?.message ?? '';
  const code = (error as { code?: string })?.code ?? '';
  const lower = raw.toLowerCase();

  // Auth-specific messages (safe to surface)
  if (lower.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (lower.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (lower.includes('user already registered')) return 'Este e-mail já está cadastrado.';
  if (lower.includes('password should be')) return 'A senha não atende aos requisitos mínimos.';
  if (lower.includes('rate limit') || lower.includes('too many')) return 'Muitas tentativas. Aguarde alguns instantes.';

  // Database-level — never surface raw text
  if (lower.includes('row-level security') || lower.includes('permission denied') || code === '42501') {
    return 'Você não tem permissão para executar esta ação.';
  }
  if (lower.includes('duplicate key') || code === '23505') {
    return 'Este registro já existe.';
  }
  if (lower.includes('violates foreign key') || code === '23503') {
    return 'Registro relacionado não encontrado ou em uso.';
  }
  if (lower.includes('not null') || code === '23502') {
    return 'Preencha todos os campos obrigatórios.';
  }
  if (lower.includes('check constraint') || code === '23514') {
    return 'Dados inválidos. Verifique os valores informados.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Problema de conexão. Verifique sua internet e tente novamente.';
  }

  return fallback;
}