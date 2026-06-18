export interface OfxImportPreviewRow {
  id: string;
  included: boolean;
  fitid: string;
  originalMemo: string;
  description: string;
  /** Data original do arquivo OFX (YYYY-MM-DD) */
  originalDate: string;
  date: string;
  due_date: string;
  value: number;
  category_id: number | null;
  payment_method_id: number | null;
  status: 'paid' | 'pending';
  payment_date: string | null;
  portion: string | null;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  installmentGroupKey: string | null;
  isInstallment: boolean;
  createAsInstallmentPlan: boolean;
}
