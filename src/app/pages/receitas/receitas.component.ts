import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { faArrowTrendUp, faSearch, faFilter, faChevronLeft, faChevronRight, faCalendar } from '@fortawesome/free-solid-svg-icons';
import { FinancialReleaseService } from '../../services/financial-release/financial-release.service';
import { FinancialRelease, Category } from '../../models/financial-release';

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
export class ReceitasComponent implements OnInit {
  searchQuery: string = '';
  isModalOpen: boolean = false;
  selectedMonth: Date = new Date(); // Mês atual
  isLoading: boolean = false;

  financialReleases: FinancialRelease[] = [];
  categoriesMap: Map<number, string> = new Map();

  faArrowTrendUp = faArrowTrendUp;
  faSearch = faSearch;
  faFilter = faFilter;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faCalendar = faCalendar;

  incomes: Income[] = [];

  constructor(
    private financialReleaseService: FinancialReleaseService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    
    forkJoin({
      categories: this.financialReleaseService.getCategories(),
      releases: this.financialReleaseService.getFinancialReleases()
    }).subscribe({
      next: ({ categories, releases }) => {
        // Processar categorias primeiro
        this.categoriesMap.clear();
        categories.forEach(cat => {
          this.categoriesMap.set(cat.id, cat.title);
        });
        
        // Depois processar lançamentos
        this.financialReleases = releases;
        this.processIncomes(releases);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar dados:', error);
        this.isLoading = false;
        this.incomes = [];
      }
    });
  }

  private processIncomes(releases: FinancialRelease[]): void {
    // Filtrar apenas receitas
    const incomeReleases = releases.filter(r => r.type === 'receita');
    
    this.incomes = incomeReleases.map(release => ({
      id: String(release.id),
      description: release.descrition || 'Sem descrição',
      category: this.getCategoryName(release.category_id),
      value: parseFloat(String(release.value)),
      date: release.date,
      is_paid: release.status ? release.status === 'paid' : !!release.payment_date
    }));
  }

  private getCategoryName(categoryId: number): string {
    return this.categoriesMap.get(categoryId) || 'Outros';
  }

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

  onTransactionSaved(): void {
    this.loadData();
  }
}
