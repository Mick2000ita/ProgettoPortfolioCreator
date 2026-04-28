import { Injectable, computed, signal } from '@angular/core';
import { TreeNode } from 'primeng/api';
import {
  PortfolioBackgroundImageDto,
  PortfolioModuleDto,
  PortfolioTextAlign,
  PortfolioTextStyleDto,
  PortfolioTextVerticalAlign,
} from './auth-api.service';

export type ContentType =
  | 'title'
  | 'description'
  | 'code'
  | 'cv'
  | 'image'
  | 'carousel'
  | 'table'
  | 'quote'
  | 'stats'
  | 'cta'
  | 'background';
export type PortfolioLayoutTemplateId = 'editorial-split' | 'case-study' | 'cv-showcase';

export const DEFAULT_BACKGROUND_COLOR = '#081111';
export const DEFAULT_BACKGROUND_IMAGE_WIDTH = 28;
export const DEFAULT_BACKGROUND_IMAGE_BLUR = 0;
export const DEFAULT_TABLE_BORDER_WIDTH = 1;
const DEFAULT_CODE_LANGUAGE: CodeLanguageId = 'typescript';

export interface ContentOption {
  value: ContentType;
  label: string;
  description: string;
  icon: string;
}

export type CodeLanguageId =
  | 'plaintext'
  | 'typescript'
  | 'javascript'
  | 'html'
  | 'css'
  | 'scss'
  | 'json'
  | 'bash'
  | 'python'
  | 'java'
  | 'sql';

export interface CodeLanguageOption {
  value: CodeLanguageId;
  label: string;
}

export interface EditorNodeLayout {
  columnStart: number;
  rowStart: number;
  columnSpan: number;
  rowSpan: number;
}

export interface EditorNodeTextStyle {
  fontSize?: number;
  textColor?: string;
  textAlign?: PortfolioTextAlign;
  verticalAlign?: PortfolioTextVerticalAlign;
  bold?: boolean;
  italic?: boolean;
  tableBorderWidth?: number;
}

export interface PortfolioLayoutSlotDefinition {
  id: string;
  type: Exclude<ContentType, 'background'>;
  label: string;
  helperText: string;
  layout: EditorNodeLayout;
  defaultTextValue?: string;
  defaultSubtitle?: string;
  defaultButtonLabel?: string;
  defaultUrl?: string;
}

export interface PortfolioLayoutTemplate {
  id: PortfolioLayoutTemplateId;
  name: string;
  description: string;
  accent: string;
  preview: string;
  backgroundColor: string;
  slots: PortfolioLayoutSlotDefinition[];
}

export interface EditorNodeData {
  type: ContentType;
  label: string;
  textValue: string;
  subtitle: string;
  language: string;
  buttonLabel: string;
  url: string;
  colorValue: string;
  fileName: string;
  fileData: string;
  images: string[];
  backgroundImages: PortfolioBackgroundImageDto[];
  textStyle: EditorNodeTextStyle;
  importSourceKey?: string;
  slotId?: string;
  templateId?: PortfolioLayoutTemplateId | null;
  helperText?: string;
  locked?: boolean;
  layout: EditorNodeLayout;
}

export function resolveBackgroundImage(
  image?: PortfolioBackgroundImageDto | null,
): PortfolioBackgroundImageDto {
  const fallbackScale = image?.scaleX ?? image?.width ?? DEFAULT_BACKGROUND_IMAGE_WIDTH;
  const values = (image?.values ?? []).filter(Boolean);
  const normalizedValues = values.length > 0 ? values : image?.src ? [image.src] : [];
  const primarySrc = normalizedValues[0] ?? '';

  return {
    src: primarySrc,
    values: normalizedValues,
    positionX: clampBackgroundMetric(image?.positionX, -100, 200, 50),
    positionY: clampBackgroundMetric(image?.positionY, -100, 200, 50),
    scaleX: clampBackgroundMetric(fallbackScale, 8, 300, DEFAULT_BACKGROUND_IMAGE_WIDTH),
    scaleY: clampBackgroundMetric(
      image?.scaleY ?? image?.width ?? DEFAULT_BACKGROUND_IMAGE_WIDTH,
      8,
      300,
      DEFAULT_BACKGROUND_IMAGE_WIDTH,
    ),
    blur: clampBackgroundMetric(image?.blur, 0, 40, DEFAULT_BACKGROUND_IMAGE_BLUR),
  };
}

