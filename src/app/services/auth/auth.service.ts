import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, tap, map } from 'rxjs';
import { ApiService } from '../api/api.service';
import { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, User } from '../../models/user';
import { FinanceAccount, UserRole } from '../../models/finance-account';
import { Plan, PlanFeatures } from '../../models/plan';
import { environment } from '../../../environments/environment';

export interface AuthState {
  user: User | null;
  financeAccount: FinanceAccount | null;
  plan: Plan | null;
  role: UserRole | null;
  features: PlanFeatures | null;
  token: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'auth_token';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private currentFinanceAccountSubject = new BehaviorSubject<FinanceAccount | null>(null);
  private currentRoleSubject = new BehaviorSubject<UserRole | null>(null);
  private currentPlanSubject = new BehaviorSubject<Plan | null>(null);
  private currentFeaturesSubject = new BehaviorSubject<PlanFeatures | null>(null);
  
  public currentUser$ = this.currentUserSubject.asObservable();
  public currentFinanceAccount$ = this.currentFinanceAccountSubject.asObservable();
  public currentRole$ = this.currentRoleSubject.asObservable();
  public currentPlan$ = this.currentPlanSubject.asObservable();
  public currentFeatures$ = this.currentFeaturesSubject.asObservable();

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.apiService.post<LoginResponse>('auth/login', credentials).pipe(
      tap((response) => {
        this.setToken(response.token);
        this.loadUser();
      })
    );
  }

  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.apiService.post<RegisterResponse>('auth/register', data);
  }

  logout(): Observable<any> {
    return this.apiService.post<any>('auth/logout', {}).pipe(
      tap(() => {
        this.clearAuth();
        this.router.navigate(['/login']);
      })
    );
  }

  me(): Observable<User> {
    return this.apiService.get<any>('auth/me').pipe(
      // Normalizar resposta: backend pode retornar financeAccount (camelCase) ou finance_account (snake_case)
      map((response) => {
        const user: User = {
          ...response,
          finance_account: response.finance_account || response.financeAccount || null,
          role: response.role || null
        };
        return user;
      }),
      // Efeitos colaterais: atualizar subjects e processar role
      tap((user) => {
        // Log apenas em desenvolvimento
        if (environment.production === false) {
          console.log('[AuthService] User data loaded:', {
            id: user.id,
            name: user.name,
            role: user.role,
            hasFinanceAccount: !!user.finance_account,
            planName: user.finance_account?.plan?.name
          });
        }
        
        this.currentUserSubject.next(user);
        
        if (user.finance_account) {
          this.currentFinanceAccountSubject.next(user.finance_account);
          if (user.finance_account.plan) {
            this.currentPlanSubject.next(user.finance_account.plan);
            if (user.finance_account.plan.features) {
              this.currentFeaturesSubject.next(user.finance_account.plan.features);
            }
          }
        }
        
        // Extrair role - agora vem diretamente do user.role (backend atualizado)
        let userRole: UserRole | null = null;
        
        // 1. Direto do user (método principal após atualização do backend)
        if (user.role) {
          userRole = user.role;
        }
        // 2. Fallback: Do finance_account.users pivot (caso o backend ainda não esteja atualizado)
        else if (user.finance_account) {
          const financeAccountAny = user.finance_account as any;
          if (financeAccountAny.users && Array.isArray(financeAccountAny.users)) {
            const currentUserId = user.id;
            const users = financeAccountAny.users;
            const userRelation = users.find((u: any) => u.id === currentUserId || u.user_id === currentUserId);
            
            if (userRelation?.pivot?.role) {
              userRole = userRelation.pivot.role;
            } else if (userRelation?.role) {
              userRole = userRelation.role;
            }
          }
          
          // 3. Fallback: Se o owner_id do finance_account for igual ao user.id, é owner
          if (!userRole) {
            const financeAccount = user.finance_account as any;
            if (financeAccount.owner_id === user.id) {
              userRole = 'owner';
            }
          }
        }
        
        if (userRole) {
          this.currentRoleSubject.next(userRole);
        }
        
        // Features também podem vir direto do user
        if (user.features) {
          this.currentFeaturesSubject.next(user.features);
        }
        if (user.plan) {
          this.currentPlanSubject.next(user.plan);
        }
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  clearAuth(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
    this.currentFinanceAccountSubject.next(null);
    this.currentRoleSubject.next(null);
    this.currentPlanSubject.next(null);
    this.currentFeaturesSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getCurrentFinanceAccount(): FinanceAccount | null {
    return this.currentFinanceAccountSubject.value;
  }

  getCurrentRole(): UserRole | null {
    return this.currentRoleSubject.value;
  }

  getCurrentPlan(): Plan | null {
    return this.currentPlanSubject.value;
  }

  getCurrentFeatures(): PlanFeatures | null {
    return this.currentFeaturesSubject.value;
  }

  getAuthState(): AuthState {
    return {
      user: this.currentUserSubject.value,
      financeAccount: this.currentFinanceAccountSubject.value,
      plan: this.currentPlanSubject.value,
      role: this.currentRoleSubject.value,
      features: this.currentFeaturesSubject.value,
      token: this.getToken()
    };
  }

  // Métodos para verificar features do plano
  hasFeature(featureName: keyof PlanFeatures): boolean {
    const features = this.getCurrentFeatures();
    if (!features) return false;
    return features[featureName] === true;
  }

  isPlanPro(): boolean {
    const plan = this.getCurrentPlan();
    return plan?.name === 'Pro';
  }

  isPlanFree(): boolean {
    const plan = this.getCurrentPlan();
    return plan?.name === 'Free' || !plan;
  }

  // Métodos de permissão baseados em role
  isOwner(): boolean {
    return this.getCurrentRole() === 'owner';
  }

  isEditor(): boolean {
    const role = this.getCurrentRole();
    return role === 'owner' || role === 'editor';
  }

  canEdit(): boolean {
    return this.isEditor();
  }

  canCreate(): boolean {
    return this.isEditor();
  }

  canDelete(): boolean {
    return this.isOwner();
  }

  canInvite(): boolean {
    return this.isOwner();
  }

  private loadUser(): void {
    this.me().subscribe({
      error: (error) => {
        // Token inválido, limpar autenticação
        if (error.status === 401 || error.status === 403) {
          this.clearAuth();
        }
      }
    });
  }
}
