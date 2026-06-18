import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import {
  faTimes,
  faFileImport,
  faUpload,
  faTrash,
  faCheck,
  faCreditCard,
  faLayerGroup,
  faExclamationTriangle,
  faCalendar,
  faFilePdf
} from '@fortawesome/free-solid-svg-icons';
import { ToastrService } from 'ngx-toastr';
import { Category } from '../../../models/category.model';
import { PaymentMethod } from '../../../models/payment-method.model';
import { CreateFinancialReleaseRequest } from '../../../models/financial-release';
import { OfxImportPreviewRow } from '../../../models/ofx-import.model';
import { FinancialReleaseService } from '../../../services/financial-release/financial-release.service';
import {
  parseInstallmentFromMemo,
  roundMoney,
  shiftDateToTargetMonth
} from '../../../utils/ofx-parser.util';
import { parsePdfFile, PdfParsedTransaction, PdfParseResult } from '../../../utils/pdf-parser.util';

type ImportStep = 'upload' | 'preview';

@Component({
  selector: 'app-pdf-import-modal',
  templateUrl: './pdf-import-modal.component.html',
  styleUrls: ['../ofx-import-modal/ofx-import-modal.component.scss']
})
export class PdfImportModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() categories: Category[] = [];
  @Input() paymentMethods: PaymentMethod[] = [];
  @Input() defaultMonth: Date = new Date();
  @Output() close = new EventEmitter<void>();
  @Output() imported = new EventEmitter<void>();

  faTimes = faTimes;
  faFileImport = faFileImport;
  faUpload = faUpload;
  faTrash = faTrash;
  faCheck = faCheck;
  faCreditCard = faCreditCard;
  faLayerGroup = faLayerGroup;
  faExclamationTriangle = faExclamationTriangle;
  faCalendar = faCalendar;
  faFilePdf = faFilePdf;

  step: ImportStep = 'upload';
  selectedTargetMonth = '';
  selectedPaymentMethodId: number | null = null;
  selectedFileName = '';
  rows: OfxImportPreviewRow[] = [];
  parseError = '';
  detectedBank = '';
  isLoading = false;
  isSubmitting = false;
  defaultCategoryId: number | null = null;

  constructor(
    private financialReleaseService: FinancialReleaseService,
    private toastr: ToastrService
  ) {}

  get expenseCategories(): Category[] {
    return this.categories.filter((c) => c.type === 'expense' || c.type === 'despesa');
  }

  get includedRows(): OfxImportPreviewRow[] {
    return this.rows.filter((r) => r.included);
  }

  get includedTotal(): number {
    return roundMoney(this.includedRows.reduce((sum, r) => sum + r.value, 0));
  }

  get canGoToPreview(): boolean {
    return (
      !!this.selectedPaymentMethodId &&
      !!this.selectedTargetMonth &&
      this.rows.length > 0 &&
      !this.parseError
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.initTargetMonth();
    }
  }

  get canSubmit(): boolean {
    return (
      this.includedRows.length > 0 &&
      this.includedRows.every((r) => r.category_id !== null && r.description.trim().length >= 3)
    );
  }

  get invalidIncludedCount(): number {
    return this.includedRows.filter(
      (r) => !r.category_id || r.description.trim().length < 3
    ).length;
  }

  onClose(): void {
    if (this.isSubmitting) {
      return;
    }
    this.resetState();
    this.close.emit();
  }

  resetState(): void {
    this.step = 'upload';
    this.selectedPaymentMethodId = null;
    this.selectedFileName = '';
    this.rows = [];
    this.parseError = '';
    this.detectedBank = '';
    this.isLoading = false;
    this.isSubmitting = false;
    this.defaultCategoryId = null;
    this.selectedTargetMonth = '';
  }

  private initTargetMonth(): void {
    const base = this.defaultMonth || new Date();
    const year = base.getFullYear();
    const month = String(base.getMonth() + 1).padStart(2, '0');
    this.selectedTargetMonth = `${year}-${month}`;
    this.applyTargetMonthToRows();
  }

  onTargetMonthChange(): void {
    this.applyTargetMonthToRows();
  }

  private applyTargetMonthToRows(): void {
    if (!this.selectedTargetMonth) {
      return;
    }

    this.rows.forEach((row) => {
      const shifted = shiftDateToTargetMonth(row.originalDate, this.selectedTargetMonth);
      row.date = shifted;
      row.due_date = shifted;
      row.payment_date = shifted;
    });
  }

  getTargetMonthLabel(): string {
    if (!this.selectedTargetMonth) {
      return '';
    }

    const [year, month] = this.selectedTargetMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  private getBankLabel(bank: PdfParseResult['bank']): string {
    switch (bank) {
      case 'itau':
        return 'Itaú';
      case 'bv':
        return 'BV Financeira';
      default:
        return '';
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.selectedFileName = file.name;
    this.parseError = '';
    this.detectedBank = '';
    this.isLoading = true;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const buffer = reader.result as ArrayBuffer;
        const parsed = await parsePdfFile(buffer);

        if (parsed.bank === 'unknown') {
          this.parseError =
            'PDF não reconhecido. Suportamos faturas de cartão Itaú e BV Financeira.';
          this.rows = [];
        } else if (parsed.transactions.length === 0) {
          this.parseError = 'Nenhuma compra encontrada na fatura PDF.';
          this.rows = [];
        } else {
          this.detectedBank = this.getBankLabel(parsed.bank);
          this.rows = this.mapParsedToPreviewRows(parsed.transactions);
        }
        this.isLoading = false;
      } catch {
        this.parseError = 'Não foi possível ler o arquivo PDF. Verifique o formato.';
        this.rows = [];
        this.isLoading = false;
      }
      input.value = '';
    };
    reader.onerror = () => {
      this.parseError = 'Erro ao ler o arquivo.';
      this.isLoading = false;
      input.value = '';
    };
    reader.readAsArrayBuffer(file);
  }

  private mapParsedToPreviewRows(parsed: PdfParsedTransaction[]): OfxImportPreviewRow[] {
    const paymentMethodId = this.selectedPaymentMethodId;
    const defaultCategory = this.defaultCategoryId;

    const rows: OfxImportPreviewRow[] = parsed.map((tx, index) => {
      const installment = parseInstallmentFromMemo(tx.memo);
      const description = installment?.baseDescription || tx.memo;

      const shiftedDate = this.selectedTargetMonth
        ? shiftDateToTargetMonth(tx.date, this.selectedTargetMonth)
        : tx.date;

      return {
        id: `pdf-row-${index}-${tx.fitid}`,
        included: true,
        fitid: tx.fitid,
        originalMemo: tx.memo,
        description,
        originalDate: tx.date,
        date: shiftedDate,
        due_date: shiftedDate,
        value: roundMoney(tx.value),
        category_id: defaultCategory,
        payment_method_id: paymentMethodId,
        status: 'paid',
        payment_date: shiftedDate,
        portion: installment?.portion || null,
        installmentCurrent: installment?.current || null,
        installmentTotal: installment?.total || null,
        installmentGroupKey: installment?.groupKey || null,
        isInstallment: !!installment,
        createAsInstallmentPlan: false
      };
    });

    this.detectCompleteInstallmentGroups(rows);
    return rows;
  }

  private detectCompleteInstallmentGroups(rows: OfxImportPreviewRow[]): void {
    const groups = new Map<string, OfxImportPreviewRow[]>();
    rows.forEach((row) => {
      if (!row.installmentGroupKey || !row.installmentTotal) {
        return;
      }
      const list = groups.get(row.installmentGroupKey) || [];
      list.push(row);
      groups.set(row.installmentGroupKey, list);
    });

    groups.forEach((groupRows) => {
      const total = groupRows[0]?.installmentTotal;
      if (!total || total < 2) {
        return;
      }
      const currents = new Set(groupRows.map((r) => r.installmentCurrent).filter((n) => n != null));
      let complete = currents.size === total;
      for (let i = 1; i <= total; i++) {
        if (!currents.has(i)) {
          complete = false;
          break;
        }
      }
      if (complete) {
        groupRows.forEach((r) => {
          r.createAsInstallmentPlan = true;
        });
      }
    });
  }

  goToPreview(): void {
    if (!this.selectedPaymentMethodId) {
      this.toastr.warning('Selecione a forma de pagamento antes de continuar.', 'Atenção');
      return;
    }
    if (!this.selectedTargetMonth) {
      this.toastr.warning('Selecione o mês de competência dos lançamentos.', 'Atenção');
      return;
    }
    if (this.rows.length === 0) {
      this.toastr.warning('Importe uma fatura PDF com despesas.', 'Atenção');
      return;
    }
    this.applyTargetMonthToRows();
    this.applyPaymentMethodToRows();
    this.applyDefaultCategoryToRows();
    this.step = 'preview';
  }

  backToUpload(): void {
    this.step = 'upload';
  }

  applyPaymentMethodToRows(): void {
    this.rows.forEach((row) => {
      row.payment_method_id = this.selectedPaymentMethodId;
    });
  }

  applyDefaultCategoryToRows(): void {
    if (!this.defaultCategoryId) {
      return;
    }
    this.rows.forEach((row) => {
      if (!row.category_id) {
        row.category_id = this.defaultCategoryId;
      }
    });
  }

  applyDefaultCategoryToIncluded(): void {
    if (!this.defaultCategoryId) {
      return;
    }
    this.rows.forEach((row) => {
      if (row.included && !row.category_id) {
        row.category_id = this.defaultCategoryId;
      }
    });
  }

  toggleRowIncluded(row: OfxImportPreviewRow): void {
    row.included = !row.included;
  }

  excludeRow(row: OfxImportPreviewRow): void {
    row.included = false;
  }

  includeAll(): void {
    this.rows.forEach((r) => (r.included = true));
  }

  excludeAll(): void {
    this.rows.forEach((r) => (r.included = false));
  }

  toggleInstallmentPlan(row: OfxImportPreviewRow): void {
    if (!row.installmentGroupKey) {
      return;
    }
    const newValue = !row.createAsInstallmentPlan;
    this.rows
      .filter((r) => r.installmentGroupKey === row.installmentGroupKey)
      .forEach((r) => {
        r.createAsInstallmentPlan = newValue;
      });
  }

  getGroupRows(groupKey: string): OfxImportPreviewRow[] {
    return this.rows.filter((r) => r.installmentGroupKey === groupKey);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  formatDate(value: string): string {
    if (!value) {
      return '-';
    }
    const d = new Date(value + 'T00:00:00');
    return isNaN(d.getTime()) ? value : d.toLocaleDateString('pt-BR');
  }

  buildCreatePayloads(): CreateFinancialReleaseRequest[] {
    const payloads: CreateFinancialReleaseRequest[] = [];
    const processedInstallmentGroups = new Set<string>();

    for (const row of this.includedRows) {
      if (
        row.createAsInstallmentPlan &&
        row.installmentGroupKey &&
        row.installmentTotal &&
        row.installmentTotal >= 2 &&
        !processedInstallmentGroups.has(row.installmentGroupKey)
      ) {
        processedInstallmentGroups.add(row.installmentGroupKey);
        const groupRows = this.getGroupRows(row.installmentGroupKey).filter((r) => r.included);
        const totalValue = roundMoney(groupRows.reduce((s, r) => s + r.value, 0));
        const first = groupRows.sort(
          (a, b) => (a.installmentCurrent || 0) - (b.installmentCurrent || 0)
        )[0];

        payloads.push({
          type: 'expense',
          value: totalValue,
          date: first.date,
          due_date: first.due_date,
          payment_date: first.payment_date,
          descrition: first.description,
          observation: this.buildObservation(first, true),
          category_id: first.category_id!,
          payment_method_id: first.payment_method_id,
          repetition: 'installments',
          number_installments_repetition: row.installmentTotal,
          status: first.status
        });
        continue;
      }

      if (row.installmentGroupKey && processedInstallmentGroups.has(row.installmentGroupKey)) {
        continue;
      }

      payloads.push({
        type: 'expense',
        value: row.value,
        date: row.date,
        due_date: row.due_date,
        payment_date: row.payment_date,
        descrition: row.description.trim(),
        observation: this.buildObservation(row, false),
        category_id: row.category_id!,
        payment_method_id: row.payment_method_id,
        repetition: 'only',
        portion: row.portion,
        status: row.status
      });
    }

    return payloads;
  }

  private buildObservation(row: OfxImportPreviewRow, isPlan: boolean): string {
    const parts = [`Importado via PDF (${this.detectedBank || 'cartão'})`, `Ref: ${row.fitid}`];
    if (row.originalMemo !== row.description) {
      parts.push(`Descrição original: ${row.originalMemo}`);
    }
    if (row.isInstallment && row.portion) {
      parts.push(`Parcela: ${row.portion}`);
    }
    if (isPlan) {
      parts.push('Parcelamento criado a partir do grupo na fatura PDF');
    }
    return parts.join(' | ');
  }

  submitImport(): void {
    if (!this.canSubmit) {
      this.toastr.warning(
        'Preencha categoria e descrição (mín. 3 caracteres) em todos os lançamentos incluídos.',
        'Validação'
      );
      return;
    }

    const releases = this.buildCreatePayloads();
    if (releases.length === 0) {
      this.toastr.warning('Nenhum lançamento selecionado para importar.', 'Atenção');
      return;
    }

    this.isSubmitting = true;
    this.financialReleaseService
      .bulkCreate({
        payment_method_id: this.selectedPaymentMethodId,
        releases
      })
      .subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.toastr.success(
            res.message || `${res.count} despesa(s) importada(s) com sucesso.`,
            'Importação concluída'
          );
          this.imported.emit();
          this.onClose();
        },
        error: (err) => {
          this.isSubmitting = false;
          const msg =
            err?.error?.message ||
            'Erro ao criar despesas. Verifique se o endpoint bulk-create está disponível no backend.';
          this.toastr.error(msg, 'Erro na importação');
        }
      });
  }
}
