import { Injectable } from '@angular/core';

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

interface PdfPageObjects {
  get(name: string, callback: (data: unknown) => void): void;
}

interface PdfOperatorList {
  fnArray: number[];
  argsArray: unknown[];
}

interface PdfPageProxyLike {
  getTextContent(): Promise<{ items: unknown[] }>;
  getOperatorList(): Promise<PdfOperatorList>;
}

interface PdfPageWithObjects extends PdfPageProxyLike {
  objs?: PdfPageObjects;
}

interface PdfImportedImage {
  width: number;
  height: number;
  bitmap?: ImageBitmap | null;
  data?: Uint8Array | Uint8ClampedArray | null;
}

interface PdfImportResult {
  text: string;
  images: string[];
  tables: string[];
}

@Injectable({
  providedIn: 'root'
})
export class PdfImportService {
  async importCv(file: File): Promise<PdfImportResult> {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/legacy/build/pdf.worker.mjs',
      import.meta.url
    ).toString();

    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const pagesText: string[] = [];
    const pagesImages: string[] = [];
    const pagesTables: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = (await pdf.getPage(pageNumber)) as PdfPageWithObjects;
      const [textContent, pageImages] = await Promise.all([
        page.getTextContent(),
        this.extractPdfPageImages(page, pdfjsLib.OPS)
      ]);
      const pageAnalysis = this.analyzePdfPage(textContent.items);

      if (pageAnalysis.text) {
        pagesText.push(pageAnalysis.text);
      }

