import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-test-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test-button.html',
  styleUrls: ['./test-button.scss']
})
export class TestButtonComponent {
  private http = inject(HttpClient);
  result: any;

  runTest() {
    this.http.get<any>(`${environment.apiUrl}/api/test`).subscribe({
      next: (response) => this.result = response,
      error: (err) => console.error(err)
    });
  }
}
