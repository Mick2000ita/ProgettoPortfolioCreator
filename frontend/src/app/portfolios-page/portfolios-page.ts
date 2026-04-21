import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AuthApiService, UserPortfolioSummaryDto } from '../services/auth-api.service';

@Component({
  selector: 'app-portfolios-page',
  imports: [ButtonModule, CardModule, RouterLink, ConfirmDialogModule],
  providers: [ConfirmationService],
  templateUrl: './portfolios-page.html',
  styleUrl: './portfolios-page.scss'
})
export class PortfoliosPage implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly authApiService = inject(AuthApiService);

  protected readonly portfolios = signal<UserPortfolioSummaryDto[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly deletingSlug = signal<string | null>(null);

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.isLoading.set(true);

    this.authApiService.getMyPortfolios().subscribe({
      next: (portfolios) => {
        this.portfolios.set(portfolios);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  protected viewPortfolio(slug: string) {
    void this.router.navigateByUrl(`/${slug}`);
  }

  protected editPortfolio(slug: string) {
    void this.router.navigate(['/portfolios', slug, 'edit']);
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
      }
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
      }
    });
  }
}