      pagesImages.push(...pageImages);
      pagesTables.push(...pageAnalysis.tables);
    }

    return {
      text: pagesText.join('\n\n'),
      images: this.deduplicateImages(pagesImages),
      tables: this.deduplicateTables(pagesTables)
    };
  }

  async readFileAsDataUrl(file: File) {
    return new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  private async extractPdfPageImages(
    page: PdfPageWithObjects,
    ops: {
      paintImageXObject: number;
      paintImageXObjectRepeat: number;
      paintInlineImageXObject: number;
      paintInlineImageXObjectGroup: number;
    }
  ) {
    const operatorList = await page.getOperatorList();
    const pageImages: string[] = [];

    for (let index = 0; index < operatorList.fnArray.length; index++) {
      const fnId = operatorList.fnArray[index];
      const args = Array.isArray(operatorList.argsArray[index])
        ? (operatorList.argsArray[index] as unknown[])
        : [];

      if (fnId === ops.paintImageXObject || fnId === ops.paintImageXObjectRepeat) {
        const objectName = typeof args[0] === 'string' ? args[0] : null;
        if (!objectName) {
          continue;
        }

        const imageObject = await this.resolvePageImageObject(page, objectName);
        const imageDataUrl = this.convertPdfImageToDataUrl(imageObject);
        if (imageDataUrl) {
          pageImages.push(imageDataUrl);
        }
        continue;
      }

      if (fnId === ops.paintInlineImageXObject || fnId === ops.paintInlineImageXObjectGroup) {
        const imageDataUrl = this.convertPdfImageToDataUrl(args[0]);
        if (imageDataUrl) {
          pageImages.push(imageDataUrl);
        }
      }
    }

    return this.deduplicateImages(pageImages);
  }

  private resolvePageImageObject(page: PdfPageWithObjects, objectName: string) {
    return new Promise<unknown>((resolve) => {
      if (!page.objs) {
        resolve(null);
        return;
      }

      try {
        page.objs.get(objectName, (imageObject) => resolve(imageObject ?? null));
      } catch {
        resolve(null);
      }
    });
  }

  private convertPdfImageToDataUrl(imageObject: unknown) {
    const image = this.toPdfImportedImage(imageObject);
    if (!image || image.width < 24 || image.height < 24) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }

    if (typeof ImageBitmap !== 'undefined' && image.bitmap instanceof ImageBitmap) {
      context.drawImage(image.bitmap, 0, 0, image.width, image.height);
      return canvas.toDataURL('image/png');
    }

    if (!(image.data instanceof Uint8Array || image.data instanceof Uint8ClampedArray)) {
      return null;
    }

    const rgbaBuffer = this.normalizeImageBuffer(image.data, image.width, image.height);
    if (!rgbaBuffer) {
      return null;
    }

    if (typeof ImageData === 'undefined') {
      return null;
    }

    const browserSafeBuffer = new Uint8ClampedArray(rgbaBuffer);
    context.putImageData(new ImageData(browserSafeBuffer, image.width, image.height), 0, 0);
    return canvas.toDataURL('image/png');
  }

  private toPdfImportedImage(imageObject: unknown): PdfImportedImage | null {
    if (!imageObject || typeof imageObject !== 'object') {
      return null;
    }

    const image = imageObject as {
      width?: unknown;
      height?: unknown;
      bitmap?: unknown;
      data?: unknown;
    };

    const width = typeof image.width === 'number' ? image.width : 0;
    const height = typeof image.height === 'number' ? image.height : 0;

    if (!width || !height) {
      return null;
    }

    return {
      width,
      height,
      bitmap:
        typeof ImageBitmap !== 'undefined' && image.bitmap instanceof ImageBitmap
          ? image.bitmap
          : null,
      data:
        image.data instanceof Uint8Array || image.data instanceof Uint8ClampedArray
          ? image.data
          : null
    };
  }

  private normalizeImageBuffer(
    source: Uint8Array | Uint8ClampedArray,
    width: number,
    height: number
  ) {
    const pixels = width * height;

    if (source.length === pixels * 4) {
      return source instanceof Uint8ClampedArray ? source : new Uint8ClampedArray(source);
    }

    if (source.length === pixels * 3) {
      const rgba = new Uint8ClampedArray(pixels * 4);
      for (let sourceIndex = 0, targetIndex = 0; sourceIndex < source.length; sourceIndex += 3) {
        rgba[targetIndex++] = source[sourceIndex];
        rgba[targetIndex++] = source[sourceIndex + 1];
        rgba[targetIndex++] = source[sourceIndex + 2];
        rgba[targetIndex++] = 255;
      }
      return rgba;
    }

    if (source.length === pixels) {
      const rgba = new Uint8ClampedArray(pixels * 4);
      for (let sourceIndex = 0, targetIndex = 0; sourceIndex < source.length; sourceIndex++) {
        const grayscale = source[sourceIndex];
        rgba[targetIndex++] = grayscale;
        rgba[targetIndex++] = grayscale;
        rgba[targetIndex++] = grayscale;
        rgba[targetIndex++] = 255;
      }
      return rgba;
    }

    return null;
  }

  private deduplicateImages(images: string[]) {
    return [...new Set(images)];
  }

  private deduplicateTables(tables: string[]) {
    return [...new Set(tables.map((table) => table.trim()).filter(Boolean))];
  }

  private analyzePdfPage(items: unknown[]) {
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
      return {
        text: '',
        tables: []
      };
    }

    const lines = this.groupRunsIntoLines(runs);
    const pageMinX = Math.min(...runs.map((run) => run.x));

    return {
      text: this.rebuildPdfPageText(lines, pageMinX),
      tables: this.extractTablesFromLines(lines)
    };
  }

  private rebuildPdfPageText(lines: PdfTextLine[], pageMinX: number) {
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

  private extractTablesFromLines(lines: PdfTextLine[]) {
    const tables: string[] = [];
    let currentRows: Array<Array<{ text: string; x: number }>> = [];

    for (const line of lines) {
      const cells = this.extractTableCells(line);

      if (cells.length >= 2) {
        if (
          currentRows.length === 0 ||
          this.isCompatibleTableRow(currentRows[currentRows.length - 1], cells)
        ) {
          currentRows.push(cells);
        } else {
          const completedTable = this.serializeDetectedTable(currentRows);
          if (completedTable) {
            tables.push(completedTable);
          }
          currentRows = [cells];
        }
        continue;
      }

      const completedTable = this.serializeDetectedTable(currentRows);
      if (completedTable) {
        tables.push(completedTable);
      }
      currentRows = [];
    }

    const trailingTable = this.serializeDetectedTable(currentRows);
    if (trailingTable) {
      tables.push(trailingTable);
    }

    return tables;
  }

  private extractTableCells(line: PdfTextLine) {
    if (line.runs.length < 2) {
      return [];
    }

    const averageCharWidth = this.getAverageCharWidth(line.runs);
    const cells: Array<{ text: string; x: number }> = [];
    let significantGapCount = 0;

    let currentCell = {
      text: line.runs[0].text.trim(),
      x: line.runs[0].x
    };
    let previousRun = line.runs[0];

    for (const run of line.runs.slice(1)) {
      const previousEnd = previousRun.x + previousRun.width;
      const horizontalGap = Math.max(0, run.x - previousEnd);
      const currentAverageCharWidth = this.getAverageCharWidth([previousRun, run]);

      if (horizontalGap > currentAverageCharWidth * 3.2) {
        if (currentCell.text.trim()) {
          cells.push({
            text: currentCell.text.trim(),
            x: currentCell.x
          });
        }
        currentCell = {
          text: run.text.trim(),
          x: run.x
        };
        significantGapCount++;
      } else {
        currentCell.text = `${currentCell.text}${currentCell.text ? ' ' : ''}${run.text.trim()}`.trim();
      }

      previousRun = run;
    }

    if (currentCell.text.trim()) {
      cells.push({
        text: currentCell.text.trim(),
        x: currentCell.x
      });
    }

    const hasWideColumns =
      cells.length >= 2 &&
      cells.some((cell, index) => index > 0 && cell.x - cells[index - 1].x > averageCharWidth * 8);

    if (significantGapCount === 0 || !hasWideColumns) {
      return [];
    }

    return cells;
  }

  private isCompatibleTableRow(
    previousCells: Array<{ text: string; x: number }>,
    currentCells: Array<{ text: string; x: number }>
  ) {
    if (Math.abs(previousCells.length - currentCells.length) > 1) {
      return false;
    }

    const comparableColumns = Math.min(previousCells.length, currentCells.length);
    let alignedColumns = 0;

    for (let index = 0; index < comparableColumns; index++) {
      if (Math.abs(previousCells[index].x - currentCells[index].x) <= 22) {
        alignedColumns++;
      }
    }

    return alignedColumns >= Math.max(2, comparableColumns - 1);
  }

  private serializeDetectedTable(rows: Array<Array<{ text: string; x: number }>>) {
    if (rows.length < 2) {
      return '';
    }

    const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
    if (columnCount < 2) {
      return '';
    }

    return rows
      .map((row) =>
        Array.from({ length: columnCount }, (_value, index) => row[index]?.text.trim() ?? '').join('\t')
      )
      .join('\n')
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
      const gapRatio = horizontalGap / Math.max(averageCharWidth, 4);
      const separator = gapRatio >= 6 ? '    ' : gapRatio >= 2.4 ? '  ' : ' ';

      text += `${separator}${run.text.trim()}`;
      previousRun = run;
    }

    return text.trimEnd();
  }

  private getAverageCharWidth(runs: PdfTextRun[]) {
    const sizedRuns = runs.filter((run) => run.text.trim().length > 0);
    if (sizedRuns.length === 0) {
      return 6;
    }

    const totalWidth = sizedRuns.reduce(
      (width, run) => width + run.width / Math.max(run.text.trim().length, 1),
      0
    );

    return totalWidth / sizedRuns.length;
  }
}
