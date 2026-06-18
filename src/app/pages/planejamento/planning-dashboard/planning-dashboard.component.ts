import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { faTriangleExclamation, faMoneyBillTrendUp, faPiggyBank, faCalendarCheck, faComments } from '@fortawesome/free-solid-svg-icons';
import { PlanningService } from '../../../services/planning/planning.service';
import { ExecutiveDashboard } from '../../../models/planning/planning.model';
import { formatBRL } from '../../../services/planning/planning.util';

@Component({
  selector: 'app-planning-dashboard',
  template: `
    <app-loading-overlay [isLoading]="isLoading"></app-loading-overlay>

    <div class="exec-grid" *ngIf="data">
      <!-- Saúde -->
      <div class="exec-card highlight">
        <span class="exec-label">Saúde Financeira</span>
        <app-score-gauge [score]="data.score.score" [band]="data.score.band"></app-score-gauge>
      </div>

      <div class="exec-card">
        <span class="exec-label">Saldo Projetado</span>
        <span class="exec-value" [class.negative]="data.projectedBalance < 0">{{ brl(data.projectedBalance) }}</span>
        <span class="exec-hint">próximo mês</span>
      </div>

      <div class="exec-card">
        <fa-icon [icon]="faPiggyBank" class="exec-icon green"></fa-icon>
        <span class="exec-label">Economia Possível</span>
        <span class="exec-value green">{{ brl(data.possibleSavingMonthly) }}/mês</span>
        <span class="exec-hint">{{ brl(data.possibleSavingYearly) }}/ano</span>
      </div>

      <div class="exec-card">
        <fa-icon [icon]="faTriangleExclamation" class="exec-icon red"></fa-icon>
        <span class="exec-label">Maior Vilão</span>
        <span class="exec-value">{{ data.topVillain.label }}</span>
        <span class="exec-hint">{{ data.topVillain.percent }}% dos gastos</span>
      </div>

      <div class="exec-card">
        <fa-icon [icon]="faMoneyBillTrendUp" class="exec-icon blue"></fa-icon>
        <span class="exec-label">Próxima Dívida a Encerrar</span>
        <span class="exec-value" *ngIf="data.nextDebtToFinish">{{ data.nextDebtToFinish.label }}</span>
        <span class="exec-hint" *ngIf="data.nextDebtToFinish">termina em {{ data.nextDebtToFinish.dueLabel }}</span>
        <span class="exec-value" *ngIf="!data.nextDebtToFinish">—</span>
      </div>

      <div class="exec-card">
        <fa-icon [icon]="faCalendarCheck" class="exec-icon green"></fa-icon>
        <span class="exec-label">Equilíbrio Previsto</span>
        <span class="exec-value">{{ data.breakEvenLabel || 'Sem previsão' }}</span>
      </div>

      <!-- Reserva (largura total) -->
      <div class="exec-card full">
        <span class="exec-label">Meta de Reserva de Emergência</span>
        <div class="reserve-row">
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" [style.width.%]="data.emergencyReserve.progress"></div>
          </div>
          <span class="reserve-pct">{{ data.emergencyReserve.progress }}%</span>
        </div>
        <span class="exec-hint">{{ brl(data.emergencyReserve.current) }} de {{ brl(data.emergencyReserve.target) }}</span>
      </div>

      <button type="button" class="ai-cta full" (click)="goToAi()">
        <fa-icon [icon]="faComments"></fa-icon>
        Falar com a IA Financeira
      </button>
    </div>
  `,
  styles: [`
    .exec-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .exec-card {
      background: var(--card); border: 1px solid var(--border); border-radius: 14px;
      padding: 18px; display: flex; flex-direction: column; gap: 6px;
    }
    .exec-card.highlight { align-items: center; grid-row: span 2; justify-content: center; }
    .exec-card.full { grid-column: 1 / -1; }
    .exec-label { font-size: 13px; color: var(--muted-foreground, #6b7280); font-weight: 500; }
    .exec-value { font-size: 22px; font-weight: 700; color: var(--foreground); }
    .exec-value.negative, .exec-value.red { color: #dc2626; }
    .exec-value.green { color: #16a34a; }
    .exec-hint { font-size: 12px; color: var(--muted-foreground, #6b7280); }
    .exec-icon { font-size: 20px; }
    .exec-icon.green { color: #16a34a; }
    .exec-icon.red { color: #dc2626; }
    .exec-icon.blue { color: #2563eb; }
    .reserve-row { display: flex; align-items: center; gap: 12px; }
    .progress-bar-bg { flex: 1; height: 12px; background: var(--accent, #f1f5f9); border-radius: 6px; overflow: hidden; }
    .progress-bar-fill { height: 100%; background: linear-gradient(90deg, #16a34a, #22c55e); border-radius: 6px; }
    .reserve-pct { font-weight: 700; color: #16a34a; }
    .ai-cta {
      display: inline-flex; align-items: center; justify-content: center; gap: 10px;
      padding: 14px; border: none; border-radius: 14px; cursor: pointer;
      background: linear-gradient(90deg, #2563eb, #7c3aed); color: #fff;
      font-size: 15px; font-weight: 600; transition: opacity 0.15s ease;
    }
    .ai-cta:hover { opacity: 0.92; }
    @media (max-width: 900px) { .exec-grid { grid-template-columns: 1fr; } .exec-card.highlight { grid-row: auto; } }
  `]
})
export class PlanningDashboardComponent implements OnInit {
  faTriangleExclamation = faTriangleExclamation;
  faMoneyBillTrendUp = faMoneyBillTrendUp;
  faPiggyBank = faPiggyBank;
  faCalendarCheck = faCalendarCheck;
  faComments = faComments;

  isLoading = false;
  data: ExecutiveDashboard | null = null;

  constructor(private planningService: PlanningService, private router: Router) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.planningService.getDashboard().subscribe({
      next: (d) => { this.data = d; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  brl(value: number): string { return formatBRL(value); }

  goToAi(): void { this.router.navigate(['/planejamento/ia']); }
}
