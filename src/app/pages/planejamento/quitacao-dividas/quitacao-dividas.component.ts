import { Component, OnInit } from '@angular/core';
import { faSnowflake, faMountain, faTrophy, faCalculator } from '@fortawesome/free-solid-svg-icons';
import { PlanningService } from '../../../services/planning/planning.service';
import { Debt, DebtStrategyResult } from '../../../models/planning/planning.model';
import { formatBRL } from '../../../services/planning/planning.util';

@Component({
  selector: 'app-quitacao-dividas',
  template: `
    <app-loading-overlay [isLoading]="isLoading"></app-loading-overlay>

    <div class="debts" *ngIf="debts">
      <!-- Lista de dívidas -->
      <div class="card">
        <h3 class="card-title">Suas dívidas</h3>
        <div class="debt-table">
          <div class="dt-row dt-head">
            <span>Dívida</span><span>Saldo</span><span>Parcelas</span><span>Taxa a.m.</span><span>Total restante</span>
          </div>
          <div class="dt-row" *ngFor="let d of debts">
            <span class="dt-desc">{{ d.description }}<small>{{ typeLabel(d.type) }}</small></span>
            <span>{{ brl(d.remainingAmount) }}</span>
            <span>{{ d.remainingInstallments || '—' }}</span>
            <span>{{ d.interestRateMonth != null ? d.interestRateMonth + '%' : '—' }}</span>
            <span class="dt-total">{{ brl(d.totalRemaining) }}</span>
          </div>
        </div>
      </div>

      <!-- Estratégias -->
      <div class="strategies" *ngIf="strategy">
        <div class="card strategy" [class.recommended]="strategy.recommended === 'snowball'">
          <h3 class="card-title"><fa-icon [icon]="faSnowflake" class="ico-blue"></fa-icon> Bola de Neve</h3>
          <p class="strategy-desc">Quita a menor dívida primeiro (efeito psicológico).</p>
          <ol class="strategy-steps">
            <li *ngFor="let s of strategy.snowball">{{ s.debt }}</li>
          </ol>
          <span class="badge" *ngIf="strategy.recommended === 'snowball'"><fa-icon [icon]="faTrophy"></fa-icon> Recomendado</span>
        </div>

        <div class="card strategy" [class.recommended]="strategy.recommended === 'avalanche'">
          <h3 class="card-title"><fa-icon [icon]="faMountain" class="ico-orange"></fa-icon> Avalanche</h3>
          <p class="strategy-desc">Quita a dívida de maior juros primeiro (economiza mais).</p>
          <ol class="strategy-steps">
            <li *ngFor="let s of strategy.avalanche">{{ s.debt }}</li>
          </ol>
          <span class="badge" *ngIf="strategy.recommended === 'avalanche'"><fa-icon [icon]="faTrophy"></fa-icon> Recomendado — economiza {{ brl(strategy.interestSaved) }} em juros</span>
        </div>
      </div>

      <!-- Simulador -->
      <div class="card" *ngIf="strategy">
        <h3 class="card-title"><fa-icon [icon]="faCalculator"></fa-icon> Simulador de aporte extra</h3>
        <div class="sim-grid">
          <div class="sim-card" *ngFor="let sim of strategy.simulations">
            <span class="sim-extra">+{{ brl(sim.extra) }}/mês</span>
            <div class="sim-result"><span class="green">{{ brl(sim.interestSaved) }}</span><small>economia de juros</small></div>
            <div class="sim-result"><span class="blue">{{ sim.monthsSaved }} meses</span><small>antecipados</small></div>
          </div>
        </div>
        <p class="disclaimer">Nunca recomendamos cheque especial, rotativo do cartão ou empréstimos abusivos. Priorize redução de gastos e renegociação.</p>
      </div>
    </div>
  `,
  styles: [`
    .debts { display: flex; flex-direction: column; gap: 16px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 18px; }
    .card-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; color: var(--foreground); margin: 0 0 12px; }
    .ico-blue { color: #2563eb; } .ico-orange { color: #f97316; }
    .debt-table { display: flex; flex-direction: column; }
    .dt-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1.2fr; padding: 12px 0; border-bottom: 1px solid var(--border); font-size: 14px; align-items: center; }
    .dt-row:last-child { border-bottom: none; }
    .dt-head { font-size: 12px; text-transform: uppercase; color: var(--muted-foreground, #6b7280); font-weight: 600; }
    .dt-desc { display: flex; flex-direction: column; font-weight: 600; color: var(--foreground); }
    .dt-desc small { font-weight: 400; font-size: 11px; color: var(--muted-foreground, #6b7280); }
    .dt-total { font-weight: 700; }
    .strategies { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .strategy { position: relative; }
    .strategy.recommended { border-color: #16a34a; box-shadow: 0 0 0 1px #16a34a inset; }
    .strategy-desc { font-size: 13px; color: var(--muted-foreground, #6b7280); margin: 0 0 12px; }
    .strategy-steps { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; color: var(--foreground); }
    .badge { display: inline-flex; align-items: center; gap: 6px; margin-top: 14px; padding: 6px 12px; border-radius: 20px; background: rgba(22,163,74,0.12); color: #15803d; font-size: 12px; font-weight: 600; }
    .sim-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .sim-card { border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .sim-extra { font-size: 18px; font-weight: 700; color: var(--foreground); }
    .sim-result { display: flex; flex-direction: column; }
    .sim-result span { font-size: 18px; font-weight: 700; }
    .sim-result small { font-size: 11px; color: var(--muted-foreground, #6b7280); }
    .green { color: #16a34a; } .blue { color: #2563eb; }
    .disclaimer { margin-top: 14px; font-size: 12px; color: var(--muted-foreground, #6b7280); font-style: italic; }
    @media (max-width: 800px) { .strategies, .sim-grid { grid-template-columns: 1fr; } }
  `]
})
export class QuitacaoDividasComponent implements OnInit {
  faSnowflake = faSnowflake;
  faMountain = faMountain;
  faTrophy = faTrophy;
  faCalculator = faCalculator;

  isLoading = false;
  debts: Debt[] | null = null;
  strategy: DebtStrategyResult | null = null;

  constructor(private planningService: PlanningService) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.planningService.getDebts().subscribe({
      next: (d) => { this.debts = d; },
      error: () => {}
    });
    this.planningService.getDebtStrategies(500).subscribe({
      next: (s) => { this.strategy = s; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = { financing: 'Financiamento', installment: 'Parcelamento', card: 'Cartão', loan: 'Empréstimo' };
    return map[type] || type;
  }

  brl(value: number): string { return formatBRL(value); }
}