export function resolveBackgroundImages(
  images?: Array<PortfolioBackgroundImageDto | null | undefined> | null,
): PortfolioBackgroundImageDto[] {
  return (images ?? [])
    .map((image) => resolveBackgroundImage(image))
    .filter((image) => Boolean(image.src || image.values?.[0]));
}

export function supportsTextFormatting(type: ContentType) {
  return (
    type === 'title' ||
    type === 'description' ||
    type === 'code' ||
    type === 'quote' ||
    type === 'stats' ||
    type === 'table' ||
    type === 'cta' ||
    type === 'cv'
  );
}

export function getDefaultTextFontSize(type: ContentType) {
  switch (type) {
    case 'title':
      return 56;
    case 'code':
      return 15;
    case 'quote':
      return 30;
    case 'stats':
      return 18;
    case 'table':
      return 16;
    case 'cv':
      return 15;
    case 'cta':
      return 18;
    case 'description':
    default:
      return 18;
  }
}

export function getDefaultTextStyle(type: ContentType): EditorNodeTextStyle {
  if (!supportsTextFormatting(type)) {
    return {};
  }

  return {
    fontSize: getDefaultTextFontSize(type),
    textColor: '',
    textAlign: 'left',
    verticalAlign: 'start',
    bold: type === 'title',
    italic: false,
    tableBorderWidth: type === 'table' ? DEFAULT_TABLE_BORDER_WIDTH : undefined,
  };
}

export function resolveTextStyle(
  type: ContentType,
  textStyle?: EditorNodeTextStyle | PortfolioTextStyleDto | null,
): Required<EditorNodeTextStyle> {
  const defaultStyle = getDefaultTextStyle(type);
  const resolvedTableBorderWidth =
    type === 'table'
      ? clampTextStyleMetric(
          textStyle?.tableBorderWidth,
          0,
          12,
          defaultStyle.tableBorderWidth ?? DEFAULT_TABLE_BORDER_WIDTH,
        )
      : DEFAULT_TABLE_BORDER_WIDTH;

  return {
    fontSize: textStyle?.fontSize ?? defaultStyle.fontSize ?? getDefaultTextFontSize(type),
    textColor: textStyle?.textColor ?? defaultStyle.textColor ?? '',
    textAlign: textStyle?.textAlign ?? defaultStyle.textAlign ?? 'left',
    verticalAlign: textStyle?.verticalAlign ?? defaultStyle.verticalAlign ?? 'start',
    bold: textStyle?.bold ?? defaultStyle.bold ?? false,
    italic: textStyle?.italic ?? defaultStyle.italic ?? false,
    tableBorderWidth: resolvedTableBorderWidth,
  };
}

function clampTextStyleMetric(
  value: number | null | undefined,
  min: number,
  max: number,
  fallback: number,
) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(Math.max(value, min), max);
}

export const PORTFOLIO_EDITOR_CONTENT_OPTIONS: ContentOption[] = [
  {
    value: 'title',
    label: 'Titolo',
    description: 'Headline principale del portfolio.',
    icon: 'pi pi-heading',
  },
  {
    value: 'description',
    label: 'Descrizione',
    description: 'Testi introduttivi o blocchi editoriali.',
    icon: 'pi pi-align-left',
  },
  {
    value: 'code',
    label: 'Code',
    description: 'Snippet di codice con linguaggio e formattazione leggibile.',
    icon: 'pi pi-code',
  },
  {
    value: 'quote',
    label: 'Quote',
    description: 'Citazioni, testimonianze o statement ad alto impatto.',
    icon: 'pi pi-quote-left',
  },
  {
    value: 'stats',
    label: 'Stats',
    description: 'Numeri chiave, risultati e KPI da mettere in evidenza.',
    icon: 'pi pi-chart-bar',
  },
  {
    value: 'cv',
    label: 'CV',
    description: 'Curriculum con testo modificabile e file scaricabile.',
    icon: 'pi pi-file-pdf',
  },
  {
    value: 'image',
    label: 'Immagine',
    description: 'Un singolo visual, cover o mockup per box.',
    icon: 'pi pi-image',
  },
  {
    value: 'carousel',
    label: 'Carousel',
    description: 'Sequenze di immagini sfogliabili per case study e gallery.',
    icon: 'pi pi-images',
  },
  {
    value: 'table',
    label: 'Tabella',
    description: 'Tabelle, listini e contenuti strutturati in righe e colonne.',
    icon: 'pi pi-table',
  },
  {
    value: 'cta',
    label: 'CTA',
    description: 'Inviti all azione con testo e bottone per contatti o approfondimenti.',
    icon: 'pi pi-send',
  },
  {
    value: 'background',
    label: 'Background',
    description: 'Colore di atmosfera per la pagina pubblica.',
    icon: 'pi pi-palette',
  },
];

