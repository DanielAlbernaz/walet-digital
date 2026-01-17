import { Component, Input } from '@angular/core';
import { faClock, faArrowTrendUp, faArrowTrendDown } from '@fortawesome/free-solid-svg-icons';

export interface Release {
  id: string;
  description: string;
  category: string;
  value: number;
  date: string;
  type: 'receita' | 'despesa';
  is_paid: boolean;
}

@Component({
  selector: 'app-recent-releases',
  templateUrl: './recent-releases.component.html',
  styleUrls: ['./recent-releases.component.scss']
})
export class RecentReleasesComponent {
  @Input() releases: Release[] = [];

  faClock = faClock;
  faArrowTrendUp = faArrowTrendUp;
  faArrowTrendDown = faArrowTrendDown;

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${date.getDate()} de ${months[date.getMonth()]}`;
  }

  isIncome(release: Release): boolean {
    return release.type === 'receita';
  }
}
