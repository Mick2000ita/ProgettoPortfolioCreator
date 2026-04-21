import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TreeNode } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Popover } from 'primeng/popover';
import { PopoverModule } from 'primeng/popover';
import { TextareaModule } from 'primeng/textarea';
import {
  AuthApiService,
  CreatePortfolioRequestDto,
  PortfolioModuleDto
} from '../services/auth-api.service';
import { PdfImportService } from '../services/pdf-import.service';
import {
  ContentOption,
  ContentType,
  DEFAULT_BACKGROUND_COLOR,
  EditorNodeData,
  EditorNodeLayout,
  PORTFOLIO_EDITOR_CONTENT_OPTIONS,
  PortfolioEditorStateService
} from '../services/portfolio-editor-state.service';

interface PreviewInteractionState {
  mode: 'move' | 'resize-x' | 'resize-y' | 'resize-both';
  nodeKey: string;
  pointerId: number;
  startX: number;
  startY: number;
  initialLayout: EditorNodeLayout;
  columnWidth: number;
  rowHeight: number;
}

const GRID_COLUMNS = 12;
const GRID_ROW_HEIGHT = 56;
const MAX_GRID_ROW_SPAN = 240;

@Component({
  selector: 'app-portfolio-editor-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    PopoverModule,
    NgTemplateOutlet
  ],
  templateUrl: './portfolio-editor-page.html',
  styleUrl: './portfolio-editor-page.scss'
})
export class PortfolioEditorPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authApiService = inject(AuthApiService);
  private readonly pdfImportService = inject(PdfImportService);
  private readonly portfolioEditorStateService = inject(PortfolioEditorStateService);

  private previewInteraction: PreviewInteractionState | null = null;

  protected readonly isSubmitting = signal(false);
  protected readonly isExtractingCv = signal(false);
  protected readonly isLoadingPortfolio = signal(false);
  protected readonly extractionError = signal<string | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly editingSlug = signal<string | null>(null);
  protected readonly treeNodes = this.portfolioEditorStateService.treeNodes;
  protected readonly previewNodes = computed(() => this.collectRenderableNodes(this.treeNodes()));
  protected readonly hasPreviewContent = computed(() => this.previewNodes().length > 0);
  protected readonly contentOptions: ContentOption[] = PORTFOLIO_EDITOR_CONTENT_OPTIONS;
  protected readonly addableContentOptions = this.contentOptions.filter(
    (option) => option.value !== 'background'
  );

  protected readonly portfolioForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required]]
  });

  protected readonly nodeEditorForm = this.formBuilder.nonNullable.group({
    textValue: [''],
    colorValue: [DEFAULT_BACKGROUND_COLOR]
  });

  protected readonly slugPreview = computed(() => this.slugify(this.portfolioForm.controls.title.value));
  protected readonly backgroundColor = computed(() => {
    const rootBackgroundNode = this.treeNodes().find((node) => node.data?.type === 'background');
    return rootBackgroundNode?.data?.colorValue || DEFAULT_BACKGROUND_COLOR;
  });

  constructor() {
    effect(() => {
      this.patchInspectorForm(this.portfolioEditorStateService.selectedTreeNode());
    });
  }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.portfolioEditorStateService.reset();

    this.nodeEditorForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) =>
        this.applyInspectorChanges({
          textValue: value.textValue ?? '',
          colorValue: value.colorValue ?? DEFAULT_BACKGROUND_COLOR
        })
      );

    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.loadError.set('Portfolio non trovato.');
      return;
    }

    this.editingSlug.set(slug);
    this.loadPortfolio(slug);
  }

  @HostListener('window:pointermove', ['$event'])
  protected onWindowPointerMove(event: PointerEvent) {
    if (!this.previewInteraction || event.pointerId !== this.previewInteraction.pointerId) {
      return;
    }

    const node = this.findNodeByKey(this.treeNodes(), this.previewInteraction.nodeKey);
    if (!node?.data) {
      this.previewInteraction = null;
      return;
    }

    event.preventDefault();

    const deltaColumns = Math.round(
      (event.clientX - this.previewInteraction.startX) /
        Math.max(this.previewInteraction.columnWidth, 1)
    );
    const deltaRows = Math.round(
      (event.clientY - this.previewInteraction.startY) /
        this.previewInteraction.rowHeight
    );

    const nextLayout = { ...this.previewInteraction.initialLayout };

    switch (this.previewInteraction.mode) {
      case 'move':
        nextLayout.columnStart = this.previewInteraction.initialLayout.columnStart + deltaColumns;
        nextLayout.rowStart = this.previewInteraction.initialLayout.rowStart + deltaRows;
        break;
      case 'resize-x':
        nextLayout.columnSpan = this.previewInteraction.initialLayout.columnSpan + deltaColumns;
        break;
      case 'resize-y':
        nextLayout.rowSpan = this.previewInteraction.initialLayout.rowSpan + deltaRows;
        break;
      case 'resize-both':
        nextLayout.columnSpan = this.previewInteraction.initialLayout.columnSpan + deltaColumns;
        nextLayout.rowSpan = this.previewInteraction.initialLayout.rowSpan + deltaRows;
        break;
    }

    node.data.layout = this.normalizeLayout(node.data.type, nextLayout);
    this.refreshSelectedNode(node.key ?? null);
  }

  @HostListener('window:pointerup', ['$event'])
  @HostListener('window:pointercancel', ['$event'])
  protected onWindowPointerUp(event: PointerEvent) {
    if (!this.previewInteraction || event.pointerId !== this.previewInteraction.pointerId) {
      return;
    }

    this.previewInteraction = null;
  }

  protected get selectedTreeNode() {
    return this.portfolioEditorStateService.selectedTreeNode();
  }

  protected get selectedNodeData() {
    return this.selectedTreeNode?.data ?? null;
  }

  protected get selectedNodeType() {
    return this.selectedTreeNode?.data?.type ?? null;
  }

  protected get selectedNodeChildren() {
    return this.selectedTreeNode?.children ?? [];
  }

  protected addNode(type: ContentType, popover?: Popover) {
    this.portfolioEditorStateService.addNode(type);
    popover?.hide();
  }

  protected removeSelectedNode() {
    this.portfolioEditorStateService.removeSelectedNode();
  }

  protected isSelectedPreviewNode(node: TreeNode<EditorNodeData>) {
    return node.key === this.selectedTreeNode?.key;
  }

  protected previewNodeStyle(node: TreeNode<EditorNodeData>) {
    const layout = node.data?.layout ?? this.portfolioEditorStateService.getDefaultLayout('description');
    return {
      gridColumn: `${layout.columnStart} / span ${layout.columnSpan}`,
      gridRow: `${layout.rowStart} / span ${layout.rowSpan}`
    };
  }

  protected selectPreviewNode(node: TreeNode<EditorNodeData>, event?: Event) {
    event?.stopPropagation();
    this.portfolioEditorStateService.selectNodeByKey(node.key ?? null);
  }

  protected startNodeMove(event: PointerEvent, node: TreeNode<EditorNodeData>) {
    this.startPreviewInteraction(event, node, 'move');
  }

  protected startNodeResize(
    event: PointerEvent,
    node: TreeNode<EditorNodeData>,
    mode: 'resize-x' | 'resize-y' | 'resize-both'
  ) {
    this.startPreviewInteraction(event, node, mode);
  }

  protected visibleNodeChildren(node: TreeNode<EditorNodeData>) {
    return this.collectRenderableNodes(node.children ?? []);
  }

  protected trackNode(_index: number, node: TreeNode<EditorNodeData>) {
    return node.key ?? node.label;
  }

  protected getContentTypeLabel(type: ContentType) {
    return this.portfolioEditorStateService.getContentTypeLabel(type);
  }

  protected canRemoveSelectedNode() {
    return this.portfolioEditorStateService.canRemoveSelectedNode();
  }

  protected getPreviewHeadingTag(depth: number) {
    return depth === 0 ? 'h1' : depth === 1 ? 'h2' : 'h3';
  }

  protected getTableRows(textValue: string) {
    return this.parseTableRows(textValue);
  }

  protected async onImagesSelected(event: Event) {
    const selectedNode = this.selectedTreeNode;
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (!selectedNode?.data || selectedNode.data.type !== 'image' || files.length === 0) {
      return;
    }

    const images = await Promise.all(
      files.map((file) => this.pdfImportService.readFileAsDataUrl(file))
    );
    selectedNode.data.images = [
      ...selectedNode.data.images,
      ...images.filter((image): image is string => Boolean(image))
    ];

    this.refreshSelectedNode(selectedNode.key ?? null);
  }

  protected removeImage(imageIndex: number) {
    const selectedNode = this.selectedTreeNode;
    if (!selectedNode?.data || selectedNode.data.type !== 'image') {
      return;
    }

    selectedNode.data.images = selectedNode.data.images.filter(
      (_image, currentImageIndex) => currentImageIndex !== imageIndex
    );
    this.refreshSelectedNode(selectedNode.key ?? null);
  }

  protected async onCvSelected(event: Event) {
    const selectedNode = this.selectedTreeNode;
    const file = (event.target as HTMLInputElement).files?.[0];
    this.extractionError.set(null);

    if (!selectedNode?.data || selectedNode.data.type !== 'cv' || !file) {
      return;
    }

    this.isExtractingCv.set(true);

    try {
      const [fileData, importedCv] = await Promise.all([
        this.pdfImportService.readFileAsDataUrl(file),
        this.pdfImportService.importCv(file)
      ]);

      selectedNode.data.fileData = fileData ?? '';
      selectedNode.data.fileName = file.name;
      selectedNode.data.textValue = importedCv.text;
      this.ensureNodeFitsContent(selectedNode);
      this.syncImportedCvAssetNodes(selectedNode, importedCv.images, importedCv.tables);

      this.refreshSelectedNode(selectedNode.key ?? null);
    } catch {
      this.extractionError.set(
        'Non sono riuscito a importare correttamente il CV. Puoi riprovare con un altro PDF.'
      );
    } finally {
      this.isExtractingCv.set(false);
    }
  }

  protected submit() {
    this.persistPortfolio((portfolio) => {
      void this.router.navigate(['/portfolios', portfolio.slug, 'edit']);
    });
  }

  protected openLivePortfolio() {
    const previewWindow = window.open('about:blank', '_blank');

    if (previewWindow) {
      previewWindow.document.write(
        '<!doctype html><title>Preview portfolio</title><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#081111;color:#eff6f2;font-family:sans-serif">Sto aprendo la preview del portfolio...</body>'
      );
      previewWindow.document.close();
    }

    this.persistPortfolio((portfolio) => {
      if (previewWindow) {
        previewWindow.location.href = `/${portfolio.slug}`;
      } else {
        window.open(`/${portfolio.slug}`, '_blank');
      }
    }, () => {
      previewWindow?.close();
    });
  }

  private startPreviewInteraction(
    event: PointerEvent,
    node: TreeNode<EditorNodeData>,
    mode: PreviewInteractionState['mode']
  ) {
    if (!node.data || node.data.type === 'background' || !node.key) {
      return;
    }

    const trigger = event.currentTarget as HTMLElement | null;
    const grid = trigger?.closest('.preview-grid') as HTMLElement | null;
    if (!grid) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const gridRect = grid.getBoundingClientRect();
    this.portfolioEditorStateService.selectNodeByKey(node.key);
    this.previewInteraction = {
      mode,
      nodeKey: node.key,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialLayout: { ...node.data.layout },
      columnWidth: gridRect.width / GRID_COLUMNS,
      rowHeight: GRID_ROW_HEIGHT
    };
  }

  private loadPortfolio(slug: string) {
    this.isLoadingPortfolio.set(true);
    this.loadError.set(null);

    this.authApiService.getMyPortfolio(slug).subscribe({
      next: (portfolio) => {
        this.portfolioForm.controls.title.setValue(portfolio.title);
        this.portfolioEditorStateService.setTreeNodes(this.deserializeNodes(portfolio.modules));
        this.isLoadingPortfolio.set(false);

        const firstNode = this.previewNodes()[0] ?? this.treeNodes()[0] ?? null;
        this.portfolioEditorStateService.onSelectionChange(firstNode);
      },
      error: () => {
        this.loadError.set('Non sono riuscito a caricare questo portfolio. Riprova tra poco.');
        this.isLoadingPortfolio.set(false);
      }
    });
  }

  private deserializeNodes(modules: PortfolioModuleDto[]): TreeNode<EditorNodeData>[] {
    return modules
      .filter((module): module is PortfolioModuleDto & { type: ContentType } =>
        this.isSupportedContentType(module.type)
      )
      .map((module) => {
        const key =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `node-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const type: ContentType = module.type;
        const textValue = module.value ?? '';
        const layout = this.expandLayoutForContent(
          type,
          textValue,
          this.normalizeLayout(type, module.layout)
        );

        return {
          key,
          label: this.getContentTypeLabel(type),
          icon: this.portfolioEditorStateService.getTreeNodeIcon(type),
          expanded: true,
          selectable: true,
          draggable: type !== 'background',
          droppable: true,
          data: {
            type,
            label: this.getContentTypeLabel(type),
            textValue,
            colorValue:
              type === 'background' ? module.value || DEFAULT_BACKGROUND_COLOR : DEFAULT_BACKGROUND_COLOR,
            fileName: module.fileName ?? '',
            fileData: module.fileData ?? '',
            images: module.values ?? [],
            importSourceKey: undefined,
            layout
          },
          children: this.deserializeNodes(module.children ?? [])
        };
      });
  }

  private serializeNodes(nodes: TreeNode<EditorNodeData>[]): PortfolioModuleDto[] {
    return nodes.map((node) => {
      const data = node.data!;
      const basePayload = {
        type: data.type,
        label: data.label,
        layout: { ...data.layout },
        children: this.serializeNodes(node.children ?? [])
      };

      if (data.type === 'image') {
        return {
          ...basePayload,
          values: data.images
        };
      }

      if (data.type === 'background') {
        return {
          ...basePayload,
          value: data.colorValue
        };
      }

      if (data.type === 'cv') {
        return {
          ...basePayload,
          value: data.textValue,
          fileName: data.fileName,
          fileData: data.fileData
        };
      }

      return {
        ...basePayload,
        value: data.textValue
      };
    });
  }

  private applyInspectorChanges(value: { textValue: string; colorValue: string }) {
    const selectedNode = this.selectedTreeNode;
    if (!selectedNode?.data) {
      return;
    }

    if (selectedNode.data.type === 'background') {
      selectedNode.data.colorValue = value.colorValue;
    } else {
      selectedNode.data.textValue = value.textValue;
      this.ensureNodeFitsContent(selectedNode);
    }

    this.refreshSelectedNode(selectedNode.key ?? null);
  }

  private persistPortfolio(
    onSuccess?: (portfolio: { slug: string }) => void,
    onError?: () => void
  ) {
    const slug = this.editingSlug();
    const payload = this.buildPortfolioPayload();
    if (!slug || !payload) {
      onError?.();
      return;
    }

    this.isSubmitting.set(true);

    this.authApiService.updatePortfolio(slug, payload).subscribe({
      next: (portfolio) => {
        this.isSubmitting.set(false);
        this.editingSlug.set(portfolio.slug);
        onSuccess?.(portfolio);
      },
      error: () => {
        this.isSubmitting.set(false);
        onError?.();
      }
    });
  }

  private buildPortfolioPayload(): CreatePortfolioRequestDto | null {
    this.portfolioForm.markAllAsTouched();
    if (this.portfolioForm.invalid) {
      return null;
    }

    const title = this.portfolioForm.controls.title.value.trim();
    if (!title) {
      return null;
    }

    return {
      title,
      modules: this.serializeNodes(this.treeNodes())
    };
  }

  private patchInspectorForm(node: TreeNode<EditorNodeData> | null) {
    this.nodeEditorForm.patchValue(
      {
        textValue: node?.data?.textValue ?? '',
        colorValue: node?.data?.colorValue ?? DEFAULT_BACKGROUND_COLOR
      },
      { emitEvent: false }
    );
  }

  private refreshSelectedNode(key: string | null) {
    this.portfolioEditorStateService.refreshTree();
    this.portfolioEditorStateService.selectNodeByKey(key);
  }

  private syncImportedCvAssetNodes(
    sourceNode: TreeNode<EditorNodeData>,
    images: string[],
    tables: string[]
  ) {
    const sourceNodeKey = sourceNode.key ?? null;
    const sourceLayout = sourceNode.data?.layout;
    if (!sourceNodeKey || !sourceLayout) {
      return;
    }

    const relation = this.findNodeRelation(this.treeNodes(), sourceNodeKey);
    if (!relation) {
      return;
    }

    const importPrefix = `${sourceNodeKey}:`;
    const importedAssets = [
      ...images.map((image, index) => ({
        key: `${sourceNodeKey}:image:${index}`,
        type: 'image' as const,
        label: `Immagine CV ${index + 1}`,
        images: [image],
        textValue: ''
      })),
      ...tables.map((table, index) => ({
        key: `${sourceNodeKey}:table:${index}`,
        type: 'table' as const,
        label: `Tabella CV ${index + 1}`,
        images: [] as string[],
        textValue: table
      }))
    ];

    const existingImportedNodes = relation.nodes.filter((node) => {
      const importKey = node.data?.importSourceKey;
      return importKey === sourceNodeKey || importKey?.startsWith(importPrefix);
    });
    const existingImportedNodeMap = new Map(
      existingImportedNodes
        .filter((node): node is TreeNode<EditorNodeData> & { data: EditorNodeData } => Boolean(node.data))
        .map((node) => [node.data.importSourceKey!, node])
    );
    const preservedNodes = relation.nodes.filter((node) => {
      const importKey = node.data?.importSourceKey;
      return !(importKey === sourceNodeKey || importKey?.startsWith(importPrefix));
    });
    const sourceIndex = preservedNodes.findIndex((node) => node.key === sourceNodeKey);
    if (sourceIndex < 0) {
      return;
    }

    const nextImportedNodes = importedAssets.map((asset, assetIndex) => {
      const existingNode = existingImportedNodeMap.get(asset.key);
      if (existingNode?.data) {
        existingNode.label = asset.label;
        existingNode.data.label = asset.label;
        existingNode.data.images = [...asset.images];
        existingNode.data.textValue = asset.textValue;
        existingNode.data.importSourceKey = asset.key;
        return existingNode;
      }

      const nextNode = this.portfolioEditorStateService.createTreeNode(asset.type);
      nextNode.label = asset.label;
      if (nextNode.data) {
        nextNode.data.label = asset.label;
        nextNode.data.images = [...asset.images];
        nextNode.data.textValue = asset.textValue;
        nextNode.data.importSourceKey = asset.key;
        nextNode.data.layout = this.expandImportedAssetLayout(sourceLayout, asset.type, assetIndex);
      }
      return nextNode;
    });

    preservedNodes.splice(sourceIndex + 1, 0, ...nextImportedNodes);
    relation.nodes.splice(0, relation.nodes.length, ...preservedNodes);
  }

  private ensureNodeFitsContent(node: TreeNode<EditorNodeData>) {
    if (!node.data) {
      return;
    }

    node.data.layout = this.expandLayoutForContent(
      node.data.type,
      node.data.textValue,
      node.data.layout
    );
  }

  private collectRenderableNodes(nodes: TreeNode<EditorNodeData>[]): TreeNode<EditorNodeData>[] {
    return nodes.flatMap((node) =>
      node.data?.type === 'background' ? this.collectRenderableNodes(node.children ?? []) : [node]
    );
  }

  private findNodeByKey(nodes: TreeNode<EditorNodeData>[], key: string): TreeNode<EditorNodeData> | null {
    for (const node of nodes) {
      if (node.key === key) {
        return node;
      }

      const childMatch = this.findNodeByKey(node.children ?? [], key);
      if (childMatch) {
        return childMatch;
      }
    }

    return null;
  }

  private findNodeRelation(
    nodes: TreeNode<EditorNodeData>[],
    key: string
  ): { nodes: TreeNode<EditorNodeData>[]; index: number } | null {
    const directIndex = nodes.findIndex((node) => node.key === key);
    if (directIndex >= 0) {
      return { nodes, index: directIndex };
    }

    for (const node of nodes) {
      const childRelation = this.findNodeRelation(node.children ?? [], key);
      if (childRelation) {
        return childRelation;
      }
    }

    return null;
  }

  private normalizeLayout(type: ContentType, layout?: Partial<EditorNodeLayout> | null): EditorNodeLayout {
    const fallback = this.portfolioEditorStateService.getDefaultLayout(type);
    const minColumnSpan = type === 'title' ? 3 : type === 'background' ? GRID_COLUMNS : 2;
    const minRowSpan = type === 'background' ? 1 : 2;
    const columnSpan = this.clampInteger(layout?.columnSpan, minColumnSpan, GRID_COLUMNS, fallback.columnSpan);
    const columnStart = this.clampInteger(
      layout?.columnStart,
      1,
      GRID_COLUMNS - columnSpan + 1,
      fallback.columnStart
    );
    const rowSpan = this.clampInteger(layout?.rowSpan, minRowSpan, MAX_GRID_ROW_SPAN, fallback.rowSpan);
    const rowStart = this.clampInteger(layout?.rowStart, 1, 999, fallback.rowStart);

    return {
      columnStart,
      rowStart,
      columnSpan,
      rowSpan
    };
  }

  private expandImportedImageLayout(sourceLayout: EditorNodeLayout) {
    const defaultImageLayout = this.portfolioEditorStateService.getDefaultLayout('image');
    const sourceColumnEnd = sourceLayout.columnStart + sourceLayout.columnSpan - 1;
    const remainingColumnsRight = GRID_COLUMNS - sourceColumnEnd;

    if (remainingColumnsRight >= 3) {
      return this.normalizeLayout('image', {
        columnStart: sourceColumnEnd + 1,
        rowStart: sourceLayout.rowStart,
        columnSpan: Math.min(defaultImageLayout.columnSpan, remainingColumnsRight),
        rowSpan: Math.max(defaultImageLayout.rowSpan, Math.min(sourceLayout.rowSpan, 12))
      });
    }

    return this.normalizeLayout('image', {
      columnStart: sourceLayout.columnStart,
      rowStart: sourceLayout.rowStart + sourceLayout.rowSpan,
      columnSpan: Math.min(defaultImageLayout.columnSpan, sourceLayout.columnSpan),
      rowSpan: defaultImageLayout.rowSpan
    });
  }

  private expandImportedTableLayout(sourceLayout: EditorNodeLayout) {
    const defaultTableLayout = this.portfolioEditorStateService.getDefaultLayout('table');

    return this.normalizeLayout('table', {
      columnStart: sourceLayout.columnStart,
      rowStart: sourceLayout.rowStart + sourceLayout.rowSpan + 1,
      columnSpan: Math.max(defaultTableLayout.columnSpan, sourceLayout.columnSpan),
      rowSpan: defaultTableLayout.rowSpan
    });
  }

  private expandImportedAssetLayout(
    sourceLayout: EditorNodeLayout,
    type: 'image' | 'table',
    assetIndex: number
  ) {
    const baseLayout =
      type === 'image'
        ? this.expandImportedImageLayout(sourceLayout)
        : this.expandImportedTableLayout(sourceLayout);

    return this.normalizeLayout(type, {
      ...baseLayout,
      rowStart: baseLayout.rowStart + assetIndex * (baseLayout.rowSpan + 1)
    });
  }

  private clampInteger(value: number | undefined, min: number, max: number, fallback: number) {
    const normalizedValue =
      typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;

    return Math.min(max, Math.max(min, normalizedValue));
  }

  private expandLayoutForContent(
    type: ContentType,
    textValue: string,
    layout: EditorNodeLayout
  ): EditorNodeLayout {
    const requiredRowSpan = this.getRequiredRowSpan(type, textValue, layout.columnSpan);
    if (requiredRowSpan <= layout.rowSpan) {
      return layout;
    }

    return {
      ...layout,
      rowSpan: requiredRowSpan
    };
  }

  private getRequiredRowSpan(type: ContentType, textValue: string, columnSpan: number) {
    switch (type) {
      case 'cv':
        return Math.min(
          MAX_GRID_ROW_SPAN,
          Math.max(8, 4 + Math.ceil(this.estimateWrappedLineCount(textValue, columnSpan, 9) / 2))
        );
      case 'description':
        return Math.min(
          MAX_GRID_ROW_SPAN,
          Math.max(3, 2 + Math.ceil(this.estimateWrappedLineCount(textValue, columnSpan, 12) / 3))
        );
      case 'table':
        return Math.min(
          MAX_GRID_ROW_SPAN,
          Math.max(4, 2 + this.parseTableRows(textValue).length * 2)
        );
      case 'title':
        return Math.min(
          MAX_GRID_ROW_SPAN,
          Math.max(2, 1 + Math.ceil(this.estimateWrappedLineCount(textValue, columnSpan, 8) / 2))
        );
      default:
        return 0;
    }
  }

  private estimateWrappedLineCount(textValue: string, columnSpan: number, charsPerColumn: number) {
    const normalizedText = textValue.trim();
    if (!normalizedText) {
      return 0;
    }

    const charactersPerLine = Math.max(18, Math.round(columnSpan * charsPerColumn));
    return normalizedText.split('\n').reduce((lineCount, line) => {
      const normalizedLineLength = Math.max(line.trim().length, 1);
      return lineCount + Math.max(1, Math.ceil(normalizedLineLength / charactersPerLine));
    }, 0);
  }

  private parseTableRows(textValue: string) {
    return textValue
      .split('\n')
      .map((row) => row.split('\t').map((cell) => cell.trim()))
      .filter((row) => row.some((cell) => Boolean(cell)));
  }

  private isSupportedContentType(type: string): type is ContentType {
    return this.contentOptions.some((option) => option.value === type);
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
