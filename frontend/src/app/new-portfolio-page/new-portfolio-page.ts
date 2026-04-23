import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AuthApiService } from '../services/auth-api.service';
import {
  PORTFOLIO_LAYOUT_TEMPLATES,
  PortfolioLayoutTemplateId,
  buildPortfolioModulesFromTemplate,
} from '../services/portfolio-editor-state.service';

@Component({
  selector: 'app-new-portfolio-page',
  imports: [ButtonModule, RouterLink, ReactiveFormsModule, InputTextModule],
  templateUrl: './new-portfolio-page.html',
  styleUrl: './new-portfolio-page.scss',
})
export class NewPortfolioPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authApiService = inject(AuthApiService);

  protected readonly isSubmitting = signal(false);
  protected readonly layoutTemplates = PORTFOLIO_LAYOUT_TEMPLATES;
  protected readonly selectedLayoutId = signal<PortfolioLayoutTemplateId | null>(null);
  protected readonly selectedLayout = computed(
    () =>
      this.layoutTemplates.find((template) => template.id === this.selectedLayoutId()) ??
      null,
  );

  protected readonly portfolioForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required]],
  });

  protected readonly slugPreview = computed(() =>
    this.slugify(this.portfolioForm.controls.title.value),
  );

  protected selectLayout(templateId: PortfolioLayoutTemplateId) {
    this.selectedLayoutId.set(templateId);
  }

  protected continueWithoutLayout() {
    this.selectedLayoutId.set(null);
  }

  protected submit() {
    this.portfolioForm.markAllAsTouched();
    if (this.portfolioForm.invalid) {
      return;
    }

    const title = this.portfolioForm.controls.title.value.trim();
    if (!title) {
      return;
    }

    const selectedLayoutId = this.selectedLayoutId();

    this.isSubmitting.set(true);

    this.authApiService
      .createPortfolio({
        title,
        modules: selectedLayoutId ? buildPortfolioModulesFromTemplate(selectedLayoutId) : [],
      })
      .subscribe({
        next: (portfolio) => {
          this.isSubmitting.set(false);
          void this.router.navigate(['/portfolios', portfolio.slug, 'edit']);
        },
        error: () => {
          this.isSubmitting.set(false);
        },
      });
  }

  protected trackTemplate(index: number) {
    return this.layoutTemplates[index]?.id ?? index;
  }

  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
