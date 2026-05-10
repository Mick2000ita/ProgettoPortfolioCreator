import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import {
  AuthApiService,
  PortfolioAnalyticsDto,
  PortfolioModuleDto,
  PortfolioMonthlyViewsDto,
  PortfolioPublicDto,
  PortfolioViewSummaryDto,
} from '../services/auth-api.service';
import { AuthSessionService } from '../services/auth-session.service';
import { PORTFOLIO_LAYOUT_TEMPLATES } from '../services/portfolio-editor-state.service';

interface HomeSnapshotCard {
  id: string;
  title: string;
  slug: string;
  description: string;
  tags: string[];
  featureLines: string[];
  imageUrl: string;
  accent: string;
  modulesCount: number;
  placeholder: boolean;
}

type HomePageMode = 'landing' | 'analytics';

const HOME_SNAPSHOT_LIMIT = 4;
const HOME_SNAPSHOT_PLACEHOLDERS: HomeSnapshotCard[] = [
  {
    id: 'placeholder-studio',
    title: 'Portfolio in arrivo',
    slug: '',
    description: 'Uno spazio pronto per il prossimo creator che attivera lo snap in Home.',
    tags: ['Case study', 'Design'],
    featureLines: ['Hero visuale', 'Progetti selezionati', 'Contatti rapidi'],
    imageUrl: '',
    accent: '#f7d26d',
    modulesCount: 6,
    placeholder: true,
  },
  {
    id: 'placeholder-dev',
    title: 'Showcase tecnico',
    slug: '',
    description: 'Placeholder per portfolio pubblici con codice, metriche e lavoro reale.',
    tags: ['Frontend', 'Code'],
    featureLines: ['Stack', 'Snippet', 'Metriche'],
    imageUrl: '',
    accent: '#83d1b4',
    modulesCount: 5,
    placeholder: true,
  },
  {
    id: 'placeholder-visual',
    title: 'Racconto visuale',
    slug: '',
    description: 'Una preview di riserva mentre non ci sono abbastanza snap da mostrare.',
    tags: ['Visual', 'Story'],
    featureLines: ['Gallery', 'Processo', 'CTA finale'],
    imageUrl: '',
    accent: '#d87f47',
    modulesCount: 7,
    placeholder: true,
  },
  {
    id: 'placeholder-brand',
    title: 'Profilo creativo',
    slug: '',
    description: 'Card segnaposto con la stessa densita delle anteprime reali.',
    tags: ['Brand', 'Portfolio'],
    featureLines: ['Bio', 'Risultati', 'Link social'],
    imageUrl: '',
    accent: '#c0efe1',
    modulesCount: 4,
    placeholder: true,
  },
];

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, ButtonModule, CardModule],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly authApiService = inject(AuthApiService);
  private isAnalyticsRequestInFlight = false;
  private hasRegisteredAnalyticsRefresh = false;

  protected readonly user = this.authSessionService.user;
  protected readonly isAuthenticated = this.authSessionService.authenticated;
  protected readonly pageMode = signal<HomePageMode>('landing');
  protected readonly isAnalyticsPage = computed(() => this.pageMode() === 'analytics');
  protected readonly primaryActionLink = computed(() =>
    this.isAuthenticated() ? '/portfolios/new' : '/login',
  );
  protected readonly primaryActionLabel = computed(() =>
    this.isAuthenticated() ? 'Crea portfolio' : 'Inizia ora',
  );
  protected readonly primaryActionIcon = computed(() =>
    this.isAuthenticated() ? 'pi pi-plus' : 'pi pi-sign-in',
  );
  protected readonly layoutTemplates = PORTFOLIO_LAYOUT_TEMPLATES;
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
      description: 'Salva il portfolio e condividilo con un URL pulito come /sara-rossi.',
      icon: 'pi pi-send',
    },
  ];
  protected readonly launchMetrics = [
    { value: String(PORTFOLIO_LAYOUT_TEMPLATES.length), label: 'layout guidati' },
    { value: '9', label: 'moduli editor' },
    { value: '/slug', label: 'pagina pubblica' },
  ];

  protected readonly homeSnapshots = signal<PortfolioPublicDto[]>([]);
  protected readonly isLoadingHomeSnapshots = signal(false);
  protected readonly homeSnapshotCards = computed<HomeSnapshotCard[]>(() => {
    const realCards = this.homeSnapshots()
      .slice(0, HOME_SNAPSHOT_LIMIT)
      .map((portfolio, index) => this.toHomeSnapshotCard(portfolio, index));
    const placeholders = HOME_SNAPSHOT_PLACEHOLDERS.slice(
      0,
      HOME_SNAPSHOT_LIMIT - realCards.length,
    );

    return [...realCards, ...placeholders];
  });
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
  protected readonly bestPortfolio = computed(
    () =>
      [...this.portfolioViews()].sort((first, second) => second.totalViews - first.totalViews)[0],
  );

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.pageMode.set(data['page'] === 'analytics' ? 'analytics' : 'landing');
      this.loadCurrentPageData();
    });
  }

  private loadCurrentPageData() {
    if (this.isAnalyticsPage()) {
      this.loadAnalytics();
      this.refreshAnalyticsWhenPageBecomesActive();
      return;
    }

    this.loadHomeSnapshots();
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

  private loadHomeSnapshots() {
    this.isLoadingHomeSnapshots.set(true);
    this.authApiService.getHomeSnapshotPortfolios().subscribe({
      next: (portfolios) => {
        this.homeSnapshots.set(portfolios ?? []);
        this.isLoadingHomeSnapshots.set(false);
      },
      error: () => {
        this.homeSnapshots.set([]);
        this.isLoadingHomeSnapshots.set(false);
      },
    });
  }

  private refreshAnalyticsWhenPageBecomesActive() {
    if (this.hasRegisteredAnalyticsRefresh) {
      return;
    }

    this.hasRegisteredAnalyticsRefresh = true;

    const onPageActive = () => {
      if (document.visibilityState === 'visible' && this.isAnalyticsPage()) {
        this.loadAnalytics();
      }
    };

    const onFocus = () => {
      if (this.isAnalyticsPage()) {
        this.loadAnalytics();
      }
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

  protected getSnapshotFeatureWidth(index: number): string {
    return `${88 - index * 12}%`;
  }

  private toHomeSnapshotCard(portfolio: PortfolioPublicDto, index: number): HomeSnapshotCard {
    const modules = this.flattenModules(portfolio.modules ?? []).filter(
      (module) => module.type !== 'background',
    );
    const description = this.getSnapshotDescription(portfolio, modules);
    const featureLines = modules
      .map((module) => module.label?.trim())
      .filter((label): label is string => Boolean(label))
      .slice(0, 3);

    return {
      id: portfolio.id,
      title: portfolio.title,
      slug: portfolio.slug,
      description,
      tags: (portfolio.tags ?? []).slice(0, 3),
      featureLines: featureLines.length > 0 ? featureLines : ['Hero', 'Contenuti', 'Pubblicazione'],
      imageUrl: this.getSnapshotImage(modules),
      accent: this.getSnapshotAccent(index),
      modulesCount: modules.length,
      placeholder: false,
    };
  }

  private flattenModules(modules: PortfolioModuleDto[]): PortfolioModuleDto[] {
    return modules.flatMap((module) => [module, ...this.flattenModules(module.children ?? [])]);
  }

  private getSnapshotDescription(
    portfolio: PortfolioPublicDto,
    modules: PortfolioModuleDto[],
  ): string {
    const portfolioDescription = portfolio.description?.trim();
    if (portfolioDescription) {
      return this.truncateSnapshotText(portfolioDescription, 124);
    }

    const textModule = modules.find((module) =>
      ['description', 'quote', 'cta', 'title'].includes(module.type),
    );
    const value = textModule?.value?.trim();
    if (value) {
      return this.truncateSnapshotText(value, 124);
    }

    if (portfolio.tags?.length) {
      return `Portfolio pubblico su ${portfolio.tags.slice(0, 2).join(' e ')}.`;
    }

    return 'Portfolio pubblico selezionato per comparire nella Home.';
  }

  private getSnapshotImage(modules: PortfolioModuleDto[]): string {
    const mediaModule = modules.find(
      (module) => module.type === 'image' || module.type === 'carousel',
    );
    return mediaModule?.values?.find(Boolean) ?? mediaModule?.value ?? '';
  }

  private truncateSnapshotText(value: string, limit: number): string {
    const compactValue = value.replace(/\s+/g, ' ').trim();
    return compactValue.length > limit
      ? `${compactValue.slice(0, limit - 1).trim()}...`
      : compactValue;
  }

  private getSnapshotAccent(index: number): string {
    return ['#83d1b4', '#f7d26d', '#d87f47', '#c0efe1'][index % 4];
  }
}
