import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import {
  faChartLine,
  faArrowTrendUp,
  faArrowTrendDown,
  faFileInvoice,
  faCreditCard,
  faChartBar,
  faCog,
  faChevronLeft,
  faChevronRight,
  faWallet
} from '@fortawesome/free-solid-svg-icons';

interface MenuItem {
  icon: any;
  label: string;
  path: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  @Input() isOpen: boolean = true;
  @Output() toggle = new EventEmitter<void>();

  menuItems: MenuItem[] = [
    { icon: faChartLine, label: 'Dashboard', path: '/dashboard' },
    { icon: faArrowTrendUp, label: 'Receitas', path: '/receitas' },
    { icon: faArrowTrendDown, label: 'Despesas', path: '/despesas' },
    { icon: faFileInvoice, label: 'Contas a Pagar', path: '/contas' },
    { icon: faCreditCard, label: 'Cartão / Parcelas', path: '/cartao-parcelas' },
    { icon: faWallet, label: 'Métodos de Pagamento', path: '/metodos-pagamento' },
    { icon: faChartBar, label: 'Relatórios', path: '/relatorios', disabled: true },
    { icon: faCog, label: 'Configurações', path: '/configuracoes' },
  ];

  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;

  constructor(private router: Router) {}

  onToggle(): void {
    this.toggle.emit();
  }

  navigate(path: string, disabled?: boolean): void {
    if (!disabled) {
      this.router.navigate([path]);
    }
  }

  isActive(path: string): boolean {
    return this.router.url === path || (path === '/dashboard' && this.router.url === '/');
  }
}