export const CODE_LANGUAGE_OPTIONS: CodeLanguageOption[] = [
  { value: 'plaintext', label: 'Plain Text' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'scss', label: 'SCSS' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'sql', label: 'SQL' },
];

export function resolveCodeLanguage(value?: string | null): CodeLanguageId {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_CODE_LANGUAGE;
  }

  return CODE_LANGUAGE_OPTIONS.some((option) => option.value === normalized)
    ? (normalized as CodeLanguageId)
    : DEFAULT_CODE_LANGUAGE;
}

export function getCodeLanguageLabel(value?: string | null) {
  const resolved = resolveCodeLanguage(value);
  return CODE_LANGUAGE_OPTIONS.find((option) => option.value === resolved)?.label ?? 'Code';
}

export const PORTFOLIO_LAYOUT_TEMPLATES: PortfolioLayoutTemplate[] = [
  {
    id: 'editorial-split',
    name: 'Editorial Split',
    description:
      'Un apertura editoriale moderna con hero visual, quote, storytelling e call to action finale.',
    accent: 'linear-gradient(135deg, #0f7b6c 0%, #c0efe1 100%)',
    preview: 'Hero image + intro + quote + CTA',
    backgroundColor: '#061516',
    slots: [
      {
        id: 'hero-title',
        type: 'title',
        label: 'Titolo hero',
        helperText: 'Usa un titolo breve e forte che presenti subito il portfolio.',
        layout: { columnStart: 1, rowStart: 1, columnSpan: 7, rowSpan: 2 },
      },
      {
        id: 'intro-copy',
        type: 'description',
        label: 'Introduzione',
        helperText: 'Racconta chi sei, cosa fai e il taglio del portfolio in 3 o 4 righe.',
        layout: { columnStart: 1, rowStart: 3, columnSpan: 5, rowSpan: 4 },
      },
      {
        id: 'hero-image',
        type: 'image',
        label: 'Hero image',
        helperText: 'Carica una cover forte che apra subito il portfolio.',
        layout: { columnStart: 8, rowStart: 1, columnSpan: 5, rowSpan: 6 },
      },
      {
        id: 'signature-quote',
        type: 'quote',
        label: 'Quote manifesto',
        helperText: 'Inserisci una citazione breve che dia tono e posizionamento al portfolio.',
        defaultTextValue: 'Designing interfaces that feel sharp, human and measurable.',
        defaultSubtitle: 'Nome Cognome, Product Designer',
        layout: { columnStart: 7, rowStart: 7, columnSpan: 6, rowSpan: 4 },
      },
      {
        id: 'support-carousel',
        type: 'carousel',
        label: 'Support carousel',
        helperText: 'Aggiungi una sequenza di dettagli, mockup o close-up del progetto.',
        layout: { columnStart: 1, rowStart: 8, columnSpan: 6, rowSpan: 5 },
      },
      {
        id: 'editorial-cta',
        type: 'cta',
        label: 'Call to action',
        helperText:
          'Chiudi la sezione con un invito all azione verso contatto, progetto o profilo.',
        defaultTextValue: 'Disponibile per collaborazioni, freelance e team in fase di lancio.',
        defaultButtonLabel: 'Parliamone',
        defaultUrl: 'mailto:hello@example.com',
        layout: { columnStart: 1, rowStart: 13, columnSpan: 12, rowSpan: 3 },
      },
    ],
  },
  {
    id: 'case-study',
    name: 'Case Study',
    description:
      'Pensato per progetti prodotto o UX: summary, metriche, carousel deliverable e spazio per il processo.',
    accent: 'linear-gradient(135deg, #c6ff9d 0%, #3b6f32 100%)',
    preview: 'Titolo + stats + results table + carousel',
    backgroundColor: '#10160e',
    slots: [
      {
        id: 'case-title',
        type: 'title',
        label: 'Titolo del caso studio',
        helperText: 'Inserisci il nome del progetto o del caso studio.',
        layout: { columnStart: 1, rowStart: 1, columnSpan: 8, rowSpan: 2 },
      },
      {
        id: 'case-summary',
        type: 'description',
        label: 'Summary',
        helperText: 'Riassumi obiettivo, contesto e ruolo ricoperto nel progetto.',
        layout: { columnStart: 1, rowStart: 3, columnSpan: 4, rowSpan: 4 },
      },
      {
        id: 'results-stats',
        type: 'stats',
        label: 'Numeri chiave',
        helperText: 'Inserisci un risultato per riga nel formato Valore;Etichetta;Contesto.',
        defaultTextValue:
          '42%;Riduzione bounce rate;Primi 60 giorni\n3.2x;Crescita lead qualificati;Campagna Q1\n9/10;Stakeholder satisfaction;Survey finale',
        layout: { columnStart: 5, rowStart: 3, columnSpan: 8, rowSpan: 4 },
      },
      {
        id: 'results-table',
        type: 'table',
        label: 'Tabella risultati',
        helperText: 'Compila una riga per record e separa le celle con ;.',
        layout: { columnStart: 1, rowStart: 7, columnSpan: 6, rowSpan: 5 },
      },
      {
        id: 'showcase-carousel',
        type: 'carousel',
        label: 'Schermate o deliverable',
        helperText: 'Carica screenshot, mockup o deliverable del progetto.',
        layout: { columnStart: 7, rowStart: 7, columnSpan: 6, rowSpan: 6 },
      },
      {
        id: 'process-copy',
        type: 'description',
        label: 'Processo',
        helperText: 'Descrivi passaggi, decisioni e learnings che vuoi mettere in evidenza.',
        layout: { columnStart: 1, rowStart: 12, columnSpan: 12, rowSpan: 4 },
      },
    ],
  },
  {
    id: 'cv-showcase',
    name: 'CV Showcase',
    description:
      'Un layout ibrido per profilo personale: bio, curriculum, spotlight image, skill table e contatto.',
    accent: 'linear-gradient(135deg, #f7d26d 0%, #7b4818 100%)',
    preview: 'Bio + CV + spotlight image + CTA',
    backgroundColor: '#16110a',
    slots: [
      {
        id: 'profile-title',
        type: 'title',
        label: 'Nome o headline',
        helperText: 'Inserisci nome, ruolo o headline professionale principale.',
        layout: { columnStart: 1, rowStart: 1, columnSpan: 7, rowSpan: 2 },
      },
      {
        id: 'profile-bio',
        type: 'description',
        label: 'Bio',
        helperText: 'Racconta competenze, focus e approccio personale.',
        layout: { columnStart: 1, rowStart: 3, columnSpan: 5, rowSpan: 4 },
      },
      {
        id: 'profile-cv',
        type: 'cv',
        label: 'Curriculum',
        helperText: 'Carica il CV in PDF: il testo verra ricostruito e restera scaricabile.',
        layout: { columnStart: 7, rowStart: 1, columnSpan: 6, rowSpan: 8 },
      },
      {
        id: 'selected-works',
        type: 'image',
        label: 'Spotlight image',
        helperText: 'Aggiungi una cover o un lavoro selezionato da mettere in primo piano.',
        layout: { columnStart: 1, rowStart: 8, columnSpan: 6, rowSpan: 5 },
      },
      {
        id: 'skills-table',
        type: 'table',
        label: 'Skill e servizi',
        helperText: 'Usa ; per separare le celle di strumenti, stack, servizi o disponibilita.',
        layout: { columnStart: 7, rowStart: 9, columnSpan: 6, rowSpan: 4 },
      },
      {
        id: 'profile-cta',
        type: 'cta',
        label: 'Contatto',
        helperText: 'Aggiungi disponibilita e un bottone per avviare una conversazione.',
        defaultTextValue:
          'Cerco team che vogliono costruire prodotti chiari, veloci e ben raccontati.',
        defaultButtonLabel: 'Scrivimi',
        defaultUrl: 'mailto:hello@example.com',
        layout: { columnStart: 1, rowStart: 13, columnSpan: 12, rowSpan: 3 },
      },
    ],
  },
];

