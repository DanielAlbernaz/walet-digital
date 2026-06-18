import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Category } from '../../../models/financial-release';
import { PaymentMethod } from '../../../models/payment-method.model';
import { faFilter, faSearch, faChevronDown, faChevronUp, faX } from '@fortawesome/free-solid-svg-icons';

export interface FilterState {
  search: string;
  dateFrom: string | null;
  dateTo: string | null;
  paymentDateFrom: string | null;
  paymentDateTo: string | null;
  status: string;
  categoryId: string;
  paymentMethodId: string;
  hasInstallment: string;
  valueMin: string;
  valueMax: string;
}

export interface SortState {
  field: 'date' | 'value' | 'status';
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'app-advanced-filters',
  templateUrl: './advanced-filters.component.html',
  styleUrls: ['./advanced-filters.component.css']
})
export class AdvancedFiltersComponent implements OnInit {
  @Input() categories: Category[] = [];
  @Input() paymentMethods: PaymentMethod[] = [];
  @Input() filters: FilterState = this.getInitialFilters();
  @Input() sort: SortState = { field: 'date', direction: 'desc' };

  @Output() filtersChange = new EventEmitter<FilterState>();
  @Output() sortChange = new EventEmitter<SortState>();

  filterForm: FormGroup;
  isExpanded: boolean = false;

  faFilter = faFilter;
  faSearch = faSearch;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;
  faX = faX;

  statusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'paid', label: 'Pago' },
    { value: 'pending', label: 'Pendente' },
    { value: 'overdue', label: 'Vencido' }
  ];

  installmentOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'single', label: 'Avulsos' },
    { value: 'installment', label: 'Parcelados' }
  ];

  sortFieldOptions = [
    { value: 'date', label: 'Data' },
    { value: 'value', label: 'Valor' },
    { value: 'status', label: 'Status' }
  ];

  constructor(private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      search: [''],
      dateFrom: [null],
      dateTo: [null],
      paymentDateFrom: [null],
      paymentDateTo: [null],
      status: ['all'],
      categoryId: ['all'],
      paymentMethodId: ['all'],
      hasInstallment: ['all'],
      valueMin: [''],
      valueMax: ['']
    });
  }

  ngOnInit(): void {
    // Inicializar formulário com valores atuais
    this.filterForm.patchValue({
      search: this.filters.search || '',
      dateFrom: this.filters.dateFrom || null,
      dateTo: this.filters.dateTo || null,
      paymentDateFrom: this.filters.paymentDateFrom || null,
      paymentDateTo: this.filters.paymentDateTo || null,
      status: this.filters.status || 'all',
      categoryId: this.filters.categoryId || 'all',
      paymentMethodId: this.filters.paymentMethodId || 'all',
      hasInstallment: this.filters.hasInstallment || 'all',
      valueMin: this.filters.valueMin || '',
      valueMax: this.filters.valueMax || ''
    });

    // Observar mudanças no formulário
    this.filterForm.valueChanges.subscribe(() => {
      this.emitFilters();
    });
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

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }

  clearFilters(): void {
    const initial = this.getInitialFilters();
    initial.search = this.filterForm.get('search')?.value || '';
    this.filterForm.patchValue(initial, { emitEvent: false });
    this.emitFilters();
  }

  onSortFieldChange(field: string): void {
    this.sortChange.emit({ ...this.sort, field: field as 'date' | 'value' | 'status' });
  }

  onSortDirectionToggle(): void {
    this.sortChange.emit({
      ...this.sort,
      direction: this.sort.direction === 'asc' ? 'desc' : 'asc'
    });
  }

  private emitFilters(): void {
    const formValue = this.filterForm.value;
    const filters: FilterState = {
      search: formValue.search || '',
      dateFrom: formValue.dateFrom || null,
      dateTo: formValue.dateTo || null,
      paymentDateFrom: formValue.paymentDateFrom || null,
      paymentDateTo: formValue.paymentDateTo || null,
      status: formValue.status || 'all',
      categoryId: formValue.categoryId || 'all',
      paymentMethodId: formValue.paymentMethodId || 'all',
      hasInstallment: formValue.hasInstallment || 'all',
      valueMin: formValue.valueMin || '',
      valueMax: formValue.valueMax || ''
    };
    this.filtersChange.emit(filters);
  }

  get activeFiltersCount(): number {
    let count = 0;
    const formValue = this.filterForm.value;

    if (formValue.dateFrom || formValue.dateTo) count++;
    if (formValue.paymentDateFrom || formValue.paymentDateTo) count++;
    if (formValue.status !== 'all') count++;
    if (formValue.categoryId !== 'all') count++;
    if (formValue.paymentMethodId !== 'all') count++;
    if (formValue.hasInstallment !== 'all') count++;
    if (formValue.valueMin || formValue.valueMax) count++;

    return count;
  }

  get hasActiveFilters(): boolean {
    return this.activeFiltersCount > 0;
  }

  // Getter para métodos de pagamento ativos (para usar no template)
  get activePaymentMethods(): PaymentMethod[] {
    return this.paymentMethods.filter(m => m.is_active);
  }

  // Getter para categorias padrão (para usar no template)
  get defaultCategories(): Category[] {
    return this.categories.filter(c => !c.is_custom);
  }

  // Getter para categorias personalizadas (para usar no template)
  get customCategories(): Category[] {
    return this.categories.filter(c => c.is_custom);
  }

  // Getter para métodos de pagamento padrão (para usar no template)
  get defaultPaymentMethods(): PaymentMethod[] {
    return this.activePaymentMethods.filter(m => !m.is_custom);
  }

  // Getter para métodos de pagamento personalizados (para usar no template)
  get customPaymentMethods(): PaymentMethod[] {
    return this.activePaymentMethods.filter(m => m.is_custom);
  }
}
