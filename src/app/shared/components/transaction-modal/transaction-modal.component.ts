import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { AuthService } from '../../../services/auth/auth.service';
import { FinancialReleaseService } from '../../../services/financial-release/financial-release.service';
import { SweetAlertService } from '../../../services/sweetalert/sweetalert.service';
import { PaymentMethodService } from '../../../services/payment-method/payment-method.service';
import { CreateFinancialReleaseRequest, Category, FinancialRelease } from '../../../models/financial-release';
import { PaymentMethod } from '../../../models/payment-method.model';
import { faTimes, faCalendar, faTrash } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-transaction-modal',
  templateUrl: './transaction-modal.component.html',
  styleUrls: ['./transaction-modal.component.scss']
})
export class TransactionModalComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() releaseToEdit: FinancialRelease | null = null; // Lançamento para edição
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  transactionForm: FormGroup;
  selectedType: 'receita' | 'despesa' = 'despesa';

  faTimes = faTimes;
  faCalendar = faCalendar;
  faTrash = faTrash;

  categories: Category[] = [];
  filteredCategories: Category[] = [];

  paymentMethods: PaymentMethod[] = [];
  defaultPaymentMethods: PaymentMethod[] = [];
  customPaymentMethods: PaymentMethod[] = [];

  repetitionOptions: { value: string; label: string }[] = [];

  statusOptions: { value: string; label: string }[] = [
    { value: 'pending', label: 'Pendente' },
    { value: 'paid', label: 'Pago' },
    { value: 'overdue', label: 'Atrasado' },
    { value: 'cancelled', label: 'Cancelado' }
  ];

  isLoading: boolean = false;
  isLoadingCategories: boolean = false;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private financialReleaseService: FinancialReleaseService,
    public paymentMethodService: PaymentMethodService,
    private sweetAlertService: SweetAlertService,
    private toastr: ToastrService
  ) {
    this.transactionForm = this.fb.group({
      type: ['despesa', Validators.required],
      value: ['0,00', [Validators.required]],
      competenceDate: ['', Validators.required],
      dueDate: ['', Validators.required], // Data de vencimento (obrigatória)
      paymentDate: [''],
      description: ['', [Validators.required, Validators.minLength(3)]],
      category: ['', Validators.required],
      repetition: ['only', Validators.required], // 'only', 'installments', 'fixed' (aceita 'unico' também)
      number_installments_repetition: [''], // Para parcelamento (installments)
      number_repetition: [''], // Para recorrência (fixed)
      periodicity: [''], // Para recorrência (fixed): 'daily', 'weekly', 'monthly', 'annual'
      observation: [''],
      status: ['pending', Validators.required] // Status do lançamento
    });
  }

  ngOnInit(): void {
    // Carregar opções de repetição baseadas nas features do plano
    this.loadRepetitionOptions();

    // Carregar categorias da API
    this.loadCategories();

    // Carregar métodos de pagamento
    this.loadPaymentMethods();

    this.transactionForm.get('type')?.valueChanges.subscribe(type => {
      this.selectedType = type;
      // Recarregar categorias filtradas por tipo
      this.filterCategoriesByType(type);
      // Limpar seleção de categoria apenas se não estiver editando e a categoria atual não for do novo tipo
      const currentCategory = this.transactionForm.get('category')?.value;
      if (!this.releaseToEdit && currentCategory) {
        // Verificar se a categoria atual é do tipo correto
        const category = this.categories.find(c => c.id === currentCategory);
        if (!category || (category.type !== type && category.type !== (type === 'receita' ? 'revenue' : 'expense'))) {
          this.transactionForm.patchValue({ category: '' });
        }
      }
    });

    // Gerenciar visibilidade e validação dos campos condicionais
    this.transactionForm.get('repetition')?.valueChanges.subscribe(repetition => {
      const installmentsControl = this.transactionForm.get('number_installments_repetition');
      const numberRepetitionControl = this.transactionForm.get('number_repetition');
      const periodicityControl = this.transactionForm.get('periodicity');

      // Limpar todos os controles condicionais primeiro
      installmentsControl?.clearValidators();
      installmentsControl?.setValue('');
      numberRepetitionControl?.clearValidators();
      numberRepetitionControl?.setValue('');
      periodicityControl?.clearValidators();
      periodicityControl?.setValue('');

      // Aplicar validações baseado no tipo de repetição
      if (repetition === 'installments' || repetition === 'parcelado') {
        // Parcelamento: número de parcelas obrigatório (mínimo 2, máximo 240)
        installmentsControl?.setValidators([Validators.required, Validators.min(2), Validators.max(240)]);
      } else if (repetition === 'fixed') {
        // Recorrente: número de repetições e periodicity obrigatórios
        numberRepetitionControl?.setValidators([Validators.required, Validators.min(1), Validators.max(240)]);
        periodicityControl?.setValidators([Validators.required]);
      }

      installmentsControl?.updateValueAndValidity();
      numberRepetitionControl?.updateValueAndValidity();
      periodicityControl?.updateValueAndValidity();
    });

    // Gerenciar validação da data de pagamento quando status for 'paid'
    // E detectar mudança para 'cancelled' para chamar endpoint de cancelamento
    this.transactionForm.get('status')?.valueChanges.subscribe(status => {
      const paymentDateControl = this.transactionForm.get('paymentDate');

      // Se mudou para 'cancelled' E está editando uma parcela pendente
      if (status === 'cancelled' && this.releaseToEdit?.id) {
        const currentStatus = this.releaseToEdit.status;
        // Só cancelar se não estava cancelado antes E não está pago
        if (currentStatus !== 'cancelled' && currentStatus !== 'paid') {
          this.onCancelViaSelect();
          // Reverter o valor do form para o status anterior (não mudar até confirmar)
          this.transactionForm.patchValue({ status: currentStatus || 'pending' }, { emitEvent: false });
          return;
        } else if (currentStatus === 'paid') {
          // Se tentou cancelar uma parcela paga, reverter e mostrar erro
          this.transactionForm.patchValue({ status: 'paid' }, { emitEvent: false });
          this.toastr.error('Não é possível cancelar parcelas pagas.', 'Erro');
          return;
        }
      }

      if (status === 'paid') {
        // Se status for 'paid', tornar data de pagamento obrigatória
        paymentDateControl?.setValidators([Validators.required]);
        // Se não tiver valor e estiver em modo de edição, preencher com data atual
        if (!paymentDateControl?.value && this.releaseToEdit) {
          const today = new Date().toISOString().split('T')[0];
          paymentDateControl?.setValue(today);
        }
      } else {
        // Se status não for 'paid', remover validação obrigatória
        paymentDateControl?.clearValidators();
      }

      paymentDateControl?.updateValueAndValidity();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Quando o modal abre ou quando releaseToEdit muda, carregar dados se estiver editando
    if (changes['isOpen']?.currentValue && this.releaseToEdit) {
      // Carregar categorias e dados do lançamento em paralelo
      this.loadReleaseData(this.releaseToEdit);
    } else if (changes['isOpen']?.currentValue && !this.releaseToEdit) {
      // Se abrir sem lançamento, resetar formulário
      this.resetForm();
    }
  }

  private loadReleaseData(release: FinancialRelease): void {
    if (!release || !release.id) {
      return;
    }

    // Carregar categorias e dados do lançamento em paralelo para garantir que ambos estejam prontos
    this.isLoading = true;

    forkJoin({
      categories: this.financialReleaseService.getCategories(),
      fullRelease: this.financialReleaseService.getFinancialRelease(release.id)
    }).subscribe({
      next: ({ categories, fullRelease }) => {
        // Carregar categorias primeiro
        this.categories = categories;

        // Garantir que as categorias estejam carregadas e filtradas antes de preencher
        // Normalizar tipo (backend pode retornar 'revenue'/'expense' ou 'receita'/'despesa')
        // Usar string para permitir comparação com ambos os formatos
        const releaseType = String(fullRelease.type).toLowerCase();
        let normalizedType: 'receita' | 'despesa';
        if (releaseType === 'revenue' || releaseType === 'receita') {
          normalizedType = 'receita';
        } else if (releaseType === 'expense' || releaseType === 'despesa') {
          normalizedType = 'despesa';
        } else {
          // Fallback para despesa se não reconhecer o tipo
          normalizedType = 'despesa';
        }

        // Formatar datas para YYYY-MM-DD (formato esperado pelo input type="date")
        const formatDateForInput = (dateStr: string | null | undefined): string => {
          if (!dateStr) return '';
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return '';
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        // Formatar valor corretamente - garantir que seja um número válido
        const numericValue = typeof fullRelease.value === 'number'
          ? fullRelease.value
          : parseFloat(String(fullRelease.value)) || 0;
        const formattedValue = this.formatBrazilianCurrency(numericValue);

        // Atualizar selectedType ANTES de preencher o formulário
        this.selectedType = normalizedType;
        this.filterCategoriesByType(normalizedType);

        // Normalizar repetition para valores do novo formato
        const normalizeRepetition = (rep: string | undefined): string => {
          if (!rep) return 'only';
          const repLower = String(rep).toLowerCase();
          if (repLower === 'unico' || repLower === 'only') return 'only';
          if (repLower === 'parcelado' || repLower === 'installments') return 'installments';
          if (repLower === 'fixed') return 'fixed';
          // Valores antigos (mensal, semanal, anual) - tratar como fixed com periodicity
          if (['mensal', 'monthly'].includes(repLower)) return 'fixed';
          if (['semanal', 'weekly'].includes(repLower)) return 'fixed';
          if (['anual', 'annual'].includes(repLower)) return 'fixed';
          return 'only';
        };

        const normalizedRepetition = normalizeRepetition(fullRelease.repetition);

        // Preencher formulário com dados do lançamento
        // Usar setTimeout para garantir que o DOM esteja pronto
        setTimeout(() => {
          this.transactionForm.patchValue({
            type: normalizedType,
            value: formattedValue,
            competenceDate: formatDateForInput(fullRelease.date),
            dueDate: formatDateForInput(fullRelease.due_date),
            paymentDate: formatDateForInput(fullRelease.payment_date),
            description: fullRelease.descrition || '',
            category: fullRelease.category_id || '',
            payment_method: (fullRelease as any).payment_method_id || null,
            repetition: normalizedRepetition,
            number_installments_repetition: fullRelease.portion ? this.extractInstallments(fullRelease.portion) : '',
            number_repetition: '',
            periodicity: this.getPeriodicityFromRepetition(fullRelease.repetition),
            observation: fullRelease.observation || '',
            status: fullRelease.status || 'pending'
          }, { emitEvent: false }); // Não emitir eventos para evitar conflitos
        }, 0);

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar lançamento:', error);
        this.isLoading = false;
        this.errorMessage = 'Erro ao carregar dados do lançamento.';
      }
    });
  }

  private extractInstallments(portion: string): string {
    // Extrair número de parcelas de formato "1/12"
    const match = portion.match(/\/(\d+)/);
    return match ? match[1] : '';
  }

  private getPeriodicityFromRepetition(repetition: string | undefined): string {
    if (!repetition) return 'monthly';
    const repLower = String(repetition).toLowerCase();
    if (repLower === 'mensal' || repLower === 'monthly') return 'monthly';
    if (repLower === 'semanal' || repLower === 'weekly') return 'weekly';
    if (repLower === 'anual' || repLower === 'annual') return 'annual';
    if (repLower === 'daily' || repLower === 'diario') return 'daily';
    return 'monthly'; // Default
  }

  get isInstallmentsSelected(): boolean {
    const repetition = this.transactionForm.get('repetition')?.value;
    return repetition === 'installments' || repetition === 'parcelado';
  }

  get isFixedSelected(): boolean {
    return this.transactionForm.get('repetition')?.value === 'fixed';
  }

  hasInstallmentsFeature(): boolean {
    return this.authService.hasFeature('installments');
  }

  private loadRepetitionOptions(): void {
    this.repetitionOptions = [
      { value: 'only', label: 'Lançamento Único' },
      { value: 'installments', label: 'Parcelado' },
      { value: 'fixed', label: 'Recorrente' }
    ];
  }

  loadPaymentMethods(): void {
    this.paymentMethodService.list().subscribe({
      next: (methods) => {
        this.paymentMethods = methods;
        // Métodos padrão: is_custom = false
        this.defaultPaymentMethods = methods.filter(m => !m.is_custom);
        // Métodos personalizados: is_custom = true
        this.customPaymentMethods = methods.filter(m => m.is_custom);
      },
      error: (error) => {
        console.error('Erro ao carregar métodos de pagamento:', error);
        // Não bloquear o formulário se falhar ao carregar métodos
      }
    });
  }

  loadCategories(): void {
    this.isLoadingCategories = true;
    this.financialReleaseService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        // Filtrar categorias por tipo inicial
        this.filterCategoriesByType(this.selectedType);
        this.isLoadingCategories = false;
      },
      error: (error) => {
        console.error('Erro ao carregar categorias:', error);
        this.isLoadingCategories = false;
        // Manter array vazio em caso de erro
        this.categories = [];
        this.filteredCategories = [];
      }
    });
  }

  private filterCategoriesByType(type: 'receita' | 'despesa'): void {
    // Backend retorna 'revenue'/'expense', mas aceita 'receita'/'despesa' do frontend
    const backendType = type === 'receita' ? 'revenue' : 'expense';

    this.filteredCategories = this.categories.filter(category => {
      // Aceitar tanto o tipo do backend quanto o do frontend
      return category.type === type || category.type === backendType;
    });
  }

  getCategoryDisplayName(category: Category): string {
    return category.title;
  }

  selectType(type: 'receita' | 'despesa'): void {
    this.transactionForm.patchValue({ type });
    this.selectedType = type;
  }

  onClose(): void {
    this.close.emit();
    this.errorMessage = '';
    this.resetForm();
    // Limpar lançamento em edição ao fechar
    this.releaseToEdit = null;
  }

  onDelete(): void {
    if (!this.releaseToEdit?.id) {
      return;
    }

    // Verificar se pode deletar (não pode ser pago)
    if (this.releaseToEdit.status === 'paid') {
      this.toastr.error('Não é possível excluir parcelas pagas. Parcelas pagas não podem ser alteradas.', 'Erro');
      return;
    }

    // Confirmar exclusão (soft delete)
    this.sweetAlertService.confirmDelete('Deseja realmente excluir esta parcela? Esta ação não pode ser desfeita para parcelas pendentes.').then((result) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        this.errorMessage = '';

        // Chamar endpoint DELETE (soft delete)
        this.financialReleaseService.deleteFinancialRelease(this.releaseToEdit!.id!).subscribe({
          next: (response) => {
            this.isLoading = false;
            this.toastr.success('Parcela excluída com sucesso.', 'Sucesso');
            this.saved.emit();
            this.onClose();
          },
          error: (error) => {
            this.isLoading = false;

            let errorMessage = 'Erro ao excluir parcela. Tente novamente.';
            if (error.status === 0) {
              errorMessage = 'Erro de conexão. Verifique se o servidor está rodando.';
            } else if (error.status === 403) {
              errorMessage = 'Você não tem permissão para excluir este lançamento.';
            } else if (error.status === 404) {
              errorMessage = 'Lançamento não encontrado.';
            } else if (error.error && typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error?.message) {
              errorMessage = error.error.message;
            }

            this.toastr.error(errorMessage, 'Erro');
          }
        });
      }
    });
  }

  onCancelViaSelect(): void {
    if (!this.releaseToEdit?.id) {
      return;
    }

    // Verificar se pode cancelar (não pode ser pago)
    if (this.releaseToEdit.status === 'paid') {
      this.toastr.error('Não é possível cancelar parcelas pagas. Esta parcela já foi paga.', 'Erro');
      return;
    }

    // Confirmar cancelamento
    this.sweetAlertService.confirmCancelRelease({
      isSingleInstallment: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        this.errorMessage = '';

        // Chamar endpoint POST /api/financial_release/{id}/cancel
        this.financialReleaseService.cancelFinancialRelease(this.releaseToEdit!.id!).subscribe({
          next: (response) => {
            this.isLoading = false;
            this.toastr.success('Parcela cancelada com sucesso.', 'Sucesso');
            this.saved.emit();
            this.onClose();
          },
          error: (error) => {
            this.isLoading = false;

            let errorMessage = 'Erro ao cancelar parcela. Tente novamente.';
            if (error.status === 0) {
              errorMessage = 'Erro de conexão. Verifique se o servidor está rodando.';
            } else if (error.status === 403) {
              errorMessage = 'Você não tem permissão para cancelar este lançamento.';
            } else if (error.status === 404) {
              errorMessage = 'Lançamento não encontrado.';
            } else if (error.error && typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error?.message) {
              errorMessage = error.error.message;
            }

            this.toastr.error(errorMessage, 'Erro');
          }
        });
      }
    });
  }

  get canDelete(): boolean {
    // Pode deletar se estiver editando, não estiver pago e não estiver já deletado/cancelado
    return !!(this.releaseToEdit?.id &&
              this.releaseToEdit.status !== 'paid');
  }

  get canPay(): boolean {
    // Pode pagar se estiver editando e não estiver já pago ou cancelado
    return !!(this.releaseToEdit?.id &&
              this.releaseToEdit.status !== 'paid' &&
              this.releaseToEdit.status !== 'cancelled');
  }

  onPay(): void {
    if (!this.releaseToEdit?.id) {
      return;
    }

    // Usar SweetAlert para solicitar a data de pagamento
    const today = new Date().toISOString().split('T')[0];

    Swal.fire({
      title: 'Pagar Lançamento',
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
        // Garantir que o modal não tenha overflow horizontal
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

        // Ajustar input de data especificamente
        const paymentInput = document.getElementById('payment-date') as HTMLInputElement;
        if (paymentInput) {
          paymentInput.style.width = '100%';
          paymentInput.style.maxWidth = '100%';
          paymentInput.style.margin = '0';
        }

        // Ajustar container do div para garantir alinhamento
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
        const paymentDate = result.value as string;

        console.log('=== DEBUG: Pagando lançamento ===');
        console.log('releaseToEdit.id:', this.releaseToEdit?.id);
        console.log('paymentDate:', paymentDate);

        this.isLoading = true;
        this.errorMessage = '';

        // Atualizar o lançamento com status 'paid' e data de pagamento
        const payload: any = {
          status: 'paid',
          payment_date: paymentDate
        };

        this.financialReleaseService.updateFinancialRelease(this.releaseToEdit!.id!, payload).subscribe({
          next: () => {
            this.isLoading = false;
            this.toastr.success('Lançamento marcado como pago com sucesso!', 'Sucesso');
            this.saved.emit();
            this.onClose();
          },
          error: (error) => {
            this.isLoading = false;

            console.error('=== DEBUG: Erro ao pagar lançamento ===');
            console.error('Status:', error.status);
            console.error('Error:', error);
            console.error('Error.error:', error.error);

            let errorMessage = 'Erro ao marcar lançamento como pago. Tente novamente.';
            if (error.status === 0) {
              errorMessage = 'Erro de conexão. Verifique se o servidor está rodando.';
            } else if (error.status === 403) {
              errorMessage = 'Você não tem permissão para alterar este lançamento.';
            } else if (error.status === 404) {
              errorMessage = 'Lançamento não encontrado.';
            } else if (error.error && typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error?.message) {
              errorMessage = error.error.message;
            }

            this.toastr.error(errorMessage, 'Erro');
          }
        });
      }
    });
  }

  onSave(): void {
    if (this.transactionForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const formValue = this.transactionForm.value;

      // Converter valor de formato brasileiro (0,00) para número
      const numericValue = this.parseBrazilianCurrency(formValue.value);

      // Obter category_id - formValue.category agora é o ID da categoria (número)
      const categoryId = typeof formValue.category === 'number'
        ? formValue.category
        : parseInt(formValue.category) || null;

      if (!categoryId) {
        this.isLoading = false;
        this.errorMessage = 'Por favor, selecione uma categoria.';
        return;
      }

      // Normalizar repetition para valores aceitos pelo backend
      const normalizeRepetitionValue = (rep: string): 'only' | 'installments' | 'fixed' => {
        const repLower = String(rep).toLowerCase();
        if (repLower === 'unico' || repLower === 'only') return 'only';
        if (repLower === 'parcelado' || repLower === 'installments') return 'installments';
        if (repLower === 'fixed') return 'fixed';
        // Valores antigos - converter para 'fixed'
        if (['mensal', 'semanal', 'anual'].includes(repLower)) return 'fixed';
        return 'only'; // Default
      };

      const normalizedRepetition = normalizeRepetitionValue(formValue.repetition);

      // Validações condicionais antes de enviar
      if (normalizedRepetition === 'installments') {
        const numInstallments = parseInt(formValue.number_installments_repetition) || 0;
        if (!formValue.number_installments_repetition || numInstallments < 2 || numInstallments > 240) {
          this.isLoading = false;
          this.errorMessage = 'Número de parcelas deve ser entre 2 e 240.';
          return;
        }
      } else if (normalizedRepetition === 'fixed') {
        const numRepetition = parseInt(formValue.number_repetition) || 0;
        if (!formValue.number_repetition || numRepetition < 1 || numRepetition > 240) {
          this.isLoading = false;
          this.errorMessage = 'Número de repetições deve ser entre 1 e 240.';
          return;
        }
        if (!formValue.periodicity || !['daily', 'weekly', 'monthly', 'annual'].includes(formValue.periodicity)) {
          this.isLoading = false;
          this.errorMessage = 'Selecione a frequência da recorrência.';
          return;
        }
      }

      // Obter payment_method_id (opcional)
      const paymentMethodId = formValue.payment_method && formValue.payment_method !== '' && formValue.payment_method !== null
        ? parseInt(formValue.payment_method) || null 
        : null;

      // Construir payload da API base
      const payload: any = {
        type: formValue.type,
        value: numericValue,
        date: formValue.competenceDate,
        due_date: formValue.dueDate, // Data de vencimento (obrigatória)
        payment_date: formValue.paymentDate || null,
        descrition: formValue.description || null,
        observation: formValue.observation || null,
        repetition: normalizedRepetition,
        category_id: categoryId,
        status: formValue.status || 'pending'
      };

      // Adicionar payment_method_id se foi selecionado
      if (paymentMethodId) {
        payload.payment_method_id = paymentMethodId;
      }

      // Adicionar campos condicionais baseado no tipo de repetição
      // IMPORTANTE: Remover explicitamente campos que não se aplicam ao tipo escolhido
      if (normalizedRepetition === 'installments') {
        // Parcelamento: adicionar APENAS number_installments_repetition
        const numInstallments = parseInt(formValue.number_installments_repetition) || 0;
        if (numInstallments >= 2 && numInstallments <= 240) {
          payload.number_installments_repetition = numInstallments;
        }
        // Garantir que periodicity e number_repetition NÃO sejam enviados
        delete payload.periodicity;
        delete payload.number_repetition;
      } else if (normalizedRepetition === 'fixed') {
        // Recorrente: adicionar number_repetition e periodicity
        const numRepetition = parseInt(formValue.number_repetition) || 0;
        if (numRepetition >= 1 && numRepetition <= 240) {
          payload.number_repetition = numRepetition;
        }
        if (formValue.periodicity && ['daily', 'weekly', 'monthly', 'annual'].includes(formValue.periodicity)) {
          payload.periodicity = formValue.periodicity;
        }
        // Garantir que number_installments_repetition NÃO seja enviado
        delete payload.number_installments_repetition;
      } else {
        // Para 'only', remover todos os campos condicionais
        delete payload.periodicity;
        delete payload.number_repetition;
        delete payload.number_installments_repetition;
      }

      // DEBUG: Log do payload que será enviado
      console.log('=== DEBUG: Payload sendo enviado ===');
      console.log('Tipo de operação:', (this.releaseToEdit && this.releaseToEdit.id) ? 'EDITAR' : 'CRIAR');
      console.log('Tipo de repetição:', normalizedRepetition);
      console.log('Payload completo:', JSON.stringify(payload, null, 2));
      console.log('===================================');

      // Verificar se está editando ou criando
      const isEditing = this.releaseToEdit && this.releaseToEdit.id;
      const request = isEditing && this.releaseToEdit?.id
        ? this.financialReleaseService.updateFinancialRelease(this.releaseToEdit.id, payload)
        : this.financialReleaseService.createFinancialRelease(payload);

      request.subscribe({
        next: () => {
          this.isLoading = false;
          const message = isEditing
            ? 'Lançamento atualizado com sucesso!'
            : 'Lançamento cadastrado com sucesso!';
          this.toastr.success(message, 'Sucesso');
          this.saved.emit();
          this.onClose();
        },
        error: (error) => {
          this.isLoading = false;

          // DEBUG: Log detalhado do erro
          console.error('=== DEBUG: Erro na requisição ===');
          console.error('Status:', error.status);
          console.error('Status Text:', error.statusText);
          console.error('Erro completo:', error);
          console.error('Erro.error:', error.error);
          console.error('Erro.error (JSON):', JSON.stringify(error.error, null, 2));
          console.error('=================================');

          // Tratar diferentes tipos de erro
          if (error.status === 0) {
            this.errorMessage = 'Erro de conexão. Verifique se o servidor está rodando e se o CORS está configurado.';
          } else if (error.status === 500) {
            // Erro 500 - problema no servidor
            if (error.error && typeof error.error === 'string') {
              this.errorMessage = `Erro no servidor: ${error.error}`;
            } else if (error.error?.message) {
              this.errorMessage = `Erro no servidor: ${error.error.message}`;
            } else {
              this.errorMessage = 'Erro no servidor (500). Verifique os logs do backend.';
            }
          } else if (error.status === 403) {
            this.errorMessage = isEditing
              ? 'Você não tem permissão para editar lançamentos.'
              : 'Você não tem permissão para criar lançamentos.';
          } else if (error.status === 422) {
            // Erro de validação
            const validationErrors = error.error?.errors || {};
            const firstError = Object.values(validationErrors)[0];
            this.errorMessage = firstError ? String(firstError) : 'Dados inválidos. Verifique os campos.';
          } else if (error.error && typeof error.error === 'string') {
            this.errorMessage = error.error;
          } else if (error.error?.message) {
            this.errorMessage = error.error.message;
          } else {
            this.errorMessage = isEditing
              ? 'Erro ao atualizar lançamento. Tente novamente.'
              : 'Erro ao criar lançamento. Tente novamente.';
          }
        }
      });
    } else {
      this.markFormGroupTouched(this.transactionForm);
    }
  }

  onValueInput(event: any): void {
    const input = event.target;
    let inputValue = input.value;

    // Remove tudo que não é número
    let numbers = inputValue.replace(/\D/g, '');

    // Se não tiver números, define como 0
    if (!numbers || numbers === '') {
      numbers = '0';
    }

    // Garante que tem pelo menos 2 dígitos para centavos
    while (numbers.length < 2) {
      numbers = '0' + numbers;
    }

    // Converte para número (divide por 100 para ter centavos)
    const numericValue = parseFloat(numbers) / 100;

    // Formata como moeda brasileira
    const formatted = this.formatBrazilianCurrency(numericValue);

    // Atualiza o valor do formulário sem emitir evento para evitar loops
    const control = this.transactionForm.get('value');
    if (control) {
      control.setValue(formatted, { emitEvent: false });

      // Ajusta a posição do cursor (move para o final)
      setTimeout(() => {
        input.setSelectionRange(formatted.length, formatted.length);
      }, 0);
    }
  }

  onValueBlur(): void {
    const control = this.transactionForm.get('value');
    if (control && control.value) {
      // Garante que o formato está correto ao perder o foco
      const numericValue = this.parseBrazilianCurrency(control.value);
      const formatted = this.formatBrazilianCurrency(numericValue);
      control.setValue(formatted, { emitEvent: false });
    }
  }

  private formatBrazilianCurrency(value: number): string {
    // Formata como moeda brasileira: R$ 0,00
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  private parseBrazilianCurrency(value: string): number {
    // Remove pontos de milhar e substitui vírgula por ponto
    const cleaned = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }

  private resetForm(): void {
    this.transactionForm.reset({
      type: 'despesa',
      value: '0,00',
      competenceDate: '',
      dueDate: '',
      paymentDate: '',
      description: '',
      category: '',
      repetition: 'only',
      number_installments_repetition: '',
      number_repetition: '',
      periodicity: '',
      observation: '',
      status: 'pending'
    });
    this.selectedType = 'despesa';
    this.errorMessage = '';
    // Atualizar filtro de categorias ao resetar
    this.filterCategoriesByType('despesa');
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.transactionForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return 'Campo obrigatório';
      }
      if (field.errors['minlength']) {
        return 'Mínimo de caracteres não atingido';
      }
      if (field.errors['min']) {
        return 'Valor mínimo não atingido';
      }
    }
    return '';
  }
}