export function isPortfolioLayoutTemplateId(
  value: string | null | undefined,
): value is PortfolioLayoutTemplateId {
  return PORTFOLIO_LAYOUT_TEMPLATES.some((template) => template.id === value);
}

export function getPortfolioLayoutTemplate(
  templateId: string | null | undefined,
): PortfolioLayoutTemplate | null {
  if (!isPortfolioLayoutTemplateId(templateId)) {
    return null;
  }

  return PORTFOLIO_LAYOUT_TEMPLATES.find((template) => template.id === templateId) ?? null;
}

export function buildPortfolioModulesFromTemplate(
  templateId: PortfolioLayoutTemplateId,
): PortfolioModuleDto[] {
  const template = getPortfolioLayoutTemplate(templateId);
  if (!template) {
    return [];
  }

  const backgroundModule: PortfolioModuleDto = {
    type: 'background',
    label: 'Background',
    value: template.backgroundColor,
    templateId: template.id,
    helperText: `Layout guidato ${template.name}.`,
    locked: true,
  };

  const slotModules = template.slots.map<PortfolioModuleDto>((slot) => {
    const baseModule: PortfolioModuleDto = {
      type: slot.type,
      label: slot.label,
      layout: { ...slot.layout },
      slotId: slot.id,
      templateId: template.id,
      helperText: slot.helperText,
      locked: true,
    };

    const textStyle = supportsTextFormatting(slot.type)
      ? getDefaultTextStyle(slot.type)
      : undefined;

    if (slot.type === 'image' || slot.type === 'carousel') {
      return {
        ...baseModule,
        values: [],
      };
    }

    if (slot.type === 'quote') {
      return {
        ...baseModule,
        value: slot.defaultTextValue ?? '',
        subtitle: slot.defaultSubtitle ?? '',
        textStyle,
      };
    }

    if (slot.type === 'cta') {
      return {
        ...baseModule,
        value: slot.defaultTextValue ?? '',
        buttonLabel: slot.defaultButtonLabel ?? '',
        url: slot.defaultUrl ?? '',
        textStyle,
      };
    }

    if (slot.type === 'cv') {
      return {
        ...baseModule,
        value: slot.defaultTextValue ?? '',
        fileName: '',
        fileData: '',
        textStyle,
      };
    }

    return {
      ...baseModule,
      value: slot.defaultTextValue ?? '',
      textStyle,
    };
  });

  return [backgroundModule, ...slotModules];
}

