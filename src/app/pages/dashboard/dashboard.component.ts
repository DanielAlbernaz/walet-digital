import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { FinancialReleaseService } from '../../services/financial-release/financial-release.service';
import { FinancialRelease, Category } from '../../models/financial-release';
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
export class DashboardPageComponent implements OnInit {
  totalIncome: number = 0;
  totalExpenses: number = 0;
  balance: number = 0;
  isModalOpen: boolean = false;
  isLoading: boolean = false;

  financialReleases: FinancialRelease[] = [];
  categories: Category[] = [];
  categoriesMap: Map<number, string> = new Map();

  upcomingBills: Bill[] = [];

  recentReleases: Release[] = [];
  selectedRelease: FinancialRelease | null = null; // Lançamento selecionado para edição

  constructor(
    private financialReleaseService: FinancialReleaseService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;

    // Carregar categorias e lançamentos em paralelo
    forkJoin({
      categories: this.financialReleaseService.getCategories(),
      releases: this.financialReleaseService.getFinancialReleases()
    }).subscribe({
      next: ({ categories, releases }) => {
        // Processar categorias primeiro
        this.categories = categories;
        this.categoriesMap.clear();
        categories.forEach(cat => {
          this.categoriesMap.set(cat.id, cat.title);
        });

        // Depois processar lançamentos (que dependem das categorias)
        this.financialReleases = releases;
        this.calculateSummary(releases);
        this.processBills(releases);
        this.processRecentReleases(releases);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar dados:', error);
        this.isLoading = false;
      }
    });
  }

  private calculateSummary(releases: FinancialRelease[]): void {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filtrar lançamentos do mês atual
    const currentMonthReleases = releases.filter(release => {
      const releaseDate = new Date(release.date);
      return releaseDate.getMonth() === currentMonth && releaseDate.getFullYear() === currentYear;
    });

    // Calcular receitas e despesas
    this.totalIncome = currentMonthReleases
      .filter(r => r.type === 'receita')
      .reduce((sum, r) => sum + parseFloat(String(r.value)), 0);

    this.totalExpenses = currentMonthReleases
      .filter(r => r.type === 'despesa')
      .reduce((sum, r) => sum + parseFloat(String(r.value)), 0);

    this.balance = this.totalIncome - this.totalExpenses;
  }

  private processBills(releases: FinancialRelease[]): void {
    // Filtrar despesas pendentes ou vencidas (status !== 'paid')
    const pendingBills = releases
      .filter(r => {
        if (r.type !== 'despesa') return false;
        // Usar status do backend se disponível, senão usar lógica antiga como fallback
        return r.status ? r.status !== 'paid' : !r.payment_date;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5); // Top 5

    this.upcomingBills = pendingBills.map(release => ({
      id: String(release.id),
      description: release.descrition || 'Sem descrição',
      category: this.getCategoryName(release.category_id),
      value: parseFloat(String(release.value)),
      date: release.date, // Sempre usar date (data de vencimento)
      portion: release.portion || undefined
    }));
  }

  private processRecentReleases(releases: FinancialRelease[]): void {
    // Ordenar por data mais recente e pegar os últimos 5
    const sorted = [...releases].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    }).slice(0, 5);

    this.recentReleases = sorted.map(release => ({
      id: String(release.id),
      description: release.descrition || 'Sem descrição',
      category: this.getCategoryName(release.category_id),
      value: parseFloat(String(release.value)),
      date: release.date,
      type: release.type,
      is_paid: release.status ? release.status === 'paid' : !!release.payment_date
    }));
  }

  private getCategoryName(categoryId: number): string {
    // Buscar no mapa de categorias carregadas da API
    return this.categoriesMap.get(categoryId) || 'Outros';
  }


  onFabClick(): void {
    this.selectedRelease = null; // Criar novo lançamento
    this.isModalOpen = true;
  }

  onReleaseClick(release: Release): void {
    // Buscar o lançamento completo da lista de financialReleases
    const fullRelease = this.financialReleases.find(r => String(r.id) === release.id);
    if (fullRelease) {
      this.selectedRelease = fullRelease;
      this.isModalOpen = true;
    }
  }

  onCloseModal(): void {
    this.isModalOpen = false;
    this.selectedRelease = null; // Limpar lançamento selecionado
  }

  onTransactionSaved(): void {
    // Recarregar dados após salvar (categorias podem ter mudado também)
    this.loadData();
  }
}
