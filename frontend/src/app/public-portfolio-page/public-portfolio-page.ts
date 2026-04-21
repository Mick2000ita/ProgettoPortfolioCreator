import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthApiService, PortfolioModuleDto, PortfolioPublicDto } from '../services/auth-api.service';

@Component({
  selector: 'app-public-portfolio-page',
  templateUrl: './public-portfolio-page.html',
  styleUrl: './public-portfolio-page.scss'
})
export class PublicPortfolioPage implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly route = inject(ActivatedRoute);
  private readonly authApiService = inject(AuthApiService);

  protected readonly portfolio = signal<PortfolioPublicDto | null>(null);
  protected readonly notFound = signal(false);
  protected readonly titleModules = computed(() =>
    this.findModules('title').filter((module) => module.value?.trim())
  );
  protected readonly descriptionModules = computed(() =>
    this.findModules('description').filter((module) => module.value?.trim())
  );
  protected readonly imageModules = computed(() => this.findModules('image'));
  protected readonly cvModules = computed(() => this.findModules('cv'));
  protected readonly backgroundColor = computed(() => {
    const backgroundModule = this.findModules('background').at(-1);
    return backgroundModule?.value || '#081111';
  });

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.notFound.set(true);
      return;
    }

    this.authApiService.getPublicPortfolio(slug).subscribe({
      next: (portfolio) => {
        this.portfolio.set(portfolio);
      },
      error: () => {
        this.notFound.set(true);
      }
    });
  }

  protected findModules(type: string): PortfolioModuleDto[] {
    return this.portfolio()?.modules.filter((module) => module.type === type) ?? [];
  }
}
