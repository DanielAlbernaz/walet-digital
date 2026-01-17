import { Component } from '@angular/core';
import { faArrowTrendUp, faSearch, faFilter, faChevronLeft, faChevronRight, faCalendar } from '@fortawesome/free-solid-svg-icons';

export interface Income {
  id: string;
  description: string;
  category: string;
  value: number;
  date: string;
  is_paid: boolean;
}

@Component({
  selector: 'app-receitas',
  templateUrl: './receitas.component.html',
  styleUrls: ['./receitas.component.scss']
})
export class ReceitasComponent {
  searchQuery: string = '';
  isModalOpen: boolean = false;
  selectedMonth: Date = new Date(2026, 0, 1); // Janeiro 2026

  faArrowTrendUp = faArrowTrendUp;
  faSearch = faSearch;
  faFilter = faFilter;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faCalendar = faCalendar;

  incomes: Income[] = [
    {
      id: '1',
      description: 'Salário',
      category: 'Salário',
      value: 8500.00,
      date: '2026-01-17',
      is_paid: true,
    },
    {
      id: '2',
      description: 'Projeto Freelance',
      category: 'Freelance',
      value: 1500.00,
      date: '2026-01-17',
      is_paid: true,
    },
    {
      id: '3',
      description: 'Salário',
      category: 'Salário',
      value: 8500.00,
      date: '2026-02-17',
      is_paid: true,
    },
    {
      id: '4',
      description: 'Projeto Freelance',
      category: 'Freelance',
      value: 2000.00,
      date: '2026-02-20',
      is_paid: true,
    },
  ];

  getMonthYear(): string {
    const months = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    return `${months[this.selectedMonth.getMonth()]} de ${this.selectedMonth.getFullYear()}`;
  }

  getMonthFilteredIncomes(): Income[] {
    const year = this.selectedMonth.getFullYear();
    const month = this.selectedMonth.getMonth() + 1; // getMonth() retorna 0-11
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;

    return this.incomes.filter(income =>
      income.date.startsWith(monthStr)
    );
  }

  get filteredIncomes(): Income[] {
    const monthFiltered = this.getMonthFilteredIncomes();

    if (!this.searchQuery) {
      return monthFiltered;
    }

    const query = this.searchQuery.toLowerCase();
    return monthFiltered.filter(
      (income) =>
        income.description.toLowerCase().includes(query) ||
        income.category.toLowerCase().includes(query)
    );
  }

  get totalIncome(): number {
    return this.filteredIncomes.reduce((sum, income) => sum + income.value, 0);
  }

  prevMonth(): void {
    this.selectedMonth = new Date(
      this.selectedMonth.getFullYear(),
      this.selectedMonth.getMonth() - 1,
      1
    );
  }

  nextMonth(): void {
    this.selectedMonth = new Date(
      this.selectedMonth.getFullYear(),
      this.selectedMonth.getMonth() + 1,
      1
    );
  }

  currentMonthClick(): void {
    this.selectedMonth = new Date();
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