@Injectable({
  providedIn: 'root',
})
export class PortfolioEditorStateService {
  readonly treeNodes = signal<TreeNode<EditorNodeData>[]>([]);
  readonly selectedTreeNode = signal<TreeNode<EditorNodeData> | null>(null);
  readonly activeTemplateId = signal<PortfolioLayoutTemplateId | null>(null);
  readonly activeTemplate = computed(() => getPortfolioLayoutTemplate(this.activeTemplateId()));
  readonly isGuidedLayout = computed(() => Boolean(this.activeTemplateId()));
  readonly flatNodes = computed(() => this.flattenTreeNodes(this.treeNodes()));
  readonly nodeCount = computed(() => this.flatNodes().length);

  setTreeNodes(nodes: TreeNode<EditorNodeData>[]) {
    this.treeNodes.set(this.ensureBackgroundRoot(this.decorateTreeNodes(nodes)));
  }

  setActiveTemplateId(templateId: PortfolioLayoutTemplateId | null) {
    this.activeTemplateId.set(templateId);
  }

  onSelectionChange(
    selection: TreeNode<EditorNodeData> | TreeNode<EditorNodeData>[] | null | undefined,
  ) {
    const node = Array.isArray(selection) ? (selection[0] ?? null) : (selection ?? null);
    this.selectedTreeNode.set(node);
  }

  addNode(type: ContentType) {
    if (type === 'background' || this.isGuidedLayout()) {
      return null;
    }

    const newNode = this.createTreeNode(type);
    const selectedTreeNode = this.selectedTreeNode();
    const roots = [...this.treeNodes()];

    if (selectedTreeNode && !selectedTreeNode.data?.locked) {
      selectedTreeNode.children = [...(selectedTreeNode.children ?? []), newNode];
      selectedTreeNode.expanded = true;
    } else {
      roots.push(newNode);
      this.treeNodes.set(roots);
    }

    this.refreshTree();
    this.selectNodeByKey(newNode.key ?? null);
    return newNode;
  }

