import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ApiService } from '../api/api.service';
import {
  Diagnosis,
  ReductionPlan,
  Projection,
  Debt,
  DebtStrategyResult,
  FinancialGoal,
  ExecutiveDashboard
} from '../../models/planning/planning.model';
import {
  MOCK_DIAGNOSIS,
  MOCK_REDUCTION,
  MOCK_PROJECTION,
  MOCK_DEBTS,
  MOCK_DEBT_STRATEGY,
  MOCK_GOALS,
  MOCK_DASHBOARD
} from './planning.mock';

@Injectable({ providedIn: 'root' })
export class PlanningService {
  // Endpoints Laravel /api/planning/* implementados. Mantenha `true` apenas
  // para demonstração offline com dados mock.
  private useMock = false;

  constructor(private api: ApiService) {}

  getDashboard(): Observable<ExecutiveDashboard> {
    if (this.useMock) return of(MOCK_DASHBOARD).pipe(delay(250));
    return this.api.get<ExecutiveDashboard>('planning/dashboard');
  }

  getDiagnosis(period: string = 'current'): Observable<Diagnosis> {
    if (this.useMock) return of(MOCK_DIAGNOSIS).pipe(delay(250));
    return this.api.get<Diagnosis>('planning/diagnosis', { period });
  }

  getReductionPlan(): Observable<ReductionPlan> {
    if (this.useMock) return of(MOCK_REDUCTION).pipe(delay(250));
    return this.api.get<ReductionPlan>('planning/reduction-plan');
  }

  saveReductionPlan(itemIds: number[]): Observable<{ success: boolean }> {
    if (this.useMock) return of({ success: true }).pipe(delay(250));
    return this.api.post<{ success: boolean }>('planning/reduction-plan', { item_ids: itemIds });
  }

  getProjections(months: number = 12): Observable<Projection> {
    if (this.useMock) return of(MOCK_PROJECTION).pipe(delay(250));
    return this.api.get<Projection>('planning/projections', { months });
  }

  getDebts(): Observable<Debt[]> {
    if (this.useMock) return of(MOCK_DEBTS).pipe(delay(250));
    return this.api.get<Debt[]>('planning/debts');
  }

  createDebt(debt: Debt): Observable<Debt> {
    if (this.useMock) return of({ ...debt, id: Date.now() }).pipe(delay(250));
    return this.api.post<Debt>('planning/debts', debt);
  }

  getDebtStrategies(extra: number = 500): Observable<DebtStrategyResult> {
    if (this.useMock) return of(MOCK_DEBT_STRATEGY).pipe(delay(250));
    return this.api.get<DebtStrategyResult>('planning/debts/strategies', { extra });
  }

  getGoals(): Observable<FinancialGoal[]> {
    if (this.useMock) return of(MOCK_GOALS).pipe(delay(250));
    return this.api.get<FinancialGoal[]>('planning/goals');
  }

  saveGoal(goal: FinancialGoal): Observable<FinancialGoal> {
    if (this.useMock) return of({ ...goal, id: goal.id || Date.now() }).pipe(delay(250));
    if (goal.id) return this.api.put<FinancialGoal>(`planning/goals/${goal.id}`, goal);
    return this.api.post<FinancialGoal>('planning/goals', goal);
  }
}
