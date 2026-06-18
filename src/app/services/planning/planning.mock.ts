// Dados mock do Planejamento Financeiro, baseados no caso de referência
// (renda R$ 7.500 / despesa R$ 12.000). Usados enquanto o backend Laravel
// /api/planning/* não está disponível. Quando estiver, ver PlanningService.useMock.
import {
  Diagnosis,
  ReductionPlan,
  Projection,
  Debt,
  DebtStrategyResult,
  FinancialGoal,
  ExecutiveDashboard
} from '../../models/planning/planning.model';

export const MOCK_DIAGNOSIS: Diagnosis = {
  period: 'Junho/2026',
  score: {
    score: 32,
    band: 'emergency',
    breakdown: { cashflow: 45, debt: 0, quality: 60, reserve: 0, trend: 60 }
  },
  income: 7500,
  expense: 12000,
  result: -4500,
  indicators: [
    { key: 'committed', label: 'Renda comprometida', percent: 160, threshold: 100 },
    { key: 'housing', label: 'Moradia', percent: 49, threshold: 30 },
    { key: 'food', label: 'Alimentação', percent: 23, threshold: 12 },
    { key: 'transport', label: 'Transporte', percent: 9, threshold: 10 },
    { key: 'debts', label: 'Dívidas', percent: 23, threshold: 20 },
    { key: 'card', label: 'Cartão de crédito', percent: 40, threshold: 30 }
  ],
  alerts: [
    { severity: 'danger', message: 'Você está gastando 160% da sua renda.', metric: 'committed' },
    { severity: 'warning', message: 'Seu gasto com alimentação está acima do recomendado.', metric: 'food' },
    { severity: 'warning', message: 'Seu cartão de crédito representa 40% dos gastos.', metric: 'card' },
    { severity: 'warning', message: 'Seu financiamento consome 23% da sua renda.', metric: 'debts' }
  ]
};

export const MOCK_REDUCTION: ReductionPlan = {
  items: [
    { kind: 'category', label: 'Alimentação', current: 1700, target: 800, monthlySaving: 900, recommendation: 'Reduzir delivery e priorizar mercado.' },
    { kind: 'category', label: 'Lazer', current: 650, target: 150, monthlySaving: 500, recommendation: 'Definir teto mensal de lazer.' },
    { kind: 'category', label: 'Compras por impulso', current: 295, target: 0, monthlySaving: 295, recommendation: 'Aplicar regra das 24h antes de comprar.' },
    { kind: 'subscription', label: 'Netflix', current: 55, target: 0, monthlySaving: 55, recommendation: 'Recomendado cancelar.' },
    { kind: 'subscription', label: 'Clube Esfera', current: 40, target: 0, monthlySaving: 40, recommendation: 'Recomendado cancelar.' },
    { kind: 'subscription', label: 'Spotify', current: 35, target: 0, monthlySaving: 35, recommendation: 'Avaliar plano família.' },
    { kind: 'subscription', label: 'YouTube Premium', current: 25, target: 0, monthlySaving: 25, recommendation: 'Recomendado cancelar.' }
  ],
  totalMonthly: 1850,
  totalYearly: 22200
};

function buildProjection(): Projection {
  // Caminha 12 meses; despesas caem conforme parcelamentos terminam.
  const start = [
    { label: 'Jul/2026', income: 7500, expense: 7900 },
    { label: 'Ago/2026', income: 7500, expense: 7600 },
    { label: 'Set/2026', income: 7500, expense: 7300 },
    { label: 'Out/2026', income: 7500, expense: 7100 },
    { label: 'Nov/2026', income: 7500, expense: 6950 },
    { label: 'Dez/2026', income: 7500, expense: 6900 },
    { label: 'Jan/2027', income: 7500, expense: 6800 },
    { label: 'Fev/2027', income: 7500, expense: 6750 },
    { label: 'Mar/2027', income: 7500, expense: 6700 },
    { label: 'Abr/2027', income: 7500, expense: 6650 },
    { label: 'Mai/2027', income: 7500, expense: 6600 },
    { label: 'Jun/2027', income: 7500, expense: 6550 }
  ];
  const months = start.map((m, i) => ({
    label: m.label,
    year: i < 6 ? 2026 : 2027,
    month: ((6 + i) % 12) + 1,
    income: m.income,
    expense: m.expense,
    balance: m.income - m.expense
  }));
  const breakEven = months.find(m => m.balance >= 0);
  return { months, breakEvenLabel: breakEven ? breakEven.label : null };
}

