import { Component } from '@angular/core';
import { faArrowTrendDown, faSearch, faFilter } from '@fortawesome/free-solid-svg-icons';

export interface Expense {
  id: string;
  description: string;
  category: string;
  value: number;
  date: string;
  is_paid: boolean;
  portion?: string;
}

@Component({
  selector: 'app-despesas',
  templateUrl: './despesas.component.html',
  styleUrls: ['./despesas.component.scss']
})
export class DespesasComponent {
  searchQuery: string = '';
  isModalOpen: boolean = false;

  faArrowTrendDown = faArrowTrendDown;
  faSearch = faSearch;
  faFilter = faFilter;

  expenses: Expense[] = [
    {
      id: '1',
      description: 'Aluguel',
      category: 'Aluguel',
      value: 1500.00,
      date: '2026-01-17',
      is_paid: true,
    },
    {
      id: '2',
      description: 'Netflix + Spotify + iCloud',
      category: 'Contas Fixas',
      value: 450.00,
      date: '2026-01-17',
      is_paid: false,
    },
    {
      id: '3',
      description: 'iPhone 15 - Parcela',
      category: 'Cartão de Crédito',
      value: 299.90,
      date: '2026-01-17',
      is_paid: false,
      portion: '3/12',
    },
  ];

  get filteredExpenses(): Expense[] {
    if (!this.searchQuery) {
      return this.expenses;
    }
    const query = this.searchQuery.toLowerCase();
    return this.expenses.filter(
      (expense) =>
        expense.description.toLowerCase().includes(query) ||
        expense.category.toLowerCase().includes(query)
    );
  }

  get totalExpenses(): number {
    return this.filteredExpenses.reduce((sum, expense) => sum + expense.value, 0);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate();
    const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const month = monthNames[date.getMonth()];
    return `${day} de ${month}`;
  }

  onFabClick(): void {
    this.isModalOpen = true;
  }

  onCloseModal(): void {
    this.isModalOpen = false;
  }
}
