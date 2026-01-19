import { Component, Input } from '@angular/core';
import { faArrowTrendUp, faArrowTrendDown } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-financial-page-header',
  templateUrl: './financial-page-header.component.html',
  styleUrls: ['./financial-page-header.component.css']
})
export class FinancialPageHeaderComponent {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() total: number = 0;
  @Input() type: 'receita' | 'despesa' = 'receita'; // Para diferenciar cores/ícones
  @Input() showTotal?: boolean; // Opcional: controla se mostra o total (default: true)

  faArrowTrendUp = faArrowTrendUp;
  faArrowTrendDown = faArrowTrendDown;

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }
}
