// Native-only fixture, built outside chrome/ and injected only into an isolated profile.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Canvas } from '../src/components/canvas/Canvas';
import { exportToSVG, exportToPNG, exportToInteractiveHTML, exportToMarkdown, importFromMarkdown } from '../src/services/io/exporter';
import { computeLayout } from '../src/core/layout/layoutEngine';
import { relationshipCurves, relationshipBounds } from '../src/core/layout/relationshipGeometry';
import { THEMES } from '../src/core/theme/themes';
import type { MindMapDocument, LayoutType } from '../src/core/model/types';

const root = createRoot(document.getElementById('root')!);
const model: MindMapDocument = { id: 'native_integrity', title: 'MindFlow 导出完整性',
  createdAt: 1, updatedAt: 2, themeId: 'classic-blue', layoutType: 'mindmap',
  root: { id: 'r', text: '研究问题', note: '根备注\n条件 --> & <证据> &#10;', isExpanded: true, children: [
    { id: 'a', text: '实验观测', note: '第一行\n第二行 --> & <条件>', children: [] },
    { id: 'b', text: '对照验证', children: [] },
    { id: 'c', text: '适用范围与局限', children: [] },
  ] }, relationships: [
    { id: 'evidence', fromId: 'a', toId: 'b', label: '支持 <机制> & 对照', style: 'solid', color: '#e11d48' },
    { id: 'boundary', fromId: 'b', toId: 'c', label: '适用边界', style: 'dashed', color: '#8b5cf6' },
  ],
};
const check = (ok: unknown, message: string) => { if (!ok) throw new Error(message); };
const results: Array<{ name: string; pass: boolean; error?: string }> = [];
let captured: Blob | undefined;
async function run(name: string, action: () => unknown) {
  try { await action(); results.push({ name, pass: true }); }
  catch (error) { results.push({ name, pass: false, error: String(error) }); }
}
function render(themeId: string, layoutType: LayoutType) {
  const theme = THEMES[themeId], layout = computeLayout(model.root, layoutType, theme);
  const curves = relationshipCurves(layout.nodes, model.relationships!);
  const b = relationshipBounds(layout.bounds, curves);
  const scale = Math.min((window.innerWidth - 40) / (b.maxX - b.minX), (window.innerHeight - 40) / (b.maxY - b.minY), 1);
  document.documentElement.classList.toggle('dark', theme.isDark);
  document.body.style.background = theme.background;
  const noop = () => {};
  flushSync(() => root.render(<Canvas nodes={layout.nodes} connections={layout.connections} relationships={model.relationships}
    bounds={layout.bounds} theme={theme} selectedId={null} editingId={null}
    viewport={{ x: window.innerWidth / 2 - (b.minX + b.maxX) * scale / 2,
      y: window.innerHeight / 2 - (b.minY + b.maxY) * scale / 2, scale }}
    onViewportChange={noop} onSelectNode={noop} onStartEditNode={noop} onCommitEditNode={noop}
    onCancelEditNode={noop} onToggleCollapse={noop} onMoveNode={noop} />));
  return { layout, theme, curves };
}

