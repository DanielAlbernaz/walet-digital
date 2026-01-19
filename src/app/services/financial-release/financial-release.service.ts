import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../api/api.service';
import { FinancialRelease, CreateFinancialReleaseRequest, Category, PaginatedResponse, InstallmentSummary, InstallmentDetails } from '../../models/financial-release';

@Injectable({
  providedIn: 'root'
})
export class FinancialReleaseService {

  constructor(private apiService: ApiService) {}

  getFinancialReleases(perPage: number = 100): Observable<FinancialRelease[]> {
    // Backend agora retorna resposta paginada, extrair apenas o array 'data'
    // perPage padrão = 100 para garantir que pegamos todos os registros (máximo permitido)
    return this.apiService.get<PaginatedResponse<FinancialRelease> | FinancialRelease[]>('financial_release', {
      per_page: perPage
    })
      .pipe(
        map(response => {
          // Verificar se é resposta paginada (tem propriedade 'data')
          if (response && typeof response === 'object' && 'data' in response) {
            const paginatedResponse = response as PaginatedResponse<FinancialRelease>;
            return paginatedResponse.data || [];
          }
          // Se já for um array, retornar diretamente (retrocompatibilidade)
          return (response as FinancialRelease[]) || [];
        })
      );
  }

  getFinancialReleasesWithFilters(filters: {
    month?: number;
    year?: number;
    type?: 'revenue' | 'expense' | 'receita' | 'despesa';
    status?: 'pending' | 'paid' | 'overdue';
    date_from?: string;
    date_to?: string;
    due_date_from?: string;
    due_date_to?: string;
    order_by?: 'date' | 'due_date' | 'payment_date' | 'value' | 'created_at' | 'updated_at';
    order_direction?: 'asc' | 'desc';
    page?: number; // Paginação
    per_page?: number; // Itens por página (1-100, padrão 25)
    [key: string]: any; // Permite outros filtros
  }): Observable<FinancialRelease[]> {
    // Converter type receita/despesa para revenue/expense se necessário
    const normalizedFilters: any = { ...filters };
    if (normalizedFilters.type === 'receita') {
      normalizedFilters.type = 'revenue';
    } else if (normalizedFilters.type === 'despesa') {
      normalizedFilters.type = 'expense';
    }

    // O backend retorna resposta paginada, extrair apenas o array 'data'
    // Se a resposta já for um array (retrocompatibilidade), retornar diretamente
    return this.apiService.get<PaginatedResponse<FinancialRelease> | FinancialRelease[]>('financial_release', normalizedFilters)
      .pipe(
        map(response => {
          // Verificar se é resposta paginada (tem propriedade 'data')
          if (response && typeof response === 'object' && 'data' in response) {
            const paginatedResponse = response as PaginatedResponse<FinancialRelease>;
            return paginatedResponse.data || [];
          }
          // Se já for um array, retornar diretamente (retrocompatibilidade)
          return (response as FinancialRelease[]) || [];
        })
      );
  }

  // Método para obter resposta paginada completa (se necessário para UI de paginação)
  getFinancialReleasesPaginated(filters: {
    month?: number;
    year?: number;
    type?: 'revenue' | 'expense' | 'receita' | 'despesa';
    status?: 'pending' | 'paid' | 'overdue';
    date_from?: string;
    date_to?: string;
    due_date_from?: string;
    due_date_to?: string;
    order_by?: 'date' | 'due_date' | 'payment_date' | 'value' | 'created_at' | 'updated_at';
    order_direction?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
    [key: string]: any;
  }): Observable<PaginatedResponse<FinancialRelease>> {
    const normalizedFilters: any = { ...filters };
    if (normalizedFilters.type === 'receita') {
      normalizedFilters.type = 'revenue';
    } else if (normalizedFilters.type === 'despesa') {
      normalizedFilters.type = 'expense';
    }

    return this.apiService.get<PaginatedResponse<FinancialRelease>>('financial_release', normalizedFilters);
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

  cancelFinancialRelease(id: number): Observable<any> {
    // Endpoint: POST /api/financial_release/{id}/cancel
    return this.apiService.post(`financial_release/${id}/cancel`, {});
  }

  // Método antigo mantido para retrocompatibilidade (não será usado)
  cancelFinancialReleaseBulk(payload: {
    release_ids?: number[];
    installment_id?: number;
    first_release_id?: number;
  }): Observable<any> {
    return this.apiService.post('financial_release/cancel', payload);
  }

  getCategories(type?: 'receita' | 'despesa'): Observable<Category[]> {
    // TODO: Criar endpoint específico para categorias se necessário
    // Por enquanto, retornar categorias mockadas ou criar endpoint
    return this.apiService.get<Category[]>(`categories${type ? `?type=${type}` : ''}`);
  }

  /**
   * Lista todos os parcelamentos (installments)
   * @param month - Mês (1-12) - opcional
   * @param year - Ano - opcional
   * @returns Observable com array de resumos de parcelamentos
   */
  getInstallments(month?: number, year?: number): Observable<InstallmentSummary[]> {
    const params: any = {};
    if (month !== undefined) {
      params.month = month;
    }
    if (year !== undefined) {
      params.year = year;
    }
    return this.apiService.get<InstallmentSummary[]>('financial_release/installments', params);
  }

  /**
   * Obtém detalhes de um parcelamento específico incluindo todas as parcelas
   * @param installmentId - ID do parcelamento
   * @returns Observable com detalhes do parcelamento e lista de parcelas
   */
  getInstallmentDetails(installmentId: number): Observable<InstallmentDetails> {
    return this.apiService.get<InstallmentDetails>(`financial_release/installments/${installmentId}`);
  }
}
