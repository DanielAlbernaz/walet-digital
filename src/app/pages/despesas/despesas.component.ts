import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { faArrowTrendDown, faSearch, faFilter } from '@fortawesome/free-solid-svg-icons';
import { FinancialReleaseService } from '../../services/financial-release/financial-release.service';
import { FinancialRelease, Category } from '../../models/financial-release';

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
export class DespesasComponent implements OnInit {
  searchQuery: string = '';
  isModalOpen: boolean = false;
  isLoading: boolean = false;

  financialReleases: FinancialRelease[] = [];
  categoriesMap: Map<number, string> = new Map();

  faArrowTrendDown = faArrowTrendDown;
  faSearch = faSearch;
  faFilter = faFilter;

  expenses: Expense[] = [];

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
        this.processExpenses(releases);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar dados:', error);
        this.isLoading = false;
        this.expenses = [];
      }
    });
  }

  private processExpenses(releases: FinancialRelease[]): void {
    // Filtrar apenas despesas
    const expenseReleases = releases.filter(r => r.type === 'despesa');
    
    this.expenses = expenseReleases.map(release => ({
      id: String(release.id),
      description: release.descrition || 'Sem descrição',
      category: this.getCategoryName(release.category_id),
      value: parseFloat(String(release.value)),
      date: release.date,
      is_paid: release.status ? release.status === 'paid' : !!release.payment_date,
      portion: release.portion || undefined
    }));
  }

  private getCategoryName(categoryId: number): string {
    return this.categoriesMap.get(categoryId) || 'Outros';
  }

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

  onTransactionSaved(): void {
    this.loadData();
  }
}
