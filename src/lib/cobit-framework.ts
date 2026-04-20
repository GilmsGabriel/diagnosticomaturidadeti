// COBIT 5 Framework reference — domains and processes
// Used to map questions to specific COBIT processes via the question.description prefix
// Convention: "[DSS01] ..." in question.description identifies the process code.

export type CobitDomainKey = 'EDM' | 'APO' | 'BAI' | 'DSS' | 'MEA';

export interface CobitDomain {
  key: CobitDomainKey;
  name: string;
  fullName: string;
  area: 'governance' | 'management';
  description: string;
}

export interface CobitProcess {
  code: string;
  domain: CobitDomainKey;
  name: string;
}

export const COBIT_DOMAINS: CobitDomain[] = [
  {
    key: 'EDM',
    name: 'EDM — Avaliar, Dirigir e Monitorar',
    fullName: 'Evaluate, Direct and Monitor',
    area: 'governance',
    description: 'Domínio de Governança — responsabilidade do Conselho/Direção.',
  },
  {
    key: 'APO',
    name: 'APO — Alinhar, Planejar e Organizar',
    fullName: 'Align, Plan and Organise',
    area: 'management',
    description: 'Estratégia, arquitetura, portfólio, riscos e segurança.',
  },
  {
    key: 'BAI',
    name: 'BAI — Construir, Adquirir e Implementar',
    fullName: 'Build, Acquire and Implement',
    area: 'management',
    description: 'Projetos, mudanças, requisitos e gestão de ativos.',
  },
  {
    key: 'DSS',
    name: 'DSS — Entregar, Servir e Suportar',
    fullName: 'Deliver, Service and Support',
    area: 'management',
    description: 'Operações, incidentes, problemas, continuidade e segurança operacional.',
  },
  {
    key: 'MEA',
    name: 'MEA — Monitorar, Avaliar e Analisar',
    fullName: 'Monitor, Evaluate and Assess',
    area: 'management',
    description: 'Desempenho, conformidade e controles internos.',
  },
];

export const COBIT_PROCESSES: CobitProcess[] = [
  // EDM
  { code: 'EDM01', domain: 'EDM', name: 'Garantir o estabelecimento da governança' },
  { code: 'EDM02', domain: 'EDM', name: 'Garantir a entrega de benefícios' },
  { code: 'EDM03', domain: 'EDM', name: 'Garantir a otimização de riscos' },
  { code: 'EDM04', domain: 'EDM', name: 'Garantir a otimização de recursos' },
  { code: 'EDM05', domain: 'EDM', name: 'Garantir transparência aos stakeholders' },
  // APO
  { code: 'APO01', domain: 'APO', name: 'Gerenciar o framework de gestão de TI' },
  { code: 'APO02', domain: 'APO', name: 'Gerenciar a estratégia' },
  { code: 'APO03', domain: 'APO', name: 'Gerenciar arquitetura corporativa' },
  { code: 'APO04', domain: 'APO', name: 'Gerenciar inovação' },
  { code: 'APO05', domain: 'APO', name: 'Gerenciar portfólio' },
  { code: 'APO06', domain: 'APO', name: 'Gerenciar orçamento e custos' },
  { code: 'APO07', domain: 'APO', name: 'Gerenciar recursos humanos' },
  { code: 'APO08', domain: 'APO', name: 'Gerenciar relacionamentos' },
  { code: 'APO09', domain: 'APO', name: 'Gerenciar acordos de serviço' },
  { code: 'APO10', domain: 'APO', name: 'Gerenciar fornecedores' },
  { code: 'APO11', domain: 'APO', name: 'Gerenciar qualidade' },
  { code: 'APO12', domain: 'APO', name: 'Gerenciar riscos' },
  { code: 'APO13', domain: 'APO', name: 'Gerenciar segurança' },
  // BAI
  { code: 'BAI01', domain: 'BAI', name: 'Gerenciar programas e projetos' },
  { code: 'BAI02', domain: 'BAI', name: 'Gerenciar definição de requisitos' },
  { code: 'BAI03', domain: 'BAI', name: 'Gerenciar identificação e construção de soluções' },
  { code: 'BAI04', domain: 'BAI', name: 'Gerenciar disponibilidade e capacidade' },
  { code: 'BAI05', domain: 'BAI', name: 'Gerenciar habilitação de mudança organizacional' },
  { code: 'BAI06', domain: 'BAI', name: 'Gerenciar mudanças' },
  { code: 'BAI07', domain: 'BAI', name: 'Gerenciar aceitação e transição de mudanças' },
  { code: 'BAI08', domain: 'BAI', name: 'Gerenciar conhecimento' },
  { code: 'BAI09', domain: 'BAI', name: 'Gerenciar ativos' },
  { code: 'BAI10', domain: 'BAI', name: 'Gerenciar configuração' },
  // DSS
  { code: 'DSS01', domain: 'DSS', name: 'Gerenciar operações' },
  { code: 'DSS02', domain: 'DSS', name: 'Gerenciar requisições e incidentes' },
  { code: 'DSS03', domain: 'DSS', name: 'Gerenciar problemas' },
  { code: 'DSS04', domain: 'DSS', name: 'Gerenciar continuidade' },
  { code: 'DSS05', domain: 'DSS', name: 'Gerenciar serviços de segurança' },
  { code: 'DSS06', domain: 'DSS', name: 'Gerenciar controles de processos de negócio' },
  // MEA
  { code: 'MEA01', domain: 'MEA', name: 'Monitorar desempenho e conformidade' },
  { code: 'MEA02', domain: 'MEA', name: 'Monitorar sistema de controle interno' },
  { code: 'MEA03', domain: 'MEA', name: 'Monitorar conformidade com requisitos externos' },
];

