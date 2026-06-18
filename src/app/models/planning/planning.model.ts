// Modelos do Planejamento Financeiro Inteligente.
// Contratos espelham as respostas esperadas da API Laravel (/api/planning/*).

// ---------------------------------------------------------------------------
// Score de saúde financeira
// ---------------------------------------------------------------------------
export type ScoreBand = 'excellent' | 'good' | 'attention' | 'critical' | 'emergency';

export interface ScoreBreakdown {
  cashflow: number; // fluxo de caixa (0-100)
  debt: number;     // endividamento (0-100)
  quality: number;  // qualidade do gasto (0-100)
  reserve: number;  // reserva de emergência (0-100)
  trend: number;    // tendência (0-100)
}

export interface FinancialScore {
  score: number; // 0-100
  band: ScoreBand;
  breakdown: ScoreBreakdown;
}

// ---------------------------------------------------------------------------
// Aba 1 — Diagnóstico
// ---------------------------------------------------------------------------
export type AlertSeverity = 'info' | 'warning' | 'danger';

export interface FinancialAlert {
  severity: AlertSeverity;
  message: string;
  metric?: string;
}

export interface Indicator {
  key: string;
  label: string;
  percent: number;     // % já calculado pelo backend
  threshold?: number;  // limiar recomendado (para colorir a barra)
}

export interface Diagnosis {
  period: string;
  score: FinancialScore;
  income: number;
  expense: number;
  result: number;
  indicators: Indicator[];
  alerts: FinancialAlert[];
}

// ---------------------------------------------------------------------------
// Aba 2 — Plano de Redução
// ---------------------------------------------------------------------------
export type ReductionKind = 'category' | 'subscription';

export interface ReductionItem {
  id?: number;
  kind: ReductionKind;
  label: string;
  current: number;
  target: number;
  monthlySaving: number;
  recommendation?: string;
  status?: 'suggested' | 'accepted' | 'dismissed';
}

export interface ReductionPlan {
  items: ReductionItem[];
  totalMonthly: number;
  totalYearly: number;
}

// ---------------------------------------------------------------------------
// Aba 3 — Projeções
// ---------------------------------------------------------------------------
export interface ProjectionMonth {
  label: string; // "Jul/2026"
  year: number;
  month: number;
  income: number;
  expense: number;
  balance: number;
}

export interface Projection {
  months: ProjectionMonth[];
  breakEvenLabel: string | null; // mês previsto de equilíbrio
}

// ---------------------------------------------------------------------------
// Aba 4 — Quitação de Dívidas
// ---------------------------------------------------------------------------
export type DebtType = 'financing' | 'installment' | 'card' | 'loan';

export interface Debt {
  id?: number;
  type: DebtType;
  description: string;
  remainingAmount: number;
  remainingInstallments: number;
  installmentValue: number;
  interestRateMonth?: number | null; // taxa a.m. estimada
  totalRemaining: number;
  status?: 'active' | 'paid_off' | 'renegotiating';
}

export interface DebtStrategyStep {
  order: number;
  debt: string;
}

export interface DebtSimulation {
  extra: number;
  interestSaved: number;
  monthsSaved: number;
}

export interface DebtStrategyResult {
  snowball: DebtStrategyStep[];
  avalanche: DebtStrategyStep[];
  recommended: 'snowball' | 'avalanche';
  interestSaved: number; // economia do método recomendado vs o outro
  simulations: DebtSimulation[];
}

// ---------------------------------------------------------------------------
// Aba 5 — Metas Financeiras
// ---------------------------------------------------------------------------
export type GoalType = 'emergency_reserve' | 'trip' | 'house' | 'car' | 'investment' | 'custom';

export interface FinancialGoal {
  id?: number;
  type: GoalType;
  title: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution?: number | null;
  targetDate?: string | null;
  progress: number; // 0-100
  status?: 'active' | 'achieved' | 'paused';
  isSuggested?: boolean;
}

// ---------------------------------------------------------------------------
// Dashboard Executivo
// ---------------------------------------------------------------------------
export interface ExecutiveDashboard {
  score: FinancialScore;
  projectedBalance: number;
  possibleSavingMonthly: number;
  possibleSavingYearly: number;
  topVillain: { label: string; percent: number };
  nextDebtToFinish: { label: string; dueLabel: string } | null;
  breakEvenLabel: string | null;
  emergencyReserve: { current: number; target: number; progress: number };
}

// ---------------------------------------------------------------------------
// IA Financeira
// ---------------------------------------------------------------------------
export type AiPeriod = '3m' | '6m' | '12m';

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ---------------------------------------------------------------------------
// Helpers de apresentação
// ---------------------------------------------------------------------------
export const SCORE_BAND_LABEL: Record<ScoreBand, string> = {
  excellent: 'Excelente',
  good: 'Boa',
  attention: 'Atenção',
  critical: 'Crítica',
  emergency: 'Emergência Financeira'
};

export function scoreBandFromValue(score: number): ScoreBand {
  if (score >= 95) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 60) return 'attention';
  if (score >= 40) return 'critical';
  return 'emergency';
}
