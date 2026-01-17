import { Component } from '@angular/core';
import { 
  faUser, 
  faBell, 
  faPalette, 
  faShield, 
  faCircleQuestion 
} from '@fortawesome/free-solid-svg-icons';

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
export class ConfiguracoesComponent {
  faUser = faUser;
  faBell = faBell;
  faPalette = faPalette;
  faShield = faShield;
  faCircleQuestion = faCircleQuestion;

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
