import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api.service';
import { AuthService } from '../auth/auth.service';
import { FinanceAccountUser, UserRole } from '../../models/finance-account';

@Injectable({
  providedIn: 'root'
})
export class FinanceAccountService {

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  getUsers(): Observable<FinanceAccountUser[]> {
    const financeAccount = this.authService.getCurrentFinanceAccount();
    if (!financeAccount) {
      throw new Error('Finance account not found');
    }
    return this.apiService.get<FinanceAccountUser[]>(
      `finance-accounts/${financeAccount.id}/users`
    );
  }

  updateUserRole(userId: number, role: UserRole): Observable<any> {
    const financeAccount = this.authService.getCurrentFinanceAccount();
    if (!financeAccount) {
      throw new Error('Finance account not found');
    }
    return this.apiService.put(
      `finance-accounts/${financeAccount.id}/users/${userId}`,
      { role }
    );
  }

  removeUser(userId: number): Observable<any> {
    const financeAccount = this.authService.getCurrentFinanceAccount();
    if (!financeAccount) {
      throw new Error('Finance account not found');
    }
    return this.apiService.delete(
      `finance-accounts/${financeAccount.id}/users/${userId}`
    );
  }

  getTotalUsers(): number {
    // TODO: Obter do backend ou calcular
    // Por enquanto, retornar mock
    return 1;
  }

  getMaxUsers(): number {
    const plan = this.authService.getCurrentPlan();
    return plan?.max_users || 1;
  }

  isUserLimitReached(): boolean {
    return this.getTotalUsers() >= this.getMaxUsers();
  }
}