export const MOCK_PROJECTION: Projection = buildProjection();

export const MOCK_DEBTS: Debt[] = [
  { type: 'financing', description: 'Financiamento do carro', remainingAmount: 28000, remainingInstallments: 24, installmentValue: 1380, interestRateMonth: 1.8, totalRemaining: 33120, status: 'active' },
  { type: 'card', description: 'Fatura cartão de crédito', remainingAmount: 3000, remainingInstallments: 1, installmentValue: 3000, interestRateMonth: 12, totalRemaining: 3000, status: 'active' },
  { type: 'installment', description: 'Parcelamento notebook', remainingAmount: 1700, remainingInstallments: 8, installmentValue: 212.5, interestRateMonth: null, totalRemaining: 1700, status: 'active' }
];

export const MOCK_DEBT_STRATEGY: DebtStrategyResult = {
  snowball: [
    { order: 1, debt: 'Parcelamento notebook' },
    { order: 2, debt: 'Fatura cartão de crédito' },
    { order: 3, debt: 'Financiamento do carro' }
  ],
  avalanche: [
    { order: 1, debt: 'Fatura cartão de crédito' },
    { order: 2, debt: 'Financiamento do carro' },
    { order: 3, debt: 'Parcelamento notebook' }
  ],
  recommended: 'avalanche',
  interestSaved: 2140,
  simulations: [
    { extra: 500, interestSaved: 1320, monthsSaved: 5 },
    { extra: 1000, interestSaved: 2800, monthsSaved: 9 }
  ]
};

export const MOCK_GOALS: FinancialGoal[] = [
  { type: 'emergency_reserve', title: 'Reserva de Emergência', targetAmount: 42000, currentAmount: 12600, monthlyContribution: 700, targetDate: '2029-05-01', progress: 30, status: 'active', isSuggested: true },
  { type: 'trip', title: 'Viagem em família', targetAmount: 12000, currentAmount: 3000, monthlyContribution: 400, progress: 25, status: 'active' },
  { type: 'investment', title: 'Carteira de investimentos', targetAmount: 50000, currentAmount: 5000, monthlyContribution: 500, progress: 10, status: 'active' }
];

export const MOCK_DASHBOARD: ExecutiveDashboard = {
  score: MOCK_DIAGNOSIS.score,
  projectedBalance: -4500,
  possibleSavingMonthly: 1850,
  possibleSavingYearly: 22200,
  topVillain: { label: 'Cartão de crédito', percent: 40 },
  nextDebtToFinish: { label: 'Parcelamento notebook', dueLabel: 'Fev/2027' },
  breakEvenLabel: 'Set/2026',
  emergencyReserve: { current: 12600, target: 42000, progress: 30 }
};

// Resposta determinística simulada da IA (enquanto não há OpenAI conectada).
export function mockAiAnswer(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('celular') || q.includes('comprar')) {
    return 'No momento sua situação está em déficit (-R$ 4.500/mês), então uma compra de R$ 3.000 à vista comprometeria ainda mais o orçamento. ' +
      'Seguindo o Plano de Redução (economia de R$ 1.850/mês), em cerca de 2 meses você teria essa folga sem afetar sua reserva. Recomendo aguardar e evitar parcelar no cartão.';
  }
  if (q.includes('cortar') || q.includes('economizar') || q.includes('reduzir')) {
    return 'As maiores oportunidades de corte são: Alimentação (−R$ 900), Lazer (−R$ 500) e assinaturas (−R$ 155). ' +
      'Só isso já representa R$ 1.555/mês. Comece pelas assinaturas (efeito imediato) e depois ajuste alimentação.';
  }
  if (q.includes('dívida') || q.includes('divida') || q.includes('quitar')) {
    return 'Pelo método Avalanche (priorizando a maior taxa de juros), você economiza cerca de R$ 2.140 em juros. ' +
      'Com um aporte extra de R$ 500/mês, antecipa a quitação em ~5 meses. Evite o rotativo do cartão a todo custo.';
  }
  if (q.includes('demais') || q.includes('gastando')) {
    return 'Sim. Hoje você gasta 160% da sua renda. Os principais ofensores são Cartão de crédito (40% dos gastos) e Moradia (49% da renda). ' +
      'Priorize reduzir gastos supérfluos e renegociar dívidas antes de pensar em novos compromissos.';
  }
  return 'Posso te ajudar com diagnóstico, plano de redução, projeções, quitação de dívidas e metas. ' +
    'Sua saúde financeira hoje está em "Emergência" (score 32). Quer que eu sugira por onde começar?';
}
