import { LayoutNode, ConnectionCurve, ThemeColors } from '../../core/model/types';
import { relationshipCurves, relationshipBounds, RelationshipCurve } from '../../core/layout/relationshipGeometry';
import { imageDisplayHeight, isSafeNodeImage } from '../../core/model/nodeImage';
import { ExportOptions, escapeXml, safeColor, downloadBlob } from './exportHelpers';

export function relationshipSvg(curves: RelationshipCurve[], theme: ThemeColors): { paths: string; labels: string } {
  let paths = '', labels = '';
  curves.forEach((curve, index) => {
    const color = escapeXml(safeColor(curve.link.color || '#8b5cf6', '#8b5cf6'));
    paths += `<defs><marker id="mindflow-export-arrow-${index}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="${color}" /></marker></defs>`;
    paths += `<path data-relationship="${escapeXml(curve.link.id)}" d="${curve.path}" fill="none" stroke="${color}" stroke-width="2"${curve.link.style === 'solid' ? '' : ' stroke-dasharray="5,4"'} marker-end="url(#mindflow-export-arrow-${index})" />`;
    labels += `<g transform="translate(${curve.labelX}, ${curve.labelY})"><rect x="${-curve.labelWidth / 2}" y="-13" width="${curve.labelWidth}" height="26" rx="8" fill="${escapeXml(safeColor(theme.surface, '#ffffff'))}" stroke="${color}" /><text text-anchor="middle" y="4" font-family="system-ui, Microsoft YaHei, sans-serif" font-size="12" fill="${escapeXml(safeColor(theme.text, '#0f172a'))}">${escapeXml(curve.link.label || '关联')}</text></g>`;
  });
  return { paths, labels };
}

export function readingNodeSvg(n: LayoutNode): string {
  const lines = n.textLines || [n.node.text];
  const startY = (n.height - lines.length * 20) / 2 + 15;
  const fill = escapeXml(safeColor(n.bgColor, '#ffffff'));
  const stroke = escapeXml(safeColor(n.borderColor, '#cbd5e1'));
  const rx = n.readingStyle ? 5 : n.shape === 'rectangle' ? 0 : n.shape === 'pill' ? n.height / 2 : n.level === 0 ? 12 : 8;
  const shape = n.readingStyle
    ? n.level <= 1 ? `<rect width="${n.width}" height="${n.height}" rx="5" fill="${fill}" />` : ''
    : n.shape === 'underline' && n.level > 0
      ? `<path d="M 0 ${n.height} H ${n.width}" fill="none" stroke="${stroke}" stroke-width="1.5" />`
      : `<rect width="${n.width}" height="${n.height}" rx="${rx}" fill="${fill}" stroke="${n.level === 0 ? 'none' : stroke}" stroke-width="1.5" />`;

  let taskSvg = '';
  let textIndent = 12;
  if (n.node.task) {
    textIndent = 32;
    const taskMidY = startY + 4;
    if (n.node.task.status === 'done') {
      taskSvg = `<circle cx="18" cy="${taskMidY}" r="6.5" fill="#10b981" /><path d="M 15 ${taskMidY} L 17.5 ${taskMidY + 2.5} L 21.5 ${taskMidY - 2.5}" stroke="#ffffff" stroke-width="1.5" fill="none" />`;
    } else if (n.node.task.status === 'doing') {
      taskSvg = `<circle cx="18" cy="${taskMidY}" r="6" fill="none" stroke="#2563eb" stroke-width="2" />`;
    } else {
      taskSvg = `<circle cx="18" cy="${taskMidY}" r="6" fill="none" stroke="#94a3b8" stroke-width="1.5" />`;
    }
  }

  const isTaskDone = n.node.task?.status === 'done';
  const textDecor = isTaskDone ? ' text-decoration="line-through" opacity="0.75"' : '';

  return `<g transform="translate(${n.x}, ${n.y})"><title>${escapeXml(n.node.note || n.node.text)}</title>
    ${shape}
    ${taskSvg}
    <text font-family="Microsoft YaHei, PingFang SC, sans-serif" font-size="14" font-weight="${n.level <= 1 ? 600 : 400}" fill="${escapeXml(safeColor(n.textColor, '#253e38'))}"${textDecor}>
    ${lines.map((line, index) => `<tspan x="${textIndent}" y="${startY + index * 20}">${escapeXml(line)}</tspan>`).join('')}
    </text></g>`;
}

