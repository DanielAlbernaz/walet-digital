import { Component, OnInit } from '@angular/core';
import { faScissors, faCheck, faXmark, faTag, faRepeat } from '@fortawesome/free-solid-svg-icons';
import { ToastrService } from 'ngx-toastr';
import { PlanningService } from '../../../services/planning/planning.service';
import { ReductionItem, ReductionPlan } from '../../../models/planning/planning.model';
import { formatBRL } from '../../../services/planning/planning.util';

@Component({
  selector: 'app-plano-reducao',
  template: `
    <app-loading-overlay [isLoading]="isLoading"></app-loading-overlay>

    <div class="reduction" *ngIf="data">
      <div class="totals-banner">
        <div>
          <span class="totals-label">Economia total possível</span>
          <div class="totals-values">
            <span class="totals-month">{{ brl(acceptedMonthly) }}<small>/mês</small></span>
            <span class="totals-year">{{ brl(acceptedMonthly * 12) }}<small>/ano</small></span>
          </div>
        </div>
        <button type="button" class="btn-save" (click)="save()" [disabled]="acceptedCount === 0">
          <fa-icon [icon]="faCheck"></fa-icon> Aplicar plano ({{ acceptedCount }})
        </button>
      </div>

      <div class="card">
        <h3 class="card-title"><fa-icon [icon]="faTag"></fa-icon> Categorias</h3>
        <div class="item" *ngFor="let item of categories" [class.dismissed]="item.status === 'dismissed'">
          <div class="item-main">
            <span class="item-label">{{ item.label }}</span>
            <span class="item-rec" *ngIf="item.recommendation">{{ item.recommendation }}</span>
          </div>
          <div class="item-values">
            <span class="from">{{ brl(item.current) }}</span>
            <span class="arrow">→</span>
            <span class="to">{{ brl(item.target) }}</span>
            <span class="saving">economia {{ brl(item.monthlySaving) }}</span>
          </div>
          <div class="item-actions">
            <button class="btn-accept" [class.on]="item.status === 'accepted'" (click)="accept(item)"><fa-icon [icon]="faCheck"></fa-icon></button>
            <button class="btn-dismiss" [class.on]="item.status === 'dismissed'" (click)="dismiss(item)"><fa-icon [icon]="faXmark"></fa-icon></button>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title"><fa-icon [icon]="faRepeat"></fa-icon> Assinaturas</h3>
        <div class="item" *ngFor="let item of subscriptions" [class.dismissed]="item.status === 'dismissed'">
          <div class="item-main">
            <span class="item-label">{{ item.label }}</span>
            <span class="item-rec">{{ item.recommendation || 'Recomendado cancelar.' }}</span>
          </div>
          <div class="item-values">
            <span class="from">{{ brl(item.current) }}/mês</span>
            <span class="saving">{{ brl(item.monthlySaving * 12) }}/ano</span>
          </div>
          <div class="item-actions">
            <button class="btn-accept" [class.on]="item.status === 'accepted'" (click)="accept(item)"><fa-icon [icon]="faCheck"></fa-icon></button>
            <button class="btn-dismiss" [class.on]="item.status === 'dismissed'" (click)="dismiss(item)"><fa-icon [icon]="faXmark"></fa-icon></button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reduction { display: flex; flex-direction: column; gap: 16px; }
    .totals-banner {
      display: flex; justify-content: space-between; align-items: center;
      background: linear-gradient(90deg, rgba(22,163,74,0.10), rgba(34,197,94,0.06));
      border: 1px solid rgba(22,163,74,0.30); border-radius: 14px; padding: 18px;
    }
    .totals-label { font-size: 13px; color: var(--muted-foreground, #6b7280); }
    .totals-values { display: flex; gap: 20px; align-items: baseline; margin-top: 4px; }
    .totals-month { font-size: 26px; font-weight: 800; color: #16a34a; }
    .totals-year { font-size: 18px; font-weight: 600; color: #15803d; }
    .totals-values small { font-size: 13px; font-weight: 500; opacity: 0.8; }
    .btn-save { display: inline-flex; align-items: center; gap: 8px; padding: 12px 18px; border: none; border-radius: 12px; background: #16a34a; color: #fff; font-weight: 600; cursor: pointer; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 18px; }
    .card-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; color: var(--foreground); margin: 0 0 14px; }
    .item { display: flex; align-items: center; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--border); }
    .item:last-child { border-bottom: none; }
    .item.dismissed { opacity: 0.45; }
    .item-main { flex: 1; display: flex; flex-direction: column; }
    .item-label { font-weight: 600; color: var(--foreground); }
    .item-rec { font-size: 12px; color: var(--muted-foreground, #6b7280); }
    .item-values { display: flex; align-items: center; gap: 10px; font-size: 14px; }
    .from { color: var(--muted-foreground, #6b7280); text-decoration: line-through; }
    .arrow { color: var(--muted-foreground, #6b7280); }
    .to { font-weight: 600; color: var(--foreground); }
    .saving { color: #16a34a; font-weight: 600; }
    .item-actions { display: flex; gap: 6px; }
    .btn-accept, .btn-dismiss { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--border); background: transparent; cursor: pointer; }
    .btn-accept.on { background: #16a34a; color: #fff; border-color: #16a34a; }
    .btn-dismiss.on { background: #dc2626; color: #fff; border-color: #dc2626; }
    @media (max-width: 700px) { .item { flex-wrap: wrap; } }
  `]
})
export class PlanoReducaoComponent implements OnInit {
  faScissors = faScissors;
  faCheck = faCheck;
  faXmark = faXmark;
  faTag = faTag;
  faRepeat = faRepeat;

  isLoading = false;
  data: ReductionPlan | null = null;

  constructor(private planningService: PlanningService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.planningService.getReductionPlan().subscribe({
      next: (d) => {
        // Por padrão tudo sugerido vem como "accepted" para mostrar o potencial total.
        d.items.forEach(i => i.status = i.status || 'accepted');
        this.data = d;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  get categories(): ReductionItem[] { return this.data?.items.filter(i => i.kind === 'category') || []; }
  get subscriptions(): ReductionItem[] { return this.data?.items.filter(i => i.kind === 'subscription') || []; }

  get acceptedMonthly(): number {
    return (this.data?.items || []).filter(i => i.status === 'accepted').reduce((s, i) => s + i.monthlySaving, 0);
  }
  get acceptedCount(): number {
    return (this.data?.items || []).filter(i => i.status === 'accepted').length;
  }

  accept(item: ReductionItem): void { item.status = 'accepted'; }
  dismiss(item: ReductionItem): void { item.status = 'dismissed'; }

  brl(value: number): string { return formatBRL(value); }

  save(): void {
    const ids = (this.data?.items || []).filter(i => i.status === 'accepted' && i.id).map(i => i.id!);
    this.planningService.saveReductionPlan(ids).subscribe({
      next: () => this.toastr.success('Plano de redução aplicado! Economia de ' + this.brl(this.acceptedMonthly) + '/mês.', 'Planejamento'),
      error: () => this.toastr.error('Não foi possível salvar o plano.', 'Erro')
    });
  }
}
