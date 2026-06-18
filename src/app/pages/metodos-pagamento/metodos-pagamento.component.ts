import { Component, OnInit } from '@angular/core';
import { PaymentMethodService } from '../../services/payment-method/payment-method.service';
import { PaymentMethod } from '../../models/payment-method.model';
import { ToastrService } from 'ngx-toastr';
import { SweetAlertService } from '../../services/sweetalert/sweetalert.service';
import { AuthService } from '../../services/auth/auth.service';
import Swal from 'sweetalert2';
import { faWallet, faPlus, faEdit, faTrash, faLock, faCreditCard, faMoneyBill, faQrcode, faFileInvoice, faChevronDown, faChevronUp, faPowerOff } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-metodos-pagamento',
  templateUrl: './metodos-pagamento.component.html',
  styleUrls: ['./metodos-pagamento.component.scss']
})
export class MetodosPagamentoComponent implements OnInit {
  isLoading: boolean = false;
  isModalOpen: boolean = false;
  editingMethod: PaymentMethod | null = null;

  paymentMethods: PaymentMethod[] = [];
  defaultMethods: PaymentMethod[] = [];
  customMethods: PaymentMethod[] = [];

  // Estado de expansão da seção padrão
  isDefaultMethodsExpanded: boolean = false;

  faWallet = faWallet;
  faPlus = faPlus;
  faEdit = faEdit;
  faTrash = faTrash;
  faLock = faLock;
  faCreditCard = faCreditCard;
  faMoneyBill = faMoneyBill;
  faQrcode = faQrcode;
  faFileInvoice = faFileInvoice;
  faChevronDown = faChevronDown;
  faChevronUp = faChevronUp;
  faPowerOff = faPowerOff;

  constructor(
    private paymentMethodService: PaymentMethodService,
    private authService: AuthService,
    private toastr: ToastrService,
    private sweetAlertService: SweetAlertService
  ) {}

  ngOnInit(): void {
    this.loadPaymentMethods();
  }

  loadPaymentMethods(): void {
    this.isLoading = true;
    this.paymentMethodService.list().subscribe({
      next: (methods) => {
        this.paymentMethods = methods;
        // Filtrar apenas métodos não deletados (deleted_at = null)
        // Manter todos os métodos (ativos e desativados) para mostrar o status
        const availableMethods = methods.filter(m => !m.deleted_at);

        // Separar métodos padrão (is_custom = false) e personalizados (is_custom = true)
        this.defaultMethods = availableMethods.filter(m => !m.is_custom);

        // Métodos personalizados: mostrar apenas para usuários Pro
        if (this.hasCustomPaymentMethodsFeature()) {
          this.customMethods = availableMethods.filter(m => m.is_custom);
        } else {
          this.customMethods = [];
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar métodos de pagamento:', error);
        if (error.status === 403) {
          this.toastr.error('Funcionalidade disponível apenas no plano Pro.', 'Erro');
        } else {
          this.toastr.error('Erro ao carregar métodos de pagamento.', 'Erro');
        }
        this.isLoading = false;
      }
    });
  }

  onAddClick(): void {
    // Verificar se tem permissão (plano Pro)
    if (!this.hasCustomPaymentMethodsFeature()) {
      this.toastr.warning('Funcionalidade disponível apenas no plano Pro.', 'Aviso');
      return;
    }
    this.editingMethod = null;
    this.isModalOpen = true;
  }

  onEditClick(method: PaymentMethod): void {
    if (!method.is_custom) {
      this.toastr.warning('Métodos padrão não podem ser editados.', 'Aviso');
      return;
    }

    // Verificar se tem permissão (plano Pro)
    if (!this.hasCustomPaymentMethodsFeature()) {
      this.toastr.warning('Funcionalidade disponível apenas no plano Pro.', 'Aviso');
      return;
    }

    this.editingMethod = method;
    this.isModalOpen = true;
  }

  onDisableClick(method: PaymentMethod): void {
    if (!method.is_custom) {
      this.toastr.warning('Métodos padrão não podem ser desativados.', 'Aviso');
      return;
    }

    // Verificar se tem permissão (plano Pro)
    if (!this.hasCustomPaymentMethodsFeature()) {
      this.toastr.warning('Funcionalidade disponível apenas no plano Pro.', 'Aviso');
      return;
    }

    const action = method.is_active ? 'desativar' : 'ativar';
    const actionText = method.is_active ? 'Desativar' : 'Ativar';

    Swal.fire({
      title: `${actionText} Método de Pagamento`,
      text: `Deseja realmente ${action} "${method.name}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: method.is_active ? '#f59e0b' : '#16a34a',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Sim, ${action}`,
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        // Determinar qual método usar baseado no estado atual
        const shouldActivate = !method.is_active;
        const request$ = shouldActivate
          ? this.paymentMethodService.toggleActive(method.id, true)
          : this.paymentMethodService.disable(method.id);

        request$.subscribe({
          next: () => {
            this.toastr.success(`Método de pagamento ${action === 'desativar' ? 'desativado' : 'ativado'} com sucesso.`, 'Sucesso');
            this.loadPaymentMethods();
          },
          error: (error) => {
            if (error.status === 422) {
              const errorMessage = error.error?.message || error.error?.error ||
                'Não é possível desativar este método pois ele está sendo usado em lançamentos financeiros.';
              this.toastr.error(errorMessage, 'Erro');
            } else if (error.status === 403) {
              this.toastr.error('Funcionalidade disponível apenas no plano Pro.', 'Erro');
            } else if (error.status === 404) {
              this.toastr.error('Método de pagamento não encontrado.', 'Erro');
            } else if (error.status === 400) {
              const errorMessage = error.error?.message || error.error?.error ||
                `Erro ao ${action} método de pagamento. Verifique se o backend suporta esta operação.`;
              this.toastr.error(errorMessage, 'Erro');
            } else {
              this.toastr.error(`Erro ao ${action} método de pagamento. Status: ${error.status}`, 'Erro');
            }
          }
        });
      }
    });
  }

