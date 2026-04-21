import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestService, TestResponse } from './test';

describe('TestService', () => {
  let service: TestService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TestService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(TestService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch test data from the backend endpoint', () => {
    const expectedResponse: TestResponse = {
      status: 'OK',
      message: 'Frontend e Backend comunicano correttamente'
    };

    service.getTest().subscribe((response) => {
      expect(response).toEqual(expectedResponse);
    });

    const request = httpMock.expectOne('http://localhost:8080/api/test');
    expect(request.request.method).toBe('GET');
    request.flush(expectedResponse);
  });
});