  canRemoveSelectedNode() {
    if (this.isGuidedLayout()) {
      return false;
    }

    const selectedNode = this.selectedTreeNode();
    return (
      selectedNode?.data?.type !== 'background' &&
      !selectedNode?.data?.locked &&
      Boolean(selectedNode?.key)
    );
  }

  removeSelectedNode() {
    const selectedKey = this.selectedTreeNode()?.key;
    if (!selectedKey || !this.canRemoveSelectedNode()) {
      return;
    }

    this.treeNodes.set(this.removeNodeByKey(this.treeNodes(), selectedKey));
    this.selectedTreeNode.set(null);
  }

  onNodeDrop(event: { accept?: Function }) {
    if (this.isGuidedLayout()) {
      return;
    }

    event.accept?.();
    queueMicrotask(() => {
      this.refreshTree();
    });
  }

  refreshTree() {
    const selectedKey = this.selectedTreeNode()?.key ?? null;
    this.treeNodes.set(this.cloneTreeNodes(this.treeNodes()));
    this.selectNodeByKey(selectedKey);
  }

  selectNodeByKey(key: string | null) {
    if (!key) {
      this.selectedTreeNode.set(null);
      return;
    }

    this.selectedTreeNode.set(this.findNodeByKey(this.treeNodes(), key));
  }

  getContentTypeLabel(type: ContentType) {
    return PORTFOLIO_EDITOR_CONTENT_OPTIONS.find((option) => option.value === type)?.label ?? type;
  }

  getTreeNodeIcon(type: ContentType) {
    return (
      PORTFOLIO_EDITOR_CONTENT_OPTIONS.find((option) => option.value === type)?.icon ??
      'pi pi-folder'
    );
  }

  getDefaultLayout(type: ContentType): EditorNodeLayout {
    switch (type) {
      case 'title':
        return { columnStart: 1, rowStart: 1, columnSpan: 7, rowSpan: 2 };
      case 'description':
        return { columnStart: 1, rowStart: 3, columnSpan: 6, rowSpan: 3 };
      case 'code':
        return { columnStart: 1, rowStart: 7, columnSpan: 8, rowSpan: 5 };
      case 'image':
        return { columnStart: 1, rowStart: 1, columnSpan: 6, rowSpan: 4 };
      case 'carousel':
        return { columnStart: 1, rowStart: 1, columnSpan: 8, rowSpan: 5 };
      case 'table':
        return { columnStart: 1, rowStart: 1, columnSpan: 8, rowSpan: 5 };
      case 'quote':
        return { columnStart: 1, rowStart: 1, columnSpan: 6, rowSpan: 4 };
      case 'stats':
        return { columnStart: 1, rowStart: 1, columnSpan: 8, rowSpan: 4 };
      case 'cta':
        return { columnStart: 1, rowStart: 1, columnSpan: 8, rowSpan: 3 };
      case 'cv':
        return { columnStart: 1, rowStart: 1, columnSpan: 8, rowSpan: 5 };
      case 'background':
      default:
        return { columnStart: 1, rowStart: 1, columnSpan: 12, rowSpan: 1 };
    }
  }

  createTreeNode(
    type: ContentType,
    overrides: Partial<Omit<EditorNodeData, 'type' | 'layout'>> & {
      layout?: Partial<EditorNodeLayout>;
    } = {},
  ): TreeNode<EditorNodeData> {
    const label = overrides.label ?? this.getContentTypeLabel(type);
    const locked = overrides.locked ?? false;

    return {
      key: this.generateNodeKey(),
      label,
      icon: this.getTreeNodeIcon(type),
      expanded: true,
      selectable: true,
      draggable: type !== 'background' && !locked,
      droppable: !locked,
      data: {
        type,
        label,
        textValue: overrides.textValue ?? '',
        subtitle: overrides.subtitle ?? '',
        language: type === 'code' ? resolveCodeLanguage(overrides.language) : '',
        buttonLabel: overrides.buttonLabel ?? '',
        url: overrides.url ?? '',
        colorValue: overrides.colorValue ?? DEFAULT_BACKGROUND_COLOR,
        fileName: overrides.fileName ?? '',
        fileData: overrides.fileData ?? '',
        images: [...(overrides.images ?? [])],
        backgroundImages: resolveBackgroundImages(overrides.backgroundImages),
        textStyle: resolveTextStyle(type, overrides.textStyle),
        importSourceKey: overrides.importSourceKey,
        slotId: overrides.slotId,
        templateId: overrides.templateId ?? null,
        helperText: overrides.helperText,
        locked,
        layout: {
          ...this.getDefaultLayout(type),
          ...(overrides.layout ?? {}),
        },
      },
      children: [],
    };
  }

