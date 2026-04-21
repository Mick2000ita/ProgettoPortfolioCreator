import { Routes } from '@angular/router';
import { AuthenticatedLayout } from './authenticated-layout/authenticated-layout';
import { authGuard, guestGuard } from './guards/auth.guards';
import { HomePage } from './home-page/home-page';
import { LoginPage } from './login-page/login-page';
import { NewPortfolioPage } from './new-portfolio-page/new-portfolio-page';
import { PortfolioEditorPage } from './portfolio-editor-page/portfolio-editor-page';
import { PortfoliosPage } from './portfolios-page/portfolios-page';
import { ProfilePage } from './profile-page/profile-page';
import { PublicPortfolioPage } from './public-portfolio-page/public-portfolio-page';

export const routes: Routes = [
  {
    path: '',
    component: HomePage,
    canActivate: [guestGuard]
  },
  {
    path: 'login',
    component: LoginPage,
    canActivate: [guestGuard]
  },
  {
    path: 'home',
    component: AuthenticatedLayout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: HomePage
      }
    ]
  },
  {
    path: '',
    component: AuthenticatedLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'profile',
        component: ProfilePage
      },
      {
        path: 'portfolios',
        component: PortfoliosPage
      },
      {
        path: 'portfolios/new',
        component: NewPortfolioPage
      },
      {
        path: 'portfolios/:slug/edit',
        component: PortfolioEditorPage
      }
    ]
  },
  {
    path: ':slug',
    component: PublicPortfolioPage
  },
  {
    path: '**',
    redirectTo: ''
  }
];
