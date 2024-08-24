import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class ApiService {
  private baseApiUrl = 'http://localhost:4200/api/';

  constructor(private http: HttpClient) { }

  post(apiUrl: String, formData: FormData): Observable<FormData> {
    return this.http.post<FormData>(this.baseApiUrl + apiUrl, FormData);
  }
}
