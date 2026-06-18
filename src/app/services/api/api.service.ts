import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseApiUrl = environment.baseApiUrl;

  constructor(private http: HttpClient) { }

  get<T>(url: string, params?: { [key: string]: any }): Observable<T> {
    let fullUrl = `${this.baseApiUrl}${url}`;

    // Adicionar query params se fornecidos
    if (params) {
      const queryString = Object.keys(params)
        .filter(key => params[key] !== null && params[key] !== undefined)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');

      if (queryString) {
        fullUrl += `?${queryString}`;
      }
    }

    return this.http.get<T>(fullUrl);
  }

  post<T>(url: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseApiUrl}${url}`, body);
  }

  put<T>(url: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseApiUrl}${url}`, body);
  }

  patch<T>(url: string, body: any): Observable<T> {
    return this.http.patch<T>(`${this.baseApiUrl}${url}`, body);
  }

  delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(`${this.baseApiUrl}${url}`);
  }
}
