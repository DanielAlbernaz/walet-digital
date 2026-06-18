import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { faClock, faCheckCircle, faExclamationTriangle, faSearch } from '@fortawesome/free-solid-svg-icons';
import { FinancialReleaseService } from '../../services/financial-release/financial-release.service';
import { PaymentMethodService } from '../../services/payment-method/payment-method.service';
import { FinancialRelease, Category } from '../../models/financial-release';
import { PaymentMethod } from '../../models/payment-method.model';
import { FilterState, SortState } from '../../shared/components/advanced-filters/advanced-filters.component';

export interface Bill {
  id: string;
  description: string;
  category: string;
  value: number;
  date: string; // Data de competência (para manter compatibilidade)
  due_date: string; // Data de vencimento (usada para as tags)
  is_paid: boolean;
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled'; // Status do lançamento
  portion?: string;
}

@Component({
  selector: 'app-contas-a-pagar',
  templateUrl: './contas-a-pagar.component.html',
  styleUrls: ['./contas-a-pagar.component.scss']
})
export class ContasAPagarComponent implements OnInit {
  searchQuery: string = '';
  isModalOpen: boolean = false;
  selectedMonth: Date = new Date(); // Mês atual
  isLoading: boolean = false;
  selectedRelease: FinancialRelease | null = null; // Conta selecionada para edição

  faClock = faClock;
  faCheckCircle = faCheckCircle;
  faExclamationTriangle = faExclamationTriangle;
  faSearch = faSearch;

  financialReleases: FinancialRelease[] = [];
  categoriesMap: Map<number, string> = new Map();
  categories: Category[] = [];
  paymentMethods: PaymentMethod[] = [];
  bills: Bill[] = [];

  // Getter para filtrar categorias de despesas
  get expenseCategories(): Category[] {
    return this.categories.filter(c => c.type === 'expense' || c.type === 'despesa');
  }

  filters: FilterState = this.getInitialFilters();
  sort: SortState = { field: 'date', direction: 'asc' };

