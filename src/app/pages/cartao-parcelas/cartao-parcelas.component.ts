import { Component } from '@angular/core';
import { faCalendar, faCreditCard } from '@fortawesome/free-solid-svg-icons';

export interface Installment {
  id: string;
  description: string;
  category: string;
  monthlyValue: number;
  totalValue: number;
  totalInstallments: number;
  paidInstallments: number;
  nextDueDate: string;
}

@Component({
  selector: 'app-cartao-parcelas',
  templateUrl: './cartao-parcelas.component.html',
  styleUrls: ['./cartao-parcelas.component.scss']
})
export class CartaoParcelasComponent {
  isModalOpen: boolean = false;

  faCalendar = faCalendar;
  faCreditCard = faCreditCard;

  installments: Installment[] = [
    {
      id: '1',
      description: 'iPhone 15 - Parcela',
      category: 'Cartão de Crédito',
      monthlyValue: 299.90,
      totalValue: 3598.80,
      totalInstallments: 12,
      paidInstallments: 0,
      nextDueDate: '2026-01-17'
    }
  ];

  get totalThisMonth(): number {
    return this.installments.reduce((sum, inst) => sum + inst.monthlyValue, 0);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const months = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    return `${date.getDate()} de ${months[date.getMonth()]}`;
  }

  getRemainingInstallments(installment: Installment): number {
    return installment.totalInstallments - installment.paidInstallments;
  }

  getProgressPercentage(installment: Installment): number {
    return (installment.paidInstallments / installment.totalInstallments) * 100;
  }

  onFabClick(): void {
    this.isModalOpen = true;
  }

  onCloseModal(): void {
    this.isModalOpen = false;
  }
}
