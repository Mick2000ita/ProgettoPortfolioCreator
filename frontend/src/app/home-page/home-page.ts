import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import {
  AuthApiService,
  PortfolioAnalyticsDto,
  PortfolioMonthlyViewsDto,
  PortfolioViewSummaryDto,
} from '../services/auth-api.service';
import { AuthSessionService } from '../services/auth-session.service';
import {
  PORTFOLIO_EDITOR_CONTENT_OPTIONS,
  PORTFOLIO_LAYOUT_TEMPLATES,
} from '../services/portfolio-editor-state.service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, ButtonModule, CardModule],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly authApiService = inject(AuthApiService);
  private isAnalyticsRequestInFlight = false;

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
        'Parti da layout professionali gia pronti per visual, codice, design, social, spazi e scrittura.',
      icon: 'pi pi-sitemap',
    },
    {
      kicker: '02',
      title: 'Compila il canvas',
      description:
        'Aggiungi testi, snippet di codice, immagini, carousel, tabelle, stats e CTA dentro una griglia visuale.',
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
    { value: String(PORTFOLIO_LAYOUT_TEMPLATES.length), label: 'layout guidati' },
    { value: '9', label: 'moduli editor' },
    { value: '/slug', label: 'pagina pubblica' },
  ];

  protected readonly analytics = signal<PortfolioAnalyticsDto | null>(null);
  protected readonly isLoadingAnalytics = signal(false);
  protected readonly loadError = signal('');
  protected readonly portfolioViews = computed<PortfolioViewSummaryDto[]>(
    () => this.analytics()?.portfolioViews ?? [],
  );
  protected readonly recentPortfolios = computed(() => this.portfolioViews().slice(0, 4));
  protected readonly portfolioStats = computed(() => {
    const portfolios = this.portfolioViews();
    const publicCount = portfolios.filter((portfolio) => portfolio.public).length;

    return {
      total: portfolios.length,
      public: publicCount,
      private: portfolios.length - publicCount,
    };
  });
  protected readonly viewStats = computed(() => {
    const analytics = this.analytics();
    const monthlyViews = analytics?.monthlyViews ?? 0;
    const previousMonthViews = analytics?.previousMonthViews ?? 0;
    const delta = monthlyViews - previousMonthViews;
    const deltaPercentage =
      previousMonthViews === 0
        ? monthlyViews > 0
          ? 100
          : 0
        : Math.round((delta / previousMonthViews) * 100);

    return {
      totalViews: analytics?.totalViews ?? 0,
      monthlyViews,
      previousMonthViews,
      delta,
      deltaLabel: `${deltaPercentage > 0 ? '+' : ''}${deltaPercentage}%`,
    };
  });
  protected readonly monthlyTrend = computed(() => {
    const trend = this.analytics()?.monthlyTrend ?? [];
    const maxViews = Math.max(...trend.map((month) => month.views), 0);

    return trend.map((month) => ({
      ...month,
      percentage: maxViews > 0 ? Math.max(6, Math.round((month.views / maxViews) * 100)) : 0,
    }));
  });
  protected readonly trendChart = computed(() => {
    const trend = this.monthlyTrend();
    const maxViews = Math.max(...trend.map((month) => month.views), 0);
    const chartMax = Math.max(maxViews, 1);
    const left = 6;
    const right = 94;
    const top = 8;
    const bottom = 45;
    const width = right - left;
    const height = bottom - top;
    const points = trend.map((month, index) => {
      const x = trend.length > 1 ? left + (width / (trend.length - 1)) * index : left + width / 2;
      const y = bottom - (month.views / chartMax) * height;

      return {
        ...month,
        x,
        y,
        labelY: Math.max(top + 6.5, y - 1.8),
        axisLabelY: 55,
      };
    });
    const linePoints = points.map((point) => `${point.x},${point.y}`).join(' ');
    const areaPath =
      points.length > 0
        ? `M ${points[0].x},${bottom} L ${points
            .map((point) => `${point.x},${point.y}`)
            .join(' L ')} L ${points[points.length - 1].x},${bottom} Z`
        : '';
    const gridLines = [0, 25, 50, 75, 100].map((offset) => ({
      y: bottom - (offset / 100) * height,
    }));

    return {
      areaPath,
      gridLines,
      linePoints,
      plotLeft: left,
      plotRight: right,
      points,
      viewBox: '0 0 100 60',
    };
  });
  protected readonly bestPortfolio = computed(() =>
    [...this.portfolioViews()].sort((first, second) => second.totalViews - first.totalViews)[0],
  );

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId) || !this.isAuthenticated()) {
      return;
    }

    this.loadAnalytics();
    this.refreshAnalyticsWhenPageBecomesActive();
  }

  private loadAnalytics() {
    if (this.isAnalyticsRequestInFlight) {
      return;
    }

    this.isAnalyticsRequestInFlight = true;
    this.isLoadingAnalytics.set(this.analytics() === null);
    this.authApiService.getMyPortfolioAnalytics().subscribe({
      next: (analytics) => {
        this.analytics.set(analytics);
        this.loadError.set('');
        this.isLoadingAnalytics.set(false);
        this.isAnalyticsRequestInFlight = false;
      },
      error: () => {
        this.loadError.set('Non sono riuscito a recuperare le metriche in questo momento.');
        this.isLoadingAnalytics.set(false);
        this.isAnalyticsRequestInFlight = false;
      },
    });
  }

  private refreshAnalyticsWhenPageBecomesActive() {
    const onPageActive = () => {
      if (document.visibilityState === 'visible') {
        this.loadAnalytics();
      }
    };

    const onFocus = () => {
      this.loadAnalytics();
    };

    document.addEventListener('visibilitychange', onPageActive);
    window.addEventListener('focus', onFocus);

    this.destroyRef.onDestroy(() => {
      document.removeEventListener('visibilitychange', onPageActive);
      window.removeEventListener('focus', onFocus);
    });
  }

  protected getTrendAriaLabel(month: PortfolioMonthlyViewsDto): string {
    return `${month.label}: ${month.views} visualizzazioni`;
  }

  protected getPortfolioViewShare(portfolio: PortfolioViewSummaryDto): number {
    const bestTotalViews = this.bestPortfolio()?.totalViews ?? 0;

    return bestTotalViews > 0 ? (portfolio.totalViews / bestTotalViews) * 100 : 0;
  }
}
