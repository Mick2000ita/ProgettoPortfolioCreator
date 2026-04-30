import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { TimelineModule } from 'primeng/timeline';
import { EMPTY, firstValueFrom } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { PORTFOLIO_TAG_OPTIONS } from '../portfolio-tags';
import { AuthApiService } from '../services/auth-api.service';
import {
  PORTFOLIO_LAYOUT_TEMPLATES,
  PortfolioLayoutTemplateId,
  buildPortfolioModulesFromTemplate,
} from '../services/portfolio-editor-state.service';

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error';

interface WizardStep {
  index: number;
  title: string;
  subtitle: string;
}

@Component({
  selector: 'app-new-portfolio-page',
  imports: [
    ButtonModule,
    RouterLink,
    ReactiveFormsModule,
    InputTextModule,
    MultiSelectModule,
    TimelineModule,
  ],
  templateUrl: './new-portfolio-page.html',
  styleUrl: './new-portfolio-page.scss',
})
export class NewPortfolioPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authApiService = inject(AuthApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly slugManuallyEdited = signal(false);

  protected readonly isSubmitting = signal(false);
  protected readonly activeStepIndex = signal(0);
  protected readonly slugStatus = signal<SlugStatus>('idle');
  protected readonly slugError = signal<string | null>(null);
  protected readonly slugValue = signal('');
  protected readonly layoutTemplates = PORTFOLIO_LAYOUT_TEMPLATES;
  protected readonly portfolioTagOptions = PORTFOLIO_TAG_OPTIONS;
  protected readonly selectedLayoutId = signal<PortfolioLayoutTemplateId | null>(null);
  protected readonly wizardSteps: WizardStep[] = [
    {
      index: 0,
      title: 'Identita',
      subtitle: 'Nome e slug pubblico',
    },
    {
      index: 1,
      title: 'Layout',
      subtitle: 'Struttura iniziale',
    },
    {
      index: 2,
      title: 'Visibilita',
      subtitle: 'Home, Esplora e privacy',
    },
    {
      index: 3,
      title: 'Riepilogo',
      subtitle: 'Controllo finale',
    },
  ];
  protected readonly selectedLayout = computed(
    () =>
      this.layoutTemplates.find((template) => template.id === this.selectedLayoutId()) ??
      null,
  );
  protected readonly currentStep = computed(
    () => this.wizardSteps[this.activeStepIndex()] ?? this.wizardSteps[0],
  );
  protected readonly progressValue = computed(
    () => ((this.activeStepIndex() + 1) / this.wizardSteps.length) * 100,
  );

  protected readonly portfolioForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required]],
    slug: [
      '',
      [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)],
    ],
    tags: [[] as string[]],
    showHomeSnapshot: [true],
    showInExplore: [false],
    public: [true],
  });

  protected readonly slugPreview = computed(() => this.slugValue());

  constructor() {
    this.portfolioForm.controls.title.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (!this.slugManuallyEdited()) {
          this.portfolioForm.controls.slug.setValue(this.slugify(value));
        }
      });

    this.portfolioForm.controls.slug.valueChanges
      .pipe(
        tap((value) => this.slugValue.set(value)),
        debounceTime(350),
        distinctUntilChanged(),
        switchMap((value) => {
          const slug = this.slugify(value);
          this.slugError.set(null);

          if (!slug) {
            this.slugStatus.set('idle');
            return EMPTY;
          }

          if (this.portfolioForm.controls.slug.invalid) {
            this.slugStatus.set('invalid');
            return EMPTY;
          }

          this.slugStatus.set('checking');
          return this.authApiService.checkPortfolioSlug(slug).pipe(
            catchError(() => {
              this.slugStatus.set('error');
              this.slugError.set('Non riesco a verificare lo slug in questo momento.');
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.slugStatus.set(result.available ? 'available' : 'taken');
        this.slugError.set(result.available ? null : 'Questo slug e gia in uso.');
      });
  }

  protected selectLayout(templateId: PortfolioLayoutTemplateId) {
    this.selectedLayoutId.set(templateId);
  }

  protected continueWithoutLayout() {
    this.selectedLayoutId.set(null);
  }

  protected onSlugInput() {
    this.slugManuallyEdited.set(true);

    const slugControl = this.portfolioForm.controls.slug;
    const normalizedSlug = this.slugify(slugControl.value);
    if (slugControl.value !== normalizedSlug) {
      slugControl.setValue(normalizedSlug);
    }
  }

  protected async goToStep(targetIndex: number) {
    if (targetIndex <= this.activeStepIndex()) {
      this.activeStepIndex.set(targetIndex);
      return;
    }

    if (this.activeStepIndex() === 0) {
      const canContinue = await this.validateIdentityStep();
      if (!canContinue) {
        return;
      }
    }

    this.activeStepIndex.set(Math.min(targetIndex, this.wizardSteps.length - 1));
  }

  protected async nextStep() {
    await this.goToStep(this.activeStepIndex() + 1);
  }

  protected previousStep() {
    this.activeStepIndex.set(Math.max(this.activeStepIndex() - 1, 0));
  }

  protected stepState(index: number) {
    if (index < this.activeStepIndex()) {
      return 'completed';
    }

    if (index === this.activeStepIndex()) {
      return 'active';
    }

    return 'pending';
  }

  protected async submit() {
    this.portfolioForm.markAllAsTouched();
    if (this.portfolioForm.invalid) {
      this.activeStepIndex.set(0);
      return;
    }

    const canCreate = await this.validateIdentityStep();
    if (!canCreate) {
      this.activeStepIndex.set(0);
      return;
    }

    const title = this.portfolioForm.controls.title.value.trim();
    const slug = this.slugify(this.portfolioForm.controls.slug.value);
    const tags = this.portfolioForm.controls.tags.value;
    const showHomeSnapshot = this.portfolioForm.controls.showHomeSnapshot.value;
    const showInExplore = this.portfolioForm.controls.showInExplore.value;
    const isPublic = this.portfolioForm.controls.public.value;
    if (!title || !slug) {
      this.activeStepIndex.set(0);
      return;
    }

    const selectedLayoutId = this.selectedLayoutId();

    this.isSubmitting.set(true);

    this.authApiService
      .createPortfolio({
        title,
        slug,
        tags,
        showHomeSnapshot,
        showInExplore,
        public: isPublic,
        modules: selectedLayoutId ? buildPortfolioModulesFromTemplate(selectedLayoutId) : [],
      })
      .subscribe({
        next: (portfolio) => {
          this.isSubmitting.set(false);
          void this.router.navigate(['/portfolios', portfolio.slug, 'edit']);
        },
        error: (error) => {
          this.isSubmitting.set(false);
          this.activeStepIndex.set(0);
          this.slugStatus.set('error');
          this.slugError.set(
            error?.error?.message ?? 'Non e stato possibile creare il portfolio.',
          );
        },
      });
  }

  protected trackTemplate(index: number) {
    return this.layoutTemplates[index]?.id ?? index;
  }

  private async validateIdentityStep() {
    this.portfolioForm.controls.title.markAsTouched();
    this.portfolioForm.controls.slug.markAsTouched();

    if (this.portfolioForm.controls.title.invalid || this.portfolioForm.controls.slug.invalid) {
      this.slugStatus.set(this.portfolioForm.controls.slug.value ? 'invalid' : 'idle');
      this.slugError.set(
        this.portfolioForm.controls.slug.value
          ? 'Usa solo lettere minuscole, numeri e trattini.'
          : 'Lo slug e obbligatorio.',
      );
      return false;
    }

    const slug = this.slugify(this.portfolioForm.controls.slug.value);
    if (!slug) {
      this.slugStatus.set('idle');
      this.slugError.set('Lo slug e obbligatorio.');
      return false;
    }

    this.portfolioForm.controls.slug.setValue(slug);
    this.slugStatus.set('checking');
    this.slugError.set(null);

    try {
      const result = await firstValueFrom(this.authApiService.checkPortfolioSlug(slug));
      this.slugStatus.set(result.available ? 'available' : 'taken');
      this.slugError.set(result.available ? null : 'Questo slug e gia in uso.');
      return result.available;
    } catch {
      this.slugStatus.set('error');
      this.slugError.set('Non riesco a verificare lo slug in questo momento.');
      return false;
    }
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
