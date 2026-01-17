import { Component, Input } from '@angular/core';
import { faCalendar, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

export interface Bill {
  id: string;
  description: string;
  category: string;
  value: number;
  date: string;
  portion?: string;
}

@Component({
  selector: 'app-upcoming-bills',
  templateUrl: './upcoming-bills.component.html',
  styleUrls: ['./upcoming-bills.component.scss']
})
export class UpcomingBillsComponent {
  @Input() bills: Bill[] = [];

  faCalendar = faCalendar;
  faExclamationTriangle = faExclamationTriangle;

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  getDateLabel(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) return 'Hoje';
    if (date.getTime() === tomorrow.getTime()) return 'Amanhã';
    if (date < today) return 'Vencido';

    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${date.getDate()} de ${months[date.getMonth()]}`;
  }

  getDateClass(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date < today) return 'date-badge date-overdue';
    if (date.getTime() === today.getTime()) return 'date-badge date-today';
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.getTime() === tomorrow.getTime()) return 'date-badge date-tomorrow';
    
    return 'date-badge date-upcoming';
  }

  isPast(dateStr: string): boolean {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < today;
  }
}