/**
 * Extracts COBIT process code from a question's description.
 * Convention: descriptions starting with "[DSS01] ..." are mapped to that process.
 * Falls back to undefined when no code is present.
 */
export const extractCobitCode = (description: string | null | undefined): string | undefined => {
  if (!description) return undefined;
  const match = description.match(/^\[([A-Z]{3}\d{2})\]/);
  return match?.[1];
};

export const getDomainForCode = (code: string | undefined): CobitDomainKey | undefined => {
  if (!code) return undefined;
  return COBIT_PROCESSES.find(p => p.code === code)?.domain;
};

/** ITIL 4 — Utility (fitness for purpose) and Warranty (fitness for use) hints by domain */
export const ITIL_HINTS: Record<CobitDomainKey, { utility: string; warranty: string }> = {
  EDM: {
    utility: 'Garante que a TI gere valor estratégico mensurável para os stakeholders.',
    warranty: 'Assegura governança, conformidade e otimização de riscos no longo prazo.',
  },
  APO: {
    utility: 'Alinha capacidades de TI à estratégia de negócio e ao portfólio de serviços.',
    warranty: 'Garante consistência, qualidade e segurança nos serviços planejados.',
  },
  BAI: {
    utility: 'Entrega novas soluções e mudanças que ampliam a capacidade da TI.',
    warranty: 'Assegura disponibilidade, capacidade e gestão de mudanças sem ruptura.',
  },
  DSS: {
    utility: 'Mantém os serviços operacionais entregando valor diário ao negócio.',
    warranty: 'Garante disponibilidade, continuidade e segurança da operação.',
  },
  MEA: {
    utility: 'Mede e demonstra o valor entregue pela TI ao negócio.',
    warranty: 'Garante conformidade, controle interno e melhoria contínua baseada em evidência.',
  },
};

/** ISO/IEC 27001 CIA triad indicators per COBIT domain */
export type CIAIndicator = 'C' | 'I' | 'A';
export const CIA_BY_DOMAIN: Record<CobitDomainKey, CIAIndicator[]> = {
  EDM: ['C', 'I', 'A'],
  APO: ['C', 'I'],
  BAI: ['I', 'A'],
  DSS: ['C', 'I', 'A'],
  MEA: ['I'],
};
