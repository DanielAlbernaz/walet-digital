import { Component, Input, Output, EventEmitter } from '@angular/core';
import { faCalendar, faExclamationTriangle, faClock } from '@fortawesome/free-solid-svg-icons';

export interface Bill {
  id: string;
  description: string;
  category: string;
  value: number;
  date: string; // Data de competência (para manter compatibilidade)
  due_date?: string; // Data de vencimento (usada para as tags)
  portion?: string;
}

@Component({
  selector: 'app-upcoming-bills',
  templateUrl: './upcoming-bills.component.html',
  styleUrls: ['./upcoming-bills.component.scss']
})
export class UpcomingBillsComponent {
  @Input() bills: Bill[] = [];
  @Output() billClick = new EventEmitter<Bill>();

  faCalendar = faCalendar;
  faExclamationTriangle = faExclamationTriangle;
  faClock = faClock;

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  getDateStatus(dateStr: string): { label: string; class: string; icon: any } {
    // Usar due_date se disponível, senão usar date
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

  onBillClick(bill: Bill): void {
    this.billClick.emit(bill);
  }
}
