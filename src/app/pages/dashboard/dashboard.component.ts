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
  selectedMonth: Date = new Date(); // Mês selecionado no seletor

  constructor(
    private financialReleaseService: FinancialReleaseService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;

    const selectedMonth = this.selectedMonth.getMonth() + 1; // getMonth retorna 0-11, backend espera 1-12
    const selectedYear = this.selectedMonth.getFullYear();

    // Calcular range de datas para due_date (para contas próximas do vencimento)
    // Incluir vencidos e até 5 dias no futuro
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fiveDaysLater = new Date(today);
    fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);

    // Formatar datas para YYYY-MM-DD
    const formatDateForFilter = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Usar uma data muito antiga para incluir vencidos (começar do início do mês selecionado ou antes)
    const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
    const startDateStr = formatDateForFilter(startOfMonth);
    const fiveDaysLaterStr = formatDateForFilter(fiveDaysLater);

    // Otimização: Reduzir de 6 para 3 requisições HTTP
    // Calcular revenues, expenses e recentReleases no frontend a partir de allReleases
    // Usar per_page=100 para garantir que pegamos todos os lançamentos do mês
    forkJoin({
      categories: this.financialReleaseService.getCategories(),
      // Todos os lançamentos do mês (para busca/edição e cálculos)
      // per_page=100 garante que pegamos todos do mês (máximo permitido)
      // Se o backend não suportar per_page ainda, remover temporariamente
      allReleases: this.financialReleaseService.getFinancialReleasesWithFilters({
        month: selectedMonth,
        year: selectedYear,
        order_by: 'date',
        order_direction: 'desc'
        // per_page: 100 // Temporariamente removido devido ao erro 500
      }),
      // Despesas próximas do vencimento (mês selecionado, até 5 dias ou vencidas)
      // O filtro de "não pagas" será feito no frontend pois status pode ser null
      // per_page=10 é suficiente pois limitamos a 5 no frontend
      upcomingBillsData: this.financialReleaseService.getFinancialReleasesWithFilters({
        month: selectedMonth,
        year: selectedYear,
        type: 'expense',
        due_date_from: startDateStr, // Desde início do mês (inclui vencidas)
        due_date_to: fiveDaysLaterStr, // Até 5 dias no futuro
        order_by: 'due_date',
        order_direction: 'asc'
        // per_page: 10 // Temporariamente removido devido ao erro 500
      })
    }).subscribe({
      next: ({ categories, allReleases, upcomingBillsData }) => {

        // Processar categorias primeiro
        this.categories = categories || [];
        this.categoriesMap.clear();
        (categories || []).forEach(cat => {
          this.categoriesMap.set(cat.id, cat.title);
        });

        // Armazenar todos os lançamentos para busca/edição
        this.financialReleases = allReleases || [];

        // Calcular totais no frontend (mais rápido que fazer 2 requisições adicionais)
        const revenues = (allReleases || []).filter(r => {
          const releaseType = String(r.type).toLowerCase();
          return releaseType === 'receita' || releaseType === 'revenue';
        });
        const expenses = (allReleases || []).filter(r => {
          const releaseType = String(r.type).toLowerCase();
          return releaseType === 'despesa' || releaseType === 'expense';
        });

        // Excluir cancelados dos totais (mostrar na lista, mas não somar)
        this.totalIncome = revenues
          .filter(r => r.status !== 'cancelled')
          .reduce((sum, r) => sum + parseFloat(String(r.value || 0)), 0);
        this.totalExpenses = expenses
          .filter(r => r.status !== 'cancelled')
          .reduce((sum, r) => sum + parseFloat(String(r.value || 0)), 0);
        this.balance = this.totalIncome - this.totalExpenses;

        // Processar contas próximas do vencimento (filtrar apenas não pagas e até 5 dias)
        this.processBills(upcomingBillsData || []);

        // Processar últimos lançamentos (já vem ordenado do backend)
        this.processRecentReleases(allReleases || []);

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar dados:', error);
        this.isLoading = false;
        // Definir valores padrão em caso de erro
        this.totalIncome = 0;
        this.totalExpenses = 0;
        this.balance = 0;
        this.upcomingBills = [];
        this.recentReleases = [];
      }
    });
  }


  private processBills(releases: FinancialRelease[]): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filtrar apenas despesas não pagas (os dados já vêm filtrados por mês e due_date do backend)
    const pendingBills = releases
      .filter(r => {
        // Apenas despesas não pagas
        const isNotPaid = r.status ? r.status !== 'paid' : !r.payment_date;
        if (!isNotPaid) return false;

        // Verificar se está dentro do range de até 5 dias (incluindo vencidos)
        const vencimentoDate = r.due_date || r.date;
        if (!vencimentoDate) return false;

        const dueDate = new Date(vencimentoDate);
        if (isNaN(dueDate.getTime())) return false;

        dueDate.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Até 5 dias ou vencidos
        return daysUntilDue <= 5;
      })
      .slice(0, 5); // Top 5 (já vem ordenado do backend)

    this.upcomingBills = pendingBills.map(release => ({
      id: String(release.id),
      description: release.descrition || 'Sem descrição',
      category: this.getCategoryName(release.category_id),
      value: parseFloat(String(release.value)),
      date: release.date, // Data de competência
      due_date: release.due_date || release.date, // Data de vencimento (usada para tags)
      portion: release.portion || undefined
    }));
  }

  private processRecentReleases(releases: FinancialRelease[]): void {
    // Dados já vêm filtrados e ordenados do backend
    // Pegar apenas os 5 primeiros
    const sorted = releases.slice(0, 5);

    this.recentReleases = sorted.map(release => ({
      id: String(release.id),
      description: release.descrition || 'Sem descrição',
      category: this.getCategoryName(release.category_id),
      value: parseFloat(String(release.value)),
      date: release.date,
      type: release.type,
      is_paid: release.status ? release.status === 'paid' : !!release.payment_date,
      status: release.status || undefined,
      portion: release.portion || null,
      release_type: release.release_type || undefined,
      repetition: release.repetition || undefined,
      due_date: release.due_date || undefined,
      updated_at: release.updated_at || undefined
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

  onBillClick(bill: Bill): void {
    // Buscar o lançamento completo da lista de financialReleases
    const fullRelease = this.financialReleases.find(r => String(r.id) === bill.id);
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

  onMonthChanged(selectedMonth: Date): void {
    this.selectedMonth = selectedMonth;
    // Recarregar todos os dados com os filtros do novo mês selecionado
    this.loadData();
  }
}
