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
import { PdfImportService } from '../services/pdf-import.service';

type ContentType = 'title' | 'description' | 'cv' | 'image' | 'table' | 'background';

const DEFAULT_BACKGROUND_COLOR = '#081111';

interface ContentOption {
  value: ContentType;
  label: string;
  description: string;
}

type ContentFormGroup = FormGroup<{
  id: FormControl<string>;
  importSourceId: FormControl<string>;
  type: FormControl<ContentType>;
  label: FormControl<string>;
  textValue: FormControl<string>;
  colorValue: FormControl<string>;
  fileName: FormControl<string>;
  fileData: FormControl<string>;
  images: FormControl<string[]>;
}>;

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
  private readonly pdfImportService = inject(PdfImportService);

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
      value: 'table',
      label: 'Tabella',
      description: 'Aggiunge una tabella modificabile.'
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

    const images = await Promise.all(
      files.map((file) => this.pdfImportService.readFileAsDataUrl(file))
    );
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
      const [fileData, importedCv] = await Promise.all([
        this.pdfImportService.readFileAsDataUrl(file),
        this.pdfImportService.importCv(file)
      ]);

      control.patchValue({
        textValue: importedCv.text,
        fileData: fileData ?? '',
        fileName: file.name
      });
      this.syncImportedCvAssets(index, control.controls.id.value, importedCv.images, importedCv.tables);
    } catch {
      this.extractionError.set(
        'Non sono riuscito a importare correttamente il CV. Puoi riprovare con un altro PDF.'
      );
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
      id: new FormControl(this.generateContentId(), { nonNullable: true }),
      importSourceId: new FormControl('', { nonNullable: true }),
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
    }).concat({
      type: 'background',
      label: 'Background',
      value: DEFAULT_BACKGROUND_COLOR
    });
  }

  private syncImportedCvAssets(
    sourceIndex: number,
    sourceId: string,
    images: string[],
    tables: string[]
  ) {
    const importPrefix = `${sourceId}:`;
    const importedAssets = [
      ...images.map((image, index) => ({
        importSourceId: `${sourceId}:image:${index}`,
        type: 'image' as const,
        label: `Immagine CV ${index + 1}`,
        images: [image],
        textValue: ''
      })),
      ...tables.map((table, index) => ({
        importSourceId: `${sourceId}:table:${index}`,
        type: 'table' as const,
        label: `Tabella CV ${index + 1}`,
        images: [] as string[],
        textValue: table
      }))
    ];

    const existingImportedControls = this.contentsArray.controls.filter((control) => {
      const importSourceId = control.controls.importSourceId.value;
      return importSourceId === sourceId || importSourceId.startsWith(importPrefix);
    });
    const existingImportedControlMap = new Map(
      existingImportedControls.map((control) => [control.controls.importSourceId.value, control])
    );

    for (let index = this.contentsArray.length - 1; index >= 0; index--) {
      const importSourceId = this.contentsArray.at(index)?.controls.importSourceId.value ?? '';
      if (importSourceId === sourceId || importSourceId.startsWith(importPrefix)) {
        this.contentsArray.removeAt(index);
      }
    }

    importedAssets.forEach((asset, assetIndex) => {
      const control = existingImportedControlMap.get(asset.importSourceId) ?? this.createContentGroup(asset.type);
      control.patchValue({
        importSourceId: asset.importSourceId,
        label: asset.label,
        textValue: asset.textValue,
        images: asset.images
      });
      this.contentsArray.insert(sourceIndex + assetIndex + 1, control);
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

  private generateContentId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `content-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
