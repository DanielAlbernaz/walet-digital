import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PaymentMethodService } from '../../../services/payment-method/payment-method.service';
import { PaymentMethod, CreatePaymentMethodRequest, UpdatePaymentMethodRequest } from '../../../models/payment-method.model';
import { ToastrService } from 'ngx-toastr';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-payment-method-modal',
  templateUrl: './payment-method-modal.component.html',
  styleUrls: ['./payment-method-modal.component.scss']
})
export class PaymentMethodModalComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() methodToEdit: PaymentMethod | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  methodForm: FormGroup;
  faTimes = faTimes;
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private paymentMethodService: PaymentMethodService,
    private toastr: ToastrService
  ) {
    this.methodForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      is_active: [true]
    });
  }

  ngOnInit(): void {
    if (this.methodToEdit) {
      this.populateForm(this.methodToEdit);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['methodToEdit'] && this.methodToEdit) {
      this.populateForm(this.methodToEdit);
    } else if (changes['isOpen'] && this.isOpen && !this.methodToEdit) {
      this.methodForm.reset({
        name: '',
        is_active: true
      });
    }
  }

  populateForm(method: PaymentMethod): void {
    this.methodForm.patchValue({
      name: method.name,
      is_active: method.is_active
    });
  }

  onClose(): void {
    this.close.emit();
  }

  onToggleChange(event: any): void {
    const isChecked = event.target.checked;
    this.methodForm.patchValue({ is_active: isChecked }, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.methodForm.invalid) {
      this.markFormGroupTouched(this.methodForm);
      return;
    }

    this.isLoading = true;
    const formValue = this.methodForm.value;

    if (this.methodToEdit) {
      const updateData: UpdatePaymentMethodRequest = {
        name: formValue.name,
        is_active: formValue.is_active
      };

      this.paymentMethodService.update(this.methodToEdit.id, updateData).subscribe({
        next: () => {
          this.toastr.success('Método de pagamento atualizado com sucesso.', 'Sucesso');
          this.isLoading = false;
          this.saved.emit();
        },
        error: (error) => {
          this.isLoading = false;
          if (error.status === 422) {
            this.toastr.error('Já existe um método de pagamento com este nome.', 'Erro');
          } else if (error.status === 403) {
            this.toastr.error('Funcionalidade disponível apenas no plano Pro.', 'Erro');
          } else {
            this.toastr.error('Erro ao atualizar método de pagamento.', 'Erro');
          }
        }
      });
    } else {
      const createData: CreatePaymentMethodRequest = {
        name: formValue.name,
        is_active: formValue.is_active
      };

      this.paymentMethodService.create(createData).subscribe({
        next: () => {
          this.toastr.success('Método de pagamento criado com sucesso.', 'Sucesso');
          this.isLoading = false;
          this.saved.emit();
        },
        error: (error) => {
          this.isLoading = false;
          if (error.status === 422) {
            this.toastr.error('Já existe um método de pagamento com este nome.', 'Erro');
          } else if (error.status === 400) {
            this.toastr.error('Usuário não possui uma conta financeira ativa.', 'Erro');
          } else if (error.status === 403) {
            this.toastr.error('Funcionalidade disponível apenas no plano Pro.', 'Erro');
          } else {
            this.toastr.error('Erro ao criar método de pagamento.', 'Erro');
          }
        }
      });
    }
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

  get isEditing(): boolean {
    return !!this.methodToEdit;
  }
}
