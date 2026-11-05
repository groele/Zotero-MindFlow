import { LayoutNode, ConnectionCurve, ThemeColors } from '../../core/model/types';
import { relationshipCurves, relationshipBounds } from '../../core/layout/relationshipGeometry';
import { imageDisplayHeight, isSafeNodeImage } from '../../core/model/nodeImage';
import { ExportOptions, escapeXml, safeColor, downloadBlob } from './exportHelpers';
import { relationshipSvg, readingNodeSvg } from './svgExporter';

/**
 * Export as Standalone Offline Interactive HTML with touch pinch-to-zoom and pan support
 */
export function exportToInteractiveHTML(
  nodes: LayoutNode[],
  connections: ConnectionCurve[],
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  theme: ThemeColors,
  title: string,
  options?: ExportOptions
): void {
  const curves = relationshipCurves(nodes, options?.relationships || []);
  const totalBounds = relationshipBounds(bounds, curves);
  const relationships = relationshipSvg(curves, theme);
  const padding = 100;
  const width = Math.ceil(totalBounds.maxX - totalBounds.minX + padding * 2);
  const height = Math.ceil(totalBounds.maxY - totalBounds.minY + padding * 2);
  const offsetX = -totalBounds.minX + padding;
  const offsetY = -totalBounds.minY + padding;

  let curvesSvg = '';
  for (const conn of connections) {
    curvesSvg += `<path d="${escapeXml(conn.path)}" fill="none" stroke="${escapeXml(safeColor(conn.color, '#64748b'))}" stroke-width="${conn.strokeWidth}" stroke-linecap="round" />\n`;
  }

  let nodesSvg = '';
  for (const n of nodes) {
    if (n.textLines) { nodesSvg += readingNodeSvg(n); continue; }
    const rx = n.level === 0 ? 12 : (n.shape === 'pill' ? 16 : 8);
    const stroke = n.level === 0 ? 'none' : safeColor(n.borderColor, '#cbd5e1');
    const fill = n.level === 0 ? safeColor(n.bgColor, '#ffffff') : safeColor(theme.surface, '#ffffff');
    const fontSize = n.level === 0 ? 16 : (n.level === 1 ? 14 : 12);
    const fontWeight = n.level === 0 ? 'bold' : (n.level === 1 ? '600' : 'normal');
    const textColor = n.level === 0 ? safeColor(n.textColor, '#0f172a') : safeColor(theme.nodeText, '#0f172a');
    const image = isSafeNodeImage(n.node.image) ? n.node.image : null;
    const textY = image ? n.height - 12 : n.height / 2 + (fontSize / 3);

    let taskSvg = '';
    let textX = n.width / 2;
    let textAnchor = 'middle';
    if (n.node.task && !image) {
      textAnchor = 'start';
      textX = 30;
      const centerY = n.height / 2;
      if (n.node.task.status === 'done') {
        taskSvg = `<circle cx="16" cy="${centerY}" r="6.5" fill="#10b981" /><path d="M 13 ${centerY} L 15.5 ${centerY + 2.5} L 19.5 ${centerY - 2.5}" stroke="#ffffff" stroke-width="1.5" fill="none" />`;
      } else if (n.node.task.status === 'doing') {
        taskSvg = `<circle cx="16" cy="${centerY}" r="6" fill="none" stroke="#2563eb" stroke-width="2" />`;
      } else {
        taskSvg = `<circle cx="16" cy="${centerY}" r="6" fill="none" stroke="#94a3b8" stroke-width="1.5" />`;
      }
    }
    const isTaskDone = n.node.task?.status === 'done';
    const textDecor = isTaskDone ? ' text-decoration="line-through" opacity="0.75"' : '';

    nodesSvg += `
    <g class="mind-node" transform="translate(${n.x}, ${n.y})">
      <rect width="${n.width}" height="${n.height}" rx="${rx}" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="1.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.08))" />
      ${image ? `<image href="${escapeXml(image.dataUrl)}" x="${(n.width - image.width) / 2}" y="8" width="${image.width}" height="${imageDisplayHeight(image)}" preserveAspectRatio="xMidYMid meet" />` : ''}
      ${taskSvg}
      ${n.node.text ? `<text x="${textX}" y="${textY}" text-anchor="${textAnchor}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${escapeXml(textColor)}"${textDecor}>${escapeXml(n.node.text)}</text>` : ''}
    </g>`;
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeXml(title)} - MindFlow 交互导图</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, html { width: 100%; height: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: ${safeColor(theme.background, '#ffffff')}; color: ${safeColor(theme.text, '#0f172a')}; }
    #header {
      position: absolute; top: 16px; left: 16px; right: 16px; z-index: 10;
      display: flex; justify-content: space-between; align-items: center; pointer-events: none;
    }
    .header-card {
      background: ${safeColor(theme.surface, '#ffffff')}; padding: 8px 16px; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1); pointer-events: auto; display: flex; align-items: center; gap: 12px;
    }
    .title { font-weight: 700; font-size: 16px; }
    .badge { font-size: 11px; background: rgba(59, 130, 246, 0.15); color: #3b82f6; padding: 2px 8px; border-radius: 9999px; font-weight: 600; }
    .controls { display: flex; gap: 8px; pointer-events: auto; }
    .btn {
      background: ${safeColor(theme.surface, '#ffffff')}; border: 1px solid rgba(125,125,125,0.2); color: ${safeColor(theme.text, '#0f172a')};
      padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: all 0.15s;
    }
    .btn:hover { background: rgba(125,125,125,0.1); }
    #canvas-container { width: 100%; height: 100%; cursor: grab; user-select: none; }
    #canvas-container:active { cursor: grabbing; }
    svg { width: 100%; height: 100%; display: block; }
    .node-text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .mind-node { transition: transform 0.1s; }
  </style>
</head>
<body>
  <div id="header">
    <div class="header-card">
      <span class="title">${escapeXml(title)}</span>
      <span class="badge">${nodes.length} 节点</span>
    </div>
    <div class="controls">
      <button class="btn" onclick="zoomIn()">放大 (+)</button>
      <button class="btn" onclick="zoomOut()">缩小 (-)</button>
      <button class="btn" onclick="resetView()">重置视口</button>
    </div>
  </div>

  <div id="canvas-container">
    <svg id="svg-canvas" viewBox="0 0 ${width} ${height}">
      <g id="viewport" transform="translate(${offsetX}, ${offsetY}) scale(1)">
        ${curvesSvg}
        ${relationships.paths}
        ${nodesSvg}
        ${relationships.labels}
      </g>
    </svg>
  </div>

  <script>
    let scale = 1;
    let panX = ${offsetX};
    let panY = ${offsetY};
    let isDragging = false;
    let startX = 0, startY = 0;

    const viewport = document.getElementById('viewport');
    const container = document.getElementById('canvas-container');

    function updateTransform() {
      viewport.setAttribute('transform', 'translate(' + panX + ', ' + panY + ') scale(' + scale + ')');
    }

    container.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      updateTransform();
    });

    window.addEventListener('mouseup', () => { isDragging = false; });

    let isPinching = false;
    let initialPinchDist = 0;
    let initialPinchScale = 1;
    let pinchCenterX = 0, pinchCenterY = 0;

    container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        isPinching = false;
        startX = e.touches[0].clientX - panX;
        startY = e.touches[0].clientY - panY;
      } else if (e.touches.length === 2) {
        isDragging = false;
        isPinching = true;
        initialPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        ) || 1;
        initialPinchScale = scale;
        pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        pinchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (isPinching && e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / initialPinchDist;
        const newScale = Math.min(Math.max(0.2, initialPinchScale * factor), 4);
        panX = pinchCenterX - (pinchCenterX - panX) * (newScale / scale);
        panY = pinchCenterY - (pinchCenterY - panY) * (newScale / scale);
        scale = newScale;
        updateTransform();
      } else if (isDragging && e.touches.length === 1) {
        panX = e.touches[0].clientX - startX;
        panY = e.touches[0].clientY - startY;
        updateTransform();
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) isPinching = false;
      if (e.touches.length === 0) isDragging = false;
    });
    window.addEventListener('touchcancel', () => {
      isDragging = false;
      isPinching = false;
    });

    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(Math.max(0.2, scale * zoomFactor), 4);
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      panX = mouseX - (mouseX - panX) * (newScale / scale);
      panY = mouseY - (mouseY - panY) * (newScale / scale);
      scale = newScale;
      updateTransform();
    }, { passive: false });

    function zoomIn() {
      scale = Math.min(4, scale * 1.2);
      updateTransform();
    }
    function zoomOut() {
      scale = Math.max(0.2, scale / 1.2);
      updateTransform();
    }
    function resetView() {
      scale = 1;
      panX = ${offsetX};
      panY = ${offsetY};
      updateTransform();
    }
  </script>
</body>
</html>`;

  downloadBlob(new Blob([htmlContent], { type: 'text/html;charset=utf-8' }), `${title}.html`, options?.download);
}
