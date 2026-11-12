import { MindMapNode } from '../model/types';
import { imageDisplayHeight, isSafeNodeImage } from '../model/nodeImage';

export interface MeasuredNodeMetrics {
  width: number;
  height: number;
  lines?: string[];
}

const measureCache = new WeakMap<MindMapNode, { key: string; result: MeasuredNodeMetrics }>();

function measureCacheKey(node: MindMapNode, level: number, reading: boolean): string {
  const img = node.image;
  return `${level}:${reading ? 1 : 0}:${node.text || ''}|${node.icons?.length || 0}|${node.tags?.length || 0}|` +
    `${node.link ? 1 : 0}${node.note ? 1 : 0}${node.internalLink ? 1 : 0}${node.task ? 1 : 0}|` +
    `${img ? `${img.width}:${img.aspectRatio}` : ''}`;
}

// Approximate dimensions for a node based on content (memoized per node snapshot)
export function measureNodeWithLines(node: MindMapNode, level: number, reading = false): MeasuredNodeMetrics {
  const key = measureCacheKey(node, level, reading);
  const cached = measureCache.get(node);
  if (cached && cached.key === key) return cached.result;

  const text = node.text || ' ';
  // Approximate character width (Chinese chars ~ 15px, Latin ~ 8.5px)
  let estimatedTextWidth = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    estimatedTextWidth += (code > 255) ? 15 : 8.5;
  }

  // Add extra spacing for icons and tags
  let extraWidth = 0;
  if (node.icons && node.icons.length > 0) extraWidth += node.icons.length * 22;
  if (node.tags && node.tags.length > 0) extraWidth += node.tags.length * 36;
  if (node.link) extraWidth += 20;
  if (node.note) extraWidth += 20;
  if (node.internalLink) extraWidth += 20;
  if (node.task) extraWidth += 26;

  let result: MeasuredNodeMetrics;
  if (isSafeNodeImage(node.image)) {
    const baseWidth = level === 0 ? 120 : level === 1 ? 90 : 70;
    const textWidth = estimatedTextWidth + (level === 0 ? 48 : level === 1 ? 36 : 28) + extraWidth;
    result = {
      width: Math.max(baseWidth, node.image.width + 24, Math.min(textWidth, 520)),
      height: imageDisplayHeight(node.image) + 16 + (node.text || node.task || node.tags?.length || node.icons?.length || node.note || node.link || node.internalLink ? 30 : 0),
    };
  } else if (reading) {
    const maxWidth = level === 0 ? 480 : level === 1 ? 300 : level === 2 ? 240 : 500;
    const width = Math.min(maxWidth, Math.max(100, readingTextWidth(text) + 28 + extraWidth));
    const lines = wrapReadingText(text, Math.max(30, width - 28 - extraWidth));
    result = { width, height: lines.length * 20 + 14, lines };
  } else {
    const padding = level === 0 ? 48 : level === 1 ? 36 : 28;
    const width = Math.min(level === 0 ? 520 : level === 1 ? 360 : 300,
      Math.max(level === 0 ? 140 : level === 1 ? 90 : 70, estimatedTextWidth + padding + extraWidth));
    const lines = wrapReadingText(text, Math.max(30, width - padding - extraWidth));
    result = { width, height: Math.max(level === 0 ? 46 : level === 1 ? 38 : 32, lines.length * 20 + 14), lines };
  }

  measureCache.set(node, { key, result });
  return result;
}

export function measureNode(node: MindMapNode, level: number, reading = false): { width: number; height: number } {
  const { width, height } = measureNodeWithLines(node, level, reading);
  return { width, height };
}

// Conservatively sized for 14px Microsoft YaHei. One shared set of line breaks
// prevents canvas, SVG, PNG and HTML from showing different or clipped text.
function readingTextWidth(text: string): number {
  return [...text].reduce((width, char) => width + (char.codePointAt(0)! > 255 ? 14.5 : 8.5), 0);
}
export function wrapReadingText(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '', width = 0;
    for (const char of paragraph) {
      const charWidth = readingTextWidth(char);
      if (line && width + charWidth > maxWidth) { lines.push(line); line = ''; width = 0; }
      line += char; width += charWidth;
    }
    lines.push(line);
  }
  return lines;
}
