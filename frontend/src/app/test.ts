import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TestResponse {
  status: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class TestService {
  private apiUrl = 'http://localhost:8080/api/test';

  constructor(private http: HttpClient) {}

  getTest(): Observable<TestResponse> {
    return this.http.get<TestResponse>(this.apiUrl);
  }
}