import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AuthApiService } from '../services/auth-api.service';
import { AuthSessionService } from '../services/auth-session.service';
import { ProfilePage } from './profile-page';

describe('ProfilePage', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;

  beforeEach(async () => {
    const profile = {
      id: 'user-id',
      email: 'user@example.com',
      username: 'User',
      avatarUrl: null,
      roleCode: 'USER',
      roleDescription: 'User',
      portfolio: null,
    };

    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        {
          provide: AuthSessionService,
          useValue: {
            user: signal({
              email: profile.email,
              username: profile.username,
              avatarUrl: profile.avatarUrl,
            }),
            isGoogleSession: signal(false),
            updateSessionUser: vi.fn(),
          },
        },
        {
          provide: AuthApiService,
          useValue: {
            getCurrentUserProfile: () => of(profile),
            updateCurrentUserProfile: () => of(profile),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
