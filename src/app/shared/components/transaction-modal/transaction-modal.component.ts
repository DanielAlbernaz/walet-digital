import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { faTimes, faCalendar } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-transaction-modal',
  templateUrl: './transaction-modal.component.html',
  styleUrls: ['./transaction-modal.component.scss']
})
export class TransactionModalComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();

  transactionForm: FormGroup;
  selectedType: 'receita' | 'despesa' = 'despesa';

  faTimes = faTimes;
  faCalendar = faCalendar;

  categories = [
    'Alimentação',
    'Transporte',
    'Moradia',
    'Saúde',
    'Educação',
    'Lazer',
    'Salário',
    'Freelance',
    'Cartão de Crédito',
    'Contas Fixas',
    'Aluguel',
    'Outros'
  ];

  repetitionOptions = [
    { value: 'unico', label: 'Único' },
    { value: 'mensal', label: 'Mensal' },
    { value: 'semanal', label: 'Semanal' },
    { value: 'anual', label: 'Anual' },
    { value: 'parcelado', label: 'Parcelado' }
  ];

  constructor(private fb: FormBuilder) {
    this.transactionForm = this.fb.group({
      type: ['despesa', Validators.required],
      value: ['0,00', [Validators.required]],
      competenceDate: ['', Validators.required],
      paymentDate: [''],
      description: ['', [Validators.required, Validators.minLength(3)]],
      category: ['', Validators.required],
      repetition: ['unico', Validators.required],
      installments: [''], // Quantidade de parcelas
      observation: ['']
    });
  }

  ngOnInit(): void {
    this.transactionForm.get('type')?.valueChanges.subscribe(type => {
      this.selectedType = type;
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

  get isParceladoSelected(): boolean {
    return this.transactionForm.get('repetition')?.value === 'parcelado';
  }

  selectType(type: 'receita' | 'despesa'): void {
    this.transactionForm.patchValue({ type });
    this.selectedType = type;
  }

  onClose(): void {
    this.close.emit();
    this.resetForm();
  }

  onSave(): void {
    if (this.transactionForm.valid) {
      const formValue = this.transactionForm.value;
      console.log('Transaction data:', formValue);
      // TODO: Implementar salvamento
      this.onClose();
    } else {
      this.markFormGroupTouched(this.transactionForm);
    }
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
      observation: ''
    });
    this.selectedType = 'despesa';
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
