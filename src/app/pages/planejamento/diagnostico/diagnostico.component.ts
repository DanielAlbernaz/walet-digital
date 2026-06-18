import { Component, OnInit } from '@angular/core';
import { faCircleInfo, faTriangleExclamation, faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import { PlanningService } from '../../../services/planning/planning.service';
import { Diagnosis, FinancialAlert, Indicator } from '../../../models/planning/planning.model';
import { formatBRL } from '../../../services/planning/planning.util';

@Component({
  selector: 'app-diagnostico',
  template: `
    <app-loading-overlay [isLoading]="isLoading"></app-loading-overlay>

    <div class="diag" *ngIf="data">
      <!-- Saúde + Resumo -->
      <div class="diag-top">
        <div class="card score-card">
          <h3 class="card-title">Saúde Financeira</h3>
          <app-score-gauge [score]="data.score.score" [band]="data.score.band"></app-score-gauge>
        </div>
        <div class="card summary-card">
          <h3 class="card-title">Resumo de {{ data.period }}</h3>
          <div class="summary-row"><span>Receitas</span><strong class="green">{{ brl(data.income) }}</strong></div>
          <div class="summary-row"><span>Despesas</span><strong class="red">{{ brl(data.expense) }}</strong></div>
          <hr/>
          <div class="summary-row big"><span>Resultado</span><strong [class.red]="data.result < 0" [class.green]="data.result >= 0">{{ brl(data.result) }}</strong></div>
        </div>
      </div>

      <!-- Indicadores -->
      <div class="card">
        <h3 class="card-title">Indicadores</h3>
        <div class="indicators">
          <div class="indicator" *ngFor="let ind of data.indicators">
            <div class="indicator-head">
              <span class="indicator-label">{{ ind.label }}</span>
              <span class="indicator-pct" [class.over]="isOver(ind)">{{ ind.percent }}%</span>
            </div>
            <div class="indicator-bar-bg">
              <div class="indicator-bar-fill" [class.over]="isOver(ind)" [style.width.%]="capPercent(ind.percent)"></div>
            </div>
            <span class="indicator-threshold" *ngIf="ind.threshold">recomendado até {{ ind.threshold }}%</span>
          </div>
        </div>
      </div>

      <!-- Alertas -->
      <div class="card">
        <h3 class="card-title">Alertas</h3>
        <div class="alerts">
          <div class="alert" *ngFor="let alert of data.alerts" [ngClass]="alert.severity">
            <fa-icon [icon]="alertIcon(alert)"></fa-icon>
            <span>{{ alert.message }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .diag { display: flex; flex-direction: column; gap: 16px; }
    .diag-top { display: grid; grid-template-columns: 240px 1fr; gap: 16px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 18px; }
    .card-title { font-size: 16px; font-weight: 600; color: var(--foreground); margin: 0 0 14px; }
    .score-card { display: flex; flex-direction: column; align-items: center; }
    .summary-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 14px; color: var(--foreground); }
    .summary-row.big { font-size: 18px; font-weight: 600; }
    .green { color: #16a34a; } .red { color: #dc2626; }
    hr { border: none; border-top: 1px solid var(--border); margin: 6px 0; }
    .indicators { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .indicator-head { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px; }
    .indicator-label { color: var(--foreground); font-weight: 500; }
    .indicator-pct { font-weight: 700; color: #16a34a; }
    .indicator-pct.over { color: #dc2626; }
    .indicator-bar-bg { height: 10px; background: var(--accent, #f1f5f9); border-radius: 5px; overflow: hidden; }
    .indicator-bar-fill { height: 100%; background: #22c55e; border-radius: 5px; transition: width 0.5s ease; }
    .indicator-bar-fill.over { background: #dc2626; }
    .indicator-threshold { font-size: 11px; color: var(--muted-foreground, #6b7280); }
    .alerts { display: flex; flex-direction: column; gap: 10px; }
    .alert { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 10px; font-size: 14px; }
    .alert.info { background: rgba(37,99,235,0.08); color: #1d4ed8; }
    .alert.warning { background: rgba(245,158,11,0.10); color: #b45309; }
    .alert.danger { background: rgba(220,38,38,0.10); color: #b91c1c; }
    @media (max-width: 800px) { .diag-top { grid-template-columns: 1fr; } .indicators { grid-template-columns: 1fr; } }
  `]
})
export class DiagnosticoComponent implements OnInit {
  isLoading = false;
  data: Diagnosis | null = null;

  constructor(private planningService: PlanningService) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.planningService.getDiagnosis().subscribe({
      next: (d) => { this.data = d; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  brl(value: number): string { return formatBRL(value); }

  isOver(ind: Indicator): boolean {
    return ind.threshold !== undefined && ind.percent > ind.threshold;
  }

  capPercent(pct: number): number {
    return Math.min(100, pct);
  }

  alertIcon(alert: FinancialAlert) {
    if (alert.severity === 'danger') return faCircleExclamation;
    if (alert.severity === 'warning') return faTriangleExclamation;
    return faCircleInfo;
  }
}
