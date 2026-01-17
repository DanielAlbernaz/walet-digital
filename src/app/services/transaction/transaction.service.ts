import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Transaction {
  id: number;
  type: string;
  value: string;
  date: string;
  payment_date: string;
  descrition: string;
  observation: string;
  repetition: string;
  portion: string | null;
  category_id: number;
  user_id: number;
  installment_id: number | null;
  created_at: string;
  updated_at: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  // Ajuste esta URL conforme o endereço do seu backend
  private baseApiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.baseApiUrl}/transactions`);
  }
}


