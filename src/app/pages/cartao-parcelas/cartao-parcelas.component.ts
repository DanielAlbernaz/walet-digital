import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { faCalendar, faCreditCard, faTimes, faCheckCircle, faClock, faArrowTrendDown } from '@fortawesome/free-solid-svg-icons';
import { FinancialReleaseService } from '../../services/financial-release/financial-release.service';
import { FinancialRelease, Category, InstallmentSummary, InstallmentDetails } from '../../models/financial-release';
import { SweetAlertService } from '../../services/sweetalert/sweetalert.service';
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

  selectedMonth: Date = new Date();
  isLoading: boolean = false;
  installments: Installment[] = [];
  installmentDetails: InstallmentDetails | null = null; // Detalhes carregados para o modal

  constructor(
    private financialReleaseService: FinancialReleaseService,
    private sweetAlertService: SweetAlertService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;

    const selectedMonth = this.selectedMonth.getMonth() + 1; // getMonth retorna 0-11, backend espera 1-12
    const selectedYear = this.selectedMonth.getFullYear();

    // Usar o novo endpoint de parcelamentos com filtro de mês/ano
    this.financialReleaseService.getInstallments(selectedMonth, selectedYear).subscribe({
      next: (installments) => {
        this.processInstallments(installments);
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.installments = [];
        
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

  private processInstallments(summaries: InstallmentSummary[]): void {
    // Converter InstallmentSummary[] para Installment[]
    this.installments = summaries.map(summary => {
      // Calcular valor mensal (assumindo que todas as parcelas têm o mesmo valor)
      const monthlyValue = summary.total_value / summary.total_installments;

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
        firstDate: summary.first_date
      };
    });

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

          // Atualizar o installment correspondente
          const installment = this.installments.find(inst => inst.installment_id === summary.installment_id);
          if (installment) {
            if (nextPending) {
              installment.nextDueDate = nextPending.due_date;
            }
            // Se não encontrou pendente, mantém first_date (já está setado)
          }
        },
        error: () => {
          // Silenciar erro - se falhar ao buscar detalhes, mantém first_date
        }
      });
    });
  }

  get totalThisMonth(): number {
    // Somar valores mensais de todos os parcelamentos exibidos (já filtrados pelo backend)
    return this.installments.reduce((sum, inst) => sum + inst.monthlyValue, 0);
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
        this.selectedInstallment = {
          installment_id: details.installment_id,
          description: details.descrition || 'Sem descrição',
          category: details.category.title,
          monthlyValue: details.total_value / details.total_installments,
          totalValue: details.total_value,
          totalInstallments: details.total_installments,
          paidInstallments: details.paid_installments,
          nextDueDate: nextDueDate,
          firstDate: details.first_date
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
    this.loadData(); // Recarregar após alterações
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
                  this.selectedInstallment = {
                    installment_id: details.installment_id,
                    description: details.descrition || 'Sem descrição',
                    category: details.category.title,
                    monthlyValue: details.total_value / details.total_installments,
                    totalValue: details.total_value,
                    totalInstallments: details.total_installments,
                    paidInstallments: details.paid_installments,
                    nextDueDate: details.first_date,
                    firstDate: details.first_date
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
}