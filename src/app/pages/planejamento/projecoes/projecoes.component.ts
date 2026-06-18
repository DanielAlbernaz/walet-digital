import { Component, OnInit } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { faChartLine, faCalendarCheck } from '@fortawesome/free-solid-svg-icons';
import { PlanningService } from '../../../services/planning/planning.service';
import { Projection } from '../../../models/planning/planning.model';
import { formatBRL } from '../../../services/planning/planning.util';

@Component({
  selector: 'app-projecoes',
  template: `
    <app-loading-overlay [isLoading]="isLoading"></app-loading-overlay>

    <div class="proj" *ngIf="data">
      <div class="range-tabs">
        <button *ngFor="let r of ranges" class="range-tab" [class.active]="months === r.value" (click)="setRange(r.value)">{{ r.label }}</button>
      </div>

      <div class="card break-even" *ngIf="data.breakEvenLabel">
        <fa-icon [icon]="faCalendarCheck"></fa-icon>
        <span>Equilíbrio financeiro previsto para <strong>{{ data.breakEvenLabel }}</strong></span>
      </div>

      <div class="card">
        <h3 class="card-title"><fa-icon [icon]="faChartLine"></fa-icon> Tendência de saldo</h3>
        <div class="chart-wrap">
          <canvas baseChart [type]="lineType" [data]="chartData" [options]="chartOptions"></canvas>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">Timeline mês a mês</h3>
        <div class="timeline">
          <div class="tl-row tl-head">
            <span>Mês</span><span>Receita</span><span>Despesa</span><span>Saldo</span>
          </div>
          <div class="tl-row" *ngFor="let m of visibleMonths">
            <span class="tl-month">{{ m.label }}</span>
            <span class="green">{{ brl(m.income) }}</span>
            <span class="red">{{ brl(m.expense) }}</span>
            <span [class.green]="m.balance >= 0" [class.red]="m.balance < 0" class="tl-balance">{{ brl(m.balance) }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .proj { display: flex; flex-direction: column; gap: 16px; }
    .range-tabs { display: flex; gap: 6px; }
    .range-tab { padding: 8px 16px; border-radius: 10px; border: 1px solid var(--border); background: var(--card); color: var(--foreground); cursor: pointer; font-size: 14px; }
    .range-tab.active { background: #2563eb; color: #fff; border-color: #2563eb; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 18px; }
    .card-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; color: var(--foreground); margin: 0 0 14px; }
    .break-even { display: flex; align-items: center; gap: 10px; background: rgba(22,163,74,0.10); border-color: rgba(22,163,74,0.30); color: #15803d; font-size: 14px; }
    .chart-wrap { height: 300px; }
    .timeline { display: flex; flex-direction: column; }
    .tl-row { display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
    .tl-row:last-child { border-bottom: none; }
    .tl-head { font-weight: 600; color: var(--muted-foreground, #6b7280); font-size: 12px; text-transform: uppercase; }
    .tl-month { font-weight: 600; color: var(--foreground); }
    .tl-balance { font-weight: 700; }
    .green { color: #16a34a; } .red { color: #dc2626; }
  `]
})
export class ProjecoesComponent implements OnInit {
  faChartLine = faChartLine;
  faCalendarCheck = faCalendarCheck;

  isLoading = false;
  data: Projection | null = null;
  months = 12;

  ranges = [
    { label: '1 mês', value: 1 },
    { label: '3 meses', value: 3 },
    { label: '6 meses', value: 6 },
    { label: '12 meses', value: 12 }
  ];

  readonly lineType = 'line' as const;
  chartData: ChartData<'line'> = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true } },
    scales: { y: { ticks: { callback: (v) => 'R$ ' + v } } }
  };

  constructor(private planningService: PlanningService) {}

  ngOnInit(): void { this.load(); }

  setRange(value: number): void { this.months = value; this.buildChart(); }

  get visibleMonths() {
    return (this.data?.months || []).slice(0, this.months);
  }

  private load(): void {
    this.isLoading = true;
    this.planningService.getProjections(12).subscribe({
      next: (d) => { this.data = d; this.buildChart(); this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  private buildChart(): void {
    const items = this.visibleMonths;
    this.chartData = {
      labels: items.map(m => m.label),
      datasets: [
        { data: items.map(m => m.income), label: 'Receita', borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.1)', tension: 0.3 },
        { data: items.map(m => m.expense), label: 'Despesa', borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.1)', tension: 0.3 },
        { data: items.map(m => m.balance), label: 'Saldo', borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.15)', fill: true, tension: 0.3 }
      ]
    };
  }

  brl(value: number): string { return formatBRL(value); }
}