export function exportToSVG(
  nodes: LayoutNode[],
  connections: ConnectionCurve[],
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  theme: ThemeColors,
  title: string,
  options?: ExportOptions
): string {
  const relCurves = relationshipCurves(nodes, options?.relationships || []);
  const totalBounds = relationshipBounds(bounds, relCurves);
  const padding = 60;
  const width = totalBounds.maxX - totalBounds.minX + padding * 2;
  const height = totalBounds.maxY - totalBounds.minY + padding * 2;
  const offsetX = -totalBounds.minX + padding;
  const offsetY = -totalBounds.minY + padding;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `<defs><style>text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }</style></defs>`;
  svg += `<rect width="100%" height="100%" fill="${escapeXml(safeColor(theme.background, '#f8fafc'))}"/>`;

  // Draw Connections
  svg += `<g transform="translate(${offsetX}, ${offsetY})">`;
  for (const conn of connections) {
    svg += `<path d="${conn.path}" fill="none" stroke="${escapeXml(safeColor(conn.color, '#cbd5e1'))}" stroke-width="${conn.strokeWidth}"/>`;
  }
  const relSvg = relationshipSvg(relCurves, theme);
  svg += relSvg.paths;

  // Draw Nodes
  for (const n of nodes) {
    if (n.readingStyle) {
      svg += readingNodeSvg(n);
      continue;
    }

    const rx = n.shape === 'rectangle' ? 0 : n.shape === 'pill' ? n.height / 2 : (n.level === 0 ? 12 : 8);
    const fill = escapeXml(safeColor(n.bgColor, '#ffffff'));
    const stroke = escapeXml(safeColor(n.borderColor, '#cbd5e1'));

    const lines = n.textLines || [n.node.text];
    const imgH = isSafeNodeImage(n.node.image) ? imageDisplayHeight(n.node.image) : 0;
    const startY = (n.height - imgH - lines.length * 20) / 2 + 15;

    svg += `<g transform="translate(${n.x}, ${n.y})">`;
    svg += `<title>${escapeXml(n.node.note || n.node.text)}</title>`;

    if (n.shape === 'underline' && n.level > 0) {
      svg += `<path d="M 0 ${n.height} H ${n.width}" fill="none" stroke="${stroke}" stroke-width="1.5"/>`;
    } else {
      svg += `<rect width="${n.width}" height="${n.height}" rx="${rx}" fill="${fill}" stroke="${n.level === 0 ? 'none' : stroke}" stroke-width="1.5"/>`;
    }

    let taskSvg = '';
    let textIndent = 12;
    if (n.node.task) {
      textIndent = 32;
      const taskMidY = startY + 4;
      if (n.node.task.status === 'done') {
        taskSvg = `<circle cx="18" cy="${taskMidY}" r="6.5" fill="#10b981" /><path d="M 15 ${taskMidY} L 17.5 ${taskMidY + 2.5} L 21.5 ${taskMidY - 2.5}" stroke="#ffffff" stroke-width="1.5" fill="none" />`;
      } else if (n.node.task.status === 'doing') {
        taskSvg = `<circle cx="18" cy="${taskMidY}" r="6" fill="none" stroke="#2563eb" stroke-width="2" />`;
      } else {
        taskSvg = `<circle cx="18" cy="${taskMidY}" r="6" fill="none" stroke="#94a3b8" stroke-width="1.5" />`;
      }
    }
    svg += taskSvg;

    if (isSafeNodeImage(n.node.image)) {
      svg += `<image href="${n.node.image.dataUrl}" x="${textIndent}" y="8" width="${n.width - 24}" height="${imgH}" preserveAspectRatio="xMidYMid slice" clip-path="inset(0 round 4px)"/>`;
    }

    const isTaskDone = n.node.task?.status === 'done';
    const textDecor = isTaskDone ? ' text-decoration="line-through" opacity="0.75"' : '';

    svg += `<text font-size="14" font-weight="${n.level === 0 ? 600 : 400}" fill="${escapeXml(safeColor(n.textColor, '#0f172a'))}"${textDecor}>`;
    lines.forEach((line, i) => {
      svg += `<tspan x="${textIndent}" y="${startY + imgH + i * 20}">${escapeXml(line)}</tspan>`;
    });
    svg += `</text>`;

    if (n.node.link) {
      svg += `<text x="${n.width - 20}" y="${startY + 2}" font-size="12">🔗</text>`;
    }

    svg += `</g>`;
  }

  svg += relSvg.labels;

  if (options?.watermark) {
    const wmText = options.watermarkText || 'Created with MindFlow for Zotero';
    svg += `<text x="${totalBounds.maxX - totalBounds.minX}" y="${totalBounds.maxY - totalBounds.minY + 40}" font-size="12" fill="${escapeXml(safeColor(theme.text, '#94a3b8'))}" opacity="0.4" text-anchor="end">${escapeXml(wmText)}</text>`;
  }

  svg += `</g></svg>`;

  if (options?.download) {
    downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8;' }), `${title}.svg`, options.download);
  }

  return svg;
}
