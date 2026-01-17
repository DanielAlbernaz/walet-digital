import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api.service';
import { AuthService } from '../auth/auth.service';
import { CreateInviteRequest, FinanceAccountInvite } from '../../models/finance-account';

@Injectable({
  providedIn: 'root'
})
export class InviteService {

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  createInvite(data: CreateInviteRequest): Observable<FinanceAccountInvite> {
    const financeAccount = this.authService.getCurrentFinanceAccount();
    if (!financeAccount) {
      throw new Error('Finance account not found');
    }
    return this.apiService.post<FinanceAccountInvite>(
      `finance-accounts/${financeAccount.id}/invites`,
      data
    );
  }

  getInvites(): Observable<FinanceAccountInvite[]> {
    const financeAccount = this.authService.getCurrentFinanceAccount();
    if (!financeAccount) {
      throw new Error('Finance account not found');
    }
    return this.apiService.get<FinanceAccountInvite[]>(
      `finance-accounts/${financeAccount.id}/invites`
    );
  }

  deleteInvite(inviteId: number): Observable<any> {
    const financeAccount = this.authService.getCurrentFinanceAccount();
    if (!financeAccount) {
      throw new Error('Finance account not found');
    }
    return this.apiService.delete(
      `finance-accounts/${financeAccount.id}/invites/${inviteId}`
    );
  }
}
