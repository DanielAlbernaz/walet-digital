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
import { ConfiguracoesComponent } from './pages/configuracoes/configuracoes.component';
import { PaymentMethodModalComponent } from './shared/components/payment-method-modal/payment-method-modal.component';
import { FloatingActionButtonComponent } from './shared/components/floating-action-button/floating-action-button.component';
import { TransactionModalComponent } from './shared/components/transaction-modal/transaction-modal.component';
import { UpgradeModalComponent } from './shared/components/upgrade-modal/upgrade-modal.component';
import { InviteModalComponent } from './shared/components/invite-modal/invite-modal.component';
import { LoadingOverlayComponent } from './shared/components/loading-overlay/loading-overlay.component';
import { FinancialPageHeaderComponent } from './shared/components/financial-page-header/financial-page-header.component';
import { FinancialSearchBarComponent } from './shared/components/financial-search-bar/financial-search-bar.component';
import { FinancialListComponent } from './shared/components/financial-list/financial-list.component';
import { FinancialEmptyStateComponent } from './shared/components/financial-empty-state/financial-empty-state.component';
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
    ConfiguracoesComponent,
    PaymentMethodModalComponent,
    FloatingActionButtonComponent,
    TransactionModalComponent,
    UpgradeModalComponent,
    InviteModalComponent,
    LoadingOverlayComponent,
    FinancialPageHeaderComponent,
    FinancialSearchBarComponent,
    FinancialListComponent,
    FinancialEmptyStateComponent,
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
      maxOpened: 5
    })
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
