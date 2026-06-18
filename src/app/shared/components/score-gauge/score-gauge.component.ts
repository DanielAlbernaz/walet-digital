import { Component, Input } from '@angular/core';
import { ScoreBand, SCORE_BAND_LABEL } from '../../../models/planning/planning.model';

@Component({
  selector: 'app-score-gauge',
  template: `
    <div class="gauge" [style.--gauge-color]="color">
      <svg viewBox="0 0 120 120" class="gauge-svg">
        <circle class="gauge-track" cx="60" cy="60" r="52"></circle>
        <circle
          class="gauge-progress"
          cx="60" cy="60" r="52"
          [attr.stroke-dasharray]="circumference"
          [attr.stroke-dashoffset]="dashOffset">
        </circle>
      </svg>
      <div class="gauge-center">
        <span class="gauge-value">{{ score }}</span>
        <span class="gauge-max">/100</span>
      </div>
      <span class="gauge-band" [style.color]="color">{{ bandLabel }}</span>
    </div>
  `,
  styles: [`
    .gauge {
      position: relative;
      width: 160px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .gauge-svg {
      width: 140px;
      height: 140px;
      transform: rotate(-90deg);
    }
    .gauge-track {
      fill: none;
      stroke: var(--border, #e5e7eb);
      stroke-width: 10;
    }
    .gauge-progress {
      fill: none;
      stroke: var(--gauge-color, #2563eb);
      stroke-width: 10;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.6s ease;
    }
    .gauge-center {
      position: absolute;
      top: 56px;
      left: 0;
      width: 140px;
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 2px;
    }
    .gauge-value {
      font-size: 34px;
      font-weight: 700;
      color: var(--foreground, #111827);
    }
    .gauge-max {
      font-size: 14px;
      color: var(--muted-foreground, #6b7280);
    }
    .gauge-band {
      margin-top: 4px;
      font-size: 14px;
      font-weight: 600;
    }
  `]
})
export class ScoreGaugeComponent {
  @Input() score: number = 0;
  @Input() band: ScoreBand = 'attention';

  readonly circumference = 2 * Math.PI * 52;

  get dashOffset(): number {
    const pct = Math.max(0, Math.min(100, this.score)) / 100;
    return this.circumference * (1 - pct);
  }

  get bandLabel(): string {
    return SCORE_BAND_LABEL[this.band];
  }

  get color(): string {
    switch (this.band) {
      case 'excellent': return '#16a34a';
      case 'good': return '#22c55e';
      case 'attention': return '#f59e0b';
      case 'critical': return '#f97316';
      case 'emergency': return '#dc2626';
    }
  }
}
