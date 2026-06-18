import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();

    // Pula a página de aviso do ngrok (plano free). Inofensivo fora do ngrok.
    let headers = req.headers.set('ngrok-skip-browser-warning', 'true');

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return next.handle(req.clone({ headers }));
  }
}
