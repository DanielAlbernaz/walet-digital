import { Component, Input, Output, EventEmitter } from '@angular/core';
import { faClock, faArrowTrendUp, faArrowTrendDown } from '@fortawesome/free-solid-svg-icons';

export interface Release {
  id: string;
  description: string;
  category: string;
  value: number;
  date: string;
  type: 'receita' | 'despesa' | 'revenue' | 'expense'; // Aceita ambos os formatos
  is_paid: boolean;
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled'; // Status do lançamento
  portion?: string | null; // Parcela (ex: "1/12")
  release_type?: 'installment' | 'recurring' | 'single'; // Tipo de lançamento
  repetition?: string; // Tipo de repetição (para fallback)
  due_date?: string; // Data de vencimento (para tooltip de cancelamento)
  updated_at?: string; // Data de atualização (para tooltip de cancelamento)
}

@Component({
  selector: 'app-recent-releases',
  templateUrl: './recent-releases.component.html',
  styleUrls: ['./recent-releases.component.scss']
})
export class RecentReleasesComponent {
  @Input() releases: Release[] = [];
  @Output() releaseClick = new EventEmitter<Release>();

  faClock = faClock;
  faArrowTrendUp = faArrowTrendUp;
  faArrowTrendDown = faArrowTrendDown;

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${date.getDate()} de ${months[date.getMonth()]}`;
  }

  isIncome(release: Release): boolean {
    // Verificar se é receita (pode vir como 'receita' do frontend ou 'revenue' do backend)
    return release.type === 'receita' || release.type === 'revenue';
  }

  isExpense(release: Release): boolean {
    // Verificar se é despesa (pode vir como 'despesa' do frontend ou 'expense' do backend)
    return release.type === 'despesa' || release.type === 'expense';
  }

  onReleaseClick(release: Release): void {
    this.releaseClick.emit(release);
  }

  getStatusLabel(release: Release): string {
    // Se tiver status explicitamente, usar ele
    if (release.status === 'cancelled') {
      return 'Cancelado';
    }
    if (release.status === 'paid') {
      return 'Pago';
    }
    // Fallback para is_paid (retrocompatibilidade)
    if (release.is_paid) {
      return 'Pago';
    }
    return 'Pendente';
  }

  getStatusClass(release: Release): string {
    // Priorizar status explícito
    if (release.status === 'cancelled') {
      return 'status-cancelled';
    }
    if (release.status === 'paid' || release.is_paid) {
      return 'status-paid';
    }
    // Pendente ou overdue
    return 'status-pending';
  }

  getCancelTooltip(release: Release): string | null {
    // Tooltip apenas para itens cancelados
    if (release.status !== 'cancelled') {
      return null;
    }
    // Se não tiver updated_at, mostrar mensagem genérica
    if (!release.updated_at) {
      return 'Parcela cancelada. Não será considerada nos relatórios.';
    }
    // Formatar data de cancelamento
    try {
      const cancelDate = new Date(release.updated_at);
      if (isNaN(cancelDate.getTime())) {
        return 'Parcela cancelada. Não será considerada nos relatórios.';
      }
      const day = cancelDate.getDate().toString().padStart(2, '0');
      const month = (cancelDate.getMonth() + 1).toString().padStart(2, '0');
      const year = cancelDate.getFullYear();
      return `Parcela cancelada em ${day}/${month}/${year}. Não será considerada nos relatórios.`;
    } catch (e) {
      return 'Parcela cancelada. Não será considerada nos relatórios.';
    }
  }

  getReleaseTypeTag(release: Release): { label: string; class: string } | null {
    const releaseType = release.release_type || this.inferReleaseType(release);

    if (releaseType === 'installment') {
      return {
        label: release.portion ? `Parcela ${release.portion}` : 'Parcelado',
        class: 'type-badge type-installment'
      };
    } else if (releaseType === 'recurring') {
      return {
        label: release.portion ? `Recorrente ${release.portion}` : 'Recorrente',
        class: 'type-badge type-recurring'
      };
    } else if (releaseType === 'single') {
      return {
        label: 'Único',
        class: 'type-badge type-single'
      };
    }
    return null;
  }

  private inferReleaseType(release: Release): 'installment' | 'recurring' | 'single' {
    if (release.repetition === 'installments' || release.repetition === 'parcelado') {
      return 'installment';
    } else if (release.repetition === 'fixed') {
      return 'recurring';
    }
    return 'single';
  }
}
