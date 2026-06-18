import { Component, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { ChartConfiguration, ChartData, ChartOptions } from 'chart.js';
import {
  faArrowTrendUp,
  faArrowTrendDown,
  faWallet,
  faMoneyBillTransfer,
  faFilter,
  faXmark,
  faCalendarDay,
  faTag,
  faChartPie,
  faChartLine,
  faChartColumn,
  faBuildingColumns,
  faCreditCard,
  faListUl,
  faCircleExclamation,
  faClock,
  faCheck,
  faRotate,
  faArrowUp,
  faArrowDown,
  faMinus,
  faLightbulb,
  faTriangleExclamation,
  faCircleCheck,
  faFire,
  faScaleUnbalanced,
  faPiggyBank
} from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

import {
  FinancialReportsService,
  ReportFilters,
  ReportPeriodAlias,
  ReportDateField,
  CashFlowGroupBy,
  SummaryReport,
  CategoryReport,
  FinanceAccountReport,
  PaymentMethodReport,
  PaymentMethodReportItem,
  StatusReport,
  StatusReportItem,
  CashFlowReport,
  TopExpensesReport,
  ComparisonReport
} from '../../services/financial-reports/financial-reports.service';
import { CategoryService } from '../../services/category/category.service';
import { PaymentMethodService } from '../../services/payment-method/payment-method.service';
import { Category } from '../../models/category.model';
import { PaymentMethod } from '../../models/payment-method.model';

interface PeriodOption {
  value: ReportPeriodAlias;
  label: string;
}

interface DateFieldOption {
  value: ReportDateField;
  label: string;
}

interface GroupByOption {
  value: CashFlowGroupBy;
  label: string;
}

type InsightSeverity = 'critical' | 'warning' | 'positive' | 'info';

interface ReportInsight {
  id: string;
  severity: InsightSeverity;
  icon: IconDefinition;
  title: string;
  message: string;
  highlight?: string;
}

const CHART_PALETTE = [
  '#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#7c3aed',
  '#0891b2', '#db2777', '#0d9488', '#ea580c', '#4f46e5',
  '#65a30d', '#be185d', '#0369a1', '#b45309', '#9333ea'
];

@Component({
  selector: 'app-relatorios',
  templateUrl: './relatorios.component.html',
  styleUrls: ['./relatorios.component.scss']
})
export class RelatoriosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isLoading = false;
  hasError = false;
  errorMessage = '';
  failedEndpoints: { label: string; message: string }[] = [];

  faArrowTrendUp = faArrowTrendUp;
  faArrowTrendDown = faArrowTrendDown;
  faWallet = faWallet;
  faMoneyBillTransfer = faMoneyBillTransfer;
  faFilter = faFilter;
  faXmark = faXmark;
  faCalendarDay = faCalendarDay;
  faTag = faTag;
  faChartPie = faChartPie;
  faChartLine = faChartLine;
  faChartColumn = faChartColumn;
  faBuildingColumns = faBuildingColumns;
  faCreditCard = faCreditCard;
  faListUl = faListUl;
  faCircleExclamation = faCircleExclamation;
  faClock = faClock;
  faCheck = faCheck;
  faRotate = faRotate;
  faArrowUp = faArrowUp;
  faArrowDown = faArrowDown;
  faMinus = faMinus;
  faLightbulb = faLightbulb;
  faTriangleExclamation = faTriangleExclamation;
  faCircleCheck = faCircleCheck;
  faFire = faFire;
  faScaleUnbalanced = faScaleUnbalanced;
  faPiggyBank = faPiggyBank;

  periodOptions: PeriodOption[] = [
    { value: 'today', label: 'Hoje' },
    { value: 'yesterday', label: 'Ontem' },
    { value: 'this_week', label: 'Esta semana' },
    { value: 'last_week', label: 'Semana passada' },
    { value: 'this_month', label: 'Este mês' },
    { value: 'last_month', label: 'Mês passado' },
    { value: 'last_7_days', label: 'Últimos 7 dias' },
    { value: 'last_30_days', label: 'Últimos 30 dias' },
    { value: 'last_90_days', label: 'Últimos 90 dias' },
    { value: 'this_year', label: 'Este ano' },
    { value: 'last_year', label: 'Ano passado' }
  ];

  dateFieldOptions: DateFieldOption[] = [
    { value: 'date', label: 'Competência' },
    { value: 'due_date', label: 'Vencimento' },
    { value: 'payment_date', label: 'Pagamento' }
  ];

  groupByOptions: GroupByOption[] = [
    { value: 'day', label: 'Diário' },
    { value: 'week', label: 'Semanal' },
    { value: 'month', label: 'Mensal' },
    { value: 'year', label: 'Anual' }
  ];

  selectedPeriod: ReportPeriodAlias = 'this_month';
  selectedDateField: ReportDateField = 'date';
  selectedGroupBy: CashFlowGroupBy = 'day';
  selectedCategoryId: number | null = null;
  selectedPaymentMethodId: number | null = null;
  includeCancelled = false;
  topExpensesLimit = 5;
  customDateFrom: string | null = null;
  customDateTo: string | null = null;

  categories: Category[] = [];
  paymentMethods: PaymentMethod[] = [];

  summary: SummaryReport | null = null;
  byCategory: CategoryReport | null = null;
  byFinanceAccount: FinanceAccountReport | null = null;
  byPaymentMethod: PaymentMethodReport | null = null;
  byStatus: StatusReport | null = null;
  cashFlow: CashFlowReport | null = null;
  topExpenses: TopExpensesReport | null = null;
  comparison: ComparisonReport | null = null;

  insights: ReportInsight[] = [];

  expenseByCategoryChart: ChartData<'doughnut'> = { labels: [], datasets: [] };
  revenueByCategoryChart: ChartData<'doughnut'> = { labels: [], datasets: [] };
  financeAccountChart: ChartData<'bar'> = { labels: [], datasets: [] };
  paymentMethodChart: ChartData<'bar'> = { labels: [], datasets: [] };
  statusChart: ChartData<'doughnut'> = { labels: [], datasets: [] };
  cashFlowChart: ChartData<'line'> = { labels: [], datasets: [] };

  readonly doughnutType = 'doughnut' as const;
  readonly barType = 'bar' as const;
  readonly lineType = 'line' as const;

  doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 16,
          boxWidth: 8,
          font: { size: 12 }
        }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = Number(ctx.parsed) || 0;
            const total = (ctx.dataset.data as number[]).reduce((s, v) => s + (Number(v) || 0), 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${ctx.label}: ${this.formatCurrency(value)} (${percentage}%)`;
          }
        }
      }
    }
  };

  barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => this.formatCompactCurrency(Number(value))
        }
      }
    },
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 14, boxWidth: 8 } },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${this.formatCurrency(Number(ctx.parsed.y) || 0)}`
        }
      }
    }
  };

  lineOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => this.formatCompactCurrency(Number(value))
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: {
          callback: (value) => this.formatCompactCurrency(Number(value))
        }
      }
    },
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 14, boxWidth: 8 } },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${this.formatCurrency(Number(ctx.parsed.y) || 0)}`
        }
      }
    }
  };

  constructor(
    private reportsService: FinancialReportsService,
    private categoryService: CategoryService,
    private paymentMethodService: PaymentMethodService
  ) {}

  ngOnInit(): void {
    this.loadCatalogs();
    this.loadReports();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCatalogs(): void {
    forkJoin({
      categories: this.categoryService.list(),
      paymentMethods: this.paymentMethodService.list()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ categories, paymentMethods }) => {
          this.categories = (categories || []).filter((c) => c.is_active);
          this.paymentMethods = (paymentMethods || []).filter((p) => p.is_active);
        },
        error: () => {
          this.categories = [];
          this.paymentMethods = [];
        }
      });
  }

  loadReports(): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';
    this.failedEndpoints = [];

    const baseFilters = this.buildBaseFilters();
    const cashFlowFilters: ReportFilters = {
      ...baseFilters,
      group_by: this.selectedGroupBy
    };
    const topExpensesFilters: ReportFilters = {
      ...baseFilters,
      limit: this.topExpensesLimit
    };

    const withFallback = <T>(label: string, obs: any, fallback: T | null) =>
      obs.pipe(
        catchError((err: any) => {
          console.error(`[Relatórios] Falha em "${label}":`, err);
          this.failedEndpoints.push({
            label,
            message: this.extractMessage(err)
          });
          return of(fallback);
        })
      );

    forkJoin({
      summary: withFallback('Resumo', this.reportsService.getSummary(baseFilters), null),
      byCategory: withFallback('Por categoria', this.reportsService.getByCategory(baseFilters), null),
      byFinanceAccount: withFallback('Por conta', this.reportsService.getByFinanceAccount(baseFilters), null),
      byPaymentMethod: withFallback('Por forma de pagamento', this.reportsService.getByPaymentMethod(baseFilters), null),
      byStatus: withFallback('Por status', this.reportsService.getByStatus(baseFilters), null),
      cashFlow: withFallback('Fluxo de caixa', this.reportsService.getCashFlow(cashFlowFilters), null),
      topExpenses: withFallback('Top despesas', this.reportsService.getTopExpenses(topExpensesFilters), null),
      comparison: withFallback('Comparativo', this.reportsService.getComparison(baseFilters), null)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.summary = res.summary;
          this.byCategory = res.byCategory;
          this.byFinanceAccount = res.byFinanceAccount;
          this.byPaymentMethod = res.byPaymentMethod;
          this.byStatus = res.byStatus;
          this.cashFlow = res.cashFlow;
          this.topExpenses = res.topExpenses;
          this.comparison = res.comparison;

          this.buildCharts();
          this.insights = this.buildInsights();
          this.isLoading = false;

          if (this.failedEndpoints.length > 0) {
            this.hasError = true;
            this.errorMessage =
              `Alguns relatórios falharam: ${this.failedEndpoints.map((f) => f.label).join(', ')}. ` +
              'Verifique o console para mais detalhes.';
          }
        },
        error: (err) => {
          console.error('Erro inesperado ao carregar relatórios:', err);
          this.hasError = true;
          this.errorMessage = this.extractMessage(err) || 'Não foi possível carregar os relatórios. Tente novamente.';
          this.isLoading = false;
        }
      });
  }

  private extractMessage(err: any): string {
    if (!err) {
      return '';
    }
    if (typeof err === 'string') {
      return err;
    }
    if (err.error?.message) {
      return err.error.message;
    }
    if (err.error?.error) {
      return err.error.error;
    }
    if (err.message) {
      return err.message;
    }
    if (err.statusText) {
      return `${err.status || ''} ${err.statusText}`.trim();
    }
    return 'Erro desconhecido';
  }

  private buildBaseFilters(): ReportFilters {
    const filters: ReportFilters = {
      date_field: this.selectedDateField,
      include_cancelled: this.includeCancelled
    };

    if (this.customDateFrom && this.customDateTo) {
      filters.date_from = this.customDateFrom;
      filters.date_to = this.customDateTo;
    } else {
      filters.period = this.selectedPeriod;
    }

    if (this.selectedCategoryId) {
      filters.category_id = this.selectedCategoryId;
    }
    if (this.selectedPaymentMethodId) {
      filters.payment_method_id = this.selectedPaymentMethodId;
    }

    return filters;
  }

  onPeriodChange(period: ReportPeriodAlias): void {
    this.selectedPeriod = period;
    this.customDateFrom = null;
    this.customDateTo = null;
    this.loadReports();
  }

  onDateFieldChange(field: ReportDateField): void {
    this.selectedDateField = field;
    this.loadReports();
  }

  onGroupByChange(group: CashFlowGroupBy): void {
    this.selectedGroupBy = group;
    this.loadReports();
  }

  onCategoryChange(): void {
    this.loadReports();
  }

  onPaymentMethodChange(): void {
    this.loadReports();
  }

  onIncludeCancelledChange(): void {
    this.loadReports();
  }

  onCustomDateChange(): void {
    if (this.customDateFrom && this.customDateTo) {
      this.loadReports();
    }
  }

  clearCustomDate(): void {
    this.customDateFrom = null;
    this.customDateTo = null;
    this.loadReports();
  }

  resetFilters(): void {
    this.selectedPeriod = 'this_month';
    this.selectedDateField = 'date';
    this.selectedGroupBy = 'day';
    this.selectedCategoryId = null;
    this.selectedPaymentMethodId = null;
    this.includeCancelled = false;
    this.topExpensesLimit = 5;
    this.customDateFrom = null;
    this.customDateTo = null;
    this.loadReports();
  }

  get hasActiveFilters(): boolean {
    return (
      this.selectedPeriod !== 'this_month' ||
      this.selectedDateField !== 'date' ||
      this.selectedCategoryId !== null ||
      this.selectedPaymentMethodId !== null ||
      this.includeCancelled ||
      (!!this.customDateFrom && !!this.customDateTo)
    );
  }

  private buildCharts(): void {
    this.buildCategoryCharts();
    this.buildFinanceAccountChart();
    this.buildPaymentMethodChart();
    this.buildStatusChart();
    this.buildCashFlowChart();
  }

  private buildCategoryCharts(): void {
    const expenseItems = (this.byCategory?.expense || []).slice(0, 10);
    this.expenseByCategoryChart = {
      labels: expenseItems.map((i) => i.category_name || 'Sem categoria'),
      datasets: [
        {
          data: expenseItems.map((i) => Number(i.total) || 0),
          backgroundColor: expenseItems.map((_, idx) => CHART_PALETTE[idx % CHART_PALETTE.length]),
          borderWidth: 0,
          hoverOffset: 6
        }
      ]
    };

    const revenueItems = (this.byCategory?.revenue || []).slice(0, 10);
    this.revenueByCategoryChart = {
      labels: revenueItems.map((i) => i.category_name || 'Sem categoria'),
      datasets: [
        {
          data: revenueItems.map((i) => Number(i.total) || 0),
          backgroundColor: revenueItems.map((_, idx) => CHART_PALETTE[idx % CHART_PALETTE.length]),
          borderWidth: 0,
          hoverOffset: 6
        }
      ]
    };
  }

  private buildFinanceAccountChart(): void {
    const items = this.byFinanceAccount?.items || [];
    this.financeAccountChart = {
      labels: items.map((i) => i.finance_account_name),
      datasets: [
        {
          label: 'Receitas',
          data: items.map((i) => Number(i.revenue) || 0),
          backgroundColor: 'rgba(22, 163, 74, 0.75)',
          borderRadius: 6,
          maxBarThickness: 42
        },
        {
          label: 'Despesas',
          data: items.map((i) => Number(i.expense) || 0),
          backgroundColor: 'rgba(220, 38, 38, 0.75)',
          borderRadius: 6,
          maxBarThickness: 42
        }
      ]
    };
  }

  private buildPaymentMethodChart(): void {
    const items = this.getPaymentMethodItems().slice(0, 10);
    this.paymentMethodChart = {
      labels: items.map((i) => i.payment_method_name || 'Sem forma'),
      datasets: [
        {
          label: 'Total',
          data: items.map((i) => Number(i.total) || 0),
          backgroundColor: items.map((_, idx) => CHART_PALETTE[idx % CHART_PALETTE.length]),
          borderRadius: 6,
          maxBarThickness: 42
        }
      ]
    };
  }

  private buildStatusChart(): void {
    const items = this.getStatusItems();
    this.statusChart = {
      labels: items.map((i) => this.getStatusLabel(i.status)),
      datasets: [
        {
          data: items.map((i) => Number(i.total) || 0),
          backgroundColor: items.map((i) => this.getStatusColor(i.status)),
          borderWidth: 0,
          hoverOffset: 6
        }
      ]
    };
  }

  private buildCashFlowChart(): void {
    const series = this.cashFlow?.series || [];
    this.cashFlowChart = {
      labels: series.map((s) => this.formatBucket(s.bucket)),
      datasets: [
        {
          label: 'Receita',
          data: series.map((s) => Number(s.revenue) || 0),
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22, 163, 74, 0.15)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#16a34a',
          yAxisID: 'y'
        },
        {
          label: 'Despesa',
          data: series.map((s) => Number(s.expense) || 0),
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220, 38, 38, 0.15)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#dc2626',
          yAxisID: 'y'
        },
        {
          label: 'Saldo acumulado',
          data: series.map((s) => Number(s.cumulative_balance) || 0),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          fill: false,
          borderDash: [6, 4],
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#2563eb',
          yAxisID: 'y1'
        }
      ]
    };
  }

  private buildInsights(): ReportInsight[] {
    if (!this.summary) {
      return [];
    }

    const list: ReportInsight[] = [];
    const revenue = this.totalRevenue;
    const expense = this.totalExpense;
    const balance = this.totalBalance;

    // 1. Comprometimento da renda (despesas x receitas)
    if (revenue > 0) {
      const ratio = (expense / revenue) * 100;
      if (ratio >= 100) {
        list.push({
          id: 'commitment',
          severity: 'critical',
          icon: this.faScaleUnbalanced,
          title: 'Despesas acima das receitas',
          message: `Você gastou o equivalente a ${this.formatRatio(ratio)} do que recebeu. O ideal é cortar gastos para reequilibrar o período.`,
          highlight: this.formatRatio(ratio)
        });
      } else if (ratio >= 80) {
        list.push({
          id: 'commitment',
          severity: 'warning',
          icon: this.faScaleUnbalanced,
          title: 'Renda muito comprometida',
          message: `Suas despesas consumiram ${this.formatRatio(ratio)} das receitas. Sobra pouca margem de folga.`,
          highlight: this.formatRatio(ratio)
        });
      } else {
        list.push({
          id: 'commitment',
          severity: 'positive',
          icon: this.faPiggyBank,
          title: 'Renda sob controle',
          message: `Você gastou ${this.formatRatio(ratio)} do que recebeu e guardou ${this.formatCurrency(revenue - expense)} no período.`,
          highlight: this.formatRatio(ratio)
        });
      }
    } else if (expense > 0) {
      list.push({
        id: 'commitment',
        severity: 'warning',
        icon: this.faScaleUnbalanced,
        title: 'Despesas sem receita registrada',
        message: `Há ${this.formatCurrency(expense)} em despesas e nenhuma receita lançada neste período.`
      });
    }

    // 2. Maior categoria de despesa (onde você gasta mais)
    const topCategory = [...(this.byCategory?.expense || [])]
      .sort((a, b) => Number(b.total) - Number(a.total))[0];
    if (topCategory && Number(topCategory.total) > 0) {
      const pct = expense > 0
        ? (Number(topCategory.total) / expense) * 100
        : Number(topCategory.percentage) || 0;
      const concentrated = pct >= 40;
      list.push({
        id: 'top-category',
        severity: concentrated ? 'warning' : 'info',
        icon: this.faFire,
        title: 'Onde você mais gasta',
        message: concentrated
          ? `${topCategory.category_name || 'Sem categoria'} concentra ${this.formatRatio(pct)} das suas despesas — vale revisar esse grupo.`
          : `${topCategory.category_name || 'Sem categoria'} é sua maior despesa, representando ${this.formatRatio(pct)} do total.`,
        highlight: this.formatCurrency(topCategory.total)
      });
    }

    // 3. Despesas vencidas (ação imediata)
    const overdue = Number(this.summary.expense?.overdue || 0);
    if (overdue > 0) {
      list.push({
        id: 'overdue',
        severity: 'critical',
        icon: this.faCircleExclamation,
        title: 'Contas vencidas',
        message: `Você tem ${this.formatCurrency(overdue)} em despesas vencidas e não pagas. Regularize para evitar juros e multas.`,
        highlight: this.formatCurrency(overdue)
      });
    }

    // 4. Tendência das despesas vs período anterior
    const expVar = this.comparison?.variation?.expense;
    const previousExpense = Number(this.comparison?.previous?.totals?.expense || 0);
    if (expVar && previousExpense > 0) {
      const pct = Number(expVar.percentage) || 0;
      if (pct > 0) {
        list.push({
          id: 'trend',
          severity: pct >= 15 ? 'warning' : 'info',
          icon: this.faArrowTrendUp,
          title: 'Gastos em alta',
          message: `Suas despesas subiram ${this.formatRatio(pct)} (${this.formatCurrency(expVar.absolute)}) em relação ao período anterior.`,
          highlight: this.formatPercentage(pct)
        });
      } else if (pct < 0) {
        list.push({
          id: 'trend',
          severity: 'positive',
          icon: this.faArrowTrendDown,
          title: 'Gastos em queda',
          message: `Você reduziu suas despesas em ${this.formatRatio(Math.abs(pct))} (${this.formatCurrency(Math.abs(expVar.absolute))}) frente ao período anterior. Continue assim!`,
          highlight: this.formatPercentage(pct)
        });
      }
    }

    // 5. Conta no negativo
    const worstAccount = [...(this.byFinanceAccount?.items || [])]
      .sort((a, b) => Number(a.balance) - Number(b.balance))[0];
    if (worstAccount && Number(worstAccount.balance) < 0) {
      list.push({
        id: 'account-negative',
        severity: 'warning',
        icon: this.faBuildingColumns,
        title: 'Conta no vermelho',
        message: `A conta "${worstAccount.finance_account_name}" fechou o período negativa em ${this.formatCurrency(Math.abs(Number(worstAccount.balance)))}.`,
        highlight: this.formatCurrency(worstAccount.balance)
      });
    }

    // 6. Saldo do período (fechamento)
    if (revenue > 0 || expense > 0) {
      if (balance >= 0) {
        list.push({
          id: 'balance',
          severity: 'positive',
          icon: this.faCircleCheck,
          title: 'Período no azul',
          message: `Receitas superaram despesas em ${this.formatCurrency(balance)}. Bom resultado!`,
          highlight: this.formatCurrency(balance)
        });
      } else {
        list.push({
          id: 'balance',
          severity: 'critical',
          icon: this.faTriangleExclamation,
          title: 'Período no vermelho',
          message: `As despesas superaram as receitas em ${this.formatCurrency(Math.abs(balance))} no período.`,
          highlight: this.formatCurrency(balance)
        });
      }
    }

    const order: { [key in InsightSeverity]: number } = {
      critical: 0,
      warning: 1,
      positive: 2,
      info: 3
    };

    return list
      .sort((a, b) => order[a.severity] - order[b.severity])
      .slice(0, 6);
  }

  private formatRatio(value: number): string {
    const num = Number(value || 0);
    return `${num.toFixed(0)}%`;
  }

  getPaymentMethodItems(): PaymentMethodReportItem[] {
    if (!this.byPaymentMethod) {
      return [];
    }
    if (this.byPaymentMethod.items && this.byPaymentMethod.items.length > 0) {
      return this.byPaymentMethod.items;
    }
    const combined = [
      ...(this.byPaymentMethod.revenue || []),
      ...(this.byPaymentMethod.expense || [])
    ];
    const grouped = new Map<string, PaymentMethodReportItem>();
    combined.forEach((item) => {
      const key = `${item.payment_method_id ?? 'null'}-${item.payment_method_name}`;
      const current = grouped.get(key);
      if (current) {
        current.total = Number(current.total) + Number(item.total);
        current.count = Number(current.count) + Number(item.count);
      } else {
        grouped.set(key, { ...item });
      }
    });
    return Array.from(grouped.values()).sort((a, b) => Number(b.total) - Number(a.total));
  }

  getStatusItems(): StatusReportItem[] {
    if (!this.byStatus) {
      return [];
    }
    if (this.byStatus.items && this.byStatus.items.length > 0) {
      return this.byStatus.items;
    }
    const combined = [
      ...(this.byStatus.revenue || []),
      ...(this.byStatus.expense || [])
    ];
    const grouped = new Map<string, StatusReportItem>();
    combined.forEach((item) => {
      const key = String(item.status);
      const current = grouped.get(key);
      if (current) {
        current.total = Number(current.total) + Number(item.total);
        current.count = Number(current.count) + Number(item.count);
      } else {
        grouped.set(key, { ...item });
      }
    });
    return Array.from(grouped.values()).sort((a, b) => Number(b.total) - Number(a.total));
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending: 'Pendente',
      paid: 'Pago',
      overdue: 'Vencido',
      cancelled: 'Cancelado'
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      pending: '#f59e0b',
      paid: '#16a34a',
      overdue: '#dc2626',
      cancelled: '#64748b'
    };
    return colors[status] || '#94a3b8';
  }

  getStatusIcon(status: string) {
    switch (status) {
      case 'paid':
        return this.faCheck;
      case 'pending':
        return this.faClock;
      case 'overdue':
        return this.faCircleExclamation;
      case 'cancelled':
        return this.faXmark;
      default:
        return this.faCircleExclamation;
    }
  }

  formatCurrency(value: number | null | undefined): string {
    const num = Number(value ?? 0);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  }

  formatCompactCurrency(value: number): string {
    const num = Number(value || 0);
    const abs = Math.abs(num);
    if (abs >= 1_000_000) {
      return `R$ ${(num / 1_000_000).toFixed(1).replace('.', ',')}M`;
    }
    if (abs >= 1_000) {
      return `R$ ${(num / 1_000).toFixed(1).replace('.', ',')}k`;
    }
    return this.formatCurrency(num);
  }

  formatPercentage(value: number | null | undefined): string {
    const num = Number(value ?? 0);
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(2).replace('.', ',')}%`;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }
    const date = new Date(value + 'T00:00:00');
    if (isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('pt-BR');
  }

  formatBucket(bucket: string): string {
    if (!bucket) {
      return '-';
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(bucket)) {
      const date = new Date(bucket + 'T00:00:00');
      return isNaN(date.getTime())
        ? bucket
        : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
    if (/^\d{4}-\d{2}$/.test(bucket)) {
      const [year, month] = bucket.split('-');
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    }
    if (/^\d{4}$/.test(bucket)) {
      return bucket;
    }
    return bucket;
  }

  getVariationClass(value: number | undefined, invertLogic = false): string {
    const num = Number(value ?? 0);
    if (num === 0) {
      return 'variation-neutral';
    }
    const isPositive = num > 0;
    if (invertLogic) {
      return isPositive ? 'variation-negative' : 'variation-positive';
    }
    return isPositive ? 'variation-positive' : 'variation-negative';
  }

  getVariationIcon(value: number | undefined) {
    const num = Number(value ?? 0);
    if (num > 0) {
      return this.faArrowUp;
    }
    if (num < 0) {
      return this.faArrowDown;
    }
    return this.faMinus;
  }

  get realizedBalance(): number {
    return Number(this.summary?.totals?.realized_balance || 0);
  }

  get totalRevenue(): number {
    return Number(this.summary?.totals?.revenue || 0);
  }

  get totalExpense(): number {
    return Number(this.summary?.totals?.expense || 0);
  }

  get totalBalance(): number {
    return Number(this.summary?.totals?.balance || 0);
  }

  get periodLabel(): string {
    if (!this.summary?.period) {
      return '';
    }
    const from = this.formatDate(this.summary.period.from);
    const to = this.formatDate(this.summary.period.to);
    return `${from} - ${to}`;
  }

  get hasCashFlowData(): boolean {
    return (this.cashFlow?.series || []).some(
      (s) => Number(s.revenue) > 0 || Number(s.expense) > 0
    );
  }

  get hasExpenseByCategory(): boolean {
    return (this.byCategory?.expense || []).length > 0;
  }

  get hasRevenueByCategory(): boolean {
    return (this.byCategory?.revenue || []).length > 0;
  }

  get hasFinanceAccountData(): boolean {
    return (this.byFinanceAccount?.items || []).length > 0;
  }

  get hasPaymentMethodData(): boolean {
    return this.getPaymentMethodItems().length > 0;
  }

  get hasStatusData(): boolean {
    return this.getStatusItems().length > 0;
  }

  get hasTopExpenses(): boolean {
    return (this.topExpenses?.items || []).length > 0;
  }
}
