import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { ForgotPasswordComponent } from './pages/auth/forgot-password/forgot-password.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard.component';
import { ReceitasComponent } from './pages/receitas/receitas.component';
import { DespesasComponent } from './pages/despesas/despesas.component';
import { ContasAPagarComponent } from './pages/contas-a-pagar/contas-a-pagar.component';
import { CartaoParcelasComponent } from './pages/cartao-parcelas/cartao-parcelas.component';
import { MetodosPagamentoComponent } from './pages/metodos-pagamento/metodos-pagamento.component';
import { ConfiguracoesComponent } from './pages/configuracoes/configuracoes.component';
import { authGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },
  {
    path: 'dashboard',
    component: DashboardPageComponent,
    canActivate: [authGuard]
  },
  {
    path: 'receitas',
    component: ReceitasComponent,
    canActivate: [authGuard]
  },
  {
    path: 'despesas',
    component: DespesasComponent,
    canActivate: [authGuard]
  },
  {
    path: 'contas',
    component: ContasAPagarComponent,
    canActivate: [authGuard]
  },
  {
    path: 'cartao-parcelas',
    component: CartaoParcelasComponent,
    canActivate: [authGuard]
  },
  {
    path: 'metodos-pagamento',
    component: MetodosPagamentoComponent,
    canActivate: [authGuard]
  },
  {
    path: 'configuracoes',
    component: ConfiguracoesComponent,
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
