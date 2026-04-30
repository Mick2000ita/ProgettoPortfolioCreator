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
  | 'share'
  | 'background';
export type PortfolioLayoutTemplateId =
  | 'artist-3d'
  | 'developer'
  | 'advertising-designer'
  | 'photographer-videomaker'
  | 'ux-ui-designer'
  | 'social-media-manager'
  | 'architect-interior'
  | 'copywriter';

export const DEFAULT_BACKGROUND_COLOR = '#081111';
export const DEFAULT_BACKGROUND_IMAGE_WIDTH = 28;
export const DEFAULT_BACKGROUND_IMAGE_BLUR = 0;
export const DEFAULT_TABLE_BORDER_WIDTH = 1;
export const DEFAULT_TABLE_BORDER_COLOR = '#c8d5c3';
export const DEFAULT_TABLE_CELL_BACKGROUND_COLOR = '#ffffff';
export const DEFAULT_TABLE_HEADER_BACKGROUND_COLOR = '#e8f1e3';
export const DEFAULT_TABLE_TEXT_COLOR = '#151713';
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

export type SharePlatformId =
  | 'linkedin'
  | 'x'
  | 'whatsapp'
  | 'telegram'
  | 'facebook';

export interface SharePlatformOption {
  id: SharePlatformId;
  label: string;
  iconPath?: string;
}

export interface ShareEntry {
  platformId: SharePlatformId;
  value: string;
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
  tableBorderColor?: string;
  tableCellBackgroundColor?: string;
  tableHeaderBackgroundColor?: string;
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
    tableBorderColor: type === 'table' ? DEFAULT_TABLE_BORDER_COLOR : undefined,
    tableCellBackgroundColor: type === 'table' ? DEFAULT_TABLE_CELL_BACKGROUND_COLOR : undefined,
    tableHeaderBackgroundColor:
      type === 'table' ? DEFAULT_TABLE_HEADER_BACKGROUND_COLOR : undefined,
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
    textColor:
      textStyle?.textColor ?? defaultStyle.textColor ?? (type === 'table' ? DEFAULT_TABLE_TEXT_COLOR : ''),
    textAlign: textStyle?.textAlign ?? defaultStyle.textAlign ?? 'left',
    verticalAlign: textStyle?.verticalAlign ?? defaultStyle.verticalAlign ?? 'start',
    bold: textStyle?.bold ?? defaultStyle.bold ?? false,
    italic: textStyle?.italic ?? defaultStyle.italic ?? false,
    tableBorderWidth: resolvedTableBorderWidth,
    tableBorderColor:
      textStyle?.tableBorderColor ??
      defaultStyle.tableBorderColor ??
      DEFAULT_TABLE_BORDER_COLOR,
    tableCellBackgroundColor:
      textStyle?.tableCellBackgroundColor ??
      defaultStyle.tableCellBackgroundColor ??
      DEFAULT_TABLE_CELL_BACKGROUND_COLOR,
    tableHeaderBackgroundColor:
      textStyle?.tableHeaderBackgroundColor ??
      defaultStyle.tableHeaderBackgroundColor ??
      DEFAULT_TABLE_HEADER_BACKGROUND_COLOR,
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
    value: 'share',
    label: 'Share',
    description: 'Pulsanti pronti per condividere il portfolio sui social principali.',
    icon: 'pi pi-share-alt',
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

export const SHARE_PLATFORM_OPTIONS: SharePlatformOption[] = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    iconPath:
      'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.12 20.452H3.555V9H7.12v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  {
    id: 'x',
    label: 'X',
    iconPath:
      'M18.901 1.153h3.68l-8.04 9.19L24 22.847h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932L18.901 1.153Zm-1.291 19.49h2.039L6.486 3.25H4.298L17.61 20.643Z',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    iconPath:
      'M20.52 3.449A11.77 11.77 0 0 0 12.004 0C5.495 0 .196 5.299.196 11.808c0 2.084.544 4.118 1.579 5.91L0 24l6.461-1.696a11.81 11.81 0 0 0 5.543 1.411h.005c6.507 0 11.806-5.299 11.806-11.808a11.73 11.73 0 0 0-3.295-8.458Zm-8.516 18.27h-.004a9.8 9.8 0 0 1-4.989-1.369l-.358-.213-3.833 1.006 1.022-3.709-.233-.372a9.79 9.79 0 0 1-1.516-5.226c0-5.4 4.394-9.794 9.799-9.794 2.615 0 5.073 1.019 6.923 2.868a9.75 9.75 0 0 1 2.87 6.926c-.003 5.402-4.397 9.797-9.794 9.797Zm5.37-7.348c-.294-.147-1.737-.857-2.006-.955-.268-.098-.463-.147-.658.147-.195.294-.756.955-.927 1.151-.171.195-.342.22-.636.073-.294-.147-1.24-.457-2.362-1.458-.873-.778-1.462-1.737-1.633-2.031-.171-.294-.018-.453.129-.6.132-.131.294-.342.441-.513.147-.171.195-.294.294-.489.098-.195.049-.367-.024-.513-.073-.147-.658-1.59-.902-2.178-.237-.57-.478-.492-.658-.501l-.562-.01c-.195 0-.513.073-.782.367-.268.294-1.026 1.004-1.026 2.447 0 1.443 1.05 2.837 1.196 3.033.147.195 2.068 3.159 5.01 4.428.7.302 1.246.482 1.672.617.703.224 1.343.192 1.849.116.564-.084 1.737-.71 1.982-1.394.244-.684.244-1.271.171-1.394-.073-.122-.268-.195-.562-.342Z',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    iconPath:
      'M23.998 4.362c-.09.754-.337 2.686-.584 4.696-.383 3.089-.798 6.474-.798 6.474-.069.562-.483 1.052-1.061 1.105-.123.014-.247.014-.37.014-.808 0-1.421-.389-2.023-.779-.462-.298-.91-.586-1.454-.646-.707-.078-1.243.183-1.874.852-.706.749-1.099 1.176-1.99 2.134-.34.365-.659.709-1.029 1.103-.293.312-.586.65-1.013.65-.192 0-.423-.068-.708-.228l.108-3.476.108-3.476-6.276-1.783c-1.361-.39-1.387-.39-1.55-.484-.357-.205-.484-.476-.484-.779 0-.136.028-.277.084-.422.213-.554.808-.807 1.575-1.084.108-.039 7.54-3.01 16.515-6.749.375-.156.714-.225 1.018-.225.319 0 .598.076.836.223.235.145.411.351.515.611.105.259.137.575.097.946Z',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    iconPath:
      'M22.675 0h-21.35C.595 0 0 .595 0 1.326v21.348C0 23.405.595 24 1.326 24H12.82v-9.294H9.69v-3.622h3.13V8.413c0-3.1 1.894-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.312h3.587l-.467 3.622h-3.12V24h6.116C23.405 24 24 23.405 24 22.674V1.326C24 .595 23.405 0 22.675 0z',
  },
];

