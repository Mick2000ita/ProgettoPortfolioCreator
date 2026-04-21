import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { PublicPortfolioPage } from './public-portfolio-page';

describe('PublicPortfolioPage', () => {
  let component: PublicPortfolioPage;
  let fixture: ComponentFixture<PublicPortfolioPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicPortfolioPage],
      providers: [provideHttpClient(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PublicPortfolioPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
