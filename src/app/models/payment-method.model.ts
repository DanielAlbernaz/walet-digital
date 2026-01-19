export interface PaymentMethod {
  id: number;
  finance_account_id: number | null;
  name: string;
  is_custom: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreatePaymentMethodRequest {
  name: string;
  is_active?: boolean;
}

export interface UpdatePaymentMethodRequest {
  name?: string;
  is_active?: boolean;
}
