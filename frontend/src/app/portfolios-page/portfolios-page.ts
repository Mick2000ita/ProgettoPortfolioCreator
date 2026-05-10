import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { PORTFOLIO_TAG_OPTIONS } from '../portfolio-tags';
import { AuthApiService, UserPortfolioSummaryDto } from '../services/auth-api.service';

@Component({
  selector: 'app-portfolios-page',
  imports: [
    ButtonModule,
    CardModule,
    RouterLink,
    ConfirmDialogModule,
    FormsModule,
    MultiSelectModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './portfolios-page.html',
  styleUrl: './portfolios-page.scss',
})
export class PortfoliosPage implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly authApiService = inject(AuthApiService);

  protected readonly portfolios = signal<UserPortfolioSummaryDto[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly loadError = signal(false);
  protected readonly deletingSlug = signal<string | null>(null);
  protected readonly visibilitySlug = signal<string | null>(null);
  protected readonly discoverySavingSlug = signal<string | null>(null);
  protected readonly tagSavingSlug = signal<string | null>(null);
  protected readonly tagDrafts = signal<Record<string, string[]>>({});
  protected readonly descriptionSavingSlug = signal<string | null>(null);
  protected readonly descriptionDrafts = signal<Record<string, string>>({});
  protected readonly portfolioTagOptions = PORTFOLIO_TAG_OPTIONS;

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.isLoading.set(true);
    this.loadError.set(false);

    this.authApiService.getMyPortfolios().subscribe({
      next: (portfolios) => {
        this.portfolios.set(portfolios);
        this.tagDrafts.set(this.createTagDrafts(portfolios));
        this.descriptionDrafts.set(this.createDescriptionDrafts(portfolios));
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  protected editPortfolio(slug: string) {
    void this.router.navigate(['/portfolios', slug, 'edit']);
  }

  protected togglePortfolioVisibility(portfolio: UserPortfolioSummaryDto) {
    this.visibilitySlug.set(portfolio.slug);

    this.authApiService.updatePortfolioVisibility(portfolio.slug, !portfolio.public).subscribe({
      next: (updatedPortfolio) => {
        this.portfolios.update((portfolios) =>
          portfolios.map((currentPortfolio) =>
            currentPortfolio.slug === updatedPortfolio.slug ? updatedPortfolio : currentPortfolio
          )
        );
        this.visibilitySlug.set(null);
      },
      error: () => {
        this.visibilitySlug.set(null);
      },
    });
  }

  protected toggleHomeSnapshotVisibility(portfolio: UserPortfolioSummaryDto) {
    this.updatePortfolioDiscoveryPreferences(portfolio, {
      showHomeSnapshot: !portfolio.showHomeSnapshot,
      showInExplore: Boolean(portfolio.showInExplore),
    });
  }

  protected toggleExploreVisibility(portfolio: UserPortfolioSummaryDto) {
    this.updatePortfolioDiscoveryPreferences(portfolio, {
      showHomeSnapshot: Boolean(portfolio.showHomeSnapshot),
      showInExplore: !portfolio.showInExplore,
    });
  }

  protected getTagDraft(portfolio: UserPortfolioSummaryDto) {
    return this.tagDrafts()[portfolio.slug] ?? portfolio.tags ?? [];
  }

  protected updateTagDraft(slug: string, tags: string[]) {
    this.tagDrafts.update((drafts) => ({
      ...drafts,
      [slug]: [...tags],
    }));
  }

  protected hasTagChanges(portfolio: UserPortfolioSummaryDto) {
    return !this.areTagsEqual(this.getTagDraft(portfolio), portfolio.tags ?? []);
  }

  protected getDescriptionDraft(portfolio: UserPortfolioSummaryDto) {
    return this.descriptionDrafts()[portfolio.slug] ?? portfolio.description ?? '';
  }

  protected updateDescriptionDraft(slug: string, description: string) {
    this.descriptionDrafts.update((drafts) => ({
      ...drafts,
      [slug]: description,
    }));
  }

  protected hasDescriptionChanges(portfolio: UserPortfolioSummaryDto) {
    return this.normalizeDescriptionDraft(this.getDescriptionDraft(portfolio)) !==
      this.normalizeDescriptionDraft(portfolio.description ?? '');
  }

  protected savePortfolioTags(portfolio: UserPortfolioSummaryDto) {
    const tags = this.getTagDraft(portfolio);
    this.tagSavingSlug.set(portfolio.slug);

    this.authApiService.updatePortfolioTags(portfolio.slug, { tags }).subscribe({
      next: (updatedPortfolio) => {
        this.portfolios.update((portfolios) =>
          portfolios.map((currentPortfolio) =>
            currentPortfolio.slug === updatedPortfolio.slug ? updatedPortfolio : currentPortfolio
          )
        );
        this.updateTagDraft(updatedPortfolio.slug, updatedPortfolio.tags ?? []);
        this.tagSavingSlug.set(null);
      },
      error: () => {
        this.updateTagDraft(portfolio.slug, portfolio.tags ?? []);
        this.tagSavingSlug.set(null);
      },
    });
  }

  protected savePortfolioDescription(portfolio: UserPortfolioSummaryDto) {
    const description = this.normalizeDescriptionDraft(this.getDescriptionDraft(portfolio));
    this.descriptionSavingSlug.set(portfolio.slug);

    this.authApiService.updatePortfolioDescription(portfolio.slug, { description }).subscribe({
      next: (updatedPortfolio) => {
        this.portfolios.update((portfolios) =>
          portfolios.map((currentPortfolio) =>
            currentPortfolio.slug === updatedPortfolio.slug ? updatedPortfolio : currentPortfolio
          )
        );
        this.updateDescriptionDraft(updatedPortfolio.slug, updatedPortfolio.description ?? '');
        this.descriptionSavingSlug.set(null);
      },
      error: () => {
        this.updateDescriptionDraft(portfolio.slug, portfolio.description ?? '');
        this.descriptionSavingSlug.set(null);
      },
    });
  }

  protected confirmDeletePortfolio(portfolio: UserPortfolioSummaryDto) {
    this.confirmationService.confirm({
      header: 'Rimuovere questo portfolio?',
      message: `Il portfolio "${portfolio.title}" verra' eliminato definitivamente.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Rimuovi',
      rejectLabel: 'Annulla',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deletePortfolio(portfolio.slug);
      },
    });
  }

  private deletePortfolio(slug: string) {
    this.deletingSlug.set(slug);

    this.authApiService.deletePortfolio(slug).subscribe({
      next: () => {
        this.portfolios.update((portfolios) =>
          portfolios.filter((portfolio) => portfolio.slug !== slug)
        );
        this.deletingSlug.set(null);
      },
      error: () => {
        this.deletingSlug.set(null);
      },
    });
  }

  private updatePortfolioDiscoveryPreferences(
    portfolio: UserPortfolioSummaryDto,
    payload: { showHomeSnapshot: boolean; showInExplore: boolean },
  ) {
    this.discoverySavingSlug.set(portfolio.slug);

    this.authApiService.updatePortfolioDiscoveryPreferences(portfolio.slug, payload).subscribe({
      next: (updatedPortfolio) => {
        this.portfolios.update((portfolios) =>
          portfolios.map((currentPortfolio) =>
            currentPortfolio.slug === updatedPortfolio.slug ? updatedPortfolio : currentPortfolio
          )
        );
        this.discoverySavingSlug.set(null);
      },
      error: () => {
        this.discoverySavingSlug.set(null);
      },
    });
  }

  private createTagDrafts(portfolios: UserPortfolioSummaryDto[]) {
    return portfolios.reduce<Record<string, string[]>>((drafts, portfolio) => {
      drafts[portfolio.slug] = [...(portfolio.tags ?? [])];
      return drafts;
    }, {});
  }

  private createDescriptionDrafts(portfolios: UserPortfolioSummaryDto[]) {
    return portfolios.reduce<Record<string, string>>((drafts, portfolio) => {
      drafts[portfolio.slug] = portfolio.description ?? '';
      return drafts;
    }, {});
  }

  private areTagsEqual(firstTags: string[], secondTags: string[]) {
    if (firstTags.length !== secondTags.length) {
      return false;
    }

    return firstTags.every((tag, index) => tag === secondTags[index]);
  }

  private normalizeDescriptionDraft(description: string) {
    return description.trim().replace(/\s+/g, ' ');
  }
}
