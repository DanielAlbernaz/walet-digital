import { Injectable } from '@angular/core';
import Swal, { SweetAlertOptions, SweetAlertResult } from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class SweetAlertService {

  /**
   * Exibe um alerta de confirmação
   */
  confirm(options: {
    title?: string;
    text?: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
    icon?: 'warning' | 'error' | 'success' | 'info' | 'question';
  }): Promise<SweetAlertResult> {
    const defaultOptions: SweetAlertOptions = {
      title: 'Tem certeza?',
      text: 'Esta ação não pode ser desfeita.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2563EB',
      cancelButtonColor: '#6B7280',
      confirmButtonText: options.confirmButtonText || 'Sim, confirmar',
      cancelButtonText: options.cancelButtonText || 'Cancelar',
      reverseButtons: true
    };

    return Swal.fire({
      ...defaultOptions,
      ...options
    });
  }


  /**
   * Exibe um alerta de confirmação para cancelar lançamento
   * Regras de UX: Para parcelas, sempre perguntar apenas "Deseja realmente cancelar esta parcela?"
   */
  confirmCancelRelease(options: {
    isInstallment?: boolean;
    isRecurring?: boolean;
    releaseCount?: number;
    isSingleInstallment?: boolean; // Nova opção para cancelar uma parcela única
  } = {}): Promise<SweetAlertResult> {
    // Se for uma parcela única (não parcelamento completo), mensagem simplificada
    if (options.isSingleInstallment) {
      return Swal.fire({
        title: 'Cancelar parcela?',
        text: 'Deseja realmente cancelar esta parcela?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DC2626',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Sim, cancelar',
        cancelButtonText: 'Não, manter',
        reverseButtons: true
      });
    }

    // Para parcelamentos/recorrências futuras (ação em massa - preparado para futuro)
    let title = 'Cancelar lançamento?';
    let text = 'Tem certeza que deseja cancelar este lançamento? Esta ação não pode ser desfeita.';

    if (options.isInstallment && options.releaseCount && options.releaseCount > 1) {
      title = 'Cancelar parcelas futuras?';
      text = `Tem certeza que deseja cancelar todas as ${options.releaseCount} parcelas futuras deste parcelamento? Esta ação não pode ser desfeita.`;
    } else if (options.isRecurring && options.releaseCount && options.releaseCount > 1) {
      title = 'Cancelar recorrências futuras?';
      text = `Tem certeza que deseja cancelar todas as ${options.releaseCount} recorrências futuras? Esta ação não pode ser desfeita.`;
    }

    return Swal.fire({
      title: title,
      text: text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DC2626',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Sim, cancelar',
      cancelButtonText: 'Não, manter',
      reverseButtons: true
    });
  }

  /**
   * Exibe um alerta de confirmação para excluir
   */
  confirmDelete(message: string = 'Esta ação não pode ser desfeita.'): Promise<SweetAlertResult> {
    return Swal.fire({
      title: 'Excluir lançamento?',
      text: message,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DC2626',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });
  }

  /**
   * Exibe um loading
   */
  loading(title: string = 'Processando...'): void {
    Swal.fire({
      title: title,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  /**
   * Fecha o alerta atual
   */
  close(): void {
    Swal.close();
  }
}
