import { isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { AuthApiService, PortfolioModuleDto } from '../services/auth-api.service';

type ContentType = 'title' | 'description' | 'cv' | 'image' | 'background';

interface ContentOption {
  value: ContentType;
  label: string;
  description: string;
}

type ContentFormGroup = FormGroup<{
  type: FormControl<ContentType>;
  label: FormControl<string>;
  textValue: FormControl<string>;
  colorValue: FormControl<string>;
  fileName: FormControl<string>;
  fileData: FormControl<string>;
  images: FormControl<string[]>;
}>;

interface PdfTextRun {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PdfTextLine {
  y: number;
  height: number;
  runs: PdfTextRun[];
}

@Component({
  selector: 'app-new-portfolio-page',
  imports: [ButtonModule, CardModule, RouterLink, ReactiveFormsModule, InputTextModule, TextareaModule],
  templateUrl: './new-portfolio-page.html',
  styleUrl: './new-portfolio-page.scss'
})
export class NewPortfolioPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authApiService = inject(AuthApiService);

  protected readonly isSubmitting = signal(false);
  protected readonly isExtractingCv = signal(false);
  protected readonly extractionError = signal<string | null>(null);
  protected readonly selectedContentType = signal<ContentType>('title');

  protected readonly contentOptions: ContentOption[] = [
    {
      value: 'title',
      label: 'Titolo',
      description: 'Aggiunge un titolo principale al portfolio.'
    },
    {
      value: 'description',
      label: 'Descrizione',
      description: 'Aggiunge una descrizione o un testo introduttivo.'
    },
    {
      value: 'cv',
      label: 'CV',
      description: 'Carica il curriculum e ricava automaticamente il testo.'
    },
    {
      value: 'image',
      label: 'Immagini',
      description: 'Aggiunge un array di immagini caricabili.'
    },
    {
      value: 'background',
      label: 'Background',
      description: 'Definisce il colore di sfondo del portfolio.'
    }
  ];

  protected readonly portfolioForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required]],
    contents: this.formBuilder.array<ContentFormGroup>([])
  });

  protected readonly slugPreview = computed(() => this.slugify(this.portfolioForm.controls.title.value));

  protected get contentsArray(): FormArray<ContentFormGroup> {
    return this.portfolioForm.controls.contents;
  }

  protected setSelectedContentType(value: string) {
    this.selectedContentType.set(value as ContentType);
  }

  protected addSelectedContent() {
    this.contentsArray.push(this.createContentGroup(this.selectedContentType()));
  }

  protected removeContent(index: number) {
    this.contentsArray.removeAt(index);
  }

  protected trackContent(_index: number, control: ContentFormGroup) {
    return control;
  }

  protected getContentTypeLabel(type: ContentType) {
    return this.contentOptions.find((option) => option.value === type)?.label ?? type;
  }

  protected isType(control: ContentFormGroup, type: ContentType) {
    return control.controls.type.value === type;
  }

  protected async onImagesSelected(index: number, event: Event) {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    const control = this.contentsArray.at(index);
    if (!isPlatformBrowser(this.platformId) || files.length === 0 || !control) {
      return;
    }

    const images = await Promise.all(files.map((file) => this.readFileAsDataUrl(file)));
    control.patchValue({
      images: images.filter((image): image is string => Boolean(image))
    });
  }

  protected async onCvSelected(index: number, event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    const control = this.contentsArray.at(index);
    this.extractionError.set(null);

    if (!isPlatformBrowser(this.platformId) || !file || !control) {
      return;
    }

    this.isExtractingCv.set(true);

    try {
      const [fileData, extractedText] = await Promise.all([
        this.readFileAsDataUrl(file),
        this.extractPdfText(file)
      ]);

      control.patchValue({
        textValue: extractedText,
        fileData: fileData ?? '',
        fileName: file.name
      });
    } catch {
      this.extractionError.set('Non sono riuscito a estrarre il testo dal CV. Puoi riprovare.');
    } finally {
      this.isExtractingCv.set(false);
    }
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

    this.isSubmitting.set(true);

    this.authApiService
      .createPortfolio({
        title,
        modules: this.buildModulesPayload()
      })
      .subscribe({
        next: (portfolio) => {
          this.isSubmitting.set(false);
          void this.router.navigate(['/portfolios', portfolio.slug, 'edit']);
        },
        error: () => {
          this.isSubmitting.set(false);
        }
      });
  }

  private createContentGroup(type: ContentType): ContentFormGroup {
    return new FormGroup({
      type: new FormControl(type, { nonNullable: true }),
      label: new FormControl(this.getContentTypeLabel(type), { nonNullable: true }),
      textValue: new FormControl('', { nonNullable: true }),
      colorValue: new FormControl('#0b1111', { nonNullable: true }),
      fileName: new FormControl('', { nonNullable: true }),
      fileData: new FormControl('', { nonNullable: true }),
      images: new FormControl<string[]>([], { nonNullable: true })
    });
  }

  private buildModulesPayload(): PortfolioModuleDto[] {
    return this.contentsArray.controls.map((control) => {
      const rawValue = control.getRawValue();

      if (rawValue.type === 'image') {
        return {
          type: rawValue.type,
          label: rawValue.label,
          values: rawValue.images
        };
      }

      if (rawValue.type === 'background') {
        return {
          type: rawValue.type,
          label: rawValue.label,
          value: rawValue.colorValue
        };
      }

      if (rawValue.type === 'cv') {
        return {
          type: rawValue.type,
          label: rawValue.label,
          value: rawValue.textValue,
          fileName: rawValue.fileName,
          fileData: rawValue.fileData
        };
      }

      return {
        type: rawValue.type,
        label: rawValue.label,
        value: rawValue.textValue
      };
    });
  }

  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private readFileAsDataUrl(file: File) {
    return new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  private async extractPdfText(file: File) {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/legacy/build/pdf.worker.mjs',
      import.meta.url
    ).toString();

    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    const pagesText: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = this.rebuildPdfPageText(textContent.items);

      if (pageText) {
        pagesText.push(pageText);
      }
    }

    return pagesText.join('\n\n');
  }

  private rebuildPdfPageText(items: unknown[]) {
    const runs = items
      .map((item) => this.toPdfTextRun(item))
      .filter((run): run is PdfTextRun => Boolean(run))
      .sort((left, right) => {
        const yDelta = right.y - left.y;
        if (Math.abs(yDelta) > 0.5) {
          return yDelta;
        }

        return left.x - right.x;
      });

    if (runs.length === 0) {
      return '';
    }

    const lines = this.groupRunsIntoLines(runs);
    const pageMinX = Math.min(...runs.map((run) => run.x));

    return lines
      .map((line, index) => {
        const lineText = this.buildLineText(line, pageMinX);
        if (!lineText) {
          return '';
        }

        if (index === 0) {
          return lineText;
        }

        const previousLine = lines[index - 1];
        const verticalGap = previousLine.y - line.y;
        const expectedLineGap = Math.max(previousLine.height, line.height) * 1.35;

        return verticalGap > expectedLineGap * 1.2 ? `\n${lineText}` : lineText;
      })
      .filter(Boolean)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private toPdfTextRun(item: unknown): PdfTextRun | null {
    if (!item || typeof item !== 'object' || !('str' in item) || !('transform' in item)) {
      return null;
    }

    const pdfItem = item as {
      str?: unknown;
      transform?: unknown;
      width?: unknown;
      height?: unknown;
    };

    const text = typeof pdfItem.str === 'string' ? pdfItem.str : '';
    const transform = Array.isArray(pdfItem.transform) ? pdfItem.transform : [];
    if (!text.trim() || transform.length < 6) {
      return null;
    }

    const x = typeof transform[4] === 'number' ? transform[4] : 0;
    const y = typeof transform[5] === 'number' ? transform[5] : 0;
    const width = typeof pdfItem.width === 'number' ? pdfItem.width : text.length * 6;
    const height = Math.abs(
      typeof pdfItem.height === 'number' ? pdfItem.height : transform[0] || 12
    );

    return {
      text,
      x,
      y,
      width,
      height: height || 12
    };
  }

  private groupRunsIntoLines(runs: PdfTextRun[]) {
    const lines: PdfTextLine[] = [];

    for (const run of runs) {
      const matchingLine = lines.find((line) => {
        const tolerance = Math.max(2.5, Math.min(line.height, run.height) * 0.45);
        return Math.abs(line.y - run.y) <= tolerance;
      });

      if (!matchingLine) {
        lines.push({
          y: run.y,
          height: run.height,
          runs: [run]
        });
        continue;
      }

      matchingLine.runs.push(run);
      matchingLine.y = (matchingLine.y + run.y) / 2;
      matchingLine.height = Math.max(matchingLine.height, run.height);
    }

    return lines
      .map((line) => ({
        ...line,
        runs: [...line.runs].sort((left, right) => left.x - right.x)
      }))
      .sort((left, right) => right.y - left.y);
  }

  private buildLineText(line: PdfTextLine, pageMinX: number) {
    if (line.runs.length === 0) {
      return '';
    }

    const firstRun = line.runs[0];
    const averageCharWidth = this.getAverageCharWidth(line.runs);
    const indentGap = Math.max(0, firstRun.x - pageMinX);
    const indentSpaces =
      indentGap > averageCharWidth * 2
        ? ' '.repeat(Math.min(12, Math.round(indentGap / Math.max(averageCharWidth, 4))))
        : '';

    let text = indentSpaces + firstRun.text.trimEnd();
    let previousRun = firstRun;

    for (const run of line.runs.slice(1)) {
      const previousEnd = previousRun.x + previousRun.width;
      const horizontalGap = Math.max(0, run.x - previousEnd);
      const currentAverageCharWidth = this.getAverageCharWidth([previousRun, run]);

      if (horizontalGap > currentAverageCharWidth * 0.3 && !text.endsWith(' ')) {
        const spaces = Math.max(
          1,
          Math.min(8, Math.round(horizontalGap / Math.max(currentAverageCharWidth, 4)))
        );
        text += ' '.repeat(spaces);
      }

      text += run.text.trimEnd();
      previousRun = run;
    }

    return text.replace(/[ \t]+$/g, '');
  }

  private getAverageCharWidth(runs: PdfTextRun[]) {
    const totalCharacters = runs.reduce(
      (count, run) => count + Math.max(run.text.trim().length, 1),
      0
    );
    const totalWidth = runs.reduce((width, run) => width + Math.max(run.width, run.height * 0.5), 0);

    return totalWidth / Math.max(totalCharacters, 1);
  }
}
