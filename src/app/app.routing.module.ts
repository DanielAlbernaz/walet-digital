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
    path: 'categorias',
    component: CategoriasComponent,
    canActivate: [authGuard]
  },
  {
    path: 'relatorios',
    component: RelatoriosComponent,
    canActivate: [authGuard]
  },
  {
    path: 'planejamento',
    component: PlanejamentoComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: PlanningDashboardComponent },
      { path: 'diagnostico', component: DiagnosticoComponent },
      { path: 'reducao', component: PlanoReducaoComponent },
      { path: 'projecoes', component: ProjecoesComponent },
      { path: 'dividas', component: QuitacaoDividasComponent },
      { path: 'metas', component: MetasComponent },
      { path: 'ia', component: ChatIaComponent }
    ]
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
