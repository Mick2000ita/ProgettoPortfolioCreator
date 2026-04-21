import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NewPortfolioPage } from './new-portfolio-page';

describe('NewPortfolioPage', () => {
  let component: NewPortfolioPage;
  let fixture: ComponentFixture<NewPortfolioPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewPortfolioPage],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(NewPortfolioPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
