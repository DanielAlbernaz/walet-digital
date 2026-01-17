import { Component, OnInit } from '@angular/core';
import { 
  faUser, 
  faBell, 
  faPalette, 
  faShield, 
  faCircleQuestion,
  faCrown,
  faUsers,
  faEnvelope,
  faTrash,
  faEdit,
  faLock
} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../services/auth/auth.service';
import { FinanceAccountService } from '../../services/finance-account/finance-account.service';
import { InviteService } from '../../services/invite/invite.service';
import { FinanceAccountInvite, FinanceAccountUser, UserRole } from '../../models/finance-account';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface SettingItem {
  label: string;
  description: string;
  toggle?: boolean;
  value?: boolean;
}

interface SettingGroup {
  title: string;
  icon: any;
  items: SettingItem[];
}

@Component({
  selector: 'app-configuracoes',
  templateUrl: './configuracoes.component.html',
  styleUrls: ['./configuracoes.component.scss']
})
export class ConfiguracoesComponent implements OnInit {
  faUser = faUser;
  faBell = faBell;
  faPalette = faPalette;
  faShield = faShield;
  faCircleQuestion = faCircleQuestion;
  faCrown = faCrown;
  faUsers = faUsers;
  faEnvelope = faEnvelope;
  faTrash = faTrash;
  faEdit = faEdit;
  faLock = faLock;

  users: FinanceAccountUser[] = [];
  invites: FinanceAccountInvite[] = [];
  isOwner: boolean = false;
  isLoadingUsers: boolean = false;
  showUpgradeModal: boolean = false;
  showInviteModal: boolean = false;

  constructor(
    private authService: AuthService,
    private financeAccountService: FinanceAccountService,
    private inviteService: InviteService
  ) {}

  ngOnInit(): void {
    this.isOwner = this.authService.isOwner();
    if (this.isOwner) {
      this.loadUsersAndInvites();
    }
  }

  loadUsersAndInvites(): void {
    this.isLoadingUsers = true;
    forkJoin({
      users: this.financeAccountService.getUsers().pipe(
        catchError(() => of([] as FinanceAccountUser[]))
      ),
      invites: this.inviteService.getInvites().pipe(
        catchError(() => of([] as FinanceAccountInvite[]))
      )
    }).subscribe({
      next: ({ users, invites }) => {
        this.users = users;
        this.invites = invites;
        this.isLoadingUsers = false;
      },
      error: () => {
        this.isLoadingUsers = false;
      }
    });
  }

  getPlanName(): string {
    const plan = this.authService.getCurrentPlan();
    return plan?.name || 'Free';
  }

  getMaxUsers(): number {
    const plan = this.authService.getCurrentPlan();
    return plan?.max_users || 1;
  }

  getTotalUsers(): number {
    return this.users.length;
  }

  isUserLimitReached(): boolean {
    return this.getTotalUsers() >= this.getMaxUsers();
  }

  onUpgradeClick(): void {
    this.showUpgradeModal = true;
  }

  onInviteUser(): void {
    this.showInviteModal = true;
  }

  onCloseUpgradeModal(): void {
    this.showUpgradeModal = false;
  }

  onCloseInviteModal(): void {
    this.showInviteModal = false;
  }

  onInviteCreated(): void {
    this.loadUsersAndInvites();
    this.showInviteModal = false;
  }

  onRemoveInvite(inviteId: number): void {
    this.inviteService.deleteInvite(inviteId).subscribe({
      next: () => {
        this.loadUsersAndInvites();
      },
      error: (error) => {
        console.error('Erro ao remover convite:', error);
      }
    });
  }

  onUpdateUserRole(userId: number, role: UserRole): void {
    this.financeAccountService.updateUserRole(userId, role).subscribe({
      next: () => {
        this.loadUsersAndInvites();
      },
      error: (error) => {
        console.error('Erro ao atualizar role:', error);
      }
    });
  }

  onRemoveUser(userId: number): void {
    if (confirm('Tem certeza que deseja remover este usuário?')) {
      this.financeAccountService.removeUser(userId).subscribe({
        next: () => {
          this.loadUsersAndInvites();
        },
        error: (error) => {
          console.error('Erro ao remover usuário:', error);
        }
      });
    }
  }

  getInviteStatus(invite: FinanceAccountInvite): string {
    if (invite.accepted_at) {
      return 'Aceito';
    }
    const expiresAt = new Date(invite.expires_at);
    if (expiresAt < new Date()) {
      return 'Expirado';
    }
    return 'Pendente';
  }

  isPlanFree(): boolean {
    return this.authService.isPlanFree();
  }

  isPlanPro(): boolean {
    return this.authService.isPlanPro();
  }

  getCurrentUserId(): number | null {
    const user = this.authService.getCurrentUser();
    return user?.id || null;
  }


  settingsGroups: SettingGroup[] = [
    {
      title: 'Perfil',
      icon: faUser,
      items: [
        { label: 'Editar perfil', description: 'Altere seu nome, email e foto' },
        { label: 'Alterar senha', description: 'Atualize sua senha de acesso' },
      ],
    },
    {
      title: 'Notificações',
      icon: faBell,
      items: [
        { 
          label: 'Lembrete de vencimento', 
          description: 'Receba alertas de contas a vencer', 
          toggle: true,
          value: false
        },
        { 
          label: 'Resumo semanal', 
          description: 'Relatório semanal por email', 
          toggle: true,
          value: false
        },
      ],
    },
    {
      title: 'Aparência',
      icon: faPalette,
      items: [
        { 
          label: 'Modo escuro', 
          description: 'Ative o tema escuro', 
          toggle: true,
          value: false
        },
      ],
    },
    {
      title: 'Segurança',
      icon: faShield,
      items: [
        { 
          label: 'Autenticação em dois fatores', 
          description: 'Adicione uma camada extra de segurança', 
          toggle: true,
          value: false
        },
        { label: 'Sessões ativas', description: 'Gerencie seus dispositivos conectados' },
      ],
    },
    {
      title: 'Ajuda',
      icon: faCircleQuestion,
      items: [
        { label: 'Central de ajuda', description: 'Encontre respostas para suas dúvidas' },
        { label: 'Fale conosco', description: 'Entre em contato com o suporte' },
      ],
    },
  ];

  onToggleChange(groupIndex: number, itemIndex: number): void {
    const item = this.settingsGroups[groupIndex].items[itemIndex];
    if (item.toggle && item.value !== undefined) {
      item.value = !item.value;
    }
  }

  onAccessClick(label: string): void {
    // TODO: Implementar navegação ou ação específica
    console.log('Acessar:', label);
  }
}
