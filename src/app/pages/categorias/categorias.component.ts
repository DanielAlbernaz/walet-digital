import { Component, OnInit } from '@angular/core';
import { CategoryService } from '../../services/category/category.service';
import { Category } from '../../models/category.model';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth/auth.service';
import Swal from 'sweetalert2';
import { faTag, faPlus, faEdit, faTrash, faLock, faArrowTrendUp, faArrowTrendDown, faPowerOff, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-categorias',
  templateUrl: './categorias.component.html',
  styleUrls: ['./categorias.component.scss']
})
export class CategoriasComponent implements OnInit {
  isLoading: boolean = false;
  isModalOpen: boolean = false;
  editingCategory: Category | null = null;

  categories: Category[] = [];
  defaultCategories: Category[] = [];
  customCategories: Category[] = [];

  // Categorias separadas por tipo
  defaultRevenueCategories: Category[] = [];
  defaultExpenseCategories: Category[] = [];
  customRevenueCategories: Category[] = [];
  customExpenseCategories: Category[] = [];

  // Estados de expansão das seções padrão
  isDefaultRevenueExpanded: boolean = false;
  isDefaultExpenseExpanded: boolean = false;

  faTag = faTag;
  faPlus = faPlus;
  faEdit = faEdit;
  faTrash = faTrash;
  faLock = faLock;
  faArrowTrendUp = faArrowTrendUp;
  faArrowTrendDown = faArrowTrendDown;
  faPowerOff = faPowerOff;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;

  constructor(
    private categoryService: CategoryService,
    private authService: AuthService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading = true;
    this.categoryService.list().subscribe({
      next: (categories) => {
        this.categories = categories;
        // Filtrar apenas categorias não deletadas (deleted_at = null)
        // Manter todas as categorias (ativas e desativadas) para mostrar o status
        const availableCategories = categories.filter(c => !c.deleted_at);

        // Separar categorias padrão (is_custom = false) e personalizadas (is_custom = true)
        this.defaultCategories = availableCategories.filter(c => !c.is_custom);

        // Separar categorias padrão por tipo
        this.defaultRevenueCategories = this.defaultCategories.filter(c =>
          c.type === 'revenue' || c.type === 'receita'
        );
        this.defaultExpenseCategories = this.defaultCategories.filter(c =>
          c.type === 'expense' || c.type === 'despesa'
        );

        // Categorias personalizadas: mostrar apenas para usuários Pro
        if (this.hasCustomCategoriesFeature()) {
          this.customCategories = availableCategories.filter(c => c.is_custom);

          // Separar categorias personalizadas por tipo
          this.customRevenueCategories = this.customCategories.filter(c =>
            c.type === 'revenue' || c.type === 'receita'
          );
          this.customExpenseCategories = this.customCategories.filter(c =>
            c.type === 'expense' || c.type === 'despesa'
          );
        } else {
          this.customCategories = [];
          this.customRevenueCategories = [];
          this.customExpenseCategories = [];
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar categorias:', error);
        if (error.status === 403) {
          this.toastr.error('Funcionalidade disponível apenas no plano Pro.', 'Erro');
        } else {
          this.toastr.error('Erro ao carregar categorias.', 'Erro');
        }
        this.isLoading = false;
      }
    });
  }

  onAddClick(): void {
    // Verificar se tem permissão (plano Pro)
    if (!this.hasCustomCategoriesFeature()) {
      this.toastr.warning('Funcionalidade disponível apenas no plano Pro.', 'Aviso');
      return;
    }
    this.editingCategory = null;
    this.isModalOpen = true;
  }

  onEditClick(category: Category): void {
    if (!category.is_custom) {
      this.toastr.warning('Categorias padrão não podem ser editadas.', 'Aviso');
      return;
    }

    // Verificar se tem permissão (plano Pro)
    if (!this.hasCustomCategoriesFeature()) {
      this.toastr.warning('Funcionalidade disponível apenas no plano Pro.', 'Aviso');
      return;
    }

    this.editingCategory = category;
    this.isModalOpen = true;
  }

  onDisableClick(category: Category): void {
    if (!category.is_custom) {
      this.toastr.warning('Categorias padrão não podem ser desativadas.', 'Aviso');
      return;
    }

    // Verificar se tem permissão (plano Pro)
    if (!this.hasCustomCategoriesFeature()) {
      this.toastr.warning('Funcionalidade disponível apenas no plano Pro.', 'Aviso');
      return;
    }

    const action = category.is_active ? 'desativar' : 'ativar';
    const actionText = category.is_active ? 'Desativar' : 'Ativar';

    Swal.fire({
      title: `${actionText} Categoria`,
      text: `Deseja realmente ${action} "${category.title}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: category.is_active ? '#f59e0b' : '#16a34a',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Sim, ${action}`,
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        // Determinar qual método usar baseado no estado atual
        const shouldActivate = !category.is_active;
        const request$ = shouldActivate
          ? this.categoryService.toggleActive(category.id, true)
          : this.categoryService.disable(category.id);

        request$.subscribe({
          next: () => {
            this.toastr.success(`Categoria ${action === 'desativar' ? 'desativada' : 'ativada'} com sucesso.`, 'Sucesso');
            this.loadCategories();
          },
          error: (error) => {
            if (error.status === 422) {
              const errorMessage = error.error?.message || error.error?.error ||
                'Não é possível desativar esta categoria pois ela está sendo usada em lançamentos financeiros.';
              this.toastr.error(errorMessage, 'Erro');
            } else if (error.status === 403) {
              this.toastr.error('Funcionalidade disponível apenas no plano Pro.', 'Erro');
            } else if (error.status === 404) {
              this.toastr.error('Categoria não encontrada.', 'Erro');
            } else if (error.status === 400) {
              const errorMessage = error.error?.message || error.error?.error ||
                `Erro ao ${action} categoria. Verifique se o backend suporta esta operação.`;
              this.toastr.error(errorMessage, 'Erro');
            } else {
              this.toastr.error(`Erro ao ${action} categoria. Status: ${error.status}`, 'Erro');
            }
          }
        });
      }
    });
  }

