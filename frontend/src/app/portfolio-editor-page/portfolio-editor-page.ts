import { NgStyle, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TreeNode } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import {
  AuthApiService,
  CreatePortfolioRequestDto,
  PortfolioBackgroundImageDto,
  PortfolioModuleDto,
} from '../services/auth-api.service';
import { PdfImportService } from '../services/pdf-import.service';
import { PortfolioPreviewLiveService } from '../services/portfolio-preview-live.service';
import {
  CODE_LANGUAGE_OPTIONS,
  CodeLanguageOption,
  ContentOption,
  ContentType,
  DEFAULT_BACKGROUND_COLOR,
  EditorNodeData,
  EditorNodeLayout,
  EditorNodeTextStyle,
  PORTFOLIO_EDITOR_CONTENT_OPTIONS,
  PortfolioEditorStateService,
  SharePlatformId,
  SharePlatformOption,
  parseShareEntries,
  resolveCodeLanguage,
  resolveBackgroundImages,
  resolveSharePlatformHref,
  resolveTextStyle,
  serializeShareEntries,
  SHARE_PLATFORM_OPTIONS,
  supportsTextFormatting,
} from '../services/portfolio-editor-state.service';

const CANVAS_COLUMNS = 48;
const CANVAS_ROW_HEIGHT = 18;
const MIN_CANVAS_ROWS = 72;
const MAX_CANVAS_ROWS = 420;
const FREEFORM_LAYOUT_MARKER = 'freeform-canvas-v2';
const LEGACY_COLUMN_SCALE = 4;
const LEGACY_ROW_SCALE = 3;

interface CanvasTarget {
  column: number;
  row: number;
  layout: EditorNodeLayout;
}

interface CreateInteraction {
  mode: 'create';
  pointerId: number;
  type: ContentType;
  clientX: number;
  clientY: number;
  target: CanvasTarget | null;
}

interface TransformInteraction {
  mode: 'move' | 'resize';
  pointerId: number;
  nodeKey: string;
  startX: number;
  startY: number;
  initialLayout: EditorNodeLayout;
  columnStep: number;
  rowStep: number;
  resizeHandle?: ResizeHandlePosition;
}

type EditorInteraction = CreateInteraction | TransformInteraction;
type ResizeHandlePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface StatRow {
  value: string;
  label: string;
  detail: string;
}

type TextStyleField = keyof EditorNodeTextStyle;
type EditableTableGrid = string[][];

@Component({
  selector: 'app-portfolio-editor-page',
  imports: [
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    NgStyle,
  ],
  templateUrl: './portfolio-editor-page.html',
  styleUrl: './portfolio-editor-page.scss',
})
export class PortfolioEditorPage implements OnInit, OnDestroy {
  @ViewChild('canvasSurface') private canvasSurface?: ElementRef<HTMLElement>;

  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authApiService = inject(AuthApiService);
  private readonly pdfImportService = inject(PdfImportService);
  private readonly portfolioPreviewLiveService = inject(PortfolioPreviewLiveService);
  private readonly portfolioEditorStateService = inject(PortfolioEditorStateService);
  private lastToolbarCreateAt = 0;
  private backgroundAutoplayIntervalId: number | null = null;
  private livePreviewTimerId: number | null = null;

