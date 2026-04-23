import { NgStyle, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AuthApiService,
  PortfolioModuleDto,
  PortfolioPublicDto,
} from '../services/auth-api.service';
import {
  ContentType,
  DEFAULT_BACKGROUND_COLOR,
  EditorNodeTextStyle,
  EditorNodeLayout,
  resolveTextStyle,
  supportsTextFormatting,
} from '../services/portfolio-editor-state.service';

const CANVAS_COLUMNS = 48;
const CANVAS_ROW_HEIGHT = 18;
const MIN_CANVAS_ROWS = 72;
const MAX_CANVAS_ROWS = 420;
const FREEFORM_LAYOUT_MARKER = 'freeform-canvas-v2';
const LEGACY_COLUMN_SCALE = 4;
const LEGACY_ROW_SCALE = 3;
const PORTFOLIO_PREVIEW_STORAGE_KEY = 'portfolio-editor-preview';

interface RenderableModule extends PortfolioModuleDto {
  resolvedLayout: EditorNodeLayout;
}

interface StatRow {
  value: string;
  label: string;
  detail: string;
}

@Component({
  selector: 'app-public-portfolio-page',
  imports: [NgStyle],
  templateUrl: './public-portfolio-page.html',
  styleUrl: './public-portfolio-page.scss',
})
export class PublicPortfolioPage implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly route = inject(ActivatedRoute);
  private readonly authApiService = inject(AuthApiService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  protected readonly portfolio = signal<PortfolioPublicDto | null>(null);
  protected readonly notFound = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly carouselIndexes = signal<Record<string, number>>({});
  protected readonly renderableModules = computed(() =>
    this.buildRenderableModules(this.portfolio()?.modules ?? []),
  );
  protected readonly backgroundColor = computed(() => {
    const backgroundModule = [...this.flattenModules(this.portfolio()?.modules ?? [])]
      .reverse()
      .find((module) => module.type === 'background');
    return backgroundModule?.value || DEFAULT_BACKGROUND_COLOR;
  });
  protected readonly canvasRowCount = computed(() => {
    const bottomEdge = this.renderableModules().reduce((maxBottom, module) => {
      const layout = module.resolvedLayout;
      return Math.max(maxBottom, layout.rowStart + layout.rowSpan + 4);
    }, MIN_CANVAS_ROWS);

    return Math.min(MAX_CANVAS_ROWS, Math.max(MIN_CANVAS_ROWS, bottomEdge));
  });
  private autoplayIntervalId: number | null = null;

  ngOnInit() {
    if (!this.isBrowser) {
      return;
    }

    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.notFound.set(true);
      this.isLoading.set(false);
      return;
    }

    const previewMode = this.route.snapshot.queryParamMap.get('preview') === '1';
    const localPreview = previewMode ? this.readLocalPreview(slug) : null;
    if (localPreview) {
      this.portfolio.set(localPreview);
      this.startCarouselAutoplay();
    }

    this.authApiService.getPublicPortfolio(slug).subscribe({
      next: (portfolio) => {
        const hasModules = Array.isArray(portfolio.modules) && portfolio.modules.length > 0;
        if (hasModules || !localPreview) {
          this.portfolio.set(portfolio);
        }
        this.startCarouselAutoplay();
        this.isLoading.set(false);
      },
      error: () => {
        if (!localPreview) {
          this.notFound.set(true);
        }
        this.isLoading.set(false);
      },
    });
  }

  ngOnDestroy() {
    this.stopCarouselAutoplay();
  }

  protected trackModule(index: number, module: RenderableModule) {
    return this.getModuleKey(index, module);
  }

  protected getModuleStyle(module: RenderableModule) {
    return {
      gridColumn: `${module.resolvedLayout.columnStart} / span ${module.resolvedLayout.columnSpan}`,
      gridRow: `${module.resolvedLayout.rowStart} / span ${module.resolvedLayout.rowSpan}`,
    };
  }

  protected getTextModuleStyle(module: RenderableModule) {
    const textStyle = resolveTextStyle(module.type as ContentType, module.textStyle);
    const style: Record<string, string> = {
      '--text-font-size': `${textStyle.fontSize}px`,
      '--text-align': textStyle.textAlign,
      '--text-justify': this.getTextJustify(textStyle.textAlign),
      '--text-vertical-align': this.getVerticalAlignValue(textStyle.verticalAlign),
      '--text-font-weight': textStyle.bold ? '700' : '400',
      '--text-font-style': textStyle.italic ? 'italic' : 'normal',
    };

    if (textStyle.textColor) {
      style['--text-color'] = textStyle.textColor;
    }

    return style;
  }

  protected getTableRows(value?: string) {
    return (value ?? '')
      .split('\n')
      .map((row) => row.split(';').map((cell) => cell.trim()))
      .filter((row) => row.some((cell) => Boolean(cell)));
  }

  protected getStatRows(value?: string): StatRow[] {
    return (value ?? '')
      .split('\n')
      .map((row) => row.split(';').map((cell) => cell.trim()))
      .filter((row) => row.some((cell) => Boolean(cell)))
      .map(([statValue = '', label = '', detail = '']) => ({
        value: statValue,
        label,
        detail,
      }));
  }

  protected getPrimaryImage(module: RenderableModule) {
    return module.values?.[0] ?? null;
  }

  protected getCarouselSlide(module: RenderableModule, index: number) {
    const slideCount = module.values?.length ?? 0;
    if (slideCount === 0) {
      return 0;
    }

    const carouselKey = this.getModuleKey(index, module);
    const savedIndex = this.carouselIndexes()[carouselKey] ?? 0;
    return Math.min(Math.max(savedIndex, 0), slideCount - 1);
  }

  protected getCarouselImage(module: RenderableModule, index: number) {
    return module.values?.[this.getCarouselSlide(module, index)] ?? '';
  }

  protected shiftCarousel(module: RenderableModule, index: number, direction: -1 | 1) {
    const slideCount = module.values?.length ?? 0;
    if (slideCount <= 1) {
      return;
    }

    const carouselKey = this.getModuleKey(index, module);
    const currentIndex = this.getCarouselSlide(module, index);
    const nextIndex = (currentIndex + direction + slideCount) % slideCount;
    this.carouselIndexes.update((currentIndexes) => ({
      ...currentIndexes,
      [carouselKey]: nextIndex,
    }));
  }

  private startCarouselAutoplay() {
    if (!this.isBrowser || this.autoplayIntervalId !== null) {
      return;
    }

    this.autoplayIntervalId = window.setInterval(() => {
      const modules = this.renderableModules();
      if (!modules.length) {
        return;
      }

      this.carouselIndexes.update((currentIndexes) => {
        const nextIndexes = { ...currentIndexes };

        modules.forEach((module, index) => {
          if (module.type !== 'carousel' || (module.values?.length ?? 0) <= 1) {
            return;
          }

          const carouselKey = this.getModuleKey(index, module);
          const slideCount = module.values?.length ?? 0;
          const currentIndex = nextIndexes[carouselKey] ?? 0;
          nextIndexes[carouselKey] = (currentIndex + 1) % slideCount;
        });

        return nextIndexes;
      });
    }, 4500);
  }

  private stopCarouselAutoplay() {
    if (this.autoplayIntervalId === null) {
      return;
    }

    window.clearInterval(this.autoplayIntervalId);
    this.autoplayIntervalId = null;
  }

  private buildRenderableModules(modules: PortfolioModuleDto[]): RenderableModule[] {
    const flattenedModules = this.flattenModules(modules);
    const contentModules = flattenedModules.filter(
      (module): module is PortfolioModuleDto & { type: ContentType } =>
        this.isSupportedContentType(module.type) && module.type !== 'background',
    );
    const usesFreeformCanvas = flattenedModules.some(
      (module) => module.helperText === FREEFORM_LAYOUT_MARKER,
    );
    const shouldScaleLegacyModules =
      !usesFreeformCanvas && this.looksLikeLegacyLayout(contentModules);

    return contentModules.map((module) => {
      const normalizedType =
        module.type === 'image' && (module.values?.length ?? 0) > 1 ? 'carousel' : module.type;
      const normalizedValues =
        normalizedType === 'image' ? (module.values?.slice(0, 1) ?? []) : (module.values ?? []);

      return {
        ...module,
        type: normalizedType,
        values: normalizedValues,
        textStyle: supportsTextFormatting(normalizedType) ? module.textStyle : undefined,
        resolvedLayout: shouldScaleLegacyModules
          ? this.normalizeLayout(normalizedType, this.scaleLegacyLayout(normalizedType, module.layout))
          : this.normalizeLayout(normalizedType, module.layout),
      };
    });
  }

  private flattenModules(modules: PortfolioModuleDto[]): PortfolioModuleDto[] {
    return modules.flatMap((module) => [module, ...this.flattenModules(module.children ?? [])]);
  }

  private isSupportedContentType(type: string): type is ContentType {
    return (
      type === 'title' ||
      type === 'description' ||
      type === 'image' ||
      type === 'carousel' ||
      type === 'table' ||
      type === 'quote' ||
      type === 'stats' ||
      type === 'cta' ||
      type === 'cv' ||
      type === 'background'
    );
  }

  private getDefaultLayout(type: ContentType): EditorNodeLayout {
    switch (type) {
      case 'title':
        return { columnStart: 3, rowStart: 3, columnSpan: 22, rowSpan: 8 };
      case 'description':
        return { columnStart: 3, rowStart: 12, columnSpan: 18, rowSpan: 12 };
      case 'image':
        return { columnStart: 22, rowStart: 12, columnSpan: 18, rowSpan: 16 };
      case 'carousel':
        return { columnStart: 19, rowStart: 12, columnSpan: 22, rowSpan: 18 };
      case 'table':
        return { columnStart: 5, rowStart: 20, columnSpan: 22, rowSpan: 14 };
      case 'quote':
        return { columnStart: 4, rowStart: 12, columnSpan: 20, rowSpan: 10 };
      case 'stats':
        return { columnStart: 4, rowStart: 12, columnSpan: 24, rowSpan: 10 };
      case 'cta':
        return { columnStart: 6, rowStart: 26, columnSpan: 28, rowSpan: 6 };
      case 'cv':
        return { columnStart: 7, rowStart: 8, columnSpan: 24, rowSpan: 20 };
      case 'background':
      default:
        return { columnStart: 1, rowStart: 1, columnSpan: CANVAS_COLUMNS, rowSpan: 1 };
    }
  }

  private normalizeLayout(
    type: ContentType,
    layout?: Partial<EditorNodeLayout> | null,
  ): EditorNodeLayout {
    const fallback = this.getDefaultLayout(type);
    const minColumnSpan =
      type === 'title'
        ? 12
        : type === 'cta'
          ? 14
          : type === 'quote' || type === 'stats' || type === 'carousel'
            ? 12
            : 10;
    const minRowSpan =
      type === 'title'
        ? 6
        : type === 'cta'
          ? 4
          : type === 'quote' || type === 'stats'
            ? 6
            : type === 'image'
              ? 10
              : 8;
    const columnSpan = this.clampInteger(
      layout?.columnSpan,
      minColumnSpan,
      CANVAS_COLUMNS,
      fallback.columnSpan,
    );
    const columnStart = this.clampInteger(
      layout?.columnStart,
      1,
      CANVAS_COLUMNS - columnSpan + 1,
      fallback.columnStart,
    );
    const rowSpan = this.clampInteger(layout?.rowSpan, minRowSpan, MAX_CANVAS_ROWS, fallback.rowSpan);
    const rowStart = this.clampInteger(
      layout?.rowStart,
      1,
      MAX_CANVAS_ROWS - rowSpan + 1,
      fallback.rowStart,
    );

    return {
      columnStart,
      rowStart,
      columnSpan,
      rowSpan,
    };
  }

  private scaleLegacyLayout(
    type: ContentType,
    layout?: PortfolioModuleDto['layout'],
  ): Partial<EditorNodeLayout> {
    const fallback = this.getDefaultLayout(type);
    const columnStart = layout?.columnStart ?? fallback.columnStart;
    const rowStart = layout?.rowStart ?? fallback.rowStart;
    const columnSpan = layout?.columnSpan ?? fallback.columnSpan;
    const rowSpan = layout?.rowSpan ?? fallback.rowSpan;

    return {
      columnStart: ((columnStart - 1) * LEGACY_COLUMN_SCALE) + 1,
      rowStart: ((rowStart - 1) * LEGACY_ROW_SCALE) + 1,
      columnSpan: columnSpan * LEGACY_COLUMN_SCALE,
      rowSpan: rowSpan * LEGACY_ROW_SCALE,
    };
  }

  private looksLikeLegacyLayout(modules: Array<PortfolioModuleDto & { type: ContentType }>) {
    if (!modules.length) {
      return false;
    }

    const maxColumnEnd = modules.reduce((currentMax, module) => {
      const columnStart = module.layout?.columnStart ?? 1;
      const columnSpan = module.layout?.columnSpan ?? 1;
      return Math.max(currentMax, columnStart + columnSpan - 1);
    }, 0);

    return maxColumnEnd <= 12;
  }

  private clampInteger(value: number | undefined, min: number, max: number, fallback: number) {
    const normalizedValue =
      typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;

    return Math.min(max, Math.max(min, normalizedValue));
  }

  private getTextJustify(textAlign: EditorNodeTextStyle['textAlign']) {
    if (textAlign === 'center') {
      return 'center';
    }

    if (textAlign === 'right') {
      return 'end';
    }

    return 'start';
  }

  private getVerticalAlignValue(verticalAlign: EditorNodeTextStyle['verticalAlign']) {
    if (verticalAlign === 'center') {
      return 'center';
    }

    if (verticalAlign === 'end') {
      return 'end';
    }

    return 'start';
  }

  private getModuleKey(index: number, module: RenderableModule) {
    return `${module.type}-${module.label}-${module.resolvedLayout.columnStart}-${module.resolvedLayout.rowStart}-${index}`;
  }

  private readLocalPreview(slug: string): PortfolioPublicDto | null {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return null;
    }

    const rawValue = window.localStorage.getItem(PORTFOLIO_PREVIEW_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    try {
      const parsedValue = JSON.parse(rawValue) as Partial<PortfolioPublicDto> & {
        savedAt?: number;
      };
      if (parsedValue.slug !== slug) {
        return null;
      }

      return {
        id: parsedValue.id ?? '',
        title: parsedValue.title ?? slug,
        slug,
        public: parsedValue.public ?? true,
        modules: Array.isArray(parsedValue.modules) ? parsedValue.modules : [],
      };
    } catch {
      return null;
    }
  }
}
