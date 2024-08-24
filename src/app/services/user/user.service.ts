import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { User } from 'src/app/interfaces/User';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';


@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseApiUrl = environment.baseApiUrl
  private url = `${this.baseApiUrl}auth/`;
  private userasdAuthenticated: boolean = false;

  constructor(
    private http: HttpClient,
    private route: Router
    ) { }

  create(data: User): Observable<User> {
    return this.http.post<User>(`${this.url}register`, data);
  }

  login(data: User): Observable<User> {
    return this.http.post<User>(`${this.url}login`, data);
  }

  me(token: string): Observable<User> {
    const headers = { 'Authorization': `Bearer ${token}`};
    return this.http.get<User>(`${this.url}me`, {headers});
  }

  userAuthenticated (user: User, userToken: string) {
    sessionStorage.setItem('authTokenUser', userToken);
    sessionStorage.setItem('userName', user.name);
    sessionStorage.setItem('userEmail', user.email);

    if (userToken) {
      this.route.navigate(['/']);
    }
  }

  userIsAuthenticated () {
    if (sessionStorage.getItem('authTokenUser')) {
      return true;
    }
    return false;
  }
}
