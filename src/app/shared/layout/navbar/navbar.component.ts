import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import {
  faWallet,
  faUser,
  faCog,
  faSignOutAlt,
  faChevronDown,
  faBars
} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../../services/auth/auth.service';
import { User } from '../../../models/user';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();
  @Input() walletBalance: number = 7800.00;

  userName: string = '';
  private userSubscription?: Subscription;

  faWallet = faWallet;
  faUser = faUser;
  faCog = faCog;
  faSignOutAlt = faSignOutAlt;
  faChevronDown = faChevronDown;
  faBars = faBars;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Carregar dados do usuário ao inicializar
    this.loadUser();

    // Se inscrever para mudanças no usuário
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.name;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  private loadUser(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.userName = currentUser.name;
    } else {
      // Se não tem usuário em memória, carregar da API
      this.authService.me().subscribe({
        next: (user) => {
          this.userName = user.name;
        },
        error: () => {
          // Se erro, usar nome padrão
          this.userName = 'Usuário';
        }
      });
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  getInitials(name: string): string {
    if (!name || name.trim() === '') {
      return 'U';
    }
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        // O AuthService já redireciona para /login no método logout
      },
      error: (error) => {
        // Mesmo em caso de erro, limpar autenticação local e redirecionar
        this.authService.clearAuth();
      }
    });
  }
}