  reset() {
    this.treeNodes.set([]);
    this.selectedTreeNode.set(null);
    this.activeTemplateId.set(null);
  }

  private ensureBackgroundRoot(nodes: TreeNode<EditorNodeData>[]) {
    const backgroundIndex = nodes.findIndex((node) => node.data?.type === 'background');
    if (backgroundIndex >= 0) {
      const backgroundNode = nodes[backgroundIndex];
      const remainingNodes = nodes.filter((_node, index) => index !== backgroundIndex);
      return [backgroundNode, ...remainingNodes];
    }

    return [this.createTreeNode('background'), ...nodes];
  }

  private decorateTreeNodes(nodes: TreeNode<EditorNodeData>[]): TreeNode<EditorNodeData>[] {
    return nodes.map((node) => {
      const locked = Boolean(node.data?.locked);
      const type = node.data?.type ?? 'description';

      return {
        ...node,
        label: node.data?.label ?? node.label ?? this.getContentTypeLabel(type),
        icon: this.getTreeNodeIcon(type),
        expanded: node.expanded ?? true,
        selectable: true,
        draggable: type !== 'background' && !locked,
        droppable: !locked,
        data: node.data
          ? {
              ...node.data,
              label: node.data.label || this.getContentTypeLabel(type),
              images: [...node.data.images],
              backgroundImages: resolveBackgroundImages(node.data.backgroundImages),
              subtitle: node.data.subtitle ?? '',
              language: type === 'code' ? resolveCodeLanguage(node.data.language) : '',
              buttonLabel: node.data.buttonLabel ?? '',
              url: node.data.url ?? '',
              textStyle: resolveTextStyle(type, node.data.textStyle),
              templateId: node.data.templateId ?? null,
              locked,
              layout: { ...node.data.layout },
            }
          : undefined,
        children: this.decorateTreeNodes(node.children ?? []),
      };
    });
  }

  private removeNodeByKey(
    nodes: TreeNode<EditorNodeData>[],
    key: string,
  ): TreeNode<EditorNodeData>[] {
    return nodes
      .filter((node) => node.key !== key)
      .map((node) => ({
        ...node,
        data: node.data ? { ...node.data } : undefined,
        children: this.removeNodeByKey(node.children ?? [], key),
      }));
  }

  private flattenTreeNodes(nodes: TreeNode<EditorNodeData>[]): TreeNode<EditorNodeData>[] {
    return nodes.flatMap((node) => [node, ...this.flattenTreeNodes(node.children ?? [])]);
  }

  private cloneTreeNodes(nodes: TreeNode<EditorNodeData>[]): TreeNode<EditorNodeData>[] {
    return nodes.map((node) => ({
      ...node,
      data: node.data
        ? {
            ...node.data,
            images: [...node.data.images],
            backgroundImages: resolveBackgroundImages(node.data.backgroundImages),
            subtitle: node.data.subtitle ?? '',
            language: node.data.type === 'code' ? resolveCodeLanguage(node.data.language) : '',
            buttonLabel: node.data.buttonLabel ?? '',
            url: node.data.url ?? '',
            textStyle: resolveTextStyle(node.data.type, node.data.textStyle),
            importSourceKey: node.data.importSourceKey,
            slotId: node.data.slotId,
            templateId: node.data.templateId ?? null,
            helperText: node.data.helperText,
            locked: node.data.locked,
            layout: { ...node.data.layout },
          }
        : undefined,
      children: this.cloneTreeNodes(node.children ?? []),
    }));
  }

  private findNodeByKey(
    nodes: TreeNode<EditorNodeData>[],
    key: string,
  ): TreeNode<EditorNodeData> | null {
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

  private generateNodeKey() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `node-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function clampBackgroundMetric(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
) {
  const normalizedValue = typeof value === 'number' && Number.isFinite(value) ? value : fallback;

  return Math.min(max, Math.max(min, normalizedValue));
}
