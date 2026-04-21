import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthApiService, PortfolioModuleDto, PortfolioPublicDto } from '../services/auth-api.service';
import {
  ContentType,
  DEFAULT_BACKGROUND_COLOR,
  EditorNodeLayout,
  PortfolioEditorStateService
} from '../services/portfolio-editor-state.service';

const GRID_COLUMNS = 12;
const MAX_GRID_ROW_SPAN = 240;

@Component({
  selector: 'app-public-portfolio-page',
  imports: [NgTemplateOutlet],
  templateUrl: './public-portfolio-page.html',
  styleUrl: './public-portfolio-page.scss'
})
export class PublicPortfolioPage implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly route = inject(ActivatedRoute);
  private readonly authApiService = inject(AuthApiService);
  private readonly portfolioEditorStateService = inject(PortfolioEditorStateService);

  protected readonly portfolio = signal<PortfolioPublicDto | null>(null);
  protected readonly notFound = signal(false);
  protected readonly renderableModules = computed(() =>
    this.collectRenderableModules(this.portfolio()?.modules ?? [])
  );
  protected readonly backgroundColor = computed(() => {
    const backgroundModule = this.findModulesByType(this.portfolio()?.modules ?? [], 'background').at(-1);
    return backgroundModule?.value || DEFAULT_BACKGROUND_COLOR;
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

  protected trackModule(index: number, module: PortfolioModuleDto) {
    return `${module.type}-${module.label}-${module.value ?? ''}-${index}`;
  }

  protected getModuleStyle(module: PortfolioModuleDto) {
    const layout = this.normalizeLayout(module.type, module.layout);
    return {
      gridColumn: `${layout.columnStart} / span ${layout.columnSpan}`,
      gridRow: `${layout.rowStart} / span ${layout.rowSpan}`
    };
  }

  protected getVisibleChildren(module: PortfolioModuleDto) {
    return this.collectRenderableModules(module.children ?? []);
  }

  protected getHeadingTag(depth: number) {
    return depth === 0 ? 'h1' : depth === 1 ? 'h2' : 'h3';
  }

  protected getTableRows(value?: string) {
    return (value ?? '')
      .split('\n')
      .map((row) => row.split('\t').map((cell) => cell.trim()))
      .filter((row) => row.some((cell) => Boolean(cell)));
  }

  private collectRenderableModules(modules: PortfolioModuleDto[]): PortfolioModuleDto[] {
    return modules.flatMap((module) =>
      module.type === 'background' ? this.collectRenderableModules(module.children ?? []) : [module]
    );
  }

  private findModulesByType(modules: PortfolioModuleDto[], type: string): PortfolioModuleDto[] {
    return modules.flatMap((module) => {
      const nestedModules = this.findModulesByType(module.children ?? [], type);
      return module.type === type ? [module, ...nestedModules] : nestedModules;
    });
  }

  private normalizeLayout(type: string, layout?: PortfolioModuleDto['layout']): EditorNodeLayout {
    const contentType = this.toContentType(type);
    const fallback = this.portfolioEditorStateService.getDefaultLayout(contentType);
    const minColumnSpan = contentType === 'title' ? 3 : 2;
    const columnSpan = this.clampInteger(layout?.columnSpan, minColumnSpan, GRID_COLUMNS, fallback.columnSpan);
    const columnStart = this.clampInteger(
      layout?.columnStart,
      1,
      GRID_COLUMNS - columnSpan + 1,
      fallback.columnStart
    );
    const rowSpan = this.clampInteger(layout?.rowSpan, 2, MAX_GRID_ROW_SPAN, fallback.rowSpan);
    const rowStart = this.clampInteger(layout?.rowStart, 1, 999, fallback.rowStart);

    return {
      columnStart,
      rowStart,
      columnSpan,
      rowSpan
    };
  }

  private clampInteger(value: number | undefined, min: number, max: number, fallback: number) {
    const normalizedValue =
      typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;

    return Math.min(max, Math.max(min, normalizedValue));
  }

  private toContentType(type: string): ContentType {
    switch (type) {
      case 'title':
      case 'description':
      case 'cv':
      case 'image':
      case 'table':
      case 'background':
        return type;
      default:
        return 'description';
    }
  }
}
