import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { FinancialReleaseService } from '../../services/financial-release/financial-release.service';
import { FinancialRelease, Category } from '../../models/financial-release';
import { FinancialItem } from '../../shared/components/financial-list/financial-list.component';

@Component({
  selector: 'app-despesas',
  templateUrl: './despesas.component.html',
  styleUrls: ['./despesas.component.scss']
})
export class DespesasComponent implements OnInit {
  searchQuery: string = '';
  isModalOpen: boolean = false;
  selectedMonth: Date = new Date(); // Mês atual
  isLoading: boolean = false;
  selectedRelease: FinancialRelease | null = null; // Despesa selecionada para edição

  financialReleases: FinancialRelease[] = [];
  categoriesMap: Map<number, string> = new Map();

  financialItems: FinancialItem[] = [];

  constructor(
    private financialReleaseService: FinancialReleaseService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;

    const selectedMonth = this.selectedMonth.getMonth() + 1; // getMonth retorna 0-11, backend espera 1-12
    const selectedYear = this.selectedMonth.getFullYear();

    forkJoin({
      categories: this.financialReleaseService.getCategories(),
      // Buscar apenas despesas do mês selecionado usando filtros do backend
      releases: this.financialReleaseService.getFinancialReleasesWithFilters({
        month: selectedMonth,
        year: selectedYear,
        type: 'expense',
        order_by: 'date',
        order_direction: 'desc'
      })
    }).subscribe({
      next: ({ categories, releases }) => {
        // Processar categorias primeiro
        this.categoriesMap.clear();
        categories.forEach(cat => {
          this.categoriesMap.set(cat.id, cat.title);
        });

        // Depois processar lançamentos (já filtrados por mês e tipo pelo backend)
        this.financialReleases = releases || [];
        this.processExpenses(this.financialReleases);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar dados:', error);
        this.isLoading = false;
        this.financialItems = [];
        this.financialReleases = [];
      }
    });
  }

  private processExpenses(releases: FinancialRelease[]): void {
    // Os dados já vêm filtrados por tipo 'expense' do backend
    // Mas vamos garantir que sejam apenas despesas (pode vir 'expense' ou 'despesa')
    const expenseReleases = releases.filter(r => {
      const type = String(r.type).toLowerCase();
      return type === 'despesa' || type === 'expense';
    });

    this.financialItems = expenseReleases.map(release => ({
      id: String(release.id),
      description: release.descrition || 'Sem descrição',
      category: this.getCategoryName(release.category_id),
      value: parseFloat(String(release.value)),
      date: release.date,
      is_paid: release.status ? release.status === 'paid' : !!release.payment_date,
      status: release.status || undefined,
      portion: release.portion || null,
      release_type: release.release_type || undefined,
      repetition: release.repetition || undefined,
      due_date: release.due_date || undefined,
      updated_at: release.updated_at || undefined
    }));
  }

  private getCategoryName(categoryId: number): string {
    return this.categoriesMap.get(categoryId) || 'Outros';
  }

  get filteredExpenses(): FinancialItem[] {
    // Os dados já vêm filtrados por mês do backend
    // Apenas aplicar filtro de busca por descrição
    if (!this.searchQuery || this.searchQuery.trim() === '') {
      return this.financialItems;
    }

    const query = this.searchQuery.toLowerCase().trim();
    return this.financialItems.filter(
      (item) =>
        item.description.toLowerCase().includes(query)
    );
  }

  // Verificar se não há despesas no mês (sem filtro de busca)
  get hasNoExpensesInMonth(): boolean {
    return this.financialItems.length === 0 && (!this.searchQuery || this.searchQuery.trim() === '');
  }

  // Verificar se a busca não encontrou resultados (mas pode haver despesas no mês)
  get searchHasNoResults(): boolean {
    return !!(this.searchQuery && this.searchQuery.trim() !== '' && this.filteredExpenses.length === 0);
  }

  get totalExpenses(): number {
    // Total do mês selecionado (apenas despesas, já filtradas pelo backend)
    // Excluir cancelados dos totais (mostrar na lista, mas não somar)
    return this.financialItems
      .filter(item => item.status !== 'cancelled')
      .reduce((sum, item) => sum + item.value, 0);
  }

  onMonthChanged(selectedMonth: Date): void {
    this.selectedMonth = selectedMonth;
    // Recarregar dados com o novo mês selecionado
    this.loadData();
  }

  onFabClick(): void {
    this.selectedRelease = null; // Criar novo lançamento
    this.isModalOpen = true;
  }

  onExpenseClick(item: FinancialItem): void {
    // Buscar o lançamento completo da lista de financialReleases
    const fullRelease = this.financialReleases.find(r => String(r.id) === item.id);
    if (fullRelease) {
      this.selectedRelease = fullRelease;
      this.isModalOpen = true;
    }
  }

  onCloseModal(): void {
    this.isModalOpen = false;
    this.selectedRelease = null; // Limpar despesa selecionada
  }

  onTransactionSaved(): void {
    this.loadData();
  }
}
