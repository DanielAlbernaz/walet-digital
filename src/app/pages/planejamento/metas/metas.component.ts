import { Component, OnInit } from '@angular/core';
import { faShieldHalved, faPlane, faHouse, faCar, faChartPie, faBullseye, faStar } from '@fortawesome/free-solid-svg-icons';
import { PlanningService } from '../../../services/planning/planning.service';
import { FinancialGoal, GoalType } from '../../../models/planning/planning.model';
import { formatBRL } from '../../../services/planning/planning.util';

@Component({
  selector: 'app-metas',
  template: `
    <app-loading-overlay [isLoading]="isLoading"></app-loading-overlay>

    <div class="goals" *ngIf="goals">
      <div class="goal-card" *ngFor="let goal of goals">
        <div class="goal-head">
          <div class="goal-icon" [style.background]="iconBg(goal.type)">
            <fa-icon [icon]="goalIcon(goal.type)"></fa-icon>
          </div>
          <div class="goal-title-wrap">
            <span class="goal-title">{{ goal.title }}</span>
            <span class="goal-badge" *ngIf="goal.isSuggested"><fa-icon [icon]="faStar"></fa-icon> Sugerida</span>
          </div>
        </div>

        <div class="goal-progress-row">
          <div class="progress-bg">
            <div class="progress-fill" [style.width.%]="goal.progress"></div>
          </div>
          <span class="progress-pct">{{ goal.progress }}%</span>
        </div>

        <div class="goal-values">
          <span>{{ brl(goal.currentAmount) }}</span>
          <span class="goal-target">de {{ brl(goal.targetAmount) }}</span>
        </div>

        <div class="goal-footer" *ngIf="goal.monthlyContribution">
          Aporte sugerido: <strong>{{ brl(goal.monthlyContribution) }}/mês</strong>
          <span *ngIf="goal.targetDate"> • meta para {{ goal.targetDate | date:'MM/yyyy' }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .goals { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .goal-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 14px; }
    .goal-head { display: flex; align-items: center; gap: 12px; }
    .goal-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 18px; }
    .goal-title-wrap { display: flex; flex-direction: column; gap: 4px; }
    .goal-title { font-size: 16px; font-weight: 600; color: var(--foreground); }
    .goal-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: #b45309; background: rgba(245,158,11,0.12); padding: 2px 8px; border-radius: 10px; width: fit-content; }
    .goal-progress-row { display: flex; align-items: center; gap: 12px; }
    .progress-bg { flex: 1; height: 12px; background: var(--accent, #f1f5f9); border-radius: 6px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #2563eb, #7c3aed); border-radius: 6px; transition: width 0.5s ease; }
    .progress-pct { font-weight: 700; color: #2563eb; }
    .goal-values { display: flex; align-items: baseline; gap: 8px; }
    .goal-values span:first-child { font-size: 20px; font-weight: 700; color: var(--foreground); }
    .goal-target { font-size: 13px; color: var(--muted-foreground, #6b7280); }
    .goal-footer { font-size: 13px; color: var(--muted-foreground, #6b7280); border-top: 1px solid var(--border); padding-top: 12px; }
    @media (max-width: 800px) { .goals { grid-template-columns: 1fr; } }
  `]
})
export class MetasComponent implements OnInit {
  faStar = faStar;

  isLoading = false;
  goals: FinancialGoal[] | null = null;

  constructor(private planningService: PlanningService) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.planningService.getGoals().subscribe({
      next: (g) => { this.goals = g; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  goalIcon(type: GoalType) {
    switch (type) {
      case 'emergency_reserve': return faShieldHalved;
      case 'trip': return faPlane;
      case 'house': return faHouse;
      case 'car': return faCar;
      case 'investment': return faChartPie;
      default: return faBullseye;
    }
  }

  iconBg(type: GoalType): string {
    switch (type) {
      case 'emergency_reserve': return '#16a34a';
      case 'trip': return '#0ea5e9';
      case 'house': return '#f59e0b';
      case 'car': return '#8b5cf6';
      case 'investment': return '#2563eb';
      default: return '#6b7280';
    }
  }

  brl(value: number): string { return formatBRL(value); }
}
