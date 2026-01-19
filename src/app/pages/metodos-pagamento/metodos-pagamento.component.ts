import { Component, OnInit } from '@angular/core';
import { PaymentMethodService } from '../../services/payment-method/payment-method.service';
import { PaymentMethod } from '../../models/payment-method.model';
import { ToastrService } from 'ngx-toastr';
import { SweetAlertService } from '../../services/sweetalert/sweetalert.service';
import { AuthService } from '../../services/auth/auth.service';
import Swal from 'sweetalert2';
import { faWallet, faPlus, faEdit, faTrash, faLock, faCreditCard, faMoneyBill, faQrcode, faFileInvoice } from '@fortawesome/free-solid-svg-icons';

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

  faWallet = faWallet;
  faPlus = faPlus;
  faEdit = faEdit;
  faTrash = faTrash;
  faLock = faLock;
  faCreditCard = faCreditCard;
  faMoneyBill = faMoneyBill;
  faQrcode = faQrcode;
  faFileInvoice = faFileInvoice;

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
        // Separar métodos padrão (is_custom = false) e personalizados (is_custom = true)
        this.defaultMethods = methods.filter(m => !m.is_custom);
        
        // Métodos personalizados: mostrar apenas para usuários Pro
        if (this.hasCustomPaymentMethodsFeature()) {
          this.customMethods = methods.filter(m => m.is_custom);
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
}
