import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { faCalendar, faCreditCard, faTimes, faCheckCircle, faClock, faArrowTrendDown, faSearch, faFilePdf, faFileExcel, faFileCsv, faFileExport, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FinancialReleaseService } from '../../services/financial-release/financial-release.service';
import { PaymentMethodService } from '../../services/payment-method/payment-method.service';
import { FinancialRelease, Category, InstallmentSummary, InstallmentDetails } from '../../models/financial-release';
import { PaymentMethod } from '../../models/payment-method.model';
import { FilterState, SortState } from '../../shared/components/advanced-filters/advanced-filters.component';
import { SweetAlertService } from '../../services/sweetalert/sweetalert.service';
import { FinancialExportService, ExportColumn, ExportRow, ExportMeta } from '../../services/financial-export/financial-export.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

export interface Installment {
  installment_id: number;
  description: string;
  category: string;
  monthlyValue: number;
  totalValue: number;
  totalInstallments: number;
  paidInstallments: number;
  nextDueDate: string;
  firstDate: string; // Data da primeira parcela
  payment_method_id?: number | null; // ID do método de pagamento (opcional)
}

export interface ParcelItem {
  id: number;
  portion: string; // "1/12"
  due_date: string;
  value: number;
  status: 'pending' | 'paid' | 'cancelled' | 'overdue';
  payment_date?: string | null;
  description: string;
  category: string;
}

@Component({
  selector: 'app-cartao-parcelas',
  templateUrl: './cartao-parcelas.component.html',
  styleUrls: ['./cartao-parcelas.component.scss']
})
export class CartaoParcelasComponent implements OnInit {
  isModalOpen: boolean = false;
  isPanoramaModalOpen: boolean = false;
  selectedInstallment: Installment | null = null;

  faCalendar = faCalendar;
  faCreditCard = faCreditCard;
  faTimes = faTimes;
  faCheckCircle = faCheckCircle;
  faClock = faClock;
  faArrowTrendDown = faArrowTrendDown;
  faSearch = faSearch;
  faFilePdf = faFilePdf;
  faFileExcel = faFileExcel;
  faFileCsv = faFileCsv;
  faFileExport = faFileExport;
  faChevronDown = faChevronDown;
  isExportMenuOpen: boolean = false;

  selectedMonth: Date = new Date();
  isLoading: boolean = false;
  installments: Installment[] = [];
  allInstallments: Installment[] = []; // Todos os parcelamentos (antes dos filtros)
  installmentDetails: InstallmentDetails | null = null; // Detalhes carregados para o modal

  categories: Category[] = [];
  paymentMethods: PaymentMethod[] = [];

  // Getter para filtrar categorias de despesas
  get expenseCategories(): Category[] {
    return this.categories.filter(c => c.type === 'expense' || c.type === 'despesa');
  }

  filters: FilterState = this.getInitialFilters();
  sort: SortState = { field: 'date', direction: 'asc' };

