import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PageTextData } from '../types';
import { SemanticSegmenter } from './semanticSegmenter';

// Set up worker
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface OutlineItem {
  title: string;
  pageNumber?: number;
  dest?: any;
  items?: OutlineItem[];
}

export const PdfService = {
  async loadDocument(data: ArrayBuffer): Promise<pdfjsLib.PDFDocumentProxy> {
    // Clone buffer because PDF.js might transfer the buffer in worker
    const bufferCopy = data.slice(0);
    const loadingTask = pdfjsLib.getDocument({
      data: bufferCopy,
      cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
      cMapPacked: true,
    });
    return await loadingTask.promise;
  },

  async renderPageToCanvas(
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    canvas: HTMLCanvasElement,
    containerWidth: number = 0,
    userZoom: number = 1.0
  ): Promise<{ width: number; height: number }> {
    const safePage = Math.max(1, Math.min(pageNumber, pdfDoc.numPages));
    const page = await pdfDoc.getPage(safePage);
    const unscaledViewport = page.getViewport({ scale: 1.0 });

    // Calculate fit-to-width scale
    let baseScale = 1.0;
    if (containerWidth > 0) {
      baseScale = containerWidth / unscaledViewport.width;
    } else {
      baseScale = 1.2;
    }

    const actualScale = baseScale * userZoom;

    // Super-sampling density: at least 2.5x to 3.0x density for crystal-clear vector text on mobile
    const devicePixelRatio = window.devicePixelRatio || 1;
    const pixelRatio = Math.max(devicePixelRatio, 2.5);
    const renderViewport = page.getViewport({ scale: actualScale * pixelRatio });

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Cannot get 2d context');

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    // Canvas internal buffer resolution (super-sampled)
    canvas.width = Math.floor(renderViewport.width);
    canvas.height = Math.floor(renderViewport.height);

    // CSS displayed size
    const displayWidth = Math.floor(unscaledViewport.width * actualScale);
    const displayHeight = Math.floor(unscaledViewport.height * actualScale);
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const renderContext = {
      canvasContext: context,
      viewport: renderViewport,
    };

    await page.render(renderContext).promise;
    return { width: displayWidth, height: displayHeight };
  },

  async extractPageText(
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    pageNumber: number
  ): Promise<PageTextData> {
    const safePage = Math.max(1, Math.min(pageNumber, pdfDoc.numPages));
    const page = await pdfDoc.getPage(safePage);
    const textContent = await page.getTextContent();
    
    // Filter valid text items with spatial coordinates
    type RawTextItem = { str: string; transform: number[] };
    const validItems: RawTextItem[] = [];
    for (const item of textContent.items) {
      if ('str' in item && typeof item.str === 'string' && Array.isArray((item as any).transform)) {
        validItems.push(item as RawTextItem);
      }
    }

    if (validItems.length === 0) {
      return {
        pageNumber,
        fullText: '',
        paragraphs: [],
        sentences: ['Trang này không có văn bản hoặc là hình ảnh scan.']
      };
    }

    // Sort items: Y descending (top to bottom of page), then X ascending (left to right)
    validItems.sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5];
      if (Math.abs(yDiff) > 4) {
        return yDiff;
      }
      return a.transform[4] - b.transform[4];
    });

    // Group items into visual lines
    const lines: { y: number; text: string }[] = [];
    let currentLineItems: RawTextItem[] = [];
    let currentLineY: number | null = null;

    for (const item of validItems) {
      const y = item.transform[5];
      if (currentLineY === null) {
        currentLineY = y;
        currentLineItems.push(item);
      } else if (Math.abs(y - currentLineY) <= 4) {
        currentLineItems.push(item);
      } else {
        // Construct line string ensuring spaces between words
        let lineText = '';
        for (const it of currentLineItems) {
          if (!it.str) continue;
          if (lineText.length > 0 && !lineText.endsWith(' ') && !it.str.startsWith(' ')) {
            lineText += ' ';
          }
          lineText += it.str;
        }
        if (lineText.trim()) {
          lines.push({ y: currentLineY, text: lineText.trim() });
        }
        currentLineItems = [item];
        currentLineY = y;
      }
    }

    if (currentLineItems.length > 0 && currentLineY !== null) {
      let lineText = '';
      for (const it of currentLineItems) {
        if (!it.str) continue;
        if (lineText.length > 0 && !lineText.endsWith(' ') && !it.str.startsWith(' ')) {
          lineText += ' ';
        }
        lineText += it.str;
      }
      if (lineText.trim()) {
        lines.push({ y: currentLineY, text: lineText.trim() });
      }
    }

    // Raw complete text preserving line breaks
    const fullText = lines.map(l => l.text).join('\n');

    // Calculate line gaps to detect natural paragraph breaks
    const gaps: number[] = [];
    for (let i = 0; i < lines.length - 1; i++) {
      const gap = lines[i].y - lines[i + 1].y;
      if (gap > 0) gaps.push(gap);
    }
    gaps.sort((a, b) => a - b);
    const medianGap = gaps.length > 0 ? gaps[Math.floor(gaps.length / 2)] : 14;

    // Reconstruct full paragraphs without cutting sentences or dropping content
    const paragraphs: string[] = [];
    if (lines.length > 0) {
      let currentPara = lines[0].text;

      for (let i = 0; i < lines.length - 1; i++) {
        const currentLine = lines[i];
        const nextLine = lines[i + 1];
        const gap = currentLine.y - nextLine.y;

        const isNextBulletOrNumber = /^(\d+[\.\)]|[-•*])\s+/.test(nextLine.text);
        const isCurrentBulletOrColon = /:$/.test(currentLine.text) || /^(\d+[\.\)]|[-•*])\s+/.test(currentLine.text);
        const isSignificantGap = gap > medianGap * 1.35;

        if (isSignificantGap || isNextBulletOrNumber || isCurrentBulletOrColon) {
          paragraphs.push(currentPara);
          currentPara = nextLine.text;
        } else {
          // Connect line to current paragraph with hyphenation handling
          if (currentPara.endsWith('-')) {
            currentPara = currentPara.slice(0, -1) + nextLine.text;
          } else {
            currentPara += ' ' + nextLine.text;
          }
        }
      }

      if (currentPara) {
        paragraphs.push(currentPara);
      }
    }

    // NLP segmenter for TTS playback
    const sentences = SemanticSegmenter.segment(fullText);

    return {
      pageNumber,
      fullText,
      paragraphs: paragraphs.length > 0 ? paragraphs : (fullText ? [fullText] : []),
      sentences: sentences.length > 0 ? sentences : (paragraphs.length > 0 ? paragraphs : [fullText])
    };
  },

  async extractAllPagesText(
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<PageTextData[]> {
    const total = pdfDoc.numPages;
    const pagesData: PageTextData[] = [];

    for (let i = 1; i <= total; i++) {
      try {
        const pageData = await this.extractPageText(pdfDoc, i);
        pagesData.push(pageData);
      } catch (e) {
        console.warn(`Lỗi đọc trang ${i}:`, e);
        pagesData.push({
          pageNumber: i,
          fullText: '',
          paragraphs: [`Trang ${i}`],
          sentences: [`Trang ${i}`]
        });
      }
      onProgress?.(i, total);
    }

    return pagesData;
  },

  async generateThumbnail(pdfDoc: pdfjsLib.PDFDocumentProxy): Promise<string> {
    try {
      const page = await pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: 0.3 }); // Small thumbnail
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return '';

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport
      }).promise;

      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (err) {
      console.warn('Thumbnail generation failed:', err);
      return '';
    }
  },

  async extractOutline(pdfDoc: pdfjsLib.PDFDocumentProxy): Promise<OutlineItem[]> {
    try {
      const outline = await pdfDoc.getOutline();
      if (!outline) return [];
      
      const parsed: OutlineItem[] = [];
      for (const item of outline) {
        let pageNumber: number | undefined;
        if (item.dest) {
          try {
            const pageIndex = await pdfDoc.getPageIndex(item.dest[0]);
            pageNumber = pageIndex + 1;
          } catch {
            // Destination might be custom string or format
          }
        }
        parsed.push({
          title: item.title,
          pageNumber,
          dest: item.dest
        });
      }
      return parsed;
    } catch (e) {
      console.warn('Error reading PDF outline:', e);
      return [];
    }
  }
};
