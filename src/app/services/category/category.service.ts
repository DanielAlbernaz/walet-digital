import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api.service';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../../models/category.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  constructor(private apiService: ApiService) {}

  /**
   * Lista todas as categorias disponíveis
   * Retorna categorias padrão (is_custom = false) + categorias personalizadas da conta (is_custom = true)
   * Apenas retorna categorias ativas (is_active = true) e não deletadas
   */
  list(): Observable<Category[]> {
    return this.apiService.get<Category[]>('categories');
  }

  /**
   * Obtém detalhes de uma categoria
   */
  getById(id: number): Observable<Category> {
    return this.apiService.get<Category>(`categories/${id}`);
  }

  /**
   * Cria uma nova categoria personalizada
   */
  create(data: CreateCategoryRequest): Observable<{ message: string; data: Category }> {
    return this.apiService.post<{ message: string; data: Category }>('categories', data);
  }

  /**
   * Atualiza uma categoria
   */
  update(id: number, data: UpdateCategoryRequest): Observable<{ message: string; data: Category }> {
    return this.apiService.put<{ message: string; data: Category }>(`categories/${id}`, data);
  }

  /**
   * Desativa uma categoria personalizada
   */
  disable(id: number): Observable<{ message: string; data: Category }> {
    return this.apiService.patch<{ message: string; data: Category }>(`categories/${id}/disable`, {});
  }

  /**
   * Ativa ou desativa uma categoria personalizada
   * @param id ID da categoria
   * @param isActive true para ativar, false para desativar
   */
  toggleActive(id: number, isActive: boolean): Observable<{ message: string; data: Category }> {
    const body = { is_active: isActive };
    return this.apiService.put<{ message: string; data: Category }>(`categories/${id}`, body);
  }

  /**
   * Deleta uma categoria personalizada
   */
  delete(id: number): Observable<{ message: string }> {
    return this.apiService.delete<{ message: string }>(`categories/${id}`);
  }

  /**
   * Verifica se é categoria padrão (is_custom = false)
   */
  isDefault(category: Category): boolean {
    return !category.is_custom;
  }

  /**
   * Verifica se é categoria personalizada (is_custom = true)
   */
  isCustom(category: Category): boolean {
    return category.is_custom;
  }
}
