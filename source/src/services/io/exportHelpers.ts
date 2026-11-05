import { MindMapNode, RelationshipLink } from '../../core/model/types';

export type ExportDownload = (blob: Blob, filename: string) => void;

export interface ExportOptions {
  download?: ExportDownload;
  watermark?: boolean;
  watermarkText?: string;
  highDpi?: boolean;
  relationships?: RelationshipLink[];
}

export function confirmTextOnlyExport(root: MindMapNode): boolean {
  const pending = [root];
  while (pending.length) {
    const node = pending.pop()!;
    if (node.image && typeof window !== 'undefined') {
      return window.confirm('此格式只保存文字结构，不包含节点图片。建议同时导出 JSON 工作副本。仍要继续吗？');
    }
    pending.push(...node.children);
  }
  return true;
}

export function escapeXml(unsafe: string): string {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function unescapeXml(str: string): string {
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function safeColor(value: string | undefined, fallback: string): string {
  if (!value || typeof value !== 'string') return fallback;
  return /^[#a-zA-Z0-9(),. -]+$/.test(value) ? value : fallback;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function encodeMarkdownNote(note: string): string {
  return escapeXml(note).replace(/\r/g, '&#13;').replace(/\n/g, '&#10;');
}

export function decodeMarkdownNote(note: string): string {
  return unescapeXml(note.replace(/&#13;/g, '\r').replace(/&#10;/g, '\n'));
}

export function downloadBlob(blob: Blob, filename: string, download?: ExportDownload): void {
  if (download) { download(blob, filename); return; }
  if (typeof window === 'undefined' && typeof document === 'undefined') return;

  const url = URL.createObjectURL(blob);
  let a: HTMLAnchorElement | undefined;
  try {
    a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
  } finally {
    try { if (a) a.remove ? a.remove() : document.body.removeChild(a); }
    finally { URL.revokeObjectURL(url); }
  }
}
