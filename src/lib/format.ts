export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTime(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatScore(score: number | null | undefined, decimals = 1): string {
  if (score == null || isNaN(Number(score))) return '—';
  return Number(score).toFixed(decimals);
}

export function formatPercent(value: number | null | undefined, decimals = 0): string {
  if (value == null || isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(decimals)}%`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(Number(value))) return '—';
  return Number(value).toLocaleString('pt-BR');
}

export function pluralize(count: number, singular: string, plural?: string): string {
  const word = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${count} ${word}`;
}

export function safeFilename(name: string): string {
  return (name || 'arquivo').replace(/[^\w\u00C0-\u017F.-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}