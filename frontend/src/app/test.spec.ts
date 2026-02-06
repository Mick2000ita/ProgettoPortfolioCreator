import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TestService, TestResponse } from './test';

describe('TestService Real Backend', () => {
  let service: TestService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClient],
      providers: [TestService]
    });
    service = TestBed.inject(TestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch real data from backend', async () => {
    const response: TestResponse = await firstValueFrom(service.getTest());
    console.log('Backend response:', response);

    expect(response.status).toBe('OK');
    expect(response.message).toBe('Frontend e Backend comunicano correttamente');
  });
});