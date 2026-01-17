import { Plan } from './plan';

export interface FinanceAccount {
  id: number;
  name: string;
  owner_id: number;
  plan?: Plan;
  created_at?: string;
  updated_at?: string;
}

export interface FinanceAccountInvite {
  id: number;
  finance_account_id: number;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  token: string;
  expires_at: string;
  accepted_at?: string;
  created_at?: string;
  updated_at?: string;
  finance_account?: FinanceAccount;
}

export interface FinanceAccountUser {
  id: number;
  user_id: number;
  finance_account_id: number;
  role: 'owner' | 'editor' | 'viewer';
  user?: {
    id: number;
    name: string;
    email: string;
  };
  created_at?: string;
  updated_at?: string;
}

export type UserRole = 'owner' | 'editor' | 'viewer';

export interface CreateInviteRequest {
  email: string;
  role: UserRole;
}
