import { Component, Input, Output, EventEmitter } from '@angular/core';
import { faArrowTrendUp, faArrowTrendDown } from '@fortawesome/free-solid-svg-icons';

export interface FinancialItem {
  id: string;
  description: string;
  category: string;
  value: number;
  date: string;
  is_paid: boolean;
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled'; // Status do lançamento
  portion?: string | null; // Parcela (ex: "1/12")
  release_type?: 'installment' | 'recurring' | 'single'; // Tipo de lançamento
  repetition?: string; // Tipo de repetição (para fallback caso release_type não esteja disponível)
  due_date?: string; // Data de vencimento (para tooltip de cancelamento)
  updated_at?: string; // Data de atualização (para tooltip de cancelamento)
}

@Component({
  selector: 'app-financial-list',
  templateUrl: './financial-list.component.html',
  styleUrls: ['./financial-list.component.css']
})
export class FinancialListComponent {
  @Input() items: FinancialItem[] = [];
  @Input() type: 'receita' | 'despesa' = 'receita';
  @Input() selectionMode: boolean = false;
  @Input() selectedIds: string[] = [];
  @Output() itemClick = new EventEmitter<FinancialItem>();
  @Output() selectionChange = new EventEmitter<string[]>();

  faArrowTrendUp = faArrowTrendUp;
  faArrowTrendDown = faArrowTrendDown;

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate();
    const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const month = monthNames[date.getMonth()];
    return `${day} de ${month}`;
  }

  onItemClick(item: FinancialItem, event?: Event): void {
    if (event?.target && (event.target as HTMLElement).closest('.selection-checkbox-wrap')) {
      return;
    }
    this.itemClick.emit(item);
  }

  isSelected(item: FinancialItem): boolean {
    return this.selectedIds.includes(item.id);
  }

  toggleSelection(item: FinancialItem, event: Event): void {
    event.stopPropagation();
    const next = this.isSelected(item)
      ? this.selectedIds.filter(id => id !== item.id)
      : [...this.selectedIds, item.id];
    this.selectionChange.emit(next);
  }

  get allSelected(): boolean {
    return this.items.length > 0 && this.items.every(item => this.selectedIds.includes(item.id));
  }

  get someSelected(): boolean {
    return this.selectedIds.length > 0;
  }

  toggleSelectAll(event: Event): void {
    event.stopPropagation();
    if (this.allSelected) {
      this.selectionChange.emit([]);
    } else {
      this.selectionChange.emit(this.items.map(i => i.id));
    }
  }

  getStatusLabel(item: FinancialItem): string {
    // Se tiver status explicitamente, usar ele
    if (item.status === 'cancelled') {
      return 'Cancelado';
    }
    if (item.status === 'paid') {
      return this.type === 'receita' ? 'Recebido' : 'Pago';
    }
    // Fallback para is_paid (retrocompatibilidade)
    if (item.is_paid) {
      return this.type === 'receita' ? 'Recebido' : 'Pago';
    }
    return 'Pendente';
  }

  getStatusClass(item: FinancialItem): string {
    // Priorizar status explícito
    if (item.status === 'cancelled') {
      return 'status-cancelled';
    }
    if (item.status === 'paid' || item.is_paid) {
      return 'status-paid';
    }
    return 'status-pending';
  }

  getCancelTooltip(item: FinancialItem): string | null {
    // Tooltip apenas para itens cancelados
    if (item.status !== 'cancelled') {
      return null;
    }
    // Se não tiver updated_at, mostrar mensagem genérica
    if (!item.updated_at) {
      return 'Parcela cancelada. Não será considerada nos relatórios.';
    }
    // Formatar data de cancelamento
    try {
      const cancelDate = new Date(item.updated_at);
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

  getReleaseTypeTag(item: FinancialItem): { label: string; class: string } | null {
    // Usar release_type se disponível, senão inferir de repetition
    const releaseType = item.release_type || this.inferReleaseType(item);

    if (releaseType === 'installment') {
      return {
        label: item.portion ? `Parcela ${item.portion}` : 'Parcelado',
        class: 'type-badge type-installment'
      };
    } else if (releaseType === 'recurring') {
      return {
        label: item.portion ? `Recorrente ${item.portion}` : 'Recorrente',
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

  private inferReleaseType(item: FinancialItem): 'installment' | 'recurring' | 'single' {
    // Fallback: inferir baseado em repetition e installment_id
    if (item.repetition === 'installments' || item.repetition === 'parcelado') {
      return 'installment';
    } else if (item.repetition === 'fixed') {
      return 'recurring';
    }
    return 'single';
  }
}
