import { Component } from '@angular/core';
import { DashboardLayoutComponent } from '../../shared/layout/dashboard-layout/dashboard-layout.component';
import { MonthSelectorComponent } from './components/month-selector/month-selector.component';
import { SummaryCardsComponent } from './components/summary-cards/summary-cards.component';
import { UpcomingBillsComponent, Bill } from './components/upcoming-bills/upcoming-bills.component';
import { RecentReleasesComponent, Release } from './components/recent-releases/recent-releases.component';
import { FloatingActionButtonComponent } from '../../shared/components/floating-action-button/floating-action-button.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardPageComponent {
  totalIncome: number = 10000.00;
  totalExpenses: number = 2949.90;
  balance: number = 7050.10;
  isModalOpen: boolean = false;

  upcomingBills: Bill[] = [
    {
      id: '1',
      description: 'Netflix + Spotify + iCloud',
      category: 'Contas Fixas',
      value: 450.00,
      date: new Date().toISOString(), // Hoje
    },
    {
      id: '2',
      description: 'iPhone 15 - Parcela',
      category: 'Cartão de Crédito • Parcela 3/12',
      value: 299.90,
      date: new Date().toISOString(), // Hoje
      portion: 'Parcela 3/12',
    },
  ];

  recentReleases: Release[] = [
    {
      id: '1',
      description: 'Salário',
      category: 'Salário',
      value: 8500.00,
      date: '2026-01-17',
      type: 'receita',
      is_paid: true,
    },
    {
      id: '2',
      description: 'Aluguel',
      category: 'Aluguel',
      value: 2200.00,
      date: '2026-01-17',
      type: 'despesa',
      is_paid: true,
    },
    {
      id: '3',
      description: 'Netflix + Spotify + iCloud',
      category: 'Contas Fixas',
      value: 450.00,
      date: '2026-01-17',
      type: 'despesa',
      is_paid: false,
    },
    {
      id: '4',
      description: 'iPhone 15 - Parcela',
      category: 'Cartão de Crédito',
      value: 299.90,
      date: '2026-01-17',
      type: 'despesa',
      is_paid: false,
    },
    {
      id: '5',
      description: 'Projeto Freelance',
      category: 'Freelance',
      value: 1500.00,
      date: '2026-01-17',
      type: 'receita',
      is_paid: true,
    },
  ];

  onFabClick(): void {
    this.isModalOpen = true;
  }

  onCloseModal(): void {
    this.isModalOpen = false;
  }
}
