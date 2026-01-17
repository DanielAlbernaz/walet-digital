import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { faClock, faCheckCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { FinancialReleaseService } from '../../services/financial-release/financial-release.service';
import { FinancialRelease, Category } from '../../models/financial-release';

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
export class ContasAPagarComponent implements OnInit {
  isModalOpen: boolean = false;
  isLoading: boolean = false;

  faClock = faClock;
  faCheckCircle = faCheckCircle;
  faExclamationTriangle = faExclamationTriangle;

  financialReleases: FinancialRelease[] = [];
  categoriesMap: Map<number, string> = new Map();
  bills: Bill[] = [];

  constructor(
    private financialReleaseService: FinancialReleaseService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    
    forkJoin({
      categories: this.financialReleaseService.getCategories(),
      releases: this.financialReleaseService.getFinancialReleases()
    }).subscribe({
      next: ({ categories, releases }) => {
        // Processar categorias primeiro
        this.categoriesMap.clear();
        categories.forEach(cat => {
          this.categoriesMap.set(cat.id, cat.title);
        });
        
        // Depois processar lançamentos
        this.financialReleases = releases;
        this.processBills(releases);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar dados:', error);
        this.isLoading = false;
        this.bills = [];
      }
    });
  }

  private processBills(releases: FinancialRelease[]): void {
    // Filtrar apenas despesas
    const expenseReleases = releases.filter(r => r.type === 'despesa');
    
    this.bills = expenseReleases.map(release => ({
      id: String(release.id),
      description: release.descrition || 'Sem descrição',
      category: this.getCategoryName(release.category_id),
      value: parseFloat(String(release.value)),
      date: release.date, // Sempre usar a data de vencimento/competência
      is_paid: release.status ? release.status === 'paid' : !!release.payment_date,
      portion: release.portion || undefined
    }));
  }

  private getCategoryName(categoryId: number): string {
    return this.categoriesMap.get(categoryId) || 'Outros';
  }

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
    const bill = this.bills.find(b => b.id === billId);
    if (!bill) return;

    const releaseId = parseInt(billId);
    const release = this.financialReleases.find(r => r.id === releaseId);
    if (!release) return;

    // Atualizar payment_date para hoje
    const today = new Date().toISOString().split('T')[0];
    
    this.financialReleaseService.updateFinancialRelease(releaseId, {
      type: release.type,
      value: release.value,
      date: release.date,
      payment_date: today,
      descrition: release.descrition,
      observation: release.observation,
      repetition: release.repetition,
      portion: release.portion,
      category_id: release.category_id
    }).subscribe({
      next: () => {
        // Recarregar dados após atualizar
        this.loadData();
      },
      error: (error) => {
        console.error('Erro ao marcar conta como paga:', error);
        alert('Erro ao marcar conta como paga. Tente novamente.');
      }
    });
  }

  onTransactionSaved(): void {
    this.loadData();
  }
}
