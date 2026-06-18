import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FinancialRelease } from '../../../models/financial-release';
import { faArrowTrendUp, faArrowTrendDown, faCheckCircle, faClock } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-filter-summary',
  templateUrl: './filter-summary.component.html',
  styleUrls: ['./filter-summary.component.css']
})
export class FilterSummaryComponent implements OnChanges {
  @Input() releases: FinancialRelease[] = [];
  @Input() type: 'receita' | 'despesa' = 'receita';

  faArrowTrendUp = faArrowTrendUp;
  faArrowTrendDown = faArrowTrendDown;
  faCheckCircle = faCheckCircle;
  faClock = faClock;

  totalValue: number = 0;
  paidValue: number = 0;
  pendingValue: number = 0;
  overdueValue: number = 0;

  totalCount: number = 0;
  paidCount: number = 0;
  pendingCount: number = 0;
  overdueCount: number = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['releases']) {
      this.calculateSummary();
    }
  }

  private calculateSummary(): void {
    // Verificar se está pago: status === 'paid' ou tem payment_date
    const paidReleases = this.releases.filter(r => {
      if (r.status === 'cancelled') return false;
      return r.status === 'paid' || !!r.payment_date;
    });

    // Pendentes: não pagos e data >= hoje
    const pendingReleases = this.releases.filter(r => {
      if (r.status === 'cancelled') return false;
      const isPaid = r.status === 'paid' || !!r.payment_date;
      if (isPaid) return false;
      const releaseDate = new Date(r.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      releaseDate.setHours(0, 0, 0, 0);
      return releaseDate >= today;
    });

    // Vencidos: não pagos e data < hoje
    const overdueReleases = this.releases.filter(r => {
      if (r.status === 'cancelled') return false;
      const isPaid = r.status === 'paid' || !!r.payment_date;
      if (isPaid) return false;
      const releaseDate = new Date(r.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      releaseDate.setHours(0, 0, 0, 0);
      return releaseDate < today;
    });

    this.totalValue = this.releases
      .filter(r => r.status !== 'cancelled')
      .reduce((sum, r) => {
        const value = parseFloat(String(r.value || 0));
        return sum + (isNaN(value) ? 0 : value);
      }, 0);

    this.paidValue = paidReleases.reduce((sum, r) => {
      const value = parseFloat(String(r.value || 0));
      return sum + (isNaN(value) ? 0 : value);
    }, 0);

    this.pendingValue = pendingReleases.reduce((sum, r) => {
      const value = parseFloat(String(r.value || 0));
      return sum + (isNaN(value) ? 0 : value);
    }, 0);

    this.overdueValue = overdueReleases.reduce((sum, r) => {
      const value = parseFloat(String(r.value || 0));
      return sum + (isNaN(value) ? 0 : value);
    }, 0);

    this.totalCount = this.releases.filter(r => r.status !== 'cancelled').length;
    this.paidCount = paidReleases.length;
    this.pendingCount = pendingReleases.length;
    this.overdueCount = overdueReleases.length;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  get isIncome(): boolean {
    return this.type === 'receita';
  }

  get mainIcon(): any {
    return this.isIncome ? this.faArrowTrendUp : this.faArrowTrendDown;
  }

  get mainColorClass(): string {
    return this.isIncome ? 'text-success' : 'text-destructive';
  }

  get mainBgClass(): string {
    return this.isIncome ? 'bg-success-light' : 'bg-destructive-light';
  }

  get paidLabel(): string {
    return this.isIncome ? 'Recebido' : 'Pago';
  }
}
