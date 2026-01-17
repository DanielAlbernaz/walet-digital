import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { ApiService } from '../api/api.service';
import { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, User } from '../../models/user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'auth_token';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.apiService.post<LoginResponse>('auth/login', credentials).pipe(
      tap((response) => {
        this.setToken(response.token);
        this.loadUser();
      })
    );
  }

  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.apiService.post<RegisterResponse>('auth/register', data);
  }

  logout(): Observable<any> {
    return this.apiService.post<any>('auth/logout', {}).pipe(
      tap(() => {
        this.clearAuth();
        this.router.navigate(['/login']);
      })
    );
  }

  me(): Observable<User> {
    return this.apiService.get<User>('auth/me').pipe(
      tap((user) => {
        this.currentUserSubject.next(user);
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  clearAuth(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  private loadUser(): void {
    this.me().subscribe({
      error: (error) => {
        // Token inválido, limpar autenticação
        if (error.status === 401 || error.status === 403) {
          this.clearAuth();
        }
      }
    });
  }
}