  constructor(
    private financialReleaseService: FinancialReleaseService,
    private paymentMethodService: PaymentMethodService,
    private sweetAlertService: SweetAlertService,
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
      installments: this.financialReleaseService.getInstallments(selectedMonth, selectedYear)
    }).subscribe({
      next: ({ categories, paymentMethods, installments }) => {
        // Carregar categorias e métodos de pagamento
        this.categories = categories || [];
        this.paymentMethods = paymentMethods || [];

        // Processar parcelamentos
        this.processInstallments(installments);
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.installments = [];
        this.allInstallments = [];

        // Mostrar mensagem de erro para o usuário
        if (error.status === 500) {
          this.toastr.error('Erro interno do servidor ao carregar parcelamentos. Verifique os logs do backend.', 'Erro');
        } else if (error.status === 404) {
          this.toastr.warning('Endpoint de parcelamentos não encontrado. Verifique se o backend está atualizado.', 'Aviso');
        } else {
          this.toastr.error('Erro ao carregar parcelamentos. Tente novamente.', 'Erro');
        }
      }
    });
  }

  /**
   * Extrai payment_method_id de diferentes formatos que o backend pode retornar:
   * - payment_method_id (número)
   * - payment_method: { id: number } (objeto aninhado)
   */
  private extractPaymentMethodId(source: any): number | null {
    if (!source) return null;
    const id = source.payment_method_id
      ?? source.payment_method?.id
      ?? (source.payment_method && typeof source.payment_method === 'object' ? source.payment_method.id : null);
    if (id === null || id === undefined) return null;
    const num = Number(id);
    return isNaN(num) ? null : num;
  }

  private processInstallments(summaries: InstallmentSummary[]): void {
    // Converter InstallmentSummary[] para Installment[]
    this.allInstallments = summaries.map(summary => {
      // Calcular valor mensal (assumindo que todas as parcelas têm o mesmo valor)
      const monthlyValue = summary.total_value / summary.total_installments;

      // Extrair payment_method_id (backend pode retornar payment_method_id ou payment_method.id)
      const paymentMethodId = this.extractPaymentMethodId(summary) ?? null;

      // Inicialmente usar first_date, será atualizado se necessário
      // Para melhorar performance, não buscamos detalhes de todos aqui
      // O próximo vencimento será calculado quando o modal for aberto
      return {
        installment_id: summary.installment_id,
        description: summary.descrition || 'Sem descrição',
        category: summary.category.title,
        monthlyValue,
        totalValue: summary.total_value,
        totalInstallments: summary.total_installments,
        paidInstallments: summary.paid_installments,
        nextDueDate: summary.first_date, // Fallback inicial
        firstDate: summary.first_date,
        payment_method_id: paymentMethodId
      };
    });

    // Aplicar filtros e ordenação
    this.installments = this.applyFiltersAndSort(this.allInstallments);

    // Buscar detalhes em paralelo apenas para calcular próximos vencimentos reais
    // Isso é feito de forma assíncrona para não bloquear a UI
    summaries.forEach((summary, index) => {
      this.financialReleaseService.getInstallmentDetails(summary.installment_id).subscribe({
        next: (details) => {
          // Encontrar a próxima parcela pendente ou overdue (não paga, não cancelada)
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const nextPending = details.parcels
            .filter(p => {
              const isPending = p.status === 'pending' || p.status === 'overdue';
              const isNotPaid = !p.payment_date && p.status !== 'paid';
              return isPending && isNotPaid;
            })
            .sort((a, b) => {
              const dateA = new Date(a.due_date).getTime();
              const dateB = new Date(b.due_date).getTime();
              return dateA - dateB;
            })[0];

          // Atualizar o installment correspondente em allInstallments
          const installment = this.allInstallments.find(inst => inst.installment_id === summary.installment_id);
          if (installment) {
            if (nextPending) {
              installment.nextDueDate = nextPending.due_date;
            }
            // Se não encontrou pendente, mantém first_date (já está setado)

            // Atualizar payment_method_id dos detalhes se não estava no summary
            // Backend pode retornar payment_method_id ou payment_method.id (inclui métodos personalizados)
            if (!installment.payment_method_id) {
              const fromDetails = this.extractPaymentMethodId(details);
              if (fromDetails !== null) {
                installment.payment_method_id = fromDetails;
              } else if (details.parcels && details.parcels.length > 0) {
                const fromParcel = this.extractPaymentMethodId(details.parcels[0]);
                if (fromParcel !== null) {
                  installment.payment_method_id = fromParcel;
                }
              }
            }
          }

          // Reaplicar filtros após atualizar
          this.installments = this.applyFiltersAndSort(this.allInstallments);
        },
        error: () => {
          // Silenciar erro - se falhar ao buscar detalhes, mantém first_date
        }
      });
    });
  }

  get totalThisMonth(): number {
    // Somar valores mensais de todos os parcelamentos exibidos (já filtrados)
    return this.installments.reduce((sum, inst) => sum + inst.monthlyValue, 0);
  }

  private applyFiltersAndSort(items: Installment[]): Installment[] {
    let filtered = this.applyFilters(items);
    return this.applySort(filtered);
  }

  private applyFilters(items: Installment[]): Installment[] {
    let filtered = [...items];

    // Filtro de busca (search)
    if (this.filters.search) {
      const searchLower = this.filters.search.toLowerCase();
      filtered = filtered.filter(inst => {
        const description = inst.description?.toLowerCase() || '';
        const category = inst.category?.toLowerCase() || '';
        return description.includes(searchLower) || category.includes(searchLower);
      });
    }

    // Filtro de data de competência (usando firstDate)
    if (this.filters.dateFrom || this.filters.dateTo) {
      filtered = filtered.filter(inst => {
        const itemDate = new Date(inst.firstDate);
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

    // Filtro de data de vencimento (usando nextDueDate ou firstDate)
    if (this.filters.paymentDateFrom || this.filters.paymentDateTo) {
      filtered = filtered.filter(inst => {
        const dueDate = new Date(inst.nextDueDate || inst.firstDate);
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

    // Filtro de status (para parcelamentos, verificamos se há parcelas pendentes/vencidas/pagas)
    if (this.filters.status !== 'all') {
      // Para parcelamentos, não temos status direto no Installment
      // Podemos filtrar por progresso (parcialmente pago, completamente pago, etc.)
      // Mas por enquanto, vamos apenas aplicar se for 'all'
      // Isso pode ser expandido no futuro buscando detalhes
    }

    // Filtro de categoria
    if (this.filters.categoryId !== 'all') {
      // Para parcelamentos, precisamos buscar os detalhes para verificar a categoria
      // Por enquanto, filtramos pelo nome da categoria que já temos
      const categoryId = parseInt(this.filters.categoryId);
      const selectedCategory = this.categories.find(c => c.id === categoryId);
      if (selectedCategory) {
        filtered = filtered.filter(inst =>
          inst.category.toLowerCase() === selectedCategory.title.toLowerCase()
        );
      }
    }

    // Filtro de método de pagamento (inclui padrão e personalizados)
    if (this.filters.paymentMethodId !== 'all') {
      const paymentMethodId = parseInt(this.filters.paymentMethodId, 10);
      if (!isNaN(paymentMethodId)) {
        filtered = filtered.filter(inst => {
          const instId = inst.payment_method_id;
          if (instId === null || instId === undefined) return false;
          return Number(instId) === paymentMethodId;
        });
      }
    }

    // Filtro de tipo de lançamento (parcelado/avulso)
    // Todos são parcelados nesta página, então este filtro não se aplica

    // Filtro de faixa de valor (usando monthlyValue ou totalValue)
    if (this.filters.valueMin || this.filters.valueMax) {
      const min = this.filters.valueMin ? parseFloat(this.filters.valueMin) : 0;
      const max = this.filters.valueMax ? parseFloat(this.filters.valueMax) : Infinity;
      filtered = filtered.filter(inst => {
        // Filtrar por valor mensal ou valor total
        return (inst.monthlyValue >= min && inst.monthlyValue <= max) ||
               (inst.totalValue >= min && inst.totalValue <= max);
      });
    }

    return filtered;
  }

  private applySort(items: Installment[]): Installment[] {
    const sorted = [...items];

    sorted.sort((a, b) => {
      let comparison = 0;
      switch (this.sort.field) {
        case 'date':
          // Ordenar por data de vencimento (nextDueDate) ou primeira data
          const dateA = new Date(a.nextDueDate || a.firstDate).getTime();
          const dateB = new Date(b.nextDueDate || b.firstDate).getTime();
          comparison = dateA - dateB;
          break;
        case 'value':
          // Ordenar por valor mensal
          comparison = a.monthlyValue - b.monthlyValue;
          break;
        case 'status':
          // Ordenar por progresso (quanto mais parcelas pagas, mais à frente)
          const progressA = a.paidInstallments / a.totalInstallments;
          const progressB = b.paidInstallments / b.totalInstallments;
          comparison = progressA - progressB;
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
    this.installments = this.applyFiltersAndSort(this.allInstallments);
  }

  onSortChange(sort: SortState): void {
    this.sort = sort;
    this.installments = this.applyFiltersAndSort(this.allInstallments);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const months = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    return `${date.getDate()} de ${months[date.getMonth()]}`;
  }

  formatDateShort(dateStr: string): string {
    if (!dateStr) return '';
    // Formatar data para DD/MM/YYYY
    const dateParts = dateStr.split('T')[0].split('-');
    if (dateParts.length === 3) {
      const day = dateParts[2].padStart(2, '0');
      const month = dateParts[1].padStart(2, '0');
      const year = dateParts[0];
      return `${day}/${month}/${year}`;
    }
    // Fallback para Date se não estiver no formato esperado
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  getRemainingInstallments(installment: Installment): number {
    return installment.totalInstallments - installment.paidInstallments;
  }

  getProgressPercentage(installment: Installment): number {
    if (installment.totalInstallments === 0) return 0;
    return (installment.paidInstallments / installment.totalInstallments) * 100;
  }

  onMonthChanged(selectedMonth: Date): void {
    this.selectedMonth = selectedMonth;
    this.loadData();
  }

  onFabClick(): void {
    this.isModalOpen = true;
  }

  onCloseModal(): void {
    this.isModalOpen = false;
    this.loadData(); // Recarregar após salvar
  }

  onInstallmentClick(installment: Installment): void {
    // Carregar detalhes do parcelamento usando o novo endpoint
    this.isLoading = true;
    this.financialReleaseService.getInstallmentDetails(installment.installment_id).subscribe({
      next: (details) => {
        this.installmentDetails = details;

        // Calcular próxima data de vencimento real (primeira parcela pendente)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const nextPending = details.parcels
          .filter(p => (p.status === 'pending' || p.status === 'overdue') && !p.payment_date)
          .sort((a, b) => {
            const dateA = new Date(a.due_date).getTime();
            const dateB = new Date(b.due_date).getTime();
            return dateA - dateB;
          })[0];

        const nextDueDate = nextPending?.due_date || details.first_date;

        // Criar objeto selectedInstallment a partir dos detalhes
        const pmId = this.extractPaymentMethodId(details)
          ?? (details.parcels?.[0] ? this.extractPaymentMethodId(details.parcels[0]) : null);
        this.selectedInstallment = {
          installment_id: details.installment_id,
          description: details.descrition || 'Sem descrição',
          category: details.category.title,
          monthlyValue: details.total_value / details.total_installments,
          totalValue: details.total_value,
          totalInstallments: details.total_installments,
          paidInstallments: details.paid_installments,
          nextDueDate: nextDueDate,
          firstDate: details.first_date,
          payment_method_id: pmId
        };
        this.isPanoramaModalOpen = true;
        this.isLoading = false;
      },
      error: (error) => {
        this.toastr.error('Erro ao carregar detalhes do parcelamento.', 'Erro');
        this.isLoading = false;
      }
    });
  }

  onClosePanoramaModal(): void {
    this.isPanoramaModalOpen = false;
    this.selectedInstallment = null;
    this.installmentDetails = null;
    // Recarregar após alterações e reaplicar filtros
    // loadData() já vai chamar processInstallments que aplica os filtros
    this.loadData();
  }

  getPanoramaParcels(): ParcelItem[] {
    if (!this.installmentDetails) return [];

    // Ordenar parcelas por data de vencimento
    return this.installmentDetails.parcels
      .map(parcel => ({
        id: parcel.id,
        portion: parcel.portion,
        due_date: parcel.due_date,
        value: parcel.value,
        status: parcel.status,
        payment_date: parcel.payment_date,
        description: this.installmentDetails!.descrition || 'Sem descrição',
        category: this.installmentDetails!.category.title
      }))
      .sort((a, b) => {
        const dateA = new Date(a.due_date).getTime();
        const dateB = new Date(b.due_date).getTime();
        return dateA - dateB;
      });
  }

  getPanoramaProgress(): number {
    if (!this.selectedInstallment) return 0;
    return this.getProgressPercentage(this.selectedInstallment);
  }

  getPanoramaPaidValue(): number {
    if (!this.installmentDetails) return 0;
    return this.installmentDetails.paid_value;
  }

  getPanoramaRemainingValue(): number {
    if (!this.installmentDetails) return 0;
    return this.installmentDetails.remaining_value;
  }

  onPayParcel(parcel: ParcelItem): void {
    if (parcel.status === 'paid') {
      this.toastr.warning('Esta parcela já está paga.', 'Aviso');
      return;
    }

    if (parcel.status === 'cancelled') {
      this.toastr.warning('Parcelas canceladas não podem ser pagas.', 'Aviso');
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    Swal.fire({
      title: 'Pagar Parcela',
      html: `
        <div style="margin-top: 1rem; text-align: center;">
          <label for="payment-date" style="display: block; margin-bottom: 0.75rem; font-weight: 500; text-align: left; color: #333;">Data de Pagamento *</label>
          <input
            type="date"
            id="payment-date"
            value="${today}"
            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 0.5rem; font-size: 0.875rem; box-sizing: border-box;">
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563EB',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Confirmar Pagamento',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusConfirm: false,
      width: '420px',
      customClass: {
        popup: 'payment-modal-popup',
        htmlContainer: 'payment-modal-html'
      },
      didOpen: () => {
        const popup = document.querySelector('.swal2-popup') as HTMLElement;
        if (popup) {
          popup.style.overflowX = 'hidden';
          popup.style.maxWidth = '420px';
          popup.style.width = '420px';
        }

        const htmlContainer = document.querySelector('.swal2-html-container') as HTMLElement;
        if (htmlContainer) {
          htmlContainer.style.overflowX = 'hidden';
          htmlContainer.style.width = '100%';
          htmlContainer.style.maxWidth = '100%';
          htmlContainer.style.padding = '0 1.25rem';
        }

        const paymentInput = document.getElementById('payment-date') as HTMLInputElement;
        if (paymentInput) {
          paymentInput.style.width = '100%';
          paymentInput.style.maxWidth = '100%';
          paymentInput.style.margin = '0';
        }

        const inputContainer = paymentInput?.parentElement as HTMLElement;
        if (inputContainer) {
          inputContainer.style.textAlign = 'left';
          inputContainer.style.width = '100%';
        }
      },
      preConfirm: () => {
        const paymentDateInput = document.getElementById('payment-date') as HTMLInputElement;
        const paymentDate = paymentDateInput?.value;

        if (!paymentDate) {
          Swal.showValidationMessage('A data de pagamento é obrigatória.');
          return false;
        }

        return paymentDate;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const paymentDate = result.value;

        // Atualizar parcela para status 'paid'
        this.financialReleaseService.updateFinancialRelease(parcel.id, {
          status: 'paid',
          payment_date: paymentDate
        } as any).subscribe({
          next: () => {
            this.toastr.success('Parcela marcada como paga com sucesso.', 'Sucesso');
            // Recarregar dados do parcelamento no modal
            if (this.selectedInstallment) {
              const installmentId = this.selectedInstallment.installment_id;
              this.financialReleaseService.getInstallmentDetails(installmentId).subscribe({
                next: (details) => {
                  this.installmentDetails = details;
                  // Atualizar selectedInstallment também
                  const pmIdRefresh = this.extractPaymentMethodId(details)
                    ?? (details.parcels?.[0] ? this.extractPaymentMethodId(details.parcels[0]) : null);
                  this.selectedInstallment = {
                    installment_id: details.installment_id,
                    description: details.descrition || 'Sem descrição',
                    category: details.category.title,
                    monthlyValue: details.total_value / details.total_installments,
                    totalValue: details.total_value,
                    totalInstallments: details.total_installments,
                    paidInstallments: details.paid_installments,
                    nextDueDate: details.first_date,
                    firstDate: details.first_date,
                    payment_method_id: pmIdRefresh
                  };
                }
              });
            }
            // Recarregar lista de parcelamentos
            this.loadData();
          },
          error: (error) => {
            let errorMessage = 'Erro ao marcar parcela como paga. Tente novamente.';
            if (error.error?.message) {
              errorMessage = error.error.message;
            }
            this.toastr.error(errorMessage, 'Erro');
          }
        });
      }
    });
  }

  getStatusIcon(parcel: ParcelItem) {
    if (parcel.status === 'paid') return this.faCheckCircle;
    if (parcel.status === 'cancelled') return this.faTimes;
    return this.faClock;
  }

  getStatusLabel(parcel: ParcelItem): string {
    if (parcel.status === 'paid') return 'Paga';
    if (parcel.status === 'cancelled') return 'Cancelada';
    return 'A vencer';
  }

  getStatusClass(parcel: ParcelItem): string {
    if (parcel.status === 'paid') return 'status-paid';
    if (parcel.status === 'cancelled') return 'status-cancelled';
    return 'status-pending';
  }

  getCanPay(parcel: ParcelItem): boolean {
    return parcel.status === 'pending' || parcel.status === 'overdue';
  }

  getMonthSubtitle(): string {
    const months = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    return `${months[this.selectedMonth.getMonth()]} de ${this.selectedMonth.getFullYear()}`;
  }

  onTransactionSaved(): void {
    this.loadData();
  }

  // Valor já pago do parcelamento (parcelas pagas × valor mensal)
  getPaidValue(installment: Installment): number {
    return installment.paidInstallments * installment.monthlyValue;
  }

  // Quanto ainda falta pagar (parcelas restantes × valor mensal)
  getRemainingValue(installment: Installment): number {
    return this.getRemainingInstallments(installment) * installment.monthlyValue;
  }

  // ---------------------------------------------------------------------------
  // Exportação (Excel / PDF / CSV) — relatório de parcelamentos respeitando filtros
  // ---------------------------------------------------------------------------
  toggleExportMenu(): void {
    if (this.installments.length === 0) {
      this.toastr.info('Não há parcelamentos para exportar no período/filtro atual.', 'Exportar');
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
      { header: 'Descrição', key: 'description', type: 'text', width: 32 },
      { header: 'Categoria', key: 'category', type: 'text', width: 20 },
      { header: 'Parcelas', key: 'progress', type: 'text', align: 'center', width: 12 },
      { header: 'Valor mensal', key: 'monthlyValue', type: 'currency', width: 14 },
      { header: 'Valor total', key: 'totalValue', type: 'currency', width: 14 },
      { header: 'Já pago', key: 'paidValue', type: 'currency', width: 14 },
      { header: 'Falta pagar', key: 'remainingValue', type: 'currency', width: 14 },
      { header: 'Próximo venc.', key: 'nextDueDate', type: 'date', width: 14 }
    ];

    const items = this.installments;
    const rows: ExportRow[] = items.map((item) => ({
      description: item.description || 'Sem descrição',
      category: item.category,
      progress: `${item.paidInstallments}/${item.totalInstallments}`,
      monthlyValue: item.monthlyValue,
      totalValue: item.totalValue,
      paidValue: this.getPaidValue(item),
      remainingValue: this.getRemainingValue(item),
      nextDueDate: item.nextDueDate
    }));

    // Total destacado = quanto ainda falta pagar somando todos os parcelamentos
    const totalRemaining = items.reduce((sum, item) => sum + this.getRemainingValue(item), 0);

    const meta: ExportMeta = {
      title: 'Relatório de Parcelamentos',
      subtitle: this.exportSubtitle(items.length, totalRemaining),
      sheetName: 'Parcelamentos',
      totalLabel: 'Total a pagar',
      totalValue: totalRemaining
    };

    return { columns, rows, meta };
  }

  private exportSubtitle(count: number, totalRemaining: number): string {
    const period = this.selectedMonth.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric'
    });
    const periodCapitalized = period.charAt(0).toUpperCase() + period.slice(1);
    return `Período: ${periodCapitalized} • ${count} parcelamento(s) • Falta pagar: ${this.formatCurrency(totalRemaining)}`;
  }

  private exportFilename(): string {
    const year = this.selectedMonth.getFullYear();
    const month = String(this.selectedMonth.getMonth() + 1).padStart(2, '0');
    return `parcelamentos_${year}-${month}`;
  }

  // Verificar se não há parcelamentos no mês (sem filtros)
  get hasNoInstallments(): boolean {
    return this.allInstallments.length === 0 && !this.isLoading &&
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
    return hasActiveFilters && this.installments.length === 0 && !this.isLoading;
  }
}