  constructor(
    private financialReleaseService: FinancialReleaseService,
    private paymentMethodService: PaymentMethodService
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
        this.processBills(this.financialReleases);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar dados:', error);
        this.isLoading = false;
        this.bills = [];
        this.financialReleases = [];
      }
    });
  }

  private processBills(releases: FinancialRelease[]): void {
    // Os dados já vêm filtrados por tipo 'expense' do backend
    // Mas vamos garantir que sejam apenas despesas (pode vir 'expense' ou 'despesa')
    const expenseReleases = releases.filter(r => {
      const type = String(r.type).toLowerCase();
      return type === 'despesa' || type === 'expense';
    });

    this.bills = expenseReleases.map(release => {
      const bill = {
        id: String(release.id),
        description: release.descrition || 'Sem descrição',
        category: this.getCategoryName(release.category_id),
        value: parseFloat(String(release.value || 0)),
        date: release.date, // Data de competência
        due_date: release.due_date || release.date, // Data de vencimento (fallback para date se não tiver due_date)
        is_paid: release.status ? release.status === 'paid' : !!release.payment_date,
        status: release.status || undefined,
        portion: release.portion || undefined
      };
      
      return bill;
    });

  }

  private getCategoryName(categoryId: number): string {
    return this.categoriesMap.get(categoryId) || 'Outros';
  }

  get pendingBills(): Bill[] {
    // Aplicar filtro de busca apenas nas despesas pendentes
    // Excluir cancelados da listagem (cancelados não devem aparecer em "Contas a Pagar")
    let pending = this.bills.filter(bill => !bill.is_paid && bill.status !== 'cancelled');

    // Aplicar filtros avançados
    pending = this.applyFilters(pending);

    // Aplicar ordenação
    pending = this.applySort(pending);

    return pending;
  }

  private applyFilters(bills: Bill[]): Bill[] {
    let filtered = [...bills];

    // Filtro de busca (search)
    if (this.filters.search) {
      const searchLower = this.filters.search.toLowerCase();
      filtered = filtered.filter(bill => {
        const release = this.financialReleases.find(r => String(r.id) === bill.id);
        const categoryName = release ? this.getCategoryName(release.category_id) : '';
        const description = bill.description?.toLowerCase() || '';
        const observation = release?.observation?.toLowerCase() || '';
        return description.includes(searchLower) ||
               categoryName.toLowerCase().includes(searchLower) ||
               observation.includes(searchLower);
      });
    }

    // Filtro de data de competência
    if (this.filters.dateFrom || this.filters.dateTo) {
      filtered = filtered.filter(bill => {
        const itemDate = new Date(bill.date);
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

    // Filtro de data de vencimento (usando due_date)
    // Como não temos filtro específico de vencimento nos filtros, usamos dateFrom/dateTo para competência
    // Mas podemos usar paymentDateFrom/To para filtrar por due_date se necessário
    if (this.filters.paymentDateFrom || this.filters.paymentDateTo) {
      filtered = filtered.filter(bill => {
        const dueDate = new Date(bill.due_date);
        if (this.filters.paymentDateFrom) {
          const fromDate = new Date(this.filters.paymentDateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (dueDate < fromDate) return false;
        }
        if (this.filters.paymentDateTo) {
          const toDate = new Date(this.filters.paymentDateTo);
          toDate.setHours(23, 59, 59, 999);
          if (dueDate > toDate) return false;
        }
        return true;
      });
    }

    // Filtro de status (para contas pendentes, não aplicamos status 'paid')
    // Mas podemos filtrar por 'pending' ou 'overdue'
    if (this.filters.status !== 'all') {
      filtered = filtered.filter(bill => {
        switch (this.filters.status) {
          case 'pending':
            const billDate = new Date(bill.due_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            billDate.setHours(0, 0, 0, 0);
            return billDate >= today;
          case 'overdue':
            const billDateOverdue = new Date(bill.due_date);
            const todayOverdue = new Date();
            todayOverdue.setHours(0, 0, 0, 0);
            billDateOverdue.setHours(0, 0, 0, 0);
            return billDateOverdue < todayOverdue;
          default:
            return true;
        }
      });
    }

    // Filtro de categoria
    if (this.filters.categoryId !== 'all') {
      const categoryId = parseInt(this.filters.categoryId);
      filtered = filtered.filter(bill => {
        const release = this.financialReleases.find(r => String(r.id) === bill.id);
        return release?.category_id === categoryId;
      });
    }

    // Filtro de método de pagamento
    if (this.filters.paymentMethodId !== 'all') {
      const methodId = parseInt(this.filters.paymentMethodId);
      filtered = filtered.filter(bill => {
        const release = this.financialReleases.find(r => String(r.id) === bill.id);
        return release?.payment_method_id === methodId;
      });
    }

    // Filtro de tipo de lançamento (parcelado/avulso)
    if (this.filters.hasInstallment !== 'all') {
      filtered = filtered.filter(bill => {
        const release = this.financialReleases.find(r => String(r.id) === bill.id);
        const isInstallment = bill.portion || 
                             release?.release_type === 'installment' ||
                             (release?.repetition === 'parcelado' || release?.repetition === 'installments');
        return this.filters.hasInstallment === 'installment' ? isInstallment : !isInstallment;
      });
    }

    // Filtro de faixa de valor
    if (this.filters.valueMin || this.filters.valueMax) {
      const min = this.filters.valueMin ? parseFloat(this.filters.valueMin) : 0;
      const max = this.filters.valueMax ? parseFloat(this.filters.valueMax) : Infinity;
      filtered = filtered.filter(bill => bill.value >= min && bill.value <= max);
    }

    return filtered;
  }

  private applySort(bills: Bill[]): Bill[] {
    const sorted = [...bills];

    sorted.sort((a, b) => {
      let comparison = 0;
      switch (this.sort.field) {
        case 'date':
          // Para contas a pagar, ordenar por due_date (data de vencimento)
          comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        case 'value':
          comparison = a.value - b.value;
          break;
        case 'status':
          // Ordenar por status de vencimento (vencido primeiro, depois pendentes)
          const aStatus = this.getDateStatus(a.due_date).label === 'Vencido' ? 0 : 1;
          const bStatus = this.getDateStatus(b.due_date).label === 'Vencido' ? 0 : 1;
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

  get paidBills(): Bill[] {
    // Retornar todas as pagas (sem filtro de busca no paid, pois não é exibido)
    return this.bills.filter(bill => bill.is_paid);
  }

  // Verificar se não há contas pendentes no mês (sem filtros avançados)
  get hasNoPendingBillsInMonth(): boolean {
    // Excluir cancelados da verificação também
    const pending = this.bills.filter(bill => !bill.is_paid && bill.status !== 'cancelled');
    return pending.length === 0 &&
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
    return hasActiveFilters && this.pendingBills.length === 0;
  }

  get totalPending(): number {
    // Total de despesas pendentes do mês (já filtradas pelo backend)
    // Excluir cancelados dos totais (mostrar na lista, mas não somar)
    // Considerar como pendente: não está pago E não está cancelado
    
    if (!this.bills || this.bills.length === 0) {
      return 0;
    }

    const pendingBills = this.bills.filter(bill => {
      // Pendente = não pago E não cancelado
      return !bill.is_paid && bill.status !== 'cancelled';
    });

    const total = pendingBills.reduce((sum, bill) => {
      const value = typeof bill.value === 'number' ? bill.value : parseFloat(String(bill.value || 0));
      return sum + (isNaN(value) ? 0 : value);
    }, 0);

    return total;
  }

  get totalPaid(): number {
    // Total de despesas pagas do mês (já filtradas pelo backend)
    // Excluir cancelados dos totais (mostrar na lista, mas não somar)
    return this.bills
      .filter(bill => {
        // Pago = está pago E não está cancelado
        const isPaid = bill.is_paid;
        const isNotCancelled = bill.status !== 'cancelled';
        return isPaid && isNotCancelled;
      })
      .reduce((sum, bill) => sum + (bill.value || 0), 0);
  }

  onMonthChanged(selectedMonth: Date): void {
    this.selectedMonth = selectedMonth;
    // Recarregar dados com o novo mês selecionado
    this.loadData();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  getDateStatus(dateStr: string): { label: string; class: string; icon: any } {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date < today) {
      return {
        label: 'Vencido',
        class: 'date-overdue',
        icon: this.faExclamationTriangle
      };
    }

    if (date.getTime() === today.getTime()) {
      return {
        label: 'Hoje',
        class: 'date-today',
        icon: this.faClock
      };
    }

    if (date.getTime() === tomorrow.getTime()) {
      return {
        label: 'Amanhã',
        class: 'date-tomorrow',
        icon: this.faClock
      };
    }

    const day = date.getDate();
    const month = date.getMonth() + 1;
    return {
      label: `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`,
      class: 'date-upcoming',
      icon: this.faClock
    };
  }

  onFabClick(): void {
    this.selectedRelease = null; // Criar novo lançamento
    this.isModalOpen = true;
  }

  onBillClick(bill: Bill): void {
    // Buscar o lançamento completo da lista de financialReleases
    const fullRelease = this.financialReleases.find(r => String(r.id) === bill.id);
    if (fullRelease) {
      this.selectedRelease = fullRelease;
      this.isModalOpen = true;
    }
  }

  onCloseModal(): void {
    this.isModalOpen = false;
    this.selectedRelease = null; // Limpar conta selecionada
  }

  onPayBill(billId: string): void {
    const bill = this.bills.find(b => b.id === billId);
    if (!bill) return;

    const releaseId = parseInt(billId);
    const release = this.financialReleases.find(r => r.id === releaseId);
    if (!release) return;

    // Atualizar payment_date para hoje e status para 'paid'
    const today = new Date().toISOString().split('T')[0];

    this.financialReleaseService.updateFinancialRelease(releaseId, {
      type: release.type,
      value: release.value,
      date: release.date,
      payment_date: today,
      descrition: release.descrition,
      observation: release.observation,
      repetition: release.repetition,
      portion: release.portion,
      category_id: release.category_id,
      status: 'paid' // Atualizar status para pago
    }).subscribe({
      next: () => {
        // Recarregar dados após atualizar
        this.loadData();
      },
      error: (error) => {
        console.error('Erro ao marcar conta como paga:', error);
        alert('Erro ao marcar conta como paga. Tente novamente.');
      }
    });
  }

  onTransactionSaved(): void {
    this.loadData();
  }
}
