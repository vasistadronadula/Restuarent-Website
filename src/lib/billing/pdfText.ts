import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import * as fontkit from 'fontkit';
import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';

const files = [
  '@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff',
  '@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff',
  '@fontsource/ramabhadra/files/ramabhadra-telugu-400-normal.woff',
  '@fontsource/noto-sans/files/noto-sans-devanagari-400-normal.woff',
];
let fontBytes: Promise<Buffer[]> | undefined;
const segmenter = new Intl.Segmenter('te', { granularity: 'grapheme' });
const graphemes = (text: string) => Array.from(segmenter.segment(text), part => part.segment);

/** Embedded fonts avoid WinAnsi errors for Telugu/Hindi names and Unicode
 * punctuation. Fallback is per grapheme so Indic combining marks stay together. */
export async function createPdfText(doc: PDFDocument) {
  type PdfFontkit = Parameters<PDFDocument['registerFontkit']>[0];
  doc.registerFontkit({ create: bytes => {
    const font = fontkit.create(Buffer.from(bytes));
    if ('fonts' in font) throw new Error('Receipt font must be a single font');
    const createSubset = font.createSubset.bind(font);
    // pdf-lib expects fontkit 1's streaming subset API; fontkit 2 returns
    // the same encoded font bytes directly. Keep that compatibility local.
    font.createSubset = () => {
      const subset = createSubset();
      return Object.assign(subset, { encodeStream: () => Readable.from([subset.encode()]) });
    };
    return font as unknown as ReturnType<PdfFontkit['create']>;
  } });
  fontBytes ??= Promise.all(files.map(file => readFile(path.join(process.cwd(), 'node_modules', file))))
    .catch(error => { fontBytes = undefined; throw error; });
  const fonts = await Promise.all((await fontBytes).map(bytes => doc.embedFont(bytes, { subset: true })));
  const characterSets = new Map(fonts.map(font => [font, new Set(font.getCharacterSet())]));

  function runs(value: string, bold: boolean) {
    const preferred = bold ? [fonts[1], fonts[2], fonts[3], fonts[0]] : [fonts[0], fonts[2], fonts[3]];
    const result: { text: string; font: PDFFont }[] = [];
    const clean = Array.from(value).map(char => (char.codePointAt(0)! < 32 || char === '\u007f') ? ' ' : char).join('');
    for (const cluster of graphemes(clean)) {
      const font = preferred.find(font => Array.from(cluster).every(char => {
        const code = char.codePointAt(0)!;
        return code === 0x200c || code === 0x200d || characterSets.get(font)!.has(code);
      }));
      const actualFont = font || preferred[0];
      const text = font ? cluster : '?';
      const last = result[result.length - 1];
      if (last?.font === actualFont) last.text += text;
      else result.push({ text, font: actualFont });
    }
    return result;
  }

  const width = (value: string, size: number, bold = false) =>
    runs(value, bold).reduce((sum, run) => sum + run.font.widthOfTextAtSize(run.text, size), 0);

  const draw = (page: PDFPage, value: string, x: number, y: number, size: number, bold = false) => {
    for (const run of runs(value, bold)) {
      page.drawText(run.text, { x, y, size, font: run.font, color: rgb(0, 0, 0) });
      x += run.font.widthOfTextAtSize(run.text, size);
    }
  };

  function wrap(value: string, maxWidth: number, size: number, bold = false) {
    const lines: string[] = [];
    let line = '';
    for (const cluster of graphemes(value.replace(/\s+/g, ' ').trim())) {
      if (line && width(line + cluster, size, bold) > maxWidth) { lines.push(line); line = ''; }
      line += cluster;
    }
    if (line || !lines.length) lines.push(line);
    return lines;
  }
  return { width, draw, wrap };
}
