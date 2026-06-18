import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { FinancialReleaseService } from '../../services/financial-release/financial-release.service';
import { PaymentMethodService } from '../../services/payment-method/payment-method.service';
import { FinancialRelease, Category, BulkUpdateRequest } from '../../models/financial-release';
import { PaymentMethod } from '../../models/payment-method.model';
import { FinancialItem } from '../../shared/components/financial-list/financial-list.component';
import { FilterState, SortState } from '../../shared/components/advanced-filters/advanced-filters.component';

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
  selectedRelease: FinancialRelease | null = null; // Receita selecionada para edição

  financialReleases: FinancialRelease[] = [];
  categoriesMap: Map<number, string> = new Map();
  categories: Category[] = [];
  paymentMethods: PaymentMethod[] = [];

  financialItems: FinancialItem[] = [];
  selectedIds: string[] = [];
  isLoadingBulk: boolean = false;

  // Getter para filtrar categorias de receitas
  get incomeCategories(): Category[] {
    return this.categories.filter(c => c.type === 'revenue' || c.type === 'receita');
  }

  filters: FilterState = this.getInitialFilters();
  sort: SortState = { field: 'date', direction: 'desc' };

  constructor(
    private financialReleaseService: FinancialReleaseService,
    private paymentMethodService: PaymentMethodService,
    private toastr: ToastrService
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
      paymentMethods: this.paymentMethodService.list(),
      // Buscar apenas receitas do mês selecionado usando filtros do backend
      releases: this.financialReleaseService.getFinancialReleasesWithFilters({
        month: selectedMonth,
        year: selectedYear,
        type: 'revenue',
        order_by: 'date',
        order_direction: 'desc'
      })
    }).subscribe({
      next: ({ categories, paymentMethods, releases }) => {
        // Processar categorias primeiro
        this.categories = categories || [];
        this.categoriesMap.clear();
        categories.forEach(cat => {
          this.categoriesMap.set(cat.id, cat.title);
        });

        // Métodos de pagamento
        this.paymentMethods = paymentMethods || [];

        // Depois processar lançamentos (já filtrados por mês e tipo pelo backend)
        this.financialReleases = releases || [];
        this.processIncomes(this.financialReleases);
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

  private processIncomes(releases: FinancialRelease[]): void {
    // Os dados já vêm filtrados por tipo 'revenue' do backend
    // Mas vamos garantir que sejam apenas receitas (pode vir 'revenue' ou 'receita')
    const incomeReleases = releases.filter(r => {
      const type = String(r.type).toLowerCase();
      return type === 'receita' || type === 'revenue';
    });

    this.financialItems = incomeReleases.map(release => ({
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

  get filteredIncomes(): FinancialItem[] {
    let result = [...this.financialItems];

    // Aplicar filtros avançados
    result = this.applyFilters(result);

    // Aplicar ordenação
    result = this.applySort(result);

    return result;
  }

  private applyFilters(items: FinancialItem[]): FinancialItem[] {
    let filtered = [...items];

    // Filtro de busca (search)
    if (this.filters.search) {
      const searchLower = this.filters.search.toLowerCase();
      filtered = filtered.filter(item => {
        const release = this.financialReleases.find(r => String(r.id) === item.id);
        const categoryName = release ? this.getCategoryName(release.category_id) : '';
        const description = item.description?.toLowerCase() || '';
        const observation = release?.observation?.toLowerCase() || '';
        return description.includes(searchLower) ||
               categoryName.toLowerCase().includes(searchLower) ||
               observation.includes(searchLower);
      });
    }

    // Filtro de data de competência
    if (this.filters.dateFrom || this.filters.dateTo) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.date);
        if (this.filters.dateFrom) {
          const fromDate = new Date(this.filters.dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (itemDate < fromDate) return false;
        }
        if (this.filters.dateTo) {
          const toDate = new Date(this.filters.dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (itemDate > toDate) return false;
        }
        return true;
      });
    }

    // Filtro de status
    if (this.filters.status !== 'all') {
      filtered = filtered.filter(item => {
        switch (this.filters.status) {
          case 'paid':
            return item.status === 'paid' || item.is_paid;
          case 'pending':
            return (item.status !== 'paid' && !item.is_paid) && new Date(item.date) >= new Date();
          case 'overdue':
            return (item.status !== 'paid' && !item.is_paid) && new Date(item.date) < new Date();
          default:
            return true;
        }
      });
    }

    // Filtro de categoria
    if (this.filters.categoryId !== 'all') {
      const categoryId = parseInt(this.filters.categoryId);
      filtered = filtered.filter(item => {
        const release = this.financialReleases.find(r => String(r.id) === item.id);
        return release?.category_id === categoryId;
      });
    }

    // Filtro de método de pagamento
    if (this.filters.paymentMethodId !== 'all') {
      const methodId = parseInt(this.filters.paymentMethodId);
      filtered = filtered.filter(item => {
        const release = this.financialReleases.find(r => String(r.id) === item.id);
        return release?.payment_method_id === methodId;
      });
    }

    // Filtro de tipo de lançamento (parcelado/avulso)
    if (this.filters.hasInstallment !== 'all') {
      filtered = filtered.filter(item => {
        const isInstallment = item.release_type === 'installment' ||
                             (item.repetition === 'parcelado' || item.repetition === 'installments');
        return this.filters.hasInstallment === 'installment' ? isInstallment : !isInstallment;
      });
    }

    // Filtro de faixa de valor
    if (this.filters.valueMin || this.filters.valueMax) {
      const min = this.filters.valueMin ? parseFloat(this.filters.valueMin) : 0;
      const max = this.filters.valueMax ? parseFloat(this.filters.valueMax) : Infinity;
      filtered = filtered.filter(item => item.value >= min && item.value <= max);
    }

    return filtered;
  }

  private applySort(items: FinancialItem[]): FinancialItem[] {
    const sorted = [...items];

    sorted.sort((a, b) => {
      let comparison = 0;
      switch (this.sort.field) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'value':
          comparison = a.value - b.value;
          break;
        case 'status':
          const aStatus = a.status === 'paid' || a.is_paid ? 1 : 0;
          const bStatus = b.status === 'paid' || b.is_paid ? 1 : 0;
          comparison = aStatus - bStatus;
          break;
      }
      return this.sort.direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  private getCategoryNameById(id: string): string {
    // Buscar o release pelo id do FinancialItem
    const release = this.financialReleases.find(r => String(r.id) === id);
    return release ? this.getCategoryName(release.category_id) : '';
  }

  getInitialFilters(): FilterState {
    return {
      search: '',
      dateFrom: null,
      dateTo: null,
      paymentDateFrom: null,
      paymentDateTo: null,
      status: 'all',
      categoryId: 'all',
      paymentMethodId: 'all',
      hasInstallment: 'all',
      valueMin: '',
      valueMax: ''
    };
  }

  onFiltersChange(filters: FilterState): void {
    this.filters = filters;
  }

  onSortChange(sort: SortState): void {
    this.sort = sort;
  }

  // Verificar se não há receitas no mês (sem filtros avançados)
  get hasNoIncomesInMonth(): boolean {
    return this.financialItems.length === 0 &&
           !this.filters.search &&
           this.filters.status === 'all' &&
           this.filters.categoryId === 'all';
  }

  // Verificar se os filtros não encontram resultados
  get searchHasNoResults(): boolean {
    const hasActiveFilters = !!(this.filters.search ||
                            this.filters.status !== 'all' ||
                            this.filters.categoryId !== 'all' ||
                            this.filters.dateFrom ||
                            this.filters.dateTo ||
                            this.filters.paymentMethodId !== 'all' ||
                            this.filters.hasInstallment !== 'all' ||
                            this.filters.valueMin ||
                            this.filters.valueMax);
    return hasActiveFilters && this.filteredIncomes.length === 0;
  }

  get totalIncome(): number {
    // Total do mês selecionado (apenas receitas, já filtradas pelo backend)
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

  onIncomeClick(item: FinancialItem): void {
    // Buscar o lançamento completo da lista de financialReleases
    const fullRelease = this.financialReleases.find(r => String(r.id) === item.id);
    if (fullRelease) {
      this.selectedRelease = fullRelease;
      this.isModalOpen = true;
    }
  }

  onCloseModal(): void {
    this.isModalOpen = false;
    this.selectedRelease = null; // Limpar receita selecionada
  }

  onTransactionSaved(): void {
    this.loadData();
  }

  onSelectionChange(ids: string[]): void {
    this.selectedIds = ids;
  }

  onCancelSelection(): void {
    this.selectedIds = [];
  }

  private runBulkUpdate(payload: BulkUpdateRequest): void {
    if (payload.ids.length === 0) return;
    this.isLoadingBulk = true;
    this.financialReleaseService.bulkUpdate(payload).subscribe({
      next: (res) => {
        this.isLoadingBulk = false;
        this.selectedIds = [];
        this.loadData();
        if (res?.message) {
          this.toastr.success(res.message, 'Sucesso');
        }
      },
      error: () => {
        this.isLoadingBulk = false;
        this.toastr.error('Erro ao atualizar lançamentos. Tente novamente.', 'Erro');
      }
    });
  }

  onBulkMarkAsPaid(): void {
    const ids = this.selectedIds.map(id => parseInt(id, 10)).filter(n => !isNaN(n));
    if (ids.length === 0) return;
    this.runBulkUpdate({ ids, status: 'paid' });
  }

  onBulkMarkAsPaidWithDate(date: string): void {
    const ids = this.selectedIds.map(id => parseInt(id, 10)).filter(n => !isNaN(n));
    if (ids.length === 0 || !date) return;
    this.runBulkUpdate({ ids, status: 'paid', payment_date: date });
  }

  onBulkChangeCategory(categoryId: number): void {
    const ids = this.selectedIds.map(id => parseInt(id, 10)).filter(n => !isNaN(n));
    if (ids.length === 0) return;
    this.runBulkUpdate({ ids, category_id: categoryId });
  }

  onBulkChangePaymentMethod(paymentMethodId: number | null): void {
    const ids = this.selectedIds.map(id => parseInt(id, 10)).filter(n => !isNaN(n));
    if (ids.length === 0) return;
    this.runBulkUpdate({ ids, payment_method_id: paymentMethodId });
  }

  // Método auxiliar para fornecer releases para o FilterSummary
  // Retorna os releases originais que correspondem aos filteredIncomes após aplicar filtros
  getFilteredReleasesForSummary(): FinancialRelease[] {
    // Aplicar os mesmos filtros que filteredIncomes usa
    let releases = [...this.financialReleases];

    // Converter FinancialRelease[] para FinancialItem[], aplicar filtros e voltar
    const tempItems = releases.map(release => ({
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

    const filteredItems = this.applyFilters(tempItems);
    const filteredIds = filteredItems.map(item => parseInt(item.id));
    return releases.filter(r => filteredIds.includes(r.id || 0));
  }
}
