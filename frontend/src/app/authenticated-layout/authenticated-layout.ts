import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';

@Component({
  selector: 'app-authenticated-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './authenticated-layout.html',
  styleUrl: './authenticated-layout.scss'
})
export class AuthenticatedLayout {
  private readonly router = inject(Router);
  private readonly authSessionService = inject(AuthSessionService);

  protected readonly user = this.authSessionService.user;

  protected logout() {
    this.authSessionService.clearSession();
    void this.router.navigate(['/']);
  }
}
