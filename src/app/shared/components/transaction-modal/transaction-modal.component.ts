import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../services/auth/auth.service';
import { FinancialReleaseService } from '../../../services/financial-release/financial-release.service';
import { CreateFinancialReleaseRequest, Category, FinancialRelease } from '../../../models/financial-release';
import { faTimes, faCalendar } from '@fortawesome/free-solid-svg-icons';

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

  categories: Category[] = [];
  filteredCategories: Category[] = [];

  repetitionOptions: { value: string; label: string }[] = [];

  statusOptions: { value: string; label: string }[] = [
    { value: 'pending', label: 'Pendente' },
    { value: 'paid', label: 'Pago' },
    { value: 'overdue', label: 'Atrasado' }
  ];

  isLoading: boolean = false;
  isLoadingCategories: boolean = false;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private financialReleaseService: FinancialReleaseService
  ) {
    this.transactionForm = this.fb.group({
      type: ['despesa', Validators.required],
      value: ['0,00', [Validators.required]],
      competenceDate: ['', Validators.required],
      paymentDate: [''],
      description: ['', [Validators.required, Validators.minLength(3)]],
      category: ['', Validators.required],
      repetition: ['unico', Validators.required],
      installments: [''], // Quantidade de parcelas
      observation: [''],
      status: ['pending', Validators.required] // Status do lançamento
    });
  }

  ngOnInit(): void {
    // Carregar opções de repetição baseadas nas features do plano
    this.loadRepetitionOptions();

    // Carregar categorias da API
    this.loadCategories();

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

    // Gerenciar visibilidade do campo de parcelas
    this.transactionForm.get('repetition')?.valueChanges.subscribe(repetition => {
      const installmentsControl = this.transactionForm.get('installments');
      if (repetition === 'parcelado') {
        installmentsControl?.setValidators([Validators.required, Validators.min(1)]);
      } else {
        installmentsControl?.clearValidators();
        installmentsControl?.setValue('');
      }
      installmentsControl?.updateValueAndValidity();
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

        // Preencher formulário com dados do lançamento
        // Usar setTimeout para garantir que o DOM esteja pronto
        setTimeout(() => {
          this.transactionForm.patchValue({
            type: normalizedType,
            value: formattedValue,
            competenceDate: formatDateForInput(fullRelease.date),
            paymentDate: formatDateForInput(fullRelease.payment_date),
            description: fullRelease.descrition || '',
            category: fullRelease.category_id || '',
            repetition: fullRelease.repetition || 'unico',
            installments: fullRelease.portion ? this.extractInstallments(fullRelease.portion) : '',
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

  get isParceladoSelected(): boolean {
    return this.transactionForm.get('repetition')?.value === 'parcelado';
  }

  hasInstallmentsFeature(): boolean {
    return this.authService.hasFeature('installments');
  }

  private loadRepetitionOptions(): void {
    this.repetitionOptions = [
      { value: 'unico', label: 'Único' },
      { value: 'mensal', label: 'Mensal' },
      { value: 'semanal', label: 'Semanal' },
      { value: 'anual', label: 'Anual' }
    ];

    // Adicionar "Parcelado" apenas se tiver a feature
    if (this.hasInstallmentsFeature()) {
      this.repetitionOptions.push({ value: 'parcelado', label: 'Parcelado' });
    }
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

      // Construir payload da API
      const payload: CreateFinancialReleaseRequest = {
        type: formValue.type,
        value: numericValue,
        date: formValue.competenceDate,
        payment_date: formValue.paymentDate || null,
        descrition: formValue.description || null,
        observation: formValue.observation || null,
        repetition: formValue.repetition,
        portion: formValue.repetition === 'parcelado' && formValue.installments
          ? `1/${formValue.installments}`
          : null,
        category_id: categoryId,
        status: formValue.status || 'pending' // Incluir status no payload
      };

      // Verificar se está editando ou criando
      const isEditing = this.releaseToEdit && this.releaseToEdit.id;
      const request = isEditing && this.releaseToEdit?.id
        ? this.financialReleaseService.updateFinancialRelease(this.releaseToEdit.id, payload)
        : this.financialReleaseService.createFinancialRelease(payload);

      request.subscribe({
        next: () => {
          this.isLoading = false;
          this.saved.emit();
          this.onClose();
        },
        error: (error) => {
          this.isLoading = false;

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
      paymentDate: '',
      description: '',
      category: '',
      repetition: 'unico',
      installments: '',
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
