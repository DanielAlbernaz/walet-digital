export interface Category {
  id: number;
  finance_account_id: number | null;
  title: string;
  type: 'revenue' | 'expense' | 'receita' | 'despesa';
  user_id: number | null;
  is_custom: boolean;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryRequest {
  title: string;
  type: 'revenue' | 'expense' | 'receita' | 'despesa';
  is_active?: boolean;
}

export interface UpdateCategoryRequest {
  title?: string;
  type?: 'revenue' | 'expense' | 'receita' | 'despesa';
  is_active?: boolean;
}
