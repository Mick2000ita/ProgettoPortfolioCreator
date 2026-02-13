import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReactiveBg } from './reactive-bg';

describe('ReactiveBg', () => {
  let component: ReactiveBg;
  let fixture: ComponentFixture<ReactiveBg>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveBg]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReactiveBg);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
