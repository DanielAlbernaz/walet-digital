import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api.service';

export type ReportPeriodAlias =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days';

export type ReportDateField = 'date' | 'due_date' | 'payment_date';
export type ReportType = 'expense' | 'revenue';
export type ReportStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type CashFlowGroupBy = 'day' | 'week' | 'month' | 'year';

export interface ReportFilters {
  date_from?: string;
  date_to?: string;
  month?: number;
  year?: number;
  period?: ReportPeriodAlias;
  date_field?: ReportDateField;
  type?: ReportType;
  status?: ReportStatus;
  finance_account_id?: number;
  category_id?: number;
  payment_method_id?: number;
  include_cancelled?: boolean;
  group_by?: CashFlowGroupBy;
  limit?: number;
}

export interface ReportPeriodInfo {
  from: string;
  to: string;
  label?: string | null;
  date_field: ReportDateField;
}

export interface ReportTotals {
  revenue: number;
  expense: number;
  balance: number;
  realized_balance: number;
}

export interface ReportRevenueExpenseDetail {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
}

export interface ReportCounts {
  total: number;
  revenue: number;
  expense: number;
}

export interface SummaryReport {
  period: ReportPeriodInfo;
  totals: ReportTotals;
  revenue: ReportRevenueExpenseDetail;
  expense: ReportRevenueExpenseDetail;
  counts: ReportCounts;
}

export interface CategoryReportItem {
  category_id: number | null;
  category_name: string;
  total: number;
  count: number;
  percentage: number;
}

export interface CategoryReport {
  totals: { revenue: number; expense: number };
  revenue: CategoryReportItem[];
  expense: CategoryReportItem[];
}

export interface FinanceAccountReportItem {
  finance_account_id: number;
  finance_account_name: string;
  revenue: number;
  expense: number;
  balance: number;
  count: number;
}

export interface FinanceAccountReport {
  items: FinanceAccountReportItem[];
}

export interface PaymentMethodReportItem {
  payment_method_id: number | null;
  payment_method_name: string;
  total: number;
  count: number;
  percentage: number;
}

export interface PaymentMethodReport {
  totals: { revenue: number; expense: number };
  revenue?: PaymentMethodReportItem[];
  expense?: PaymentMethodReportItem[];
  items?: PaymentMethodReportItem[];
}

export interface StatusReportItem {
  status: ReportStatus | string;
  total: number;
  count: number;
  percentage: number;
}

export interface StatusReport {
  totals: { revenue: number; expense: number };
  revenue?: StatusReportItem[];
  expense?: StatusReportItem[];
  items?: StatusReportItem[];
}

export interface CashFlowPoint {
  bucket: string;
  revenue: number;
  expense: number;
  balance: number;
  cumulative_balance: number;
  count: number;
}

export interface CashFlowReport {
  group_by: CashFlowGroupBy;
  date_field: ReportDateField;
  series: CashFlowPoint[];
}

export interface TopExpenseItem {
  id: number;
  description: string | null;
  value: number;
  date: string;
  due_date: string | null;
  payment_date: string | null;
  status: ReportStatus | null;
  category_id: number | null;
  category_name: string | null;
  payment_method_id: number | null;
  payment_method_name: string | null;
  finance_account_id: number | null;
  finance_account_name: string | null;
}

export interface TopExpensesReport {
  items: TopExpenseItem[];
  total: number;
}

export interface VariationItem {
  current: number;
  previous: number;
  absolute: number;
  percentage: number;
}

export interface ComparisonReport {
  current: SummaryReport;
  previous: SummaryReport;
  variation: {
    revenue: VariationItem;
    expense: VariationItem;
    balance: VariationItem;
  };
}

export interface OverviewReport {
  summary: SummaryReport;
  by_category: CategoryReport;
  by_finance_account: FinanceAccountReport;
  by_payment_method: PaymentMethodReport;
  by_status: StatusReport;
  cash_flow: CashFlowReport;
  top_expenses: TopExpensesReport;
  comparison?: ComparisonReport;
}

@Injectable({
  providedIn: 'root'
})
export class FinancialReportsService {
  private readonly basePath = 'financial_release/reports';

  constructor(private apiService: ApiService) {}

  private buildParams(filters: ReportFilters = {}): { [key: string]: any } {
    const params: { [key: string]: any } = {};
    Object.keys(filters).forEach((key) => {
      const value = (filters as any)[key];
      if (value === null || value === undefined || value === '') {
        return;
      }
      if (typeof value === 'boolean') {
        // Só envia include_cancelled quando true (default do backend é false).
        // Evita 500 em backends que não parseiam "false" como booleano corretamente.
        if (!value) {
          return;
        }
        params[key] = 1;
      } else {
        params[key] = value;
      }
    });
    return params;
  }

  getOverview(filters: ReportFilters = {}): Observable<OverviewReport> {
    return this.apiService.get<OverviewReport>(`${this.basePath}/overview`, this.buildParams(filters));
  }

  getSummary(filters: ReportFilters = {}): Observable<SummaryReport> {
    return this.apiService.get<SummaryReport>(`${this.basePath}/summary`, this.buildParams(filters));
  }

  getByCategory(filters: ReportFilters = {}): Observable<CategoryReport> {
    return this.apiService.get<CategoryReport>(`${this.basePath}/by-category`, this.buildParams(filters));
  }

  getByFinanceAccount(filters: ReportFilters = {}): Observable<FinanceAccountReport> {
    return this.apiService.get<FinanceAccountReport>(`${this.basePath}/by-finance-account`, this.buildParams(filters));
  }

  getByPaymentMethod(filters: ReportFilters = {}): Observable<PaymentMethodReport> {
    return this.apiService.get<PaymentMethodReport>(`${this.basePath}/by-payment-method`, this.buildParams(filters));
  }

  getByStatus(filters: ReportFilters = {}): Observable<StatusReport> {
    return this.apiService.get<StatusReport>(`${this.basePath}/by-status`, this.buildParams(filters));
  }

  getCashFlow(filters: ReportFilters = {}): Observable<CashFlowReport> {
    return this.apiService.get<CashFlowReport>(`${this.basePath}/cash-flow`, this.buildParams(filters));
  }

  getTopExpenses(filters: ReportFilters = {}): Observable<TopExpensesReport> {
    return this.apiService.get<TopExpensesReport>(`${this.basePath}/top-expenses`, this.buildParams(filters));
  }

  getComparison(filters: ReportFilters = {}): Observable<ComparisonReport> {
    return this.apiService.get<ComparisonReport>(`${this.basePath}/comparison`, this.buildParams(filters));
  }
}
