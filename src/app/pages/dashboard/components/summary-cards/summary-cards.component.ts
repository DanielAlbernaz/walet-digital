import { Component, Input } from '@angular/core';
import { 
  faArrowTrendUp, 
  faArrowTrendDown, 
  faWallet 
} from '@fortawesome/free-solid-svg-icons';

interface SummaryCard {
  title: string;
  value: number;
  icon: any;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

@Component({
  selector: 'app-summary-cards',
  templateUrl: './summary-cards.component.html',
  styleUrls: ['./summary-cards.component.scss']
})
export class SummaryCardsComponent {
  @Input() totalIncome: number = 10000.00;
  @Input() totalExpenses: number = 2949.90;
  @Input() balance: number = 7050.10;

  faArrowTrendUp = faArrowTrendUp;
  faArrowTrendDown = faArrowTrendDown;
  faWallet = faWallet;

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  get cards(): SummaryCard[] {
    return [
      {
        title: 'Total de Receitas',
        value: this.totalIncome,
        icon: this.faArrowTrendUp,
        colorClass: 'text-success',
        bgClass: 'bg-success-light',
        borderClass: 'border-success-20',
      },
      {
        title: 'Total de Despesas',
        value: this.totalExpenses,
        icon: this.faArrowTrendDown,
        colorClass: 'text-destructive',
        bgClass: 'bg-destructive-light',
        borderClass: 'border-destructive-20',
      },
      {
        title: 'Saldo do Mês',
        value: this.balance,
        icon: this.faWallet,
        colorClass: this.balance >= 0 ? 'text-primary' : 'text-destructive',
        bgClass: this.balance >= 0 ? 'bg-primary-lighter' : 'bg-destructive-light',
        borderClass: this.balance >= 0 ? 'border-primary-20' : 'border-destructive-20',
      },
    ];
  }
}
