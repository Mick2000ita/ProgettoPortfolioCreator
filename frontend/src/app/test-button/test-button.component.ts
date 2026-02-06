import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

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
    this.http.get<any>('http://localhost:8080/api/test').subscribe({
      next: (response) => this.result = response,
      error: (err) => console.error(err)
    });
  }
}
