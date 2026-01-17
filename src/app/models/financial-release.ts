export interface FinancialRelease {
  id?: number;
  type: 'receita' | 'despesa';
  value: number;
  date: string; // YYYY-MM-DD
  payment_date?: string | null; // YYYY-MM-DD
  descrition?: string | null;
  observation?: string | null;
  repetition: 'unico' | 'mensal' | 'semanal' | 'anual' | 'parcelado';
  portion?: string | null;
  category_id: number;
  installment_id?: number | null;
  status?: 'pending' | 'paid' | 'overdue'; // Status do lançamento
  created_at?: string;
  updated_at?: string;
  finance_account_id?: number;
  created_by?: number;
}

export interface CreateFinancialReleaseRequest {
  type: 'receita' | 'despesa';
  value: number;
  date: string;
  payment_date?: string | null;
  descrition?: string | null;
  observation?: string | null;
  repetition: 'unico' | 'mensal' | 'semanal' | 'anual' | 'parcelado';
  portion?: string | null;
  category_id: number;
  installment_id?: number | null;
  status?: 'pending' | 'paid' | 'overdue'; // Status do lançamento
}

export interface Category {
  id: number;
  title: string; // Backend retorna 'title', não 'name'
  type: 'revenue' | 'expense' | 'receita' | 'despesa'; // Backend usa 'revenue'/'expense', frontend aceita ambos
  user_id?: number | null; // null para categorias globais
  created_at?: string;
  updated_at?: string;
}
