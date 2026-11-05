import { LayoutNode, ConnectionCurve, ThemeColors } from '../../core/model/types';
import { relationshipCurves, relationshipBounds } from '../../core/layout/relationshipGeometry';
import { imageDisplayHeight, isSafeNodeImage } from '../../core/model/nodeImage';
import { ExportOptions, safeColor, roundRect, downloadBlob } from './exportHelpers';

/**
 * Export canvas to PNG with high-DPI and watermark support
 */
export async function exportToPNG(
  nodes: LayoutNode[],
  connections: ConnectionCurve[],
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  theme: ThemeColors,
  title: string,
  options?: ExportOptions
): Promise<void> {
  const curves = relationshipCurves(nodes, options?.relationships || []);
  const totalBounds = relationshipBounds(bounds, curves);
  const padding = 60;
  const rawWidth = totalBounds.maxX - totalBounds.minX + padding * 2;
  const rawHeight = totalBounds.maxY - totalBounds.minY + padding * 2;
  const MAX_SIDE = 16384;
  const MAX_PIXELS = 16 * 1024 * 1024;
  if (rawWidth > MAX_SIDE || rawHeight > MAX_SIDE || rawWidth * rawHeight > MAX_PIXELS) {
    throw new Error('导图尺寸超出图片导出限制；请改用 SVG 或 JSON 导出');
  }
  const scale = options?.highDpi ? 2 : 1;
  const width = rawWidth * scale;
  const height = rawHeight * scale;
  if (width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS) {
    throw new Error('高分辨率图片超出浏览器内存限制；请关闭超清导出或改用 SVG');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法初始化画布；请改用 SVG 或 JSON 导出');

  ctx.scale(scale, scale);

  const offsetX = -totalBounds.minX + padding;
  const offsetY = -totalBounds.minY + padding;

  const imageCache = new Map<string, HTMLImageElement>();
  await Promise.all(nodes.filter(n => isSafeNodeImage(n.node.image)).map(async n => {
    const source = n.node.image!.dataUrl;
    if (imageCache.has(source)) return;
    const image = new Image();
    image.src = source;
    await image.decode();
    imageCache.set(source, image);
  }));

  // Background
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, rawWidth, rawHeight);

  ctx.save();
  ctx.translate(offsetX, offsetY);

  // Connections
  for (const conn of connections) {
    ctx.strokeStyle = conn.color;
    ctx.lineWidth = conn.strokeWidth;
    ctx.lineCap = 'round';
    const p = new Path2D(conn.path);
    ctx.stroke(p);
  }

  // Relationship curves and arrowheads
  for (const curve of curves) {
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle = safeColor(curve.link.color || '#8b5cf6', '#8b5cf6');
    ctx.lineWidth = 2; ctx.setLineDash(curve.link.style === 'solid' ? [] : [5, 4]);
    ctx.beginPath(); ctx.moveTo(curve.start.x, curve.start.y);
    ctx.quadraticCurveTo(curve.control.x, curve.control.y, curve.end.x, curve.end.y); ctx.stroke();
    ctx.setLineDash([]);
    const angle = Math.atan2(curve.end.y - curve.control.y, curve.end.x - curve.control.x);
    ctx.translate(curve.end.x, curve.end.y); ctx.rotate(angle);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10, -4.5); ctx.lineTo(-10, 4.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Nodes
  for (const n of nodes) {
    const rx = n.level === 0 ? 12 : 8;
    ctx.save();
    ctx.translate(n.x, n.y);
    if (n.textLines) {
      if (n.readingStyle ? n.level <= 1 : n.shape !== 'underline' || n.level === 0) {
        ctx.fillStyle = n.bgColor;
        const radius = n.readingStyle ? 5 : n.shape === 'rectangle' ? 0 : n.shape === 'pill' ? n.height / 2 : rx;
        roundRect(ctx, 0, 0, n.width, n.height, radius); ctx.fill();
        if (!n.readingStyle && n.level > 0) { ctx.strokeStyle = n.borderColor; ctx.lineWidth = 1.5; ctx.stroke(); }
      } else if (!n.readingStyle) {
        ctx.beginPath(); ctx.moveTo(0, n.height); ctx.lineTo(n.width, n.height);
        ctx.strokeStyle = n.borderColor; ctx.lineWidth = 1.5; ctx.stroke();
      }
      let textIndent = 12;
      if (n.node.task) {
        textIndent = 32;
        const centerY = (n.height - n.textLines.length * 20) / 2 + 15;
        ctx.save();
        if (n.node.task.status === 'done') {
          ctx.fillStyle = '#10b981';
          ctx.beginPath(); ctx.arc(18, centerY, 6.5, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(15, centerY); ctx.lineTo(17.5, centerY + 2.5); ctx.lineTo(21.5, centerY - 2.5); ctx.stroke();
        } else if (n.node.task.status === 'doing') {
          ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(18, centerY, 6, 0, Math.PI * 2); ctx.stroke();
        } else {
          ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(18, centerY, 6, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
      }
      ctx.font = `${n.level <= 1 ? '600' : '400'} 14px "Microsoft YaHei", "PingFang SC", sans-serif`;
      ctx.fillStyle = n.textColor; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      if (n.node.task?.status === 'done') ctx.globalAlpha = 0.75;
      const firstY = (n.height - n.textLines.length * 20) / 2 + 10;
      n.textLines.forEach((line, index) => ctx.fillText(line, textIndent, firstY + index * 20));
      ctx.restore(); continue;
    }

    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = n.level === 0 ? n.bgColor : theme.surface;
    roundRect(ctx, 0, 0, n.width, n.height, rx);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    if (n.level > 0) {
      ctx.strokeStyle = n.borderColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    const nodeImage = isSafeNodeImage(n.node.image) ? n.node.image : null;
    if (nodeImage) {
      const source = imageCache.get(nodeImage.dataUrl);
      if (source) {
        const boxHeight = imageDisplayHeight(nodeImage);
        const scaleFactor = Math.min(nodeImage.width / source.naturalWidth, boxHeight / source.naturalHeight);
        const drawWidth = source.naturalWidth * scaleFactor;
        const drawHeight = source.naturalHeight * scaleFactor;
        ctx.drawImage(source, (n.width - drawWidth) / 2, 8 + (boxHeight - drawHeight) / 2, drawWidth, drawHeight);
      }
    }

    let textStartX = n.width / 2;
    let align: CanvasTextAlign = 'center';
    if (n.node.task && !nodeImage) {
      align = 'left';
      textStartX = 30;
      const centerY = n.height / 2;
      ctx.save();
      if (n.node.task.status === 'done') {
        ctx.fillStyle = '#10b981';
        ctx.beginPath(); ctx.arc(16, centerY, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(13, centerY); ctx.lineTo(15.5, centerY + 2.5); ctx.lineTo(19.5, centerY - 2.5); ctx.stroke();
      } else if (n.node.task.status === 'doing') {
        ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(16, centerY, 6, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(16, centerY, 6, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }

    const fontSize = n.level === 0 ? 16 : (n.level === 1 ? 14 : 12);
    ctx.font = `${n.level === 0 ? 'bold' : '500'} ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = n.level === 0 ? n.textColor : theme.nodeText;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    if (n.node.task?.status === 'done') ctx.globalAlpha = 0.75;
    if (n.node.text) ctx.fillText(n.node.text, textStartX, nodeImage ? n.height - 15 : n.height / 2);

    ctx.restore();
  }

  for (const curve of curves) {
    ctx.save();
    ctx.fillStyle = safeColor(theme.surface, '#ffffff');
    roundRect(ctx, curve.labelX - curve.labelWidth / 2, curve.labelY - 13, curve.labelWidth, 26, 8); ctx.fill();
    ctx.strokeStyle = safeColor(curve.link.color || '#8b5cf6', '#8b5cf6'); ctx.lineWidth = 1; ctx.stroke();
    ctx.font = '12px system-ui, "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = safeColor(theme.text, '#0f172a'); ctx.fillText(curve.link.label || '关联', curve.labelX, curve.labelY);
    ctx.restore();
  }
  ctx.restore();

  if (options?.watermark) {
    ctx.save();
    ctx.font = '500 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = theme.isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.35)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(options.watermarkText || 'Created with MindFlow', rawWidth - 24, rawHeight - 20);
    ctx.restore();
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG 编码失败；请改用 SVG 或 JSON 导出')), 'image/png');
  });
  downloadBlob(blob, `${title}.png`, options?.download);
}

/**
 * Print mind map to vector PDF with landscape stylesheet
 */
export function printToPDF(): void {
  if (typeof window === 'undefined') return;

  const styleId = 'mindflow-print-styles';
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.innerHTML = `
      @media print {
        @page {
          size: landscape;
          margin: 10mm;
        }
        body {
          background: #ffffff !important;
          color: #000000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        header, nav, aside, .toolbar-container, .minimap-container, .command-palette, .modal-backdrop, button, .quick-micro-toolbar {
          display: none !important;
        }
        .canvas-container, main {
          position: static !important;
          width: 100% !important;
          height: auto !important;
          overflow: visible !important;
        }
        .canvas-background {
          background-image: none !important;
        }
      }
    `;
    document.head.appendChild(styleEl);
  }

  window.print();
}
