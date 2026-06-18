import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { AppRoutingModule } from './app.routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { ForgotPasswordComponent } from './pages/auth/forgot-password/forgot-password.component';
import { NavbarComponent } from './shared/layout/navbar/navbar.component';
import { SidebarComponent } from './shared/layout/sidebar/sidebar.component';
import { DashboardLayoutComponent } from './shared/layout/dashboard-layout/dashboard-layout.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard.component';
import { MonthSelectorComponent } from './pages/dashboard/components/month-selector/month-selector.component';
import { SummaryCardsComponent } from './pages/dashboard/components/summary-cards/summary-cards.component';
import { UpcomingBillsComponent } from './pages/dashboard/components/upcoming-bills/upcoming-bills.component';
import { RecentReleasesComponent } from './pages/dashboard/components/recent-releases/recent-releases.component';
import { ReceitasComponent } from './pages/receitas/receitas.component';
import { DespesasComponent } from './pages/despesas/despesas.component';
import { ContasAPagarComponent } from './pages/contas-a-pagar/contas-a-pagar.component';
import { CartaoParcelasComponent } from './pages/cartao-parcelas/cartao-parcelas.component';
import { MetodosPagamentoComponent } from './pages/metodos-pagamento/metodos-pagamento.component';
import { CategoriasComponent } from './pages/categorias/categorias.component';
import { RelatoriosComponent } from './pages/relatorios/relatorios.component';
import { ConfiguracoesComponent } from './pages/configuracoes/configuracoes.component';
import { PlanejamentoComponent } from './pages/planejamento/planejamento.component';
import { PlanningDashboardComponent } from './pages/planejamento/planning-dashboard/planning-dashboard.component';
import { DiagnosticoComponent } from './pages/planejamento/diagnostico/diagnostico.component';
import { PlanoReducaoComponent } from './pages/planejamento/plano-reducao/plano-reducao.component';
import { ProjecoesComponent } from './pages/planejamento/projecoes/projecoes.component';
import { QuitacaoDividasComponent } from './pages/planejamento/quitacao-dividas/quitacao-dividas.component';
import { MetasComponent } from './pages/planejamento/metas/metas.component';
import { ChatIaComponent } from './pages/planejamento/chat-ia/chat-ia.component';
import { ScoreGaugeComponent } from './shared/components/score-gauge/score-gauge.component';
import { PaymentMethodModalComponent } from './shared/components/payment-method-modal/payment-method-modal.component';
import { CategoryModalComponent } from './shared/components/category-modal/category-modal.component';
import { FloatingActionButtonComponent } from './shared/components/floating-action-button/floating-action-button.component';
import { TransactionModalComponent } from './shared/components/transaction-modal/transaction-modal.component';
import { UpgradeModalComponent } from './shared/components/upgrade-modal/upgrade-modal.component';
import { InviteModalComponent } from './shared/components/invite-modal/invite-modal.component';
import { LoadingOverlayComponent } from './shared/components/loading-overlay/loading-overlay.component';
import { FinancialPageHeaderComponent } from './shared/components/financial-page-header/financial-page-header.component';
import { FinancialSearchBarComponent } from './shared/components/financial-search-bar/financial-search-bar.component';
import { FinancialListComponent } from './shared/components/financial-list/financial-list.component';
import { FinancialEmptyStateComponent } from './shared/components/financial-empty-state/financial-empty-state.component';
import { FilterSummaryComponent } from './shared/components/filter-summary/filter-summary.component';
import { AdvancedFiltersComponent } from './shared/components/advanced-filters/advanced-filters.component';
import { BulkActionsBarComponent } from './shared/components/bulk-actions-bar/bulk-actions-bar.component';
import { OfxImportModalComponent } from './shared/components/ofx-import-modal/ofx-import-modal.component';
import { PdfImportModalComponent } from './shared/components/pdf-import-modal/pdf-import-modal.component';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { RoleDirective } from './directives/role.directive';
import { PermissionDirective } from './directives/permission.directive';
import { FeatureDirective } from './directives/feature.directive';
import { ToastrModule } from 'ngx-toastr';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    ForgotPasswordComponent,
    NavbarComponent,
    SidebarComponent,
    DashboardLayoutComponent,
    DashboardPageComponent,
    MonthSelectorComponent,
    SummaryCardsComponent,
    UpcomingBillsComponent,
    RecentReleasesComponent,
    ReceitasComponent,
    DespesasComponent,
    ContasAPagarComponent,
    CartaoParcelasComponent,
    MetodosPagamentoComponent,
    CategoriasComponent,
    RelatoriosComponent,
    ConfiguracoesComponent,
    PlanejamentoComponent,
    PlanningDashboardComponent,
    DiagnosticoComponent,
    PlanoReducaoComponent,
    ProjecoesComponent,
    QuitacaoDividasComponent,
    MetasComponent,
    ChatIaComponent,
    ScoreGaugeComponent,
    PaymentMethodModalComponent,
    CategoryModalComponent,
    FloatingActionButtonComponent,
    TransactionModalComponent,
    UpgradeModalComponent,
    InviteModalComponent,
    LoadingOverlayComponent,
    FinancialPageHeaderComponent,
    FinancialSearchBarComponent,
    FinancialListComponent,
    FinancialEmptyStateComponent,
    FilterSummaryComponent,
    AdvancedFiltersComponent,
    BulkActionsBarComponent,
    OfxImportModalComponent,
    PdfImportModalComponent,
    RoleDirective,
    PermissionDirective,
    FeatureDirective
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    ToastrModule.forRoot({
      positionClass: 'toast-top-right',
      timeOut: 3000,
      progressBar: true,
      closeButton: true,
      tapToDismiss: true,
      preventDuplicates: true,
      maxOpened: 5,
      enableHtml: false,
      newestOnTop: true,
      extendedTimeOut: 1000
    }),
    BaseChartDirective
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    provideCharts(withDefaultRegisterables())
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
