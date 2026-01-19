import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api.service';
import { PaymentMethod, CreatePaymentMethodRequest, UpdatePaymentMethodRequest } from '../../models/payment-method.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentMethodService {
  constructor(private apiService: ApiService) {}

  /**
   * Lista todos os métodos de pagamento disponíveis
   * Retorna métodos padrão (is_custom = false) + métodos personalizados da conta (is_custom = true)
   */
  list(): Observable<PaymentMethod[]> {
    return this.apiService.get<PaymentMethod[]>('payment-methods');
  }

  /**
   * Obtém detalhes de um método de pagamento
   */
  getById(id: number): Observable<PaymentMethod> {
    return this.apiService.get<PaymentMethod>(`payment-methods/${id}`);
  }

  /**
   * Cria um novo método de pagamento personalizado
   */
  create(data: CreatePaymentMethodRequest): Observable<{ message: string; data: PaymentMethod }> {
    return this.apiService.post<{ message: string; data: PaymentMethod }>('payment-methods', data);
  }

  /**
   * Atualiza um método de pagamento
   */
  update(id: number, data: UpdatePaymentMethodRequest): Observable<{ message: string; data: PaymentMethod }> {
    return this.apiService.put<{ message: string; data: PaymentMethod }>(`payment-methods/${id}`, data);
  }

  /**
   * Desativa um método de pagamento
   */
  disable(id: number): Observable<{ message: string; data: PaymentMethod }> {
    return this.apiService.post<{ message: string; data: PaymentMethod }>(`payment-methods/${id}/disable`, {});
  }

  /**
   * Deleta um método de pagamento (soft delete)
   */
  delete(id: number): Observable<{ message: string }> {
    return this.apiService.delete<{ message: string }>(`payment-methods/${id}`);
  }

  /**
   * Verifica se é método padrão (is_custom = false)
   */
  isDefault(method: PaymentMethod): boolean {
    return !method.is_custom;
  }

  /**
   * Verifica se é método personalizado (is_custom = true)
   */
  isCustom(method: PaymentMethod): boolean {
    return method.is_custom;
  }
}