async function verify() {
  const create = URL.createObjectURL, revoke = URL.revokeObjectURL, click = HTMLAnchorElement.prototype.click;
  URL.createObjectURL = blob => { captured = blob; return 'blob:mindflow-test-capture'; };
  URL.revokeObjectURL = () => {};
  HTMLAnchorElement.prototype.click = function () {};
  const files: Record<string, string> = {};
  try {
    await run('native Markdown preserves root and multiline evidence notes', async () => {
      exportToMarkdown(model.root, model.title);
      const markdown = await captured!.text(), imported = importFromMarkdown(markdown);
      check(imported.note === model.root.note && imported.children[0].note === model.root.children[0].note, 'notes changed');
      files['native-export.md'] = markdown;
    });
    for (const themeId of ['classic-blue', 'dark-nebula', 'paper-reading']) {
      for (const layoutType of ['mindmap', 'logic-right', 'org-down'] as const) {
        await run(`native ${themeId}/${layoutType} SVG, HTML, PNG retain relationships`, async () => {
          const { layout, theme, curves } = render(themeId, layoutType), options = { relationships: model.relationships };
          const svg = exportToSVG(layout.nodes, layout.connections, layout.bounds, theme, model.title, options);
          const xml = new DOMParser().parseFromString(svg, 'image/svg+xml');
          check(!xml.querySelector('parsererror'), 'SVG cannot parse');
          check(xml.querySelectorAll('[data-relationship]').length === 2, 'relationship count differs');
          check(xml.querySelector('text') && xml.documentElement.textContent!.includes('支持 <机制> & 对照'), 'relationship label lost');
          exportToInteractiveHTML(layout.nodes, layout.connections, layout.bounds, theme, model.title, options);
          const html = await captured!.text(); check(html.includes('支持 &lt;机制&gt; &amp; 对照'), 'offline label lost');
          await exportToPNG(layout.nodes, layout.connections, layout.bounds, theme, model.title, options);
          check(captured!.type === 'image/png' && captured!.size > 1000, 'PNG is empty');
          const pngBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]);
            reader.onerror = () => reject(reader.error); reader.readAsDataURL(captured!);
          });
          files[`native-${themeId}-${layoutType}.png.base64`] = pngBase64;
          if (themeId === 'classic-blue' && layoutType === 'mindmap') {
            files['native-export.svg'] = svg; files['native-export.html'] = html;
            files['native-export.png.base64'] = pngBase64;
          }
          // Decode the actual PNG. Probe visible curve segments outside labels
          // and cards; a fixed t=0.25 can fall under the opaque label background.
          const bitmap = await createImageBitmap(captured!);
          const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
          const ctx = canvas.getContext('2d')!; ctx.drawImage(bitmap, 0, 0); bitmap.close();
          const b = relationshipBounds(layout.bounds, curves);
          for (const c of curves) {
            const color = c.link.color!, rgb = [1,3,5].map(index => parseInt(color.slice(index,index+2),16));
            let colored = false, probes = 0;
            for (let step=1;step<40 && !colored;step++) {
              const t=step/40, x=(1-t)**2*c.start.x+2*(1-t)*t*c.control.x+t*t*c.end.x;
              const y=(1-t)**2*c.start.y+2*(1-t)*t*c.control.y+t*t*c.end.y;
              if (curves.some(label => Math.abs(x-label.labelX)<label.labelWidth/2+4 && Math.abs(y-label.labelY)<17)) continue;
              if (layout.nodes.some(node => x>=node.x-2 && x<=node.x+node.width+2 && y>=node.y-2 && y<=node.y+node.height+2)) continue;
              probes++;
              const px=Math.round((x-b.minX+80)*2), py=Math.round((y-b.minY+80)*2);
              const pixels=ctx.getImageData(px-3,py-3,7,7).data;
              for (let i=0;i<pixels.length;i+=4) if (rgb.every((channel,j)=>Math.abs(pixels[i+j]-channel)<35)) colored=true;
            }
            check(colored, `PNG relationship ${c.link.id} pixels missing (${probes} unobscured probes)`);
          }
          files[`geometry-${themeId}-${layoutType}.json`] = JSON.stringify({ curves, bounds: b, width: canvas.width, height: canvas.height });
        });
      }
    }
    await run('native oversized PNG produces a visible error contract', async () => {
      try { await exportToPNG([], [], { minX: 0, maxX: 100000, minY: 0, maxY: 100000 }, THEMES['classic-blue'], 'large'); }
      catch (error) { check(String(error).includes('SVG'), 'wrong failure'); return; }
      throw new Error('oversized PNG silently succeeded');
    });
  } finally { URL.createObjectURL = create; URL.revokeObjectURL = revoke; HTMLAnchorElement.prototype.click = click; }
  render('classic-blue', 'mindmap');
  return { results, files };
}

(window as any).__mindflowIntegrityTest = { verify, render, results };
render('classic-blue', 'mindmap');
