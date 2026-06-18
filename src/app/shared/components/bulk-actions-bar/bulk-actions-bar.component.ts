import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Category } from '../../../models/category.model';
import { PaymentMethod } from '../../../models/payment-method.model';

@Component({
  selector: 'app-bulk-actions-bar',
  templateUrl: './bulk-actions-bar.component.html',
  styleUrls: ['./bulk-actions-bar.component.scss']
})
export class BulkActionsBarComponent {
  @Input() selectedCount: number = 0;
  @Input() type: 'receita' | 'despesa' = 'despesa';
  @Input() categories: Category[] = [];
  @Input() paymentMethods: PaymentMethod[] = [];
  @Input() isLoading: boolean = false;

  @Output() cancelSelection = new EventEmitter<void>();
  @Output() markAsPaid = new EventEmitter<void>();
  @Output() markAsPaidWithDate = new EventEmitter<string>();
  @Output() changeCategory = new EventEmitter<number>();
  @Output() changePaymentMethod = new EventEmitter<number | null>();

  showDateInput = false;
  paymentDate: string = '';

  get paidLabel(): string {
    return this.type === 'receita' ? 'Marcar como recebido' : 'Marcar como pago';
  }

  openDateInput(): void {
    this.showDateInput = true;
    if (!this.paymentDate) {
      const today = new Date();
      this.paymentDate = today.toISOString().slice(0, 10);
    }
  }

  applyMarkAsPaidWithDate(): void {
    if (this.paymentDate) {
      this.markAsPaidWithDate.emit(this.paymentDate);
      this.showDateInput = false;
      this.paymentDate = '';
    }
  }

  onCategoryChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    if (value === '') return;
    const id = parseInt(value, 10);
    if (!isNaN(id)) {
      this.changeCategory.emit(id);
    }
    select.value = '';
  }

  onPaymentMethodChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    if (value === '') {
      return;
    }
    if (value === 'clear') {
      this.changePaymentMethod.emit(null);
    } else {
      const id = parseInt(value, 10);
      if (!isNaN(id)) {
        this.changePaymentMethod.emit(id);
      }
    }
    select.value = '';
  }
}
