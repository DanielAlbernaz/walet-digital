import { Component } from '@angular/core';
import {
  faLightbulb,
  faGaugeHigh,
  faScissors,
  faChartLine,
  faMoneyBillTrendUp,
  faBullseye,
  faRobot
} from '@fortawesome/free-solid-svg-icons';

interface PlanningTab {
  label: string;
  path: string;
  icon: any;
}

@Component({
  selector: 'app-planejamento',
  template: `
    <app-dashboard-layout>
      <div class="planning-page">
        <div class="planning-header">
          <fa-icon [icon]="faLightbulb" class="planning-header-icon"></fa-icon>
          <div>
            <h1 class="planning-title">Planejamento Financeiro</h1>
            <p class="planning-subtitle">Seu consultor financeiro pessoal, baseado nos seus dados.</p>
          </div>
        </div>

        <nav class="planning-tabs">
          <a *ngFor="let tab of tabs"
             [routerLink]="tab.path"
             routerLinkActive="active"
             class="planning-tab">
            <fa-icon [icon]="tab.icon"></fa-icon>
            <span>{{ tab.label }}</span>
          </a>
        </nav>

        <div class="planning-content">
          <router-outlet></router-outlet>
        </div>
      </div>
    </app-dashboard-layout>
  `,
  styles: [`
    .planning-page { display: flex; flex-direction: column; gap: 20px; }
    .planning-header { display: flex; align-items: center; gap: 14px; }
    .planning-header-icon { font-size: 28px; color: #f59e0b; }
    .planning-title { font-size: 24px; font-weight: 600; color: var(--foreground); margin: 0; }
    .planning-subtitle { font-size: 14px; color: var(--muted-foreground, #6b7280); margin: 2px 0 0; }
    .planning-tabs {
      display: flex; gap: 6px; flex-wrap: wrap;
      background: var(--card); border: 1px solid var(--border);
      border-radius: 14px; padding: 6px;
    }
    .planning-tab {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 16px; border-radius: 10px;
      font-size: 14px; font-weight: 500; text-decoration: none;
      color: var(--foreground); cursor: pointer; transition: all 0.15s ease;
    }
    .planning-tab fa-icon { font-size: 15px; }
    .planning-tab:hover { background: var(--accent); }
    .planning-tab.active { background: #2563eb; color: #fff; }
    .planning-content { min-height: 200px; }
  `]
})
export class PlanejamentoComponent {
  faLightbulb = faLightbulb;

  tabs: PlanningTab[] = [
    { label: 'Resumo', path: 'dashboard', icon: faGaugeHigh },
    { label: 'Diagnóstico', path: 'diagnostico', icon: faLightbulb },
    { label: 'Plano de Redução', path: 'reducao', icon: faScissors },
    { label: 'Projeções', path: 'projecoes', icon: faChartLine },
    { label: 'Quitação de Dívidas', path: 'dividas', icon: faMoneyBillTrendUp },
    { label: 'Metas', path: 'metas', icon: faBullseye },
    { label: 'IA Financeira', path: 'ia', icon: faRobot }
  ];
}
