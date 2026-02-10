import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoogleLoginComponent } from './google-login-component';

describe('GoogleLoginComponent', () => {
  let component: GoogleLoginComponent;
  let fixture: ComponentFixture<GoogleLoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoogleLoginComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoogleLoginComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
