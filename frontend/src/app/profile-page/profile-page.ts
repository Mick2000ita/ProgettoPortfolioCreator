import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { AuthSessionService } from '../services/auth-session.service';

@Component({
  selector: 'app-profile-page',
  imports: [CardModule],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss'
})
export class ProfilePage {
  protected readonly user;

  constructor(authSessionService: AuthSessionService) {
    this.user = authSessionService.user;
  }
}
