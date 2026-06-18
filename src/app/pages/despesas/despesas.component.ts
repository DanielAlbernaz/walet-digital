import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { FinancialReleaseService } from '../../services/financial-release/financial-release.service';
import { PaymentMethodService } from '../../services/payment-method/payment-method.service';
import { FinancialRelease, Category, BulkUpdateRequest } from '../../models/financial-release';
import { PaymentMethod } from '../../models/payment-method.model';
import { FinancialItem } from '../../shared/components/financial-list/financial-list.component';
import { FilterState, SortState } from '../../shared/components/advanced-filters/advanced-filters.component';
import {
  faFileImport,
  faFilePdf,
  faFileExcel,
  faFileCsv,
  faFileExport,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import {
  FinancialExportService,
  ExportColumn,
  ExportRow,
  ExportMeta
} from '../../services/financial-export/financial-export.service';

@Component({
  selector: 'app-despesas',
  templateUrl: './despesas.component.html',
  styleUrls: ['./despesas.component.scss']
})
export class DespesasComponent implements OnInit {
  searchQuery: string = '';
  isModalOpen: boolean = false;
  isOfxImportOpen: boolean = false;
  isPdfImportOpen: boolean = false;
  faFileImport = faFileImport;
  faFilePdf = faFilePdf;
  faFileExcel = faFileExcel;
  faFileCsv = faFileCsv;
  faFileExport = faFileExport;
  faChevronDown = faChevronDown;
  isExportMenuOpen: boolean = false;
  selectedMonth: Date = new Date(); // Mês atual
  isLoading: boolean = false;
  selectedRelease: FinancialRelease | null = null; // Despesa selecionada para edição

  financialReleases: FinancialRelease[] = [];
  categoriesMap: Map<number, string> = new Map();
  categories: Category[] = [];
  paymentMethods: PaymentMethod[] = [];

  financialItems: FinancialItem[] = [];
  selectedIds: string[] = [];
  isLoadingBulk: boolean = false;

  // Getter para filtrar categorias de despesas
  get expenseCategories(): Category[] {
    return this.categories.filter(c => c.type === 'expense' || c.type === 'despesa');
  }

  filters: FilterState = this.getInitialFilters();
  sort: SortState = { field: 'date', direction: 'desc' };

  constructor(
    private financialReleaseService: FinancialReleaseService,
    private paymentMethodService: PaymentMethodService,
    private toastr: ToastrService,
    private exportService: FinancialExportService
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
      // Buscar apenas despesas do mês selecionado usando filtros do backend
      releases: this.financialReleaseService.getFinancialReleasesWithFilters({
        month: selectedMonth,
        year: selectedYear,
        type: 'expense',
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

    // Filtro de data de pagamento
    if (this.filters.paymentDateFrom || this.filters.paymentDateTo) {
      filtered = filtered.filter(item => {
        const release = this.financialReleases.find(r => String(r.id) === item.id);
        if (!release?.payment_date) return false;
        const paymentDate = new Date(release.payment_date);
        if (this.filters.paymentDateFrom) {
          const fromDate = new Date(this.filters.paymentDateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (paymentDate < fromDate) return false;
        }
        if (this.filters.paymentDateTo) {
          const toDate = new Date(this.filters.paymentDateTo);
          toDate.setHours(23, 59, 59, 999);
          if (paymentDate > toDate) return false;
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
            const itemDate = new Date(item.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            itemDate.setHours(0, 0, 0, 0);
            return (item.status !== 'paid' && !item.is_paid && item.status !== 'cancelled') && itemDate >= today;
          case 'overdue':
            const itemDateOverdue = new Date(item.date);
            const todayOverdue = new Date();
            todayOverdue.setHours(0, 0, 0, 0);
            itemDateOverdue.setHours(0, 0, 0, 0);
            return (item.status !== 'paid' && !item.is_paid && item.status !== 'cancelled') && itemDateOverdue < todayOverdue;
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

  // Verificar se não há despesas no mês (sem filtros avançados)
  get hasNoExpensesInMonth(): boolean {
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
                            this.filters.paymentDateFrom ||
                            this.filters.paymentDateTo ||
                            this.filters.paymentMethodId !== 'all' ||
                            this.filters.hasInstallment !== 'all' ||
                            this.filters.valueMin ||
                            this.filters.valueMax);
    return hasActiveFilters && this.filteredExpenses.length === 0;
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

  onOpenOfxImport(): void {
    this.isOfxImportOpen = true;
  }

  onCloseOfxImport(): void {
    this.isOfxImportOpen = false;
  }

  onOfxImported(): void {
    this.loadData();
  }

  onOpenPdfImport(): void {
    this.isPdfImportOpen = true;
  }

  onClosePdfImport(): void {
    this.isPdfImportOpen = false;
  }

  onPdfImported(): void {
    this.loadData();
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
        if (res.message) {
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

  // ---------------------------------------------------------------------------
  // Exportação (Excel / PDF / CSV) — respeita os filtros e ordenação da tela
  // ---------------------------------------------------------------------------
  toggleExportMenu(): void {
    if (this.filteredExpenses.length === 0) {
      this.toastr.info('Não há despesas para exportar no período/filtro atual.', 'Exportar');
      return;
    }
    this.isExportMenuOpen = !this.isExportMenuOpen;
  }

  closeExportMenu(): void {
    this.isExportMenuOpen = false;
  }

  exportExcel(): void {
    const { columns, rows, meta } = this.buildExportData();
    this.exportService.exportToExcel(columns, rows, this.exportFilename(), meta);
    this.closeExportMenu();
    this.toastr.success('Planilha Excel gerada com sucesso.', 'Exportar');
  }

  exportPdf(): void {
    const { columns, rows, meta } = this.buildExportData();
    this.exportService.exportToPdf(columns, rows, this.exportFilename(), meta);
    this.closeExportMenu();
    this.toastr.success('PDF gerado com sucesso.', 'Exportar');
  }

  exportCsv(): void {
    const { columns, rows, meta } = this.buildExportData();
    this.exportService.exportToCsv(columns, rows, this.exportFilename(), meta);
    this.closeExportMenu();
    this.toastr.success('Arquivo CSV gerado com sucesso.', 'Exportar');
  }

  private buildExportData(): { columns: ExportColumn[]; rows: ExportRow[]; meta: ExportMeta } {
    const columns: ExportColumn[] = [
      { header: 'Data', key: 'date', type: 'date', width: 12 },
      { header: 'Descrição', key: 'description', type: 'text', width: 36 },
      { header: 'Categoria', key: 'category', type: 'text', width: 22 },
      { header: 'Tipo', key: 'type', type: 'text', width: 14 },
      { header: 'Parcela', key: 'portion', type: 'text', align: 'center', width: 10 },
      { header: 'Forma de pagamento', key: 'paymentMethod', type: 'text', width: 22 },
      { header: 'Status', key: 'status', type: 'text', width: 14 },
      { header: 'Valor', key: 'value', type: 'currency', align: 'right', width: 16 }
    ];

    const items = this.filteredExpenses;
    const rows: ExportRow[] = items.map((item) => {
      const release = this.financialReleases.find((r) => String(r.id) === item.id);
      return {
        date: item.date,
        description: item.description || 'Sem descrição',
        category: item.category,
        type: this.getExportTypeLabel(item),
        portion: this.getExportPortion(item),
        paymentMethod: this.getPaymentMethodName(release?.payment_method_id),
        status: this.getExportStatusLabel(item),
        value: item.value
      };
    });

    const total = items
      .filter((item) => item.status !== 'cancelled')
      .reduce((sum, item) => sum + (Number(item.value) || 0), 0);

    const meta: ExportMeta = {
      title: 'Relatório de Despesas',
      subtitle: this.exportSubtitle(items.length),
      sheetName: 'Despesas',
      totalLabel: 'Total',
      totalValue: total
    };

    return { columns, rows, meta };
  }

  private getPaymentMethodName(paymentMethodId: number | null | undefined): string {
    if (!paymentMethodId) {
      return '—';
    }
    const method = this.paymentMethods.find((p) => p.id === paymentMethodId);
    return method?.name || '—';
  }

  // Tipo do lançamento para o relatório: Recorrente / Parcelado / Único
  private getExportReleaseType(item: FinancialItem): 'installment' | 'recurring' | 'single' {
    if (item.release_type) {
      return item.release_type;
    }
    if (item.repetition === 'installments' || item.repetition === 'parcelado') {
      return 'installment';
    }
    if (item.repetition === 'fixed') {
      return 'recurring';
    }
    return 'single';
  }

  private getExportTypeLabel(item: FinancialItem): string {
    switch (this.getExportReleaseType(item)) {
      case 'installment':
        return 'Parcelado';
      case 'recurring':
        return 'Recorrente';
      default:
        return 'Único';
    }
  }

  // Parcela (ex.: "2/3") — exibida para parcelados e recorrentes que tenham número de parcela
  private getExportPortion(item: FinancialItem): string {
    const type = this.getExportReleaseType(item);
    if ((type === 'installment' || type === 'recurring') && item.portion) {
      return item.portion;
    }
    return '—';
  }

  private getExportStatusLabel(item: FinancialItem): string {
    if (item.status === 'cancelled') {
      return 'Cancelado';
    }
    if (item.status === 'paid' || item.is_paid) {
      return 'Pago';
    }
    const itemDate = new Date(item.date);
    itemDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return itemDate < today ? 'Vencido' : 'Pendente';
  }

  private exportSubtitle(count: number): string {
    const period = this.selectedMonth.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric'
    });
    const periodCapitalized = period.charAt(0).toUpperCase() + period.slice(1);
    return `Período: ${periodCapitalized} • ${count} lançamento(s)`;
  }

  private exportFilename(): string {
    const year = this.selectedMonth.getFullYear();
    const month = String(this.selectedMonth.getMonth() + 1).padStart(2, '0');
    return `despesas_${year}-${month}`;
  }

  // Método auxiliar para fornecer releases para o FilterSummary
  // Retorna os releases originais que correspondem aos filteredExpenses após aplicar filtros
  getFilteredReleasesForSummary(): FinancialRelease[] {
    // Aplicar os mesmos filtros que filteredExpenses usa
    let releases = [...this.financialReleases];

    // Converter FinancialRelease[] para FinancialItem[], aplicar filtros e voltar
    const tempItems = releases.map(release => ({
      id: String(release.id),
      description: release.descrition || 'Sem descrição',
      category: this.getCategoryName(release.category_id),
      value: parseFloat(String(release.value || 0)),
      date: release.date,
      is_paid: release.status ? release.status === 'paid' : !!release.payment_date,
      status: release.status || undefined,
      portion: release.portion || null,
      release_type: release.release_type || undefined,
      repetition: release.repetition || undefined,
      due_date: release.due_date || undefined,
      updated_at: release.updated_at || undefined
    }));

    // Aplicar filtros
    const filteredItems = this.applyFilters(tempItems);

    // Voltar para FinancialRelease[] - usar a mesma abordagem de receitas
    const filteredIds = filteredItems.map(item => parseInt(item.id));
    return releases.filter(r => filteredIds.includes(r.id || 0));
  }
}
