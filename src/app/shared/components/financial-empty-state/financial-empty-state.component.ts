import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IconDefinition, faArrowTrendUp, faArrowTrendDown, faSearch } from '@fortawesome/free-solid-svg-icons';

export type EmptyStateType = 'no-items' | 'no-results';

@Component({
  selector: 'app-financial-empty-state',
  templateUrl: './financial-empty-state.component.html',
  styleUrls: ['./financial-empty-state.component.css']
})
export class FinancialEmptyStateComponent {
  @Input() type: 'receita' | 'despesa' = 'receita';
  @Input() emptyStateType: EmptyStateType = 'no-items'; // 'no-items' ou 'no-results'
  @Output() addClick = new EventEmitter<void>();

  faArrowTrendUp = faArrowTrendUp;
  faArrowTrendDown = faArrowTrendDown;
  faSearch = faSearch;

  get icon(): IconDefinition {
    if (this.emptyStateType === 'no-results') {
      return this.faSearch;
    }
    return this.type === 'receita' ? this.faArrowTrendUp : this.faArrowTrendDown;
  }

  get message(): string {
    if (this.emptyStateType === 'no-results') {
      return `Nenhuma ${this.type === 'receita' ? 'receita' : 'despesa'} encontrada com os parâmetros de busca`;
    }
    return `Nenhuma ${this.type === 'receita' ? 'receita' : 'despesa'} encontrada neste mês`;
  }

  get buttonLabel(): string {
    return `Adicionar ${this.type === 'receita' ? 'Receita' : 'Despesa'}`;
  }

  get showButton(): boolean {
    return this.emptyStateType === 'no-items';
  }

  onAddClick(): void {
    this.addClick.emit();
  }
}
