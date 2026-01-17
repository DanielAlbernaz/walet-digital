import { Component } from '@angular/core';
import { faClock, faCheckCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

export interface Bill {
  id: string;
  description: string;
  category: string;
  value: number;
  date: string;
  is_paid: boolean;
  portion?: string;
}

@Component({
  selector: 'app-contas-a-pagar',
  templateUrl: './contas-a-pagar.component.html',
  styleUrls: ['./contas-a-pagar.component.scss']
})
export class ContasAPagarComponent {
  isModalOpen: boolean = false;

  faClock = faClock;
  faCheckCircle = faCheckCircle;
  faExclamationTriangle = faExclamationTriangle;

  bills: Bill[] = [
    {
      id: '1',
      description: 'Netflix + Spotify + iCloud',
      category: 'Contas Fixas',
      value: 450.00,
      date: new Date().toISOString().split('T')[0], // Hoje
      is_paid: false,
    },
    {
      id: '2',
      description: 'iPhone 15 - Parcela',
      category: 'Cartão de Crédito',
      value: 299.90,
      date: new Date().toISOString().split('T')[0], // Hoje
      is_paid: false,
      portion: '3/12',
    },
    {
      id: '3',
      description: 'Aluguel',
      category: 'Aluguel',
      value: 2200.00,
      date: '2026-01-10', // Data passada - já pago
      is_paid: true,
    },
  ];

  get pendingBills(): Bill[] {
    return this.bills.filter(bill => !bill.is_paid);
  }

  get paidBills(): Bill[] {
    return this.bills.filter(bill => bill.is_paid);
  }

  get totalPending(): number {
    return this.pendingBills.reduce((sum, bill) => sum + bill.value, 0);
  }

  get totalPaid(): number {
    return this.paidBills.reduce((sum, bill) => sum + bill.value, 0);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  getDateStatus(dateStr: string): { label: string; class: string; icon: any } {
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

  onFabClick(): void {
    this.isModalOpen = true;
  }

  onCloseModal(): void {
    this.isModalOpen = false;
  }

  onPayBill(billId: string): void {
    // TODO: Implementar lógica de pagamento
    console.log('Pagar conta:', billId);
    const bill = this.bills.find(b => b.id === billId);
    if (bill) {
      bill.is_paid = true;
    }
  }
}