const SHARE_PLATFORM_ID_SET = new Set<SharePlatformId>(
  SHARE_PLATFORM_OPTIONS.map((platform) => platform.id),
);

export function parseShareEntries(value?: string | null): ShareEntry[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as Array<Partial<ShareEntry>> | null;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (entry): entry is Partial<ShareEntry> & { platformId: SharePlatformId; value: string } =>
          typeof entry?.platformId === 'string' &&
          SHARE_PLATFORM_ID_SET.has(entry.platformId as SharePlatformId) &&
          typeof entry.value === 'string',
      )
      .map((entry) => ({
        platformId: entry.platformId,
        value: entry.value,
      }));
  } catch {
    return [];
  }
}

export function serializeShareEntries(entries: ShareEntry[]) {
  return JSON.stringify(
    entries
      .map((entry) => ({
        platformId: entry.platformId,
        value: entry.value.trim(),
      }))
      .filter((entry) => entry.value.length > 0),
  );
}

export function resolveSharePlatformHref(platformId: SharePlatformId, value?: string | null) {
  const normalizedValue = value?.trim() ?? '';
  if (!normalizedValue) {
    return null;
  }

  if (platformId === 'whatsapp') {
    const normalizedPhone = normalizedValue.replace(/\D/g, '');
    return normalizedPhone ? `https://wa.me/${normalizedPhone}` : null;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(normalizedValue)) {
    return normalizedValue;
  }

  return `https://${normalizedValue}`;
}

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
    id: 'artist-3d',
    name: '3D Artist',
    description:
      'Una vetrina visuale per showreel, asset, render finali, breakdown tecnici e contatto.',
    accent: 'linear-gradient(135deg, #18a5a7 0%, #f4d35e 100%)',
    preview: 'Hero render + gallery + breakdown + CTA',
    backgroundColor: '#071315',
    slots: [
      {
        id: 'artist-title',
        type: 'title',
        label: 'Specializzazione',
        helperText: 'Apri con ruolo, ambito 3D e stile dei lavori che vuoi vendere.',
        layout: { columnStart: 1, rowStart: 1, columnSpan: 7, rowSpan: 2 },
      },
      {
        id: 'artist-positioning',
        type: 'description',
        label: 'Approccio',
        helperText: 'Racconta pipeline, tipo di produzioni e valore creativo in poche righe.',
        layout: { columnStart: 1, rowStart: 3, columnSpan: 5, rowSpan: 4 },
      },
      {
        id: 'hero-render',
        type: 'image',
        label: 'Render hero',
        helperText: 'Carica il render piu forte o un frame showreel da usare come apertura.',
        layout: { columnStart: 8, rowStart: 1, columnSpan: 5, rowSpan: 6 },
      },
      {
        id: 'asset-gallery',
        type: 'carousel',
        label: 'Gallery lavori',
        helperText: 'Aggiungi render finali, clay render, turntable frame o close-up degli asset.',
        layout: { columnStart: 7, rowStart: 7, columnSpan: 6, rowSpan: 4 },
      },
      {
        id: 'technical-breakdown',
        type: 'table',
        label: 'Breakdown tecnico',
        helperText: 'Usa ; per separare software, task, output o note di produzione.',
        defaultTextValue:
          'Software;Uso;Output\nBlender;Modeling e lighting;Render finali\nSubstance;Texture PBR;Material library\nUnreal Engine;Lookdev realtime;Scene interactive',
        layout: { columnStart: 1, rowStart: 8, columnSpan: 6, rowSpan: 5 },
      },
      {
        id: 'artist-cta',
        type: 'cta',
        label: 'Contatto produzione',
        helperText: 'Chiudi con disponibilita, tipo di commissioni e link di contatto.',
        defaultTextValue: 'Disponibile per asset, visual product, environment e contenuti realtime.',
        defaultButtonLabel: 'Richiedi una reel',
        defaultUrl: 'mailto:hello@example.com',
        layout: { columnStart: 1, rowStart: 13, columnSpan: 12, rowSpan: 3 },
      },
    ],
  },
  {
    id: 'developer',
    name: 'Programmatore',
    description:
      'Un layout tecnico per progetti software: ruolo, stack, snippet, risultati e repository.',
    accent: 'linear-gradient(135deg, #5eead4 0%, #2563eb 100%)',
    preview: 'Headline + stack + codice + metriche',
    backgroundColor: '#07111f',
    slots: [
      {
        id: 'developer-title',
        type: 'title',
        label: 'Ruolo tecnico',
        helperText: 'Presenta stack principale, seniority o ambito: frontend, backend, full stack.',
        layout: { columnStart: 1, rowStart: 1, columnSpan: 8, rowSpan: 2 },
      },
      {
        id: 'developer-summary',
        type: 'description',
        label: 'Profilo',
        helperText: 'Riassumi cosa costruisci, come lavori e quali problemi risolvi.',
        layout: { columnStart: 1, rowStart: 3, columnSpan: 4, rowSpan: 4 },
      },
      {
        id: 'developer-stats',
        type: 'stats',
        label: 'Impatto',
        helperText: 'Inserisci numeri tecnici o di prodotto nel formato Valore;Etichetta;Contesto.',
        defaultTextValue:
          '35%;Build piu veloci;CI ottimizzata\n99.9%;Uptime;Servizi monitorati\n12;Feature rilasciate;Ultimo trimestre',
        layout: { columnStart: 5, rowStart: 3, columnSpan: 8, rowSpan: 4 },
      },
      {
        id: 'stack-table',
        type: 'table',
        label: 'Stack',
        helperText: 'Usa ; per separare area, tecnologie e livello di confidenza.',
        defaultTextValue:
          'Area;Tecnologie;Focus\nFrontend;Angular, TypeScript, SCSS;UI scalabili\nBackend;Java, Spring, PostgreSQL;API e dominio\nDevOps;Docker, CI, logging;Rilascio e osservabilita',
        layout: { columnStart: 1, rowStart: 7, columnSpan: 6, rowSpan: 5 },
      },
      {
        id: 'code-sample',
        type: 'code',
        label: 'Snippet',
        helperText: 'Inserisci un estratto breve e leggibile che mostri stile e competenza.',
        defaultTextValue:
          'export function buildFeatureFlag(key: string, enabled: boolean) {\n  return { key, enabled, updatedAt: new Date().toISOString() };\n}',
        layout: { columnStart: 7, rowStart: 7, columnSpan: 6, rowSpan: 6 },
      },
      {
        id: 'developer-cta',
        type: 'cta',
        label: 'Repository o contatto',
        helperText: 'Porta verso GitHub, demo, calendario o email.',
        defaultTextValue: 'Aperto a prodotti SaaS, piattaforme interne e team engineering-oriented.',
        defaultButtonLabel: 'Guarda il codice',
        defaultUrl: 'https://github.com/',
        layout: { columnStart: 1, rowStart: 12, columnSpan: 12, rowSpan: 4 },
      },
    ],
  },
  {
    id: 'advertising-designer',
    name: 'Grafico pubblicitario',
    description:
      'Una presentazione da campagna per visual identity, ADV, social kit, risultati e servizi.',
    accent: 'linear-gradient(135deg, #ff4d6d 0%, #ffd166 100%)',
    preview: 'Key visual + campagna + deliverable + CTA',
    backgroundColor: '#190b12',
    slots: [
      {
        id: 'designer-title',
        type: 'title',
        label: 'Headline creativa',
        helperText: 'Apri con posizionamento, stile e tipo di brand o campagne curate.',
        layout: { columnStart: 1, rowStart: 1, columnSpan: 7, rowSpan: 2 },
      },
      {
        id: 'campaign-intro',
        type: 'description',
        label: 'Direzione creativa',
        helperText: 'Spiega concept, target e approccio visivo con un tono chiaro e commerciale.',
        layout: { columnStart: 1, rowStart: 3, columnSpan: 5, rowSpan: 4 },
      },
      {
        id: 'key-visual',
        type: 'image',
        label: 'Key visual',
        helperText: 'Carica il visual principale della campagna o una composizione brand forte.',
        layout: { columnStart: 7, rowStart: 1, columnSpan: 6, rowSpan: 8 },
      },
      {
        id: 'campaign-gallery',
        type: 'carousel',
        label: 'Asset campagna',
        helperText: 'Aggiungi mockup, social post, affissioni, packaging o varianti formato.',
        layout: { columnStart: 1, rowStart: 8, columnSpan: 6, rowSpan: 5 },
      },
      {
        id: 'deliverables-table',
        type: 'table',
        label: 'Deliverable',
        helperText: 'Usa ; per separare formato, canale e obiettivo creativo.',
        defaultTextValue:
          'Formato;Canale;Obiettivo\nKey visual;OOH e web;Riconoscibilita\nSocial kit;Instagram e LinkedIn;Conversione\nBrand assets;Sales deck e landing;Coerenza visuale',
        layout: { columnStart: 7, rowStart: 9, columnSpan: 6, rowSpan: 4 },
      },
      {
        id: 'designer-cta',
        type: 'cta',
        label: 'Brief o preventivo',
        helperText: 'Chiudi con un invito a inviare brief, richiesta campagna o contatto.',
        defaultTextValue: 'Pronto per campagne, rebranding leggeri, social kit e visual di lancio.',
        defaultButtonLabel: 'Invia un brief',
        defaultUrl: 'mailto:hello@example.com',
        layout: { columnStart: 1, rowStart: 13, columnSpan: 12, rowSpan: 3 },
      },
    ],
  },
  {
    id: 'photographer-videomaker',
    name: 'Fotografo / Videomaker',
    description:
      'Un portfolio visivo per shooting, video, eventi, reportage, post-produzione e richieste di preventivo.',
    accent: 'linear-gradient(135deg, #111827 0%, #f97316 100%)',
    preview: 'Cover + gallery + pacchetti + CTA',
    backgroundColor: '#0f1014',
    slots: [
      {
        id: 'photo-title',
        type: 'title',
        label: 'Firma visiva',
        helperText: 'Presenta stile, nicchia e tipo di produzioni: eventi, brand, food, moda, video.',
        layout: { columnStart: 1, rowStart: 1, columnSpan: 7, rowSpan: 2 },
      },
      {
        id: 'photo-intro',
        type: 'description',
        label: 'Stile e servizi',
        helperText: 'Descrivi approccio, tempi di consegna, tono visivo e cosa include il servizio.',
        layout: { columnStart: 1, rowStart: 3, columnSpan: 5, rowSpan: 4 },
      },
      {
        id: 'photo-cover',
        type: 'image',
        label: 'Cover selezionata',
        helperText: 'Carica lo scatto o frame piu rappresentativo come apertura.',
        layout: { columnStart: 8, rowStart: 1, columnSpan: 5, rowSpan: 6 },
      },
      {
        id: 'photo-gallery',
        type: 'carousel',
        label: 'Gallery',
        helperText: 'Aggiungi una selezione curata di scatti, frame video o backstage.',
        layout: { columnStart: 1, rowStart: 8, columnSpan: 7, rowSpan: 6 },
      },
      {
        id: 'photo-packages',
        type: 'table',
        label: 'Pacchetti',
        helperText: 'Usa ; per separare servizio, durata, consegna o note commerciali.',
        defaultTextValue:
          'Servizio;Durata;Consegna\nShooting brand;Mezza giornata;30 foto editate\nEvento;Full day;Gallery online\nVideo short;1 giornata;3 reel verticali',
        layout: { columnStart: 8, rowStart: 8, columnSpan: 5, rowSpan: 5 },
      },
      {
        id: 'photo-cta',
        type: 'cta',
        label: 'Richiesta shooting',
        helperText: 'Chiudi con un invito a prenotare una call o inviare un brief.',
        defaultTextValue: 'Disponibile per shooting commerciali, eventi, contenuti social e video brevi.',
        defaultButtonLabel: 'Richiedi disponibilita',
        defaultUrl: 'mailto:hello@example.com',
        layout: { columnStart: 1, rowStart: 14, columnSpan: 12, rowSpan: 3 },
      },
    ],
  },
  {
    id: 'ux-ui-designer',
    name: 'UX/UI Designer',
    description:
      'Un layout da case study di prodotto con problema, processo, schermate, metriche e impatto.',
    accent: 'linear-gradient(135deg, #8b5cf6 0%, #14b8a6 100%)',
    preview: 'Problema + process + UI + risultati',
    backgroundColor: '#100f1f',
    slots: [
      {
        id: 'ux-title',
        type: 'title',
        label: 'Prodotto o ruolo',
        helperText: 'Apri con prodotto, ruolo UX/UI e contesto del progetto.',
        layout: { columnStart: 1, rowStart: 1, columnSpan: 8, rowSpan: 2 },
      },
      {
        id: 'ux-problem',
        type: 'description',
        label: 'Problema',
        helperText: 'Sintetizza obiettivo, utenti, vincoli e responsabilita nel progetto.',
        layout: { columnStart: 1, rowStart: 3, columnSpan: 4, rowSpan: 4 },
      },
      {
        id: 'ux-results',
        type: 'stats',
        label: 'Risultati',
        helperText: 'Inserisci metriche nel formato Valore;Etichetta;Contesto.',
        defaultTextValue:
          '28%;Task time ridotto;Test utenti\n18%;Conversione onboarding;Release MVP\n4.7/5;Usability score;Survey finale',
        layout: { columnStart: 5, rowStart: 3, columnSpan: 8, rowSpan: 4 },
      },
      {
        id: 'ux-screens',
        type: 'carousel',
        label: 'Schermate',
        helperText: 'Carica wireframe, UI finali, flow, prototipi o varianti responsive.',
        layout: { columnStart: 1, rowStart: 8, columnSpan: 7, rowSpan: 6 },
      },
      {
        id: 'ux-process',
        type: 'table',
        label: 'Processo',
        helperText: 'Usa ; per separare fase, attivita e output prodotto.',
        defaultTextValue:
          'Fase;Attivita;Output\nResearch;Interviste e benchmark;Insight prioritari\nDesign;Wireframe e UI kit;Prototype Figma\nValidate;Test moderati;Iterazioni',
        layout: { columnStart: 8, rowStart: 8, columnSpan: 5, rowSpan: 5 },
      },
      {
        id: 'ux-cta',
        type: 'cta',
        label: 'Demo o contatto',
        helperText: 'Porta verso prototipo, case study completo o richiesta di collaborazione.',
        defaultTextValue: 'Progetto interfacce chiare per prodotti digitali, SaaS e servizi complessi.',
        defaultButtonLabel: 'Apri il prototipo',
        defaultUrl: 'https://figma.com/',
        layout: { columnStart: 1, rowStart: 14, columnSpan: 12, rowSpan: 3 },
      },
    ],
  },
  {
    id: 'social-media-manager',
    name: 'Social Media Manager',
    description:
      'Una presentazione per calendari editoriali, campagne, performance, format e gestione canali.',
    accent: 'linear-gradient(135deg, #06b6d4 0%, #f43f5e 100%)',
    preview: 'Strategia + format + KPI + contatto',
    backgroundColor: '#0a1220',
    slots: [
      {
        id: 'social-title',
        type: 'title',
        label: 'Specializzazione social',
        helperText: 'Indica nicchia, canali gestiti e tipo di crescita o campagne curate.',
        layout: { columnStart: 1, rowStart: 1, columnSpan: 7, rowSpan: 2 },
      },
      {
        id: 'social-strategy',
        type: 'description',
        label: 'Strategia',
        helperText: 'Racconta metodo: analisi, piano editoriale, community, campagne e report.',
        layout: { columnStart: 1, rowStart: 3, columnSpan: 5, rowSpan: 4 },
      },
      {
        id: 'social-visual',
        type: 'image',
        label: 'Campaign visual',
        helperText: 'Carica una cover campagna, griglia feed o mockup social.',
        layout: { columnStart: 8, rowStart: 1, columnSpan: 5, rowSpan: 6 },
      },
      {
        id: 'social-kpi',
        type: 'stats',
        label: 'KPI',
        helperText: 'Inserisci risultati nel formato Valore;Etichetta;Contesto.',
        defaultTextValue:
          '+64%;Reach organica;90 giorni\n3.8%;Engagement rate;Instagram\n41%;Lead da social;Campagna lancio',
        layout: { columnStart: 1, rowStart: 8, columnSpan: 6, rowSpan: 5 },
      },
      {
        id: 'social-formats',
        type: 'table',
        label: 'Format editoriali',
        helperText: 'Usa ; per separare formato, canale e obiettivo.',
        defaultTextValue:
          'Format;Canale;Obiettivo\nReel tutorial;Instagram/TikTok;Awareness\nCarousel insight;LinkedIn;Authority\nStories Q&A;Instagram;Community',
        layout: { columnStart: 7, rowStart: 8, columnSpan: 6, rowSpan: 5 },
      },
      {
        id: 'social-cta',
        type: 'cta',
        label: 'Audit o piano editoriale',
        helperText: 'Invita a richiedere audit, preventivo o piano per il prossimo lancio.',
        defaultTextValue: 'Costruisco piani editoriali misurabili per brand, creator e attivita locali.',
        defaultButtonLabel: 'Richiedi un audit',
        defaultUrl: 'mailto:hello@example.com',
        layout: { columnStart: 1, rowStart: 14, columnSpan: 12, rowSpan: 3 },
      },
    ],
  },
  {
    id: 'architect-interior',
    name: 'Architetto / Interior',
    description:
      'Un layout per progetti abitativi, commerciali o hospitality con concept, render, tavole e servizi.',
    accent: 'linear-gradient(135deg, #64748b 0%, #d6a85f 100%)',
    preview: 'Concept + render + tavole + servizi',
    backgroundColor: '#12100c',
    slots: [
      {
        id: 'architect-title',
        type: 'title',
        label: 'Studio o focus',
        helperText: 'Presenta ambito: interni, retail, residenziale, hospitality o ristrutturazioni.',
        layout: { columnStart: 1, rowStart: 1, columnSpan: 7, rowSpan: 2 },
      },
      {
        id: 'architect-concept',
        type: 'description',
        label: 'Concept',
        helperText: 'Descrivi filosofia progettuale, materiali, vincoli e tipo di committenza.',
        layout: { columnStart: 1, rowStart: 3, columnSpan: 5, rowSpan: 4 },
      },
      {
        id: 'architect-render',
        type: 'image',
        label: 'Render principale',
        helperText: 'Carica render, fotografia di progetto o vista principale.',
        layout: { columnStart: 8, rowStart: 1, columnSpan: 5, rowSpan: 6 },
      },
      {
        id: 'architect-gallery',
        type: 'carousel',
        label: 'Tavole e dettagli',
        helperText: 'Aggiungi planimetrie, moodboard, dettagli materiali o viste alternative.',
        layout: { columnStart: 1, rowStart: 8, columnSpan: 7, rowSpan: 6 },
      },
      {
        id: 'architect-services',
        type: 'table',
        label: 'Servizi',
        helperText: 'Usa ; per separare servizio, fase e deliverable.',
        defaultTextValue:
          'Servizio;Fase;Deliverable\nConcept;Preliminare;Moodboard e layout\nProgetto esecutivo;Sviluppo;Tavole tecniche\nDirezione artistica;Cantiere;Scelte materiali',
        layout: { columnStart: 8, rowStart: 8, columnSpan: 5, rowSpan: 5 },
      },
      {
        id: 'architect-cta',
        type: 'cta',
        label: 'Prima consulenza',
        helperText: 'Chiudi con una richiesta di sopralluogo, call o brief iniziale.',
        defaultTextValue: 'Disponibile per residenziale, retail e spazi hospitality su misura.',
        defaultButtonLabel: 'Prenota una consulenza',
        defaultUrl: 'mailto:hello@example.com',
        layout: { columnStart: 1, rowStart: 14, columnSpan: 12, rowSpan: 3 },
      },
    ],
  },
  {
    id: 'copywriter',
    name: 'Copywriter',
    description:
      'Un portfolio testuale per brand voice, campagne, landing page, naming, email e risultati.',
    accent: 'linear-gradient(135deg, #334155 0%, #a7f3d0 100%)',
    preview: 'Voice + esempi copy + risultati + CTA',
    backgroundColor: '#0e1412',
    slots: [
      {
        id: 'copy-title',
        type: 'title',
        label: 'Posizionamento',
        helperText: 'Apri con specializzazione: brand voice, conversion copy, naming o contenuti.',
        layout: { columnStart: 1, rowStart: 1, columnSpan: 8, rowSpan: 2 },
      },
      {
        id: 'copy-intro',
        type: 'description',
        label: 'Metodo',
        helperText: 'Spiega ricerca, tono di voce, strategia e tipo di clienti serviti.',
        layout: { columnStart: 1, rowStart: 3, columnSpan: 4, rowSpan: 4 },
      },
      {
        id: 'copy-quote',
        type: 'quote',
        label: 'Headline campione',
        helperText: 'Inserisci una riga forte da usare come esempio di tono.',
        defaultTextValue: 'Scrivere meno, far capire prima, far scegliere meglio.',
        defaultSubtitle: 'Esempio di brand voice',
        layout: { columnStart: 5, rowStart: 3, columnSpan: 8, rowSpan: 4 },
      },
      {
        id: 'copy-samples',
        type: 'table',
        label: 'Esempi copy',
        helperText: 'Usa ; per separare progetto, formato e obiettivo.',
        defaultTextValue:
          'Progetto;Formato;Obiettivo\nSaaS B2B;Landing page;Lead demo\nFood brand;Naming e payoff;Lancio prodotto\nEcommerce;Email flow;Recupero carrello',
        layout: { columnStart: 1, rowStart: 8, columnSpan: 6, rowSpan: 5 },
      },
      {
        id: 'copy-results',
        type: 'stats',
        label: 'Risultati',
        helperText: 'Inserisci risultati nel formato Valore;Etichetta;Contesto.',
        defaultTextValue:
          '+22%;CTR email;Flow onboarding\n-18%;Abbandono landing;Test A/B\n3;Naming approvati;Sprint brand',
        layout: { columnStart: 7, rowStart: 8, columnSpan: 6, rowSpan: 5 },
      },
      {
        id: 'copy-cta',
        type: 'cta',
        label: 'Brief copy',
        helperText: 'Invita a inviare brief, prenotare call o richiedere audit dei testi.',
        defaultTextValue: 'Aiuto brand e prodotti digitali a trovare parole piu chiare e vendibili.',
        defaultButtonLabel: 'Mandami un brief',
        defaultUrl: 'mailto:hello@example.com',
        layout: { columnStart: 1, rowStart: 14, columnSpan: 12, rowSpan: 3 },
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
    if (type === 'cv') {
      return 'CV';
    }

    return PORTFOLIO_EDITOR_CONTENT_OPTIONS.find((option) => option.value === type)?.label ?? type;
  }

  getTreeNodeIcon(type: ContentType) {
    if (type === 'cv') {
      return 'pi pi-file-pdf';
    }

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
      case 'share':
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
