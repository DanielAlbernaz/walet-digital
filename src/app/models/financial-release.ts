export interface FinancialRelease {
  id?: number;
  type: 'receita' | 'despesa';
  value: number;
  date: string; // YYYY-MM-DD - Data de competência
  due_date: string; // YYYY-MM-DD - Data de vencimento (obrigatório)
  payment_date?: string | null; // YYYY-MM-DD - Data de pagamento
  descrition?: string | null;
  observation?: string | null;
  repetition: 'unico' | 'mensal' | 'semanal' | 'anual' | 'parcelado' | 'only' | 'installments' | 'fixed';
  portion?: string | null;
  category_id: number;
  payment_method_id?: number | null; // ID do método de pagamento (opcional)
  installment_id?: number | null;
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled'; // Status do lançamento
  release_type?: 'installment' | 'recurring' | 'single'; // Tipo de lançamento (novo campo do backend)
  created_at?: string;
  updated_at?: string;
  finance_account_id?: number;
  created_by?: number;
}

export interface CreateFinancialReleaseRequest {
  type: 'receita' | 'despesa' | 'revenue' | 'expense';
  value: number;
  date: string; // Data de competência
  due_date: string; // Data de vencimento (obrigatório)
  payment_date?: string | null;
  descrition?: string | null;
  observation?: string | null;
  repetition: 'unico' | 'mensal' | 'semanal' | 'anual' | 'parcelado' | 'only' | 'installments' | 'fixed';
  portion?: string | null;
  category_id: number;
  payment_method_id?: number | null; // ID do método de pagamento (opcional)
  installment_id?: number | null;
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled'; // Status do lançamento
  // Campos condicionais para parcelamento
  number_installments_repetition?: number; // Obrigatório se repetition = 'installments'
  // Campos condicionais para recorrência
  number_repetition?: number; // Obrigatório se repetition = 'fixed'
  periodicity?: 'daily' | 'weekly' | 'monthly' | 'annual'; // Obrigatório se repetition = 'fixed'
}

// Category interface moved to category.model.ts
// Re-export for backward compatibility
export { Category } from './category.model';

// Interface para resposta paginada do Laravel
export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

// Interfaces para endpoints de parcelamentos
export interface InstallmentSummary {
  installment_id: number;
  descrition: string;
  category_id: number;
  category: {
    id: number;
    title: string;
  };
  type: 'expense' | 'revenue';
  total_value: number;
  total_installments: number;
  paid_installments: number;
  paid_value: number;
  remaining_value: number;
  first_date: string;
  last_date: string;
  created_at: string;
  payment_method_id?: number | null; // ID do método de pagamento (opcional)
}

export interface InstallmentParcel {
  id: number;
  portion: string; // "1/12"
  value: number;
  date: string;
  due_date: string;
  payment_date: string | null;
  status: 'pending' | 'paid' | 'cancelled' | 'overdue';
  created_at: string;
  payment_method_id?: number | null; // ID do método de pagamento (opcional)
}

export interface InstallmentDetails extends InstallmentSummary {
  observation: string | null;
  parcels: InstallmentParcel[];
}

/** Payload para edição em massa (PATCH /api/financial_release/bulk-update) */
export interface BulkUpdateRequest {
  ids: number[];
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_date?: string; // YYYY-MM-DD
  finance_account_id?: number;
  category_id?: number;
  payment_method_id?: number | null;
}

/** Resposta da edição em massa */
export interface BulkUpdateResponse {
  message: string;
  count: number;
  data: FinancialRelease[];
}

/** Criação em massa (ex.: importação OFX) */
export interface BulkCreateFinancialReleaseRequest {
  payment_method_id?: number | null;
  releases: CreateFinancialReleaseRequest[];
}

export interface BulkCreateFinancialReleaseResponse {
  message: string;
  count: number;
  data?: FinancialRelease[];
  errors?: Array<{ index: number; message: string }>;
}
