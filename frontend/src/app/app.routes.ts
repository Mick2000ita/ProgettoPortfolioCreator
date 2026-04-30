import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guards';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home-page/home-page').then((module) => module.HomePage),
    canActivate: [guestGuard]
  },
  {
    path: 'login',
    loadComponent: () => import('./login-page/login-page').then((module) => module.LoginPage),
    canActivate: [guestGuard]
  },
  {
    path: 'privacy',
    loadComponent: () => import('./privacy-page/privacy-page').then((module) => module.PrivacyPage)
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./authenticated-layout/authenticated-layout').then(
        (module) => module.AuthenticatedLayout,
      ),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./home-page/home-page').then((module) => module.HomePage)
      }
    ]
  },
  {
    path: '',
    loadComponent: () =>
      import('./authenticated-layout/authenticated-layout').then(
        (module) => module.AuthenticatedLayout,
      ),
    canActivate: [authGuard],
    children: [
      {
        path: 'profile',
        loadComponent: () =>
          import('./profile-page/profile-page').then((module) => module.ProfilePage)
      },
      {
        path: 'portfolios',
        loadComponent: () =>
          import('./portfolios-page/portfolios-page').then((module) => module.PortfoliosPage)
      },
      {
        path: 'portfolios/new',
        loadComponent: () =>
          import('./new-portfolio-page/new-portfolio-page').then(
            (module) => module.NewPortfolioPage,
          )
      },
      {
        path: 'portfolios/:slug/edit',
        loadComponent: () =>
          import('./portfolio-editor-page/portfolio-editor-page').then(
            (module) => module.PortfolioEditorPage,
          )
      }
    ]
  },
  {
    path: ':slug',
    loadComponent: () =>
      import('./public-portfolio-page/public-portfolio-page').then(
        (module) => module.PublicPortfolioPage,
      )
  },
  {
    path: '**',
    redirectTo: ''
  }
];
