import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api.service';
import { FinancialRelease, CreateFinancialReleaseRequest, Category } from '../../models/financial-release';

@Injectable({
  providedIn: 'root'
})
export class FinancialReleaseService {

  constructor(private apiService: ApiService) {}

  getFinancialReleases(): Observable<FinancialRelease[]> {
    return this.apiService.get<FinancialRelease[]>('financial_release');
  }

  getFinancialRelease(id: number): Observable<FinancialRelease> {
    return this.apiService.get<FinancialRelease>(`financial_release/${id}`);
  }

  createFinancialRelease(data: CreateFinancialReleaseRequest): Observable<any> {
    return this.apiService.post('financial_release', data);
  }

  updateFinancialRelease(id: number, data: Partial<CreateFinancialReleaseRequest>): Observable<FinancialRelease> {
    return this.apiService.put<FinancialRelease>(`financial_release/${id}`, data);
  }

  deleteFinancialRelease(id: number): Observable<any> {
    return this.apiService.delete(`financial_release/${id}`);
  }

  getCategories(type?: 'receita' | 'despesa'): Observable<Category[]> {
    // TODO: Criar endpoint específico para categorias se necessário
    // Por enquanto, retornar categorias mockadas ou criar endpoint
    return this.apiService.get<Category[]>(`categories${type ? `?type=${type}` : ''}`);
  }
}
