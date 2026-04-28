import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthApiService, UserPortfolioSummaryDto } from '../services/auth-api.service';
import { AuthSessionService } from '../services/auth-session.service';
import {
  PORTFOLIO_EDITOR_CONTENT_OPTIONS,
  PORTFOLIO_LAYOUT_TEMPLATES,
} from '../services/portfolio-editor-state.service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, ButtonModule],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly authApiService = inject(AuthApiService);

  protected readonly user = this.authSessionService.user;
  protected readonly isAuthenticated = this.authSessionService.authenticated;
  protected readonly layoutTemplates = PORTFOLIO_LAYOUT_TEMPLATES;
  protected readonly editorTools = PORTFOLIO_EDITOR_CONTENT_OPTIONS.filter(
    (option) => option.value !== 'background',
  );
  protected readonly workflowSteps = [
    {
      kicker: '01',
      title: 'Scegli un layout',
      description:
        'Parti da Editorial Split, Case Study o CV Showcase con slot gia pronti da compilare.',
      icon: 'pi pi-sitemap',
    },
    {
      kicker: '02',
      title: 'Compila il canvas',
      description:
        'Aggiungi testi, snippet di codice, immagini, carousel, CV, tabelle, stats e CTA dentro una griglia visuale.',
      icon: 'pi pi-th-large',
    },
    {
      kicker: '03',
      title: 'Pubblica su slug',
      description: 'Salva il portfolio e condividilo con un URL pulito come /marco-rinaldi.',
      icon: 'pi pi-send',
    },
  ];
  protected readonly launchMetrics = [
    { value: '3', label: 'layout guidati' },
    { value: '10', label: 'moduli editor' },
    { value: '/slug', label: 'pagina pubblica' },
  ];

  protected readonly portfolios = signal<UserPortfolioSummaryDto[]>([]);
  protected readonly isLoadingPortfolios = signal(false);
  protected readonly loadError = signal('');
  protected readonly recentPortfolios = computed(() => this.portfolios().slice(0, 3));
  protected readonly portfolioStats = computed(() => {
    const portfolios = this.portfolios();
    const publicCount = portfolios.filter((portfolio) => portfolio.public).length;

    return {
      total: portfolios.length,
      public: publicCount,
      private: portfolios.length - publicCount,
    };
  });

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId) || !this.isAuthenticated()) {
      return;
    }

    this.isLoadingPortfolios.set(true);
    this.authApiService.getMyPortfolios().subscribe({
      next: (portfolios) => {
        this.portfolios.set(portfolios);
        this.loadError.set('');
        this.isLoadingPortfolios.set(false);
      },
      error: () => {
        this.loadError.set('Non sono riuscito a recuperare i portfolio in questo momento.');
        this.isLoadingPortfolios.set(false);
      },
    });
  }
}