  onDeleteClick(method: PaymentMethod): void {
    if (!method.is_custom) {
      this.toastr.warning('Métodos padrão não podem ser deletados.', 'Aviso');
      return;
    }

    // Verificar se tem permissão (plano Pro)
    if (!this.hasCustomPaymentMethodsFeature()) {
      this.toastr.warning('Funcionalidade disponível apenas no plano Pro.', 'Aviso');
      return;
    }

    Swal.fire({
      title: 'Excluir Método de Pagamento',
      text: `Deseja realmente excluir "${method.name}"? Esta ação não pode ser desfeita.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.paymentMethodService.delete(method.id).subscribe({
          next: () => {
            this.toastr.success('Método de pagamento excluído com sucesso.', 'Sucesso');
            this.loadPaymentMethods();
          },
          error: (error) => {
            if (error.status === 422) {
              this.toastr.error(
                'Não é possível excluir este método pois ele está sendo usado em lançamentos financeiros. Use desativar em vez disso.',
                'Erro'
              );
            } else if (error.status === 403) {
              this.toastr.error('Funcionalidade disponível apenas no plano Pro.', 'Erro');
            } else {
              this.toastr.error('Erro ao excluir método de pagamento.', 'Erro');
            }
          }
        });
      }
    });
  }

  onModalClose(): void {
    this.isModalOpen = false;
    this.editingMethod = null;
  }

  onModalSaved(): void {
    this.isModalOpen = false;
    this.editingMethod = null;
    this.loadPaymentMethods();
  }

  isDefault(method: PaymentMethod): boolean {
    return !method.is_custom;
  }

  isCustom(method: PaymentMethod): boolean {
    return method.is_custom;
  }

  // Verifica se o usuário tem acesso à feature de métodos de pagamento personalizados
  hasCustomPaymentMethodsFeature(): boolean {
    return this.authService.hasFeature('custom_payment_methods');
  }

  // Verifica se é plano Pro
  isPlanPro(): boolean {
    return this.authService.isPlanPro();
  }

  // Verifica se é plano Free
  isPlanFree(): boolean {
    return this.authService.isPlanFree();
  }

  // Retorna o ícone correto para métodos padrão baseado no nome
  getDefaultMethodIcon(methodName: string): any {
    const name = methodName.toLowerCase().trim();

    // Mapear nomes de métodos padrão para ícones
    if (name.includes('crédito') || name.includes('credito')) {
      return this.faCreditCard;
    } else if (name.includes('débito') || name.includes('debito')) {
      return this.faCreditCard;
    } else if (name.includes('pix')) {
      return this.faQrcode;
    } else if (name.includes('dinheiro')) {
      return this.faMoneyBill;
    } else if (name.includes('boleto')) {
      return this.faFileInvoice;
    }

    // Fallback: ícone padrão (carteira)
    return this.faWallet;
  }

  // Alterna a expansão da seção de métodos padrão
  toggleDefaultMethods(): void {
    this.isDefaultMethodsExpanded = !this.isDefaultMethodsExpanded;
  }
}
