import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { PortfoliosPage } from './portfolios-page';

describe('PortfoliosPage', () => {
  let component: PortfoliosPage;
  let fixture: ComponentFixture<PortfoliosPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortfoliosPage],
      providers: [provideHttpClient(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PortfoliosPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
