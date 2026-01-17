import { FinanceAccount, UserRole } from './finance-account';
import { Plan, PlanFeatures } from './plan';

export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string;
  created_at?: string;
  updated_at?: string;
  finance_account?: FinanceAccount;
  role?: UserRole;
  plan?: Plan;
  features?: PlanFeatures;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  invite_token?: string;
}

export interface RegisterResponse {
  user: User;
}