  protected readonly portfolioForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required]],
  });

  protected readonly isSubmitting = signal(false);
  protected readonly isExtractingCv = signal(false);
  protected readonly isLoadingPortfolio = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly extractionError = signal<string | null>(null);
  protected readonly editingSlug = signal<string | null>(null);
  protected readonly portfolioVisibility = signal(true);
  protected readonly isModulePickerOpen = signal(false);
  protected readonly interaction = signal<EditorInteraction | null>(null);
  protected readonly backgroundFrame = signal(0);
  protected readonly contentOptions: ContentOption[] = PORTFOLIO_EDITOR_CONTENT_OPTIONS;
  protected readonly codeLanguageOptions: CodeLanguageOption[] = CODE_LANGUAGE_OPTIONS;
  protected readonly sharePlatforms: SharePlatformOption[] = SHARE_PLATFORM_OPTIONS;
  protected readonly toolbarTools = this.contentOptions.filter(
    (option) => option.value !== 'background',
  );
  protected readonly treeNodes = this.portfolioEditorStateService.treeNodes;
  protected readonly selectedTreeNode = this.portfolioEditorStateService.selectedTreeNode;
  protected readonly selectedNodeData = computed(() => this.selectedTreeNode()?.data ?? null);
  protected readonly backgroundNodeData = computed(
    () => this.treeNodes().find((node) => node.data?.type === 'background')?.data ?? null,
  );
  protected readonly pageNodes = computed(() =>
    this.treeNodes().filter((node) => node.data?.type && node.data.type !== 'background'),
  );
  protected readonly backgroundColor = computed(() => {
    return this.backgroundNodeData()?.colorValue || DEFAULT_BACKGROUND_COLOR;
  });
  protected readonly backgroundImages = computed(
    () => this.backgroundNodeData()?.backgroundImages ?? [],
  );
  protected readonly slugPreview = computed(() =>
    this.slugify(this.portfolioForm.controls.title.value),
  );
  protected readonly canvasRowCount = computed(() => {
    const bottomEdge = this.pageNodes().reduce((maxBottom, node) => {
      const layout = node.data?.layout;
      if (!layout) {
        return maxBottom;
      }

      return Math.max(maxBottom, layout.rowStart + layout.rowSpan + 4);
    }, MIN_CANVAS_ROWS);

    return Math.min(MAX_CANVAS_ROWS, Math.max(MIN_CANVAS_ROWS, bottomEdge));
  });
  protected readonly dragPreviewLayout = computed(() => {
    const currentInteraction = this.interaction();
    if (currentInteraction?.mode !== 'create') {
      return null;
    }

    return currentInteraction.target?.layout ?? null;
  });
  protected readonly dragGhost = computed(() => {
    const currentInteraction = this.interaction();
    if (currentInteraction?.mode !== 'create') {
      return null;
    }

    return {
      label: this.getContentTypeLabel(currentInteraction.type),
      x: currentInteraction.clientX + 18,
      y: currentInteraction.clientY + 18,
      active: Boolean(currentInteraction.target),
    };
  });

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.portfolioEditorStateService.reset();
    this.startBackgroundAutoplay();

    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.loadError.set('Portfolio non trovato.');
      return;
    }

    this.editingSlug.set(slug);
    this.portfolioForm.controls.title.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.schedulePreviewSnapshot());
    this.loadPortfolio(slug);
  }

  ngOnDestroy() {
    this.stopBackgroundAutoplay();
    if (this.livePreviewTimerId !== null) {
      window.clearTimeout(this.livePreviewTimerId);
    }
  }

  @HostListener('window:pointermove', ['$event'])
  protected onWindowPointerMove(event: PointerEvent) {
    const currentInteraction = this.interaction();
    if (!currentInteraction || event.pointerId !== currentInteraction.pointerId) {
      return;
    }

    if (currentInteraction.mode === 'create') {
      this.interaction.set({
        ...currentInteraction,
        clientX: event.clientX,
        clientY: event.clientY,
        target: this.getCanvasTarget(event.clientX, event.clientY, currentInteraction.type),
      });
      return;
    }

    const node = this.findNodeByKey(currentInteraction.nodeKey);
    if (!node?.data) {
      this.interaction.set(null);
      return;
    }

    event.preventDefault();

    const deltaColumns = Math.round(
      (event.clientX - currentInteraction.startX) / Math.max(currentInteraction.columnStep, 1),
    );
    const deltaRows = Math.round(
      (event.clientY - currentInteraction.startY) / currentInteraction.rowStep,
    );
    const nextLayout = { ...currentInteraction.initialLayout };

    if (currentInteraction.mode === 'move') {
      nextLayout.columnStart = currentInteraction.initialLayout.columnStart + deltaColumns;
      nextLayout.rowStart = currentInteraction.initialLayout.rowStart + deltaRows;
    } else {
      switch (currentInteraction.resizeHandle ?? 'bottom-right') {
        case 'top-left':
          nextLayout.columnStart = currentInteraction.initialLayout.columnStart + deltaColumns;
          nextLayout.columnSpan = currentInteraction.initialLayout.columnSpan - deltaColumns;
          nextLayout.rowStart = currentInteraction.initialLayout.rowStart + deltaRows;
          nextLayout.rowSpan = currentInteraction.initialLayout.rowSpan - deltaRows;
          break;
        case 'top-right':
          nextLayout.columnSpan = currentInteraction.initialLayout.columnSpan + deltaColumns;
          nextLayout.rowStart = currentInteraction.initialLayout.rowStart + deltaRows;
          nextLayout.rowSpan = currentInteraction.initialLayout.rowSpan - deltaRows;
          break;
        case 'bottom-left':
          nextLayout.columnStart = currentInteraction.initialLayout.columnStart + deltaColumns;
          nextLayout.columnSpan = currentInteraction.initialLayout.columnSpan - deltaColumns;
          nextLayout.rowSpan = currentInteraction.initialLayout.rowSpan + deltaRows;
          break;
        case 'bottom-right':
        default:
          nextLayout.columnSpan = currentInteraction.initialLayout.columnSpan + deltaColumns;
          nextLayout.rowSpan = currentInteraction.initialLayout.rowSpan + deltaRows;
          break;
      }
    }

    node.data.layout = this.normalizeLayout(node.data.type, nextLayout);
    this.refreshSelectedNode(node.key ?? null);
  }

  @HostListener('window:pointerup', ['$event'])
  @HostListener('window:pointercancel', ['$event'])
  protected onWindowPointerUp(event: PointerEvent) {
    const currentInteraction = this.interaction();
    if (!currentInteraction || event.pointerId !== currentInteraction.pointerId) {
      return;
    }

    if (currentInteraction.mode === 'create' && currentInteraction.target) {
      this.lastToolbarCreateAt = Date.now();
      this.createNodeAtTarget(currentInteraction.type, currentInteraction.target);
      this.isModulePickerOpen.set(false);
    }

    this.interaction.set(null);
  }

  @HostListener('window:keydown.escape')
  protected onWindowEscape() {
    if (this.interaction()) {
      this.interaction.set(null);
      return;
    }

    this.isModulePickerOpen.set(false);
  }

  protected trackNode(_index: number, node: TreeNode<EditorNodeData>) {
    return node.key ?? node.data?.label ?? _index;
  }

  protected getContentTypeLabel(type: ContentType) {
    return this.portfolioEditorStateService.getContentTypeLabel(type);
  }

  protected isSelectedNode(node: TreeNode<EditorNodeData>) {
    return node.key === this.selectedTreeNode()?.key;
  }

  protected isDraggingTool(type: ContentType) {
    const currentInteraction = this.interaction();
    return currentInteraction?.mode === 'create' && currentInteraction.type === type;
  }

  protected getCanvasItemStyle(node: TreeNode<EditorNodeData>) {
    const layout = node.data?.layout ?? this.getDefaultLayout('description');
    return {
      gridColumn: `${layout.columnStart} / span ${layout.columnSpan}`,
      gridRow: `${layout.rowStart} / span ${layout.rowSpan}`,
    };
  }

  protected onCanvasPointerDown(event: PointerEvent) {
    this.isModulePickerOpen.set(false);
    if (event.target === event.currentTarget) {
      this.portfolioEditorStateService.selectNodeByKey(null);
    }
  }

  protected selectNode(node: TreeNode<EditorNodeData>, event?: Event) {
    event?.stopPropagation();
    this.isModulePickerOpen.set(false);
    this.portfolioEditorStateService.selectNodeByKey(node.key ?? null);
  }

  protected startToolbarDrag(event: PointerEvent, type: ContentType) {
    event.preventDefault();

    this.interaction.set({
      mode: 'create',
      pointerId: event.pointerId,
      type,
      clientX: event.clientX,
      clientY: event.clientY,
      target: this.getCanvasTarget(event.clientX, event.clientY, type),
    });
  }

  protected addNodeFromToolbar(type: ContentType) {
    if (Date.now() - this.lastToolbarCreateAt < 250) {
      return;
    }

    const layout = this.buildQuickAddLayout(type, this.pageNodes().length);
    this.lastToolbarCreateAt = Date.now();
    this.isModulePickerOpen.set(false);
    this.createNodeAtTarget(type, {
      column: layout.columnStart,
      row: layout.rowStart,
      layout,
    });
  }

  protected toggleModulePicker() {
    this.isModulePickerOpen.update((value) => !value);
  }

  protected startNodeMove(event: PointerEvent, node: TreeNode<EditorNodeData>) {
    this.startTransformInteraction(event, node, 'move');
  }

  protected startNodeResize(event: PointerEvent, node: TreeNode<EditorNodeData>) {
    this.startTransformInteraction(event, node, 'resize', 'bottom-right');
  }

  protected startNodeResizeFromCorner(
    event: PointerEvent,
    node: TreeNode<EditorNodeData>,
    corner: ResizeHandlePosition,
  ) {
    this.startTransformInteraction(event, node, 'resize', corner);
  }

  protected removeSelectedNode() {
    this.portfolioEditorStateService.removeSelectedNode();
    this.schedulePreviewSnapshot();
  }

  protected canRemoveSelectedNode() {
    return this.portfolioEditorStateService.canRemoveSelectedNode();
  }

  protected updateBackgroundColor(event: Event) {
    const backgroundNodeData = this.backgroundNodeData();
    if (!backgroundNodeData) {
      return;
    }

    backgroundNodeData.colorValue =
      (event.target as HTMLInputElement).value || DEFAULT_BACKGROUND_COLOR;
    backgroundNodeData.helperText = FREEFORM_LAYOUT_MARKER;
    this.portfolioEditorStateService.refreshTree();
    this.schedulePreviewSnapshot();
  }

  protected async onBackgroundImagesSelected(event: Event) {
    const backgroundNodeData = this.backgroundNodeData();
    const inputElement = event.target as HTMLInputElement;
    const files = Array.from(inputElement.files ?? []);
    if (!backgroundNodeData || files.length === 0) {
      return;
    }

    const images = await Promise.all(
      files.map((file) => this.pdfImportService.readFileAsDataUrl(file)),
    );
    const nextImages = images
      .filter((image): image is string => Boolean(image))
      .map((image, index) =>
        this.createBackgroundImageAsset(
          [image],
          backgroundNodeData.backgroundImages.length + index,
        ),
      );

    backgroundNodeData.backgroundImages = [...backgroundNodeData.backgroundImages, ...nextImages];
    backgroundNodeData.helperText = FREEFORM_LAYOUT_MARKER;
    inputElement.value = '';
    this.portfolioEditorStateService.refreshTree();
    this.schedulePreviewSnapshot();
  }

  protected async onBackgroundCarouselSelected(event: Event) {
    const backgroundNodeData = this.backgroundNodeData();
    const inputElement = event.target as HTMLInputElement;
    const files = Array.from(inputElement.files ?? []);
    if (!backgroundNodeData || files.length === 0) {
      return;
    }

    const images = (
      await Promise.all(files.map((file) => this.pdfImportService.readFileAsDataUrl(file)))
    ).filter((image): image is string => Boolean(image));
    if (images.length === 0) {
      return;
    }

    backgroundNodeData.backgroundImages = [
      ...backgroundNodeData.backgroundImages,
      this.createBackgroundImageAsset(images, backgroundNodeData.backgroundImages.length),
    ];
    backgroundNodeData.helperText = FREEFORM_LAYOUT_MARKER;
    inputElement.value = '';
    this.portfolioEditorStateService.refreshTree();
    this.schedulePreviewSnapshot();
  }

  protected async appendBackgroundCarouselSlides(imageIndex: number, event: Event) {
    const backgroundImage = this.backgroundImages()[imageIndex];
    const inputElement = event.target as HTMLInputElement;
    const files = Array.from(inputElement.files ?? []);
    if (!backgroundImage || files.length === 0) {
      return;
    }

    const images = (
      await Promise.all(files.map((file) => this.pdfImportService.readFileAsDataUrl(file)))
    ).filter((image): image is string => Boolean(image));
    if (images.length === 0) {
      return;
    }

    this.updateBackgroundImage(imageIndex, {
      ...backgroundImage,
      src: backgroundImage.src || images[0],
      values: [
        ...(backgroundImage.values?.length ? backgroundImage.values : [backgroundImage.src]),
        ...images,
      ].filter(Boolean),
    });
    inputElement.value = '';
  }

  protected updateBackgroundImageNumberField(
    imageIndex: number,
    field: 'positionX' | 'positionY' | 'scaleX' | 'scaleY' | 'blur',
    event: Event,
  ) {
    const backgroundImage = this.backgroundImages()[imageIndex];
    if (!backgroundImage) {
      return;
    }

    const nextValue = Number.parseFloat((event.target as HTMLInputElement).value);
    if (!Number.isFinite(nextValue)) {
      return;
    }

    this.updateBackgroundImage(imageIndex, {
      ...backgroundImage,
      [field]: nextValue,
    });
  }

  protected removeBackgroundImage(imageIndex: number) {
    const backgroundNodeData = this.backgroundNodeData();
    if (!backgroundNodeData) {
      return;
    }

    backgroundNodeData.backgroundImages = backgroundNodeData.backgroundImages.filter(
      (_image, currentImageIndex) => currentImageIndex !== imageIndex,
    );
    backgroundNodeData.helperText = FREEFORM_LAYOUT_MARKER;
    this.portfolioEditorStateService.refreshTree();
    this.schedulePreviewSnapshot();
  }

  protected getBackgroundImageStyle(image: PortfolioBackgroundImageDto) {
    return {
      left: `${image.positionX ?? 50}%`,
      top: `${image.positionY ?? 50}%`,
      width: `${image.scaleX ?? image.width ?? 28}%`,
      height: `${image.scaleY ?? image.width ?? 28}%`,
      filter: `blur(${image.blur ?? 0}px)`,
    };
  }

  protected getBackgroundImageSource(image: PortfolioBackgroundImageDto) {
    const slides = image.values?.length ? image.values : image.src ? [image.src] : [];
    if (slides.length <= 1) {
      return slides[0] ?? '';
    }

    return slides[this.backgroundFrame() % slides.length] ?? slides[0] ?? '';
  }

  protected getBackgroundImageSlideCount(image: PortfolioBackgroundImageDto) {
    return image.values?.length || (image.src ? 1 : 0);
  }

  private updateBackgroundImage(imageIndex: number, backgroundImage: PortfolioBackgroundImageDto) {
    const backgroundNodeData = this.backgroundNodeData();
    if (!backgroundNodeData) {
      return;
    }

    backgroundNodeData.backgroundImages = backgroundNodeData.backgroundImages.map(
      (currentImage, currentImageIndex) =>
        currentImageIndex === imageIndex
          ? resolveBackgroundImages([backgroundImage])[0]
          : currentImage,
    );
    backgroundNodeData.helperText = FREEFORM_LAYOUT_MARKER;
    this.portfolioEditorStateService.refreshTree();
    this.schedulePreviewSnapshot();
  }

  private startBackgroundAutoplay() {
    if (this.backgroundAutoplayIntervalId !== null) {
      return;
    }

    this.backgroundAutoplayIntervalId = window.setInterval(() => {
      this.backgroundFrame.update((frame) => frame + 1);
    }, 4200);
  }

  private stopBackgroundAutoplay() {
    if (this.backgroundAutoplayIntervalId === null) {
      return;
    }

    window.clearInterval(this.backgroundAutoplayIntervalId);
    this.backgroundAutoplayIntervalId = null;
  }

  protected updateSelectedLabel(event: Event) {
    const selectedNode = this.selectedTreeNode();
    if (!selectedNode?.data) {
      return;
    }

    const value = (event.target as HTMLInputElement).value.trim();
    selectedNode.label = value || this.getContentTypeLabel(selectedNode.data.type);
    selectedNode.data.label = selectedNode.label;
    this.refreshSelectedNode(selectedNode.key ?? null);
  }

  protected updateSelectedText(event: Event) {
    const selectedNode = this.selectedTreeNode();
    if (!selectedNode?.data) {
      return;
    }

    selectedNode.data.textValue = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.refreshSelectedNode(selectedNode.key ?? null);
  }

  protected updateNodeText(node: TreeNode<EditorNodeData>, event: Event) {
    if (!node.data) {
      return;
    }

    node.data.textValue = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.refreshSelectedNode(node.key ?? null);
  }

  protected updateSelectedSubtitle(event: Event) {
    const selectedNode = this.selectedTreeNode();
    if (!selectedNode?.data) {
      return;
    }

    selectedNode.data.subtitle = (event.target as HTMLInputElement).value;
    this.refreshSelectedNode(selectedNode.key ?? null);
  }

  protected updateNodeSubtitle(node: TreeNode<EditorNodeData>, event: Event) {
    if (!node.data) {
      return;
    }

    node.data.subtitle = (event.target as HTMLInputElement).value;
    this.refreshSelectedNode(node.key ?? null);
  }

  protected updateSelectedLanguage(language: string | null | undefined) {
    const selectedNode = this.selectedTreeNode();
    if (!selectedNode?.data) {
      return;
    }

    selectedNode.data.language = resolveCodeLanguage(language);
    this.refreshSelectedNode(selectedNode.key ?? null);
  }

  protected updateNodeLanguage(
    node: TreeNode<EditorNodeData>,
    language: string | null | undefined,
  ) {
    if (!node.data) {
      return;
    }

    node.data.language = resolveCodeLanguage(language);
    this.refreshSelectedNode(node.key ?? null);
  }

  protected resolveCodeLanguage(language?: string | null) {
    return resolveCodeLanguage(language);
  }

  protected getSharePlatformValue(nodeData: EditorNodeData, platformId: SharePlatformId) {
    return (
      parseShareEntries(nodeData.textValue).find((entry) => entry.platformId === platformId)?.value ??
      ''
    );
  }

  protected isSharePlatformConfigured(nodeData: EditorNodeData, platformId: SharePlatformId) {
    return Boolean(resolveSharePlatformHref(platformId, this.getSharePlatformValue(nodeData, platformId)));
  }

  protected updateSharePlatformValue(
    node: TreeNode<EditorNodeData>,
    platformId: SharePlatformId,
    event: Event,
  ) {
    if (!node.data || node.data.type !== 'share') {
      return;
    }

    const nextValue = (event.target as HTMLInputElement).value;
    const entries = parseShareEntries(node.data.textValue);
    const nextEntries = entries.filter((entry) => entry.platformId !== platformId);

    if (nextValue.trim()) {
      nextEntries.push({
        platformId,
        value: nextValue,
      });
    }

    node.data.textValue = serializeShareEntries(nextEntries);
    this.refreshSelectedNode(node.key ?? null);
  }

  protected updateSelectedSharePlatformValue(platformId: SharePlatformId, event: Event) {
    const selectedNode = this.selectedTreeNode();
    if (!selectedNode) {
      return;
    }

    this.updateSharePlatformValue(selectedNode, platformId, event);
  }

  protected getSharePlatformPlaceholder(platformId: SharePlatformId) {
    return platformId === 'whatsapp' ? 'Es. 393331234567' : 'https://...';
  }

  protected updateSelectedButtonLabel(event: Event) {
    const selectedNode = this.selectedTreeNode();
    if (!selectedNode?.data) {
      return;
    }

    selectedNode.data.buttonLabel = (event.target as HTMLInputElement).value;
    this.refreshSelectedNode(selectedNode.key ?? null);
  }

  protected updateNodeButtonLabel(node: TreeNode<EditorNodeData>, event: Event) {
    if (!node.data) {
      return;
    }

    node.data.buttonLabel = (event.target as HTMLInputElement).value;
    this.refreshSelectedNode(node.key ?? null);
  }

  protected updateSelectedUrl(event: Event) {
    const selectedNode = this.selectedTreeNode();
    if (!selectedNode?.data) {
      return;
    }

    selectedNode.data.url = (event.target as HTMLInputElement).value;
    this.refreshSelectedNode(selectedNode.key ?? null);
  }

  protected updateNodeUrl(node: TreeNode<EditorNodeData>, event: Event) {
    if (!node.data) {
      return;
    }

    node.data.url = (event.target as HTMLInputElement).value;
    this.refreshSelectedNode(node.key ?? null);
  }

  protected supportsTextFormatting(type: ContentType) {
    return supportsTextFormatting(type);
  }

  protected getResolvedTextStyle(nodeData: EditorNodeData) {
    return resolveTextStyle(nodeData.type, nodeData.textStyle);
  }

  protected getCanvasTextModuleStyle(nodeData: EditorNodeData) {
    const textStyle = this.getResolvedTextStyle(nodeData);
    const textEffects =
      nodeData.type === 'table' ? this.getNoTextEffects() : this.getTextContrastEffects(textStyle.textColor);
    const style: Record<string, string> = {
      '--text-font-size': `${textStyle.fontSize}px`,
      '--text-align': textStyle.textAlign,
      '--text-justify': this.getTextJustify(textStyle.textAlign),
      '--text-vertical-align': this.getVerticalAlignValue(textStyle.verticalAlign),
      '--text-font-weight': textStyle.bold ? '700' : '400',
      '--text-font-style': textStyle.italic ? 'italic' : 'normal',
      '--table-border-width': `${textStyle.tableBorderWidth}px`,
      '--table-border-color': textStyle.tableBorderColor,
      '--table-cell-background-color': textStyle.tableCellBackgroundColor,
      '--table-header-background-color': textStyle.tableHeaderBackgroundColor,
      '--table-text-color': textStyle.textColor || '#151713',
      '--text-shadow': textEffects.shadow,
      '--text-stroke-width': textEffects.strokeWidth,
      '--text-stroke-color': textEffects.strokeColor,
      'text-shadow': textEffects.shadow,
      '-webkit-text-stroke': `${textEffects.strokeWidth} ${textEffects.strokeColor}`,
    };

    if (textStyle.textColor) {
      style['--text-color'] = textStyle.textColor;
      style['color'] = textStyle.textColor;
      style['-webkit-text-fill-color'] = textStyle.textColor;
    }

    return style;
  }

  private getTextContrastEffects(textColor?: string) {
    const rgb = this.parseHexColor(textColor);
    if (!rgb) {
      return {
        shadow: '0 1px 1px rgba(0, 0, 0, 0.32), 0 0 12px rgba(0, 0, 0, 0.16)',
        strokeWidth: '0px',
        strokeColor: 'transparent',
      };
    }

    const luminance = this.getRelativeLuminance(rgb.r, rgb.g, rgb.b);
    if (luminance < 0.36) {
      return {
        shadow: '0 0 1px rgba(255, 255, 255, 0.94), 0 0 8px rgba(255, 255, 255, 0.24)',
        strokeWidth: '0.4px',
        strokeColor: 'rgba(250, 247, 238, 0.76)',
      };
    }

    return {
      shadow: '0 1px 1px rgba(0, 0, 0, 0.32), 0 0 12px rgba(0, 0, 0, 0.16)',
      strokeWidth: '0px',
      strokeColor: 'transparent',
    };
  }

  private getNoTextEffects() {
    return {
      shadow: 'none',
      strokeWidth: '0px',
      strokeColor: 'transparent',
    };
  }

  private parseHexColor(value?: string) {
    if (!value || !value.startsWith('#')) {
      return null;
    }

    const hex = value.slice(1);
    if (hex.length === 3) {
      const [r, g, b] = hex.split('');
      return {
        r: Number.parseInt(`${r}${r}`, 16),
        g: Number.parseInt(`${g}${g}`, 16),
        b: Number.parseInt(`${b}${b}`, 16),
      };
    }

    if (hex.length !== 6) {
      return null;
    }

    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
    };
  }

  private getRelativeLuminance(r: number, g: number, b: number) {
    const [red, green, blue] = [r, g, b].map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    });

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  }

  protected updateSelectedTextStyleField(
    field: TextStyleField,
    value: EditorNodeTextStyle[TextStyleField],
  ) {
    const selectedNode = this.selectedTreeNode();
    if (!selectedNode?.data || !this.supportsTextFormatting(selectedNode.data.type)) {
      return;
    }

    selectedNode.data.textStyle = {
      ...selectedNode.data.textStyle,
      [field]: value,
    };
    this.refreshSelectedNode(selectedNode.key ?? null);
  }

  protected updateSelectedTextSize(event: Event) {
    const selectedNode = this.selectedTreeNode();
    if (!selectedNode?.data || !this.supportsTextFormatting(selectedNode.data.type)) {
      return;
    }

    const fallback = this.getResolvedTextStyle(selectedNode.data).fontSize;
    const value = this.readNumberInput(event, fallback);
    this.updateSelectedTextStyleField('fontSize', Math.min(Math.max(value, 12), 120));
  }

  protected updateSelectedTextColor(event: Event) {
    this.updateSelectedTextStyleField('textColor', (event.target as HTMLInputElement).value);
  }

  protected updateSelectedTextAlign(value: EditorNodeTextStyle['textAlign']) {
    this.updateSelectedTextStyleField('textAlign', value);
  }

  protected updateSelectedVerticalAlign(value: EditorNodeTextStyle['verticalAlign']) {
    this.updateSelectedTextStyleField('verticalAlign', value);
  }

  protected toggleSelectedBold() {
    const selectedNode = this.selectedTreeNode();
    if (!selectedNode?.data || !this.supportsTextFormatting(selectedNode.data.type)) {
      return;
    }

    this.updateSelectedTextStyleField('bold', !this.getResolvedTextStyle(selectedNode.data).bold);
  }

  protected toggleSelectedItalic() {
    const selectedNode = this.selectedTreeNode();
    if (!selectedNode?.data || !this.supportsTextFormatting(selectedNode.data.type)) {
      return;
    }

    this.updateSelectedTextStyleField(
      'italic',
      !this.getResolvedTextStyle(selectedNode.data).italic,
    );
  }

  protected updateSelectedTableBorderWidth(event: Event) {
    const selectedNode = this.selectedTreeNode();
    if (!selectedNode?.data || selectedNode.data.type !== 'table') {
      return;
    }

    const fallback = this.getResolvedTextStyle(selectedNode.data).tableBorderWidth;
    const value = this.readNumberInput(event, fallback);
    this.updateSelectedTextStyleField('tableBorderWidth', Math.min(Math.max(value, 0), 12));
  }

  protected updateSelectedTableBorderColor(event: Event) {
    this.updateSelectedTableColorField(
      'tableBorderColor',
      (event.target as HTMLInputElement).value,
    );
  }

  protected updateSelectedTableCellBackgroundColor(event: Event) {
    this.updateSelectedTableColorField(
      'tableCellBackgroundColor',
      (event.target as HTMLInputElement).value,
    );
  }

  protected updateSelectedTableHeaderBackgroundColor(event: Event) {
    this.updateSelectedTableColorField(
      'tableHeaderBackgroundColor',
      (event.target as HTMLInputElement).value,
    );
  }

  private updateSelectedTableColorField(
    field: 'tableBorderColor' | 'tableCellBackgroundColor' | 'tableHeaderBackgroundColor',
    value: string,
  ) {
    const selectedNode = this.selectedTreeNode();
    if (!selectedNode?.data || selectedNode.data.type !== 'table') {
      return;
    }

    this.updateSelectedTextStyleField(field, value);
  }

  protected updateSelectedLayout(field: keyof EditorNodeLayout, event: Event, fallback: number) {
    const selectedNode = this.selectedTreeNode();
    if (!selectedNode?.data) {
      return;
    }

    const nextValue = this.readNumberInput(event, fallback);
    selectedNode.data.layout = this.normalizeLayout(selectedNode.data.type, {
      ...selectedNode.data.layout,
      [field]: nextValue,
    });
    this.refreshSelectedNode(selectedNode.key ?? null);
  }

  protected getTableRows(textValue: string) {
    return textValue
      .split('\n')
      .map((row) => row.split(';').map((cell) => cell.trim()))
      .filter((row) => row.some((cell) => Boolean(cell)));
  }

  protected getEditableTableGrid(nodeData: EditorNodeData): EditableTableGrid {
    const parsedRows = nodeData.textValue
      .split('\n')
      .map((row) => row.split(';'))
      .filter((row) => row.length > 1 || row.some((cell) => Boolean(cell.trim())));

    if (parsedRows.length === 0) {
      return this.createEmptyTableGrid();
    }

    const columnCount = Math.max(...parsedRows.map((row) => row.length), 1);
    return parsedRows.map((row) =>
      Array.from({ length: columnCount }, (_value, columnIndex) => row[columnIndex] ?? ''),
    );
  }

  protected getSpreadsheetColumnLabel(columnIndex: number) {
    let value = columnIndex + 1;
    let label = '';

    while (value > 0) {
      const remainder = (value - 1) % 26;
      label = String.fromCharCode(65 + remainder) + label;
      value = Math.floor((value - 1) / 26);
    }

    return label;
  }

  protected updateTableCell(
    node: TreeNode<EditorNodeData>,
    rowIndex: number,
    columnIndex: number,
    event: Event,
  ) {
    if (!node.data || node.data.type !== 'table') {
      return;
    }

    const nextGrid = this.getEditableTableGrid(node.data).map((row) => [...row]);
    nextGrid[rowIndex] ??= Array.from({ length: nextGrid[0]?.length ?? columnIndex + 1 }, () => '');
    nextGrid[rowIndex][columnIndex] = (event.target as HTMLInputElement).value;
    node.data.textValue = this.serializeEditableTableGrid(nextGrid);
    this.refreshSelectedNode(node.key ?? null);
  }

  protected addTableRow(node: TreeNode<EditorNodeData>, event?: Event) {
    event?.stopPropagation();
    if (!node.data || node.data.type !== 'table') {
      return;
    }

    const nextGrid = this.getEditableTableGrid(node.data).map((row) => [...row]);
    const columnCount = nextGrid[0]?.length ?? 1;
    nextGrid.push(Array.from({ length: columnCount }, () => ''));
    node.data.textValue = this.serializeEditableTableGrid(nextGrid);
    this.refreshSelectedNode(node.key ?? null);
    this.focusTableCell(node.key ?? '', nextGrid.length - 1, 0);
  }

  protected removeTableRow(node: TreeNode<EditorNodeData>, event?: Event) {
    event?.stopPropagation();
    if (!node.data || node.data.type !== 'table') {
      return;
    }

    const nextGrid = this.getEditableTableGrid(node.data).map((row) => [...row]);
    if (nextGrid.length <= 1) {
      return;
    }

    nextGrid.pop();
    node.data.textValue = this.serializeEditableTableGrid(nextGrid);
    this.refreshSelectedNode(node.key ?? null);
  }

  protected addTableColumn(node: TreeNode<EditorNodeData>, event?: Event) {
    event?.stopPropagation();
    if (!node.data || node.data.type !== 'table') {
      return;
    }

    const nextGrid = this.getEditableTableGrid(node.data).map((row) => [...row, '']);
    node.data.textValue = this.serializeEditableTableGrid(nextGrid);
    this.refreshSelectedNode(node.key ?? null);
    this.focusTableCell(node.key ?? '', 0, (nextGrid[0]?.length ?? 1) - 1);
  }

  protected removeTableColumn(node: TreeNode<EditorNodeData>, event?: Event) {
    event?.stopPropagation();
    if (!node.data || node.data.type !== 'table') {
      return;
    }

    const nextGrid = this.getEditableTableGrid(node.data).map((row) => [...row]);
    if ((nextGrid[0]?.length ?? 0) <= 1) {
      return;
    }

    node.data.textValue = this.serializeEditableTableGrid(nextGrid.map((row) => row.slice(0, -1)));
    this.refreshSelectedNode(node.key ?? null);
  }

  protected handleTableCellKeydown(
    node: TreeNode<EditorNodeData>,
    event: KeyboardEvent,
    rowIndex: number,
    columnIndex: number,
  ) {
    if (!node.data || node.data.type !== 'table' || event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    const grid = this.getEditableTableGrid(node.data);
    const nextRowIndex = event.shiftKey ? rowIndex - 1 : rowIndex + 1;
    this.focusTableCell(
      node.key ?? '',
      Math.min(Math.max(nextRowIndex, 0), grid.length - 1),
      columnIndex,
    );
  }

  protected getStatRows(textValue: string): StatRow[] {
    return textValue
      .split('\n')
      .map((row) => row.split(';').map((cell) => cell.trim()))
      .filter((row) => row.some((cell) => Boolean(cell)))
      .map(([value = '', label = '', detail = '']) => ({
        value,
        label,
        detail,
      }))
      .filter((row) => Boolean(row.value || row.label || row.detail));
  }

  protected getPrimaryImage(images: string[]) {
    return images[0] ?? null;
  }

  protected async onImagesSelected(event: Event) {
    const selectedNode = this.selectedTreeNode();
    const inputElement = event.target as HTMLInputElement;
    const files = Array.from(inputElement.files ?? []);
    if (
      !selectedNode?.data ||
      (selectedNode.data.type !== 'image' && selectedNode.data.type !== 'carousel') ||
      files.length === 0
    ) {
      return;
    }

    const images = await Promise.all(
      files.map((file) => this.pdfImportService.readFileAsDataUrl(file)),
    );
    const nextImages = images.filter((image): image is string => Boolean(image));

    if (selectedNode.data.type === 'image') {
      selectedNode.data.images = nextImages.length > 0 ? [nextImages[0]] : selectedNode.data.images;
      inputElement.value = '';
      this.refreshSelectedNode(selectedNode.key ?? null);
      return;
    }

    selectedNode.data.images = [...selectedNode.data.images, ...nextImages];
    inputElement.value = '';
    this.refreshSelectedNode(selectedNode.key ?? null);
  }

  protected removeImage(imageIndex: number) {
    const selectedNode = this.selectedTreeNode();
    if (
      !selectedNode?.data ||
      (selectedNode.data.type !== 'image' && selectedNode.data.type !== 'carousel')
    ) {
      return;
    }

    selectedNode.data.images = selectedNode.data.images.filter(
      (_image, currentImageIndex) => currentImageIndex !== imageIndex,
    );
    this.refreshSelectedNode(selectedNode.key ?? null);
  }

  protected moveImage(imageIndex: number, direction: -1 | 1) {
    const selectedNode = this.selectedTreeNode();
    if (!selectedNode?.data || selectedNode.data.type !== 'carousel') {
      return;
    }

    const nextIndex = imageIndex + direction;
    if (nextIndex < 0 || nextIndex >= selectedNode.data.images.length) {
      return;
    }

    const nextImages = [...selectedNode.data.images];
    [nextImages[imageIndex], nextImages[nextIndex]] = [
      nextImages[nextIndex],
      nextImages[imageIndex],
    ];
    selectedNode.data.images = nextImages;
    this.refreshSelectedNode(selectedNode.key ?? null);
  }

  protected async onCvSelected(event: Event) {
    const selectedNode = this.selectedTreeNode();
    const file = (event.target as HTMLInputElement).files?.[0];
    this.extractionError.set(null);

    if (!selectedNode?.data || selectedNode.data.type !== 'cv' || !file) {
      return;
    }

    this.isExtractingCv.set(true);

    try {
      const [fileData, importedCv] = await Promise.all([
        this.pdfImportService.readFileAsDataUrl(file),
        this.pdfImportService.importCv(file),
      ]);

      selectedNode.data.fileData = fileData ?? '';
      selectedNode.data.fileName = file.name;
      selectedNode.data.textValue = importedCv.text;
      this.refreshSelectedNode(selectedNode.key ?? null);
    } catch {
      this.extractionError.set(
        'Non sono riuscito a leggere questo PDF. Prova con un altro file o incolla il testo manualmente.',
      );
    } finally {
      this.isExtractingCv.set(false);
    }
  }

  protected async onCvSelectedForNode(node: TreeNode<EditorNodeData>, event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.extractionError.set(null);

    if (!node.data || node.data.type !== 'cv' || !file) {
      return;
    }

    this.portfolioEditorStateService.selectNodeByKey(node.key ?? null);
    this.isExtractingCv.set(true);

    try {
      const [fileData, importedCv] = await Promise.all([
        this.pdfImportService.readFileAsDataUrl(file),
        this.pdfImportService.importCv(file),
      ]);

      node.data.fileData = fileData ?? '';
      node.data.fileName = file.name;
      node.data.textValue = importedCv.text;
      this.refreshSelectedNode(node.key ?? null);
    } catch {
      this.extractionError.set(
        'Non sono riuscito a leggere questo PDF. Prova con un altro file o incolla il testo manualmente.',
      );
    } finally {
      this.isExtractingCv.set(false);
    }
  }

  private createEmptyTableGrid(columnCount = 3, rowCount = 3): EditableTableGrid {
    return Array.from({ length: rowCount }, () => Array.from({ length: columnCount }, () => ''));
  }

  private serializeEditableTableGrid(grid: EditableTableGrid) {
    return grid.map((row) => row.map((cell) => cell.replaceAll(';', ',')).join(';')).join('\n');
  }

  private focusTableCell(nodeKey: string, rowIndex: number, columnIndex: number) {
    if (!nodeKey) {
      return;
    }

    window.setTimeout(() => {
      const cell = this.canvasSurface?.nativeElement.querySelector<HTMLInputElement>(
        `[data-table-node="${nodeKey}"][data-table-row="${rowIndex}"][data-table-col="${columnIndex}"]`,
      );
      cell?.focus();
      cell?.select();
    });
  }

  protected submit() {
    this.persistPortfolio((portfolio) => {
      void this.router.navigate(['/portfolios', portfolio.slug, 'edit']);
    });
  }

  protected async openLivePortfolio() {
    const slug = this.editingSlug();
    const payload = this.buildPortfolioPayload();
    if (!slug || !payload) {
      return;
    }

    const previewWindow = window.open('about:blank', '_blank');

    if (previewWindow) {
      previewWindow.document.write(
        '<!doctype html><title>Preview portfolio</title><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#0f1412;color:#f4f1e8;font-family:sans-serif">Sto aprendo il portfolio...</body>',
      );
      previewWindow.document.close();
    }

    await this.writePreviewSnapshot(slug, payload);

    if (previewWindow) {
      previewWindow.location.href = `/${slug}?preview=1`;
    } else {
      window.location.assign(`/${slug}?preview=1`);
    }

    this.persistPortfolio();
  }

  private startTransformInteraction(
    event: PointerEvent,
    node: TreeNode<EditorNodeData>,
    mode: TransformInteraction['mode'],
    resizeHandle?: ResizeHandlePosition,
  ) {
    if (!node.key || !node.data) {
      return;
    }

    const canvasMetrics = this.getCanvasMetrics();
    if (!canvasMetrics) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.portfolioEditorStateService.selectNodeByKey(node.key);

    this.interaction.set({
      mode,
      pointerId: event.pointerId,
      nodeKey: node.key,
      startX: event.clientX,
      startY: event.clientY,
      initialLayout: { ...node.data.layout },
      columnStep: canvasMetrics.columnStep,
      rowStep: canvasMetrics.rowStep,
      resizeHandle,
    });
  }

  private createNodeAtTarget(type: ContentType, target: CanvasTarget) {
    const backgroundNode = this.treeNodes().find((node) => node.data?.type === 'background');
    const nextNode = this.portfolioEditorStateService.createTreeNode(type, {
      layout: target.layout,
    });
    const nextRoots = this.treeNodes().filter((node) => node.data?.type !== 'background');

    this.portfolioEditorStateService.setTreeNodes([
      backgroundNode ?? this.createBackgroundNode(DEFAULT_BACKGROUND_COLOR),
      ...nextRoots,
      nextNode,
    ]);
    this.portfolioEditorStateService.selectNodeByKey(nextNode.key ?? null);
    this.schedulePreviewSnapshot();
  }

  private loadPortfolio(slug: string) {
    this.isLoadingPortfolio.set(true);
    this.loadError.set(null);

    this.authApiService.getMyPortfolio(slug).subscribe({
      next: (portfolio) => {
        this.portfolioForm.controls.title.setValue(portfolio.title);
        this.portfolioVisibility.set(portfolio.public);
        this.portfolioEditorStateService.setActiveTemplateId(null);
        this.portfolioEditorStateService.setTreeNodes(this.deserializeNodes(portfolio.modules));
        this.isLoadingPortfolio.set(false);
        this.schedulePreviewSnapshot();

        const firstNode = this.pageNodes()[0] ?? null;
        this.portfolioEditorStateService.selectNodeByKey(firstNode?.key ?? null);
      },
      error: () => {
        this.loadError.set('Non sono riuscito a caricare questo portfolio. Riprova tra poco.');
        this.isLoadingPortfolio.set(false);
      },
    });
  }

  private deserializeNodes(modules: PortfolioModuleDto[]): TreeNode<EditorNodeData>[] {
    const flattenedModules = this.flattenModules(modules);
    const backgroundModule = [...flattenedModules]
      .reverse()
      .find((module) => module.type === 'background');
    const contentModules = flattenedModules.filter(
      (module): module is PortfolioModuleDto & { type: ContentType } =>
        this.isSupportedContentType(module.type) && module.type !== 'background',
    );
    const isFreeformCanvas = flattenedModules.some(
      (module) => module.helperText === FREEFORM_LAYOUT_MARKER,
    );
    const shouldScaleLegacyModules =
      !isFreeformCanvas && this.looksLikeLegacyLayout(contentModules);

    return [
      this.createBackgroundNode(
        backgroundModule?.value || DEFAULT_BACKGROUND_COLOR,
        resolveBackgroundImages(backgroundModule?.backgroundImages),
      ),
      ...contentModules.map((module) => {
        const normalizedType =
          module.type === 'image' && (module.values?.length ?? 0) > 1 ? 'carousel' : module.type;
        const normalizedImages =
          normalizedType === 'image' ? (module.values?.slice(0, 1) ?? []) : (module.values ?? []);
        const layout = shouldScaleLegacyModules
          ? this.scaleLegacyLayout(normalizedType, module.layout)
          : module.layout;

        return this.portfolioEditorStateService.createTreeNode(normalizedType, {
          label: module.label || this.getContentTypeLabel(normalizedType),
          textValue: module.value ?? '',
          subtitle: module.subtitle ?? '',
          language: resolveCodeLanguage(module.language),
          buttonLabel: module.buttonLabel ?? '',
          url: module.url ?? '',
          fileName: module.fileName ?? '',
          fileData: module.fileData ?? '',
          images: normalizedImages,
          textStyle: module.textStyle,
          helperText: module.helperText,
          layout: this.normalizeLayout(normalizedType, layout),
        });
      }),
    ];
  }

  private serializeNodes(nodes: TreeNode<EditorNodeData>[]): PortfolioModuleDto[] {
    return nodes
      .filter((node): node is TreeNode<EditorNodeData> & { data: EditorNodeData } =>
        Boolean(node.data),
      )
      .map((node) => {
        const data = node.data;

        if (data.type === 'background') {
          return {
            type: 'background',
            label: 'Background',
            value: data.colorValue,
            backgroundImages: resolveBackgroundImages(data.backgroundImages),
            helperText: FREEFORM_LAYOUT_MARKER,
            layout: {
              columnStart: 1,
              rowStart: 1,
              columnSpan: CANVAS_COLUMNS,
              rowSpan: 1,
            },
            children: [],
          };
        }

        const baseModule: PortfolioModuleDto = {
          type: data.type,
          label: data.label,
          layout: { ...data.layout },
          children: [],
        };

        if (data.type === 'image') {
          return {
            ...baseModule,
            values: data.images.length > 0 ? [data.images[0]] : [],
          };
        }

        if (data.type === 'carousel') {
          return {
            ...baseModule,
            values: [...data.images],
          };
        }

        if (data.type === 'quote') {
          return {
            ...baseModule,
            value: data.textValue,
            subtitle: data.subtitle,
            textStyle: data.textStyle,
          };
        }

        if (data.type === 'code') {
          return {
            ...baseModule,
            value: data.textValue,
            language: data.language,
            textStyle: data.textStyle,
          };
        }

        if (data.type === 'cta') {
          return {
            ...baseModule,
            value: data.textValue,
            buttonLabel: data.buttonLabel,
            url: data.url,
            textStyle: data.textStyle,
          };
        }

        if (data.type === 'cv') {
          return {
            ...baseModule,
            value: data.textValue,
            fileName: data.fileName,
            fileData: data.fileData,
            textStyle: data.textStyle,
          };
        }

        return {
          ...baseModule,
          value: data.textValue,
          textStyle: this.supportsTextFormatting(data.type) ? data.textStyle : undefined,
        };
      });
  }

  private persistPortfolio(
    onSuccess?: (portfolio: { slug: string }) => void,
    onError?: () => void,
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
      },
    });
  }

  private buildPortfolioPayload(markAsTouched = true): CreatePortfolioRequestDto | null {
    if (markAsTouched) {
      this.portfolioForm.markAllAsTouched();
    }

    if (this.portfolioForm.invalid) {
      return null;
    }

    const title = this.portfolioForm.controls.title.value.trim();
    if (!title) {
      return null;
    }

    return {
      title,
      modules: this.serializeNodes(this.treeNodes()),
      public: this.portfolioVisibility(),
    };
  }

  private async persistPreviewSnapshot() {
    const payload = this.buildPortfolioPayload(false);
    const slug = this.editingSlug();
    if (!payload || !slug) {
      return;
    }

    await this.writePreviewSnapshot(slug, payload);
  }

  private schedulePreviewSnapshot() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.livePreviewTimerId !== null) {
      window.clearTimeout(this.livePreviewTimerId);
    }

    this.livePreviewTimerId = window.setTimeout(() => {
      this.livePreviewTimerId = null;
      void this.persistPreviewSnapshot();
    }, 120);
  }

  private async writePreviewSnapshot(slug: string, payload: CreatePortfolioRequestDto) {
    const previewSnapshot = {
      id: '',
      title: payload.title,
      slug,
      tags: [],
      public: payload.public ?? true,
      modules: payload.modules,
      savedAt: Date.now(),
    };

    await this.portfolioPreviewLiveService.writeStoredPreview(previewSnapshot);
    this.portfolioPreviewLiveService.publish(slug, previewSnapshot);
  }

  private getCanvasTarget(
    clientX: number,
    clientY: number,
    type: ContentType,
  ): CanvasTarget | null {
    const canvasMetrics = this.getCanvasMetrics();
    if (!canvasMetrics) {
      return null;
    }

    const { rect, columnStep } = canvasMetrics;
    const insideCanvas =
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom;

    if (!insideCanvas) {
      return null;
    }

    const column = this.clampInteger(
      Math.floor((clientX - rect.left) / Math.max(columnStep, 1)) + 1,
      1,
      CANVAS_COLUMNS,
      1,
    );
    const row = this.clampInteger(
      Math.floor((clientY - rect.top) / CANVAS_ROW_HEIGHT) + 1,
      1,
      MAX_CANVAS_ROWS,
      1,
    );

    return {
      column,
      row,
      layout: this.buildLayoutAtPoint(type, column, row),
    };
  }

  private getCanvasMetrics() {
    const canvasElement = this.canvasSurface?.nativeElement;
    if (!canvasElement) {
      return null;
    }

    const rect = canvasElement.getBoundingClientRect();
    return {
      rect,
      columnStep: rect.width / CANVAS_COLUMNS,
      rowStep: CANVAS_ROW_HEIGHT,
    };
  }

  private buildLayoutAtPoint(type: ContentType, column: number, row: number) {
    const defaultLayout = this.getDefaultLayout(type);

    return this.normalizeLayout(type, {
      ...defaultLayout,
      columnStart: column,
      rowStart: row,
    });
  }

  private buildQuickAddLayout(type: ContentType, existingNodeCount: number) {
    const defaultLayout = this.getDefaultLayout(type);
    const offsetCycle = existingNodeCount % 4;

    return this.normalizeLayout(type, {
      ...defaultLayout,
      columnStart: Math.min(4 + offsetCycle * 3, CANVAS_COLUMNS - defaultLayout.columnSpan + 1),
      rowStart: 4 + existingNodeCount * 4,
    });
  }

  private getDefaultLayout(type: ContentType): EditorNodeLayout {
    switch (type) {
      case 'title':
        return { columnStart: 3, rowStart: 3, columnSpan: 22, rowSpan: 8 };
      case 'description':
        return { columnStart: 3, rowStart: 12, columnSpan: 18, rowSpan: 12 };
      case 'code':
        return { columnStart: 4, rowStart: 12, columnSpan: 24, rowSpan: 14 };
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
      case 'share':
        return { columnStart: 8, rowStart: 28, columnSpan: 16, rowSpan: 5 };
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
      type === 'background'
        ? CANVAS_COLUMNS
        : type === 'title'
          ? 12
          : type === 'cta'
            ? 14
            : type === 'share'
              ? 10
            : type === 'quote' || type === 'stats' || type === 'carousel' || type === 'code'
              ? 12
              : 10;
    const minRowSpan =
      type === 'background'
        ? 1
        : type === 'title'
          ? 6
          : type === 'cta'
            ? 4
            : type === 'share'
              ? 4
            : type === 'quote' || type === 'stats' || type === 'code'
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
    const rowSpan = this.clampInteger(
      layout?.rowSpan,
      minRowSpan,
      MAX_CANVAS_ROWS,
      fallback.rowSpan,
    );
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
      columnStart: (columnStart - 1) * LEGACY_COLUMN_SCALE + 1,
      rowStart: (rowStart - 1) * LEGACY_ROW_SCALE + 1,
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

  private createBackgroundNode(
    colorValue: string,
    backgroundImages: PortfolioBackgroundImageDto[] = [],
  ) {
    return this.portfolioEditorStateService.createTreeNode('background', {
      colorValue,
      backgroundImages,
      helperText: FREEFORM_LAYOUT_MARKER,
      layout: {
        columnStart: 1,
        rowStart: 1,
        columnSpan: CANVAS_COLUMNS,
        rowSpan: 1,
      },
    });
  }

  private createBackgroundImageAsset(
    sources: string[],
    imageIndex: number,
  ): PortfolioBackgroundImageDto {
    const positionOffset = (imageIndex % 4) * 12;
    return resolveBackgroundImages([
      {
        src: sources[0] ?? '',
        values: sources,
        positionX: 24 + positionOffset,
        positionY: 28 + (imageIndex % 3) * 18,
        scaleX: 24,
        scaleY: 24,
        blur: 0,
      },
    ])[0];
  }

  private flattenModules(modules: PortfolioModuleDto[]): PortfolioModuleDto[] {
    return modules.flatMap((module) => [module, ...this.flattenModules(module.children ?? [])]);
  }

  private isSupportedContentType(type: string): type is ContentType {
    return (
      type === 'title' ||
      type === 'description' ||
      type === 'code' ||
      type === 'image' ||
      type === 'carousel' ||
      type === 'table' ||
      type === 'quote' ||
      type === 'stats' ||
      type === 'cta' ||
      type === 'share' ||
      type === 'cv' ||
      type === 'background'
    );
  }

  private findNodeByKey(key: string) {
    return this.treeNodes().find((node) => node.key === key) ?? null;
  }

  private refreshSelectedNode(key: string | null) {
    this.portfolioEditorStateService.refreshTree();
    this.portfolioEditorStateService.selectNodeByKey(key);
    this.schedulePreviewSnapshot();
  }

  private readNumberInput(event: Event, fallback: number) {
    const rawValue = Number.parseInt((event.target as HTMLInputElement).value, 10);
    return Number.isFinite(rawValue) ? rawValue : fallback;
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

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
