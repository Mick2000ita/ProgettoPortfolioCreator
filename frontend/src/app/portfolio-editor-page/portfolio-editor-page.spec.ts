import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PortfolioEditorPage } from './portfolio-editor-page';

describe('PortfolioEditorPage', () => {
  let component: PortfolioEditorPage;
  let fixture: ComponentFixture<PortfolioEditorPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortfolioEditorPage],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PortfolioEditorPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