  onDeleteClick(category: Category): void {
    if (!category.is_custom) {
      this.toastr.warning('Categorias padrão não podem ser deletadas.', 'Aviso');
      return;
    }

    // Verificar se tem permissão (plano Pro)
    if (!this.hasCustomCategoriesFeature()) {
      this.toastr.warning('Funcionalidade disponível apenas no plano Pro.', 'Aviso');
      return;
    }

    Swal.fire({
      title: 'Excluir Categoria',
      text: `Deseja realmente excluir "${category.title}"? Esta ação não pode ser desfeita.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.categoryService.delete(category.id).subscribe({
          next: () => {
            this.toastr.success('Categoria excluída com sucesso.', 'Sucesso');
            this.loadCategories();
          },
          error: (error) => {
            if (error.status === 422) {
              const errorMessage = error.error?.message || error.error?.error ||
                'Não é possível excluir esta categoria pois ela está sendo usada em lançamentos financeiros.';
              this.toastr.error(errorMessage, 'Erro');
            } else if (error.status === 403) {
              this.toastr.error('Funcionalidade disponível apenas no plano Pro.', 'Erro');
            } else {
              this.toastr.error('Erro ao excluir categoria.', 'Erro');
            }
          }
        });
      }
    });
  }

  onModalClose(): void {
    this.isModalOpen = false;
    this.editingCategory = null;
  }

  onModalSaved(): void {
    this.isModalOpen = false;
    this.editingCategory = null;
    this.loadCategories();
  }

  isDefault(category: Category): boolean {
    return !category.is_custom;
  }

  isCustom(category: Category): boolean {
    return category.is_custom;
  }

  // Verifica se o usuário tem acesso à feature de categorias personalizadas
  hasCustomCategoriesFeature(): boolean {
    return this.authService.hasFeature('custom_categories');
  }

  // Verifica se é plano Pro
  isPlanPro(): boolean {
    return this.authService.isPlanPro();
  }

  // Verifica se é plano Free
  isPlanFree(): boolean {
    return this.authService.isPlanFree();
  }

  // Retorna o ícone correto baseado no tipo
  getCategoryIcon(category: Category): any {
    const type = category.type.toLowerCase();
    if (type === 'revenue' || type === 'receita') {
      return this.faArrowTrendUp;
    }
    return this.faArrowTrendDown;
  }

  // Retorna o label do tipo
  getTypeLabel(category: Category): string {
    const type = category.type.toLowerCase();
    if (type === 'revenue' || type === 'receita') {
      return 'Receita';
    }
    return 'Despesa';
  }

  // Alterna a expansão da seção de receitas padrão
  toggleDefaultRevenue(): void {
    this.isDefaultRevenueExpanded = !this.isDefaultRevenueExpanded;
  }

  // Alterna a expansão da seção de despesas padrão
  toggleDefaultExpense(): void {
    this.isDefaultExpenseExpanded = !this.isDefaultExpenseExpanded;
  }
}
