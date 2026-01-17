import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { AuthService } from '../services/auth/auth.service';

@Injectable({
  providedIn: 'root'
})
class AuthGuardService {

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    if (!this.authService.isAuthenticated()) {
      // Redirecionar para login se não autenticado
      this.router.navigate(['/login']);
      return false;
    }

    // Se já tem usuário carregado, permitir acesso
    if (this.authService.getCurrentUser() && this.authService.getCurrentRole()) {
      return true;
    }

    // Se não tem usuário carregado, carregar antes de permitir acesso
    return this.authService.me().pipe(
      map(() => true),
      catchError((error) => {
        console.error('[AuthGuard] Error loading user:', error);
        // Se erro ao carregar, redirecionar para login
        this.authService.clearAuth();
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  return inject(AuthGuardService).canActivate(route, state);
}
