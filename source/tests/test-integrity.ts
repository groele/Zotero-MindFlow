import assert from 'node:assert/strict';
import { validateMindMapDocument } from '../src/services/storage/documentValidation';
import { BackupService, MAX_BACKUP_BYTES } from '../src/services/storage/backupService';
import { exportToMarkdown, importFromMarkdown, exportToSVG, exportToInteractiveHTML, exportToPNG, exportToJSON } from '../src/services/io/exporter';
import { computeLayout } from '../src/core/layout/layoutEngine';
import { THEMES } from '../src/core/theme/themes';
import type { MindMapDocument } from '../src/core/model/types';
import { relationshipCurves, relationshipBounds } from '../src/core/layout/relationshipGeometry';

let passed = 0, failed = 0;
async function run(name: string, fn: () => unknown) {
  try { await fn(); passed++; console.log(`PASS: ${name}`); }
  catch (error) { failed++; console.error(`FAIL: ${name}: ${(error as Error).message}`); }
}
const map = (): MindMapDocument => ({ id: 'integrity', title: '内容完整性', themeId: 'classic-blue',
  layoutType: 'mindmap', createdAt: 1, updatedAt: 2,
  root: { id: 'root', text: '中心主题', note: '根备注\n条件 --> & <证据> &#10;', children: [
    { id: 'a', text: '实验', note: '第一行\n第二行 --> & <条件> &#10;', children: [] },
    { id: 'b', text: '对照', children: [] },
  ] }, relationships: [{ id: 'r', fromId: 'a', toId: 'b', label: '支持 <机制> & 对照', style: 'solid', color: '#12abcd' }],
});
for (const [name, patch] of [
  ['invalid calendar date', (d: any) => { d.root.task = { status: 'todo', dueDate: '2025-02-29' }; }],
  ['month overflow', (d: any) => { d.root.task = { status: 'todo', dueDate: '2026-13-01' }; }],
  ['year zero', (d: any) => { d.root.task = { status: 'todo', dueDate: '0000-01-01' }; }],
  ['invalid relationship label', (d: any) => { d.relationships[0].label = {}; }],
  ['invalid relationship style', (d: any) => { d.relationships[0].style = 'unknown'; }],
  ['invalid relationship color', (d: any) => { d.relationships[0].color = 123; }],
  ['invalid expansion state', (d: any) => { d.root.isExpanded = 'false'; }],
  ['invalid node shape', (d: any) => { d.root.shape = 'circle'; }],
  ['invalid node type', (d: any) => { d.root.type = {}; }],
  ['invalid node color', (d: any) => { d.root.textColor = {}; }],
] as const) await run(`document rejects ${name} before persistence`, () => {
  const d = map(); patch(d); assert.throws(() => validateMindMapDocument(d));
});
await run('legacy documents and real leap dates remain valid', () => {
  const d = map(); d.root.task = { status: 'doing', dueDate: '2024-02-29', progress: 50 };
  assert.equal(validateMindMapDocument(d), d);
  d.root.task.dueDate = '0096-02-29'; assert.equal(validateMindMapDocument(d), d);
});

const g = globalThis as any;
const saved = { document: g.document, window: g.window, create: URL.createObjectURL, revoke: URL.revokeObjectURL };
let blob: Blob | undefined, clicks = 0, allocations = 0, revoked = 0, detached = 0, failClick = false, failCreate = false;
try {
  g.document = { createElement(tag: string) {
    if (failCreate) throw new Error('element unavailable');
    if (tag === 'canvas') { allocations++; return { getContext: () => null }; }
    return { href: '', download: '', click() { clicks++; if (failClick) throw new Error('download unavailable'); }, remove() { detached++; } };
  }, body: { appendChild() {}, removeChild() { detached++; } } };
  g.window = { location: { protocol: 'https:' }, confirm: () => true, setTimeout: (fn: () => void) => { fn(); return 0; } };
  URL.createObjectURL = (value: Blob) => { blob = value; return 'blob:test'; };
  URL.revokeObjectURL = () => { revoked++; };
  await run('Markdown round-trips root and child multiline evidence notes including comment terminators', async () => {
    const d = map(); exportToMarkdown(d.root, d.title);
    const restored = importFromMarkdown(await blob!.text());
    assert.equal(restored.note, d.root.note);
    assert.equal(restored.children[0].note, d.root.children[0].note);
    assert.equal(restored.children.length, 2);
  });
  await run('Markdown preserves leading/trailing whitespace and literal character entities in notes', async () => {
    const d = map(); d.root.note = '  leading\r\n trailing \t &amp; &#13;  ';
    d.root.children[0].note = '   nested note   ';
    exportToMarkdown(d.root, d.title); const imported = importFromMarkdown(await blob!.text());
    assert.equal(imported.note, d.root.note); assert.equal(imported.children[0].note, d.root.children[0].note);
  });
  const d = map(), theme = THEMES['classic-blue'];
  const layout = computeLayout(d.root, d.layoutType, theme);
  const options = { watermark: false, relationships: d.relationships };
  await run('relationship endpoints stop at card edges and hidden nodes never produce exported links', () => {
    const curves = relationshipCurves(layout.nodes, d.relationships!);
    assert.equal(curves.length, 1);
    const node = layout.nodes.find(n => n.id === 'b')!, end = curves[0].end;
    assert.ok(Math.abs(end.x - node.x) < 0.0001 || Math.abs(end.x - node.x - node.width) < 0.0001 ||
      Math.abs(end.y - node.y) < 0.0001 || Math.abs(end.y - node.y - node.height) < 0.0001);
    assert.equal(relationshipCurves(layout.nodes.filter(n => n.id !== 'b'), d.relationships!).length, 0);
    const b = relationshipBounds(layout.bounds, curves);
    assert.ok(curves[0].labelX - curves[0].labelWidth / 2 >= b.minX);
    assert.ok(curves[0].labelX + curves[0].labelWidth / 2 <= b.maxX);
    assert.deepEqual(relationshipBounds(layout.bounds, []), layout.bounds);
  });
  await run('same-column and same-row relationship labels remain outside all cards', () => {
    for (const type of ['logic-right', 'org-down'] as const) {
      const scene = computeLayout(d.root, type, theme), curves = relationshipCurves(scene.nodes, d.relationships!);
      for (const curve of curves) for (const n of scene.nodes) {
        const overlapsX = curve.labelX + curve.labelWidth/2 > n.x && curve.labelX - curve.labelWidth/2 < n.x+n.width;
        const overlapsY = curve.labelY+13 > n.y && curve.labelY-13 < n.y+n.height;
        assert.ok(!(overlapsX && overlapsY), `${type}: label overlaps ${n.id}`);
      }
    }
  });
  await run('SVG exports relationship direction, style, color and escaped labels', () => {
    const svg = exportToSVG(layout.nodes, layout.connections, layout.bounds, theme, d.title, options);
    assert.match(svg, /支持 &lt;机制&gt; &amp; 对照/);
    assert.match(svg, /marker-end=/); assert.match(svg, /#12abcd/);
  });
  await run('offline HTML retains relationship labels and arrows', async () => {
    exportToInteractiveHTML(layout.nodes, layout.connections, layout.bounds, theme, d.title, options);
    const html = await blob!.text(); assert.match(html, /支持 &lt;机制&gt; &amp; 对照/); assert.match(html, /marker-end=/);
  });
  await run('oversized PNG fails before canvas allocation', async () => {
    const before = allocations;
    await assert.rejects(() => exportToPNG([], [], { minX: 0, maxX: 100000, minY: 0, maxY: 100000 }, theme, 'large'), /SVG|PNG/);
    assert.equal(allocations, before);
  });
  await run('unavailable canvas reports failure instead of silent success', async () => {
    await assert.rejects(() => exportToPNG(layout.nodes, layout.connections, layout.bounds, theme, d.title), /画布|PNG/);
  });
  await run('failed download cleans both DOM anchor and object URL', () => {
    failClick = true; const before = [revoked, detached];
    try { assert.throws(() => exportToJSON(d), /download unavailable/); }
    finally { failClick = false; }
    assert.equal(revoked, before[0] + 1); assert.equal(detached, before[1] + 1);
  });
  await run('download element creation failure also releases its object URL', () => {
    failCreate = true; const before = revoked;
    try { assert.throws(() => exportToJSON(d), /element unavailable/); }
    finally { failCreate = false; }
    assert.equal(revoked, before + 1);
  });
  await run('workspace export refuses a file larger than the restore limit before download', async () => {
    const getData = BackupService.getFullWorkspaceData;
    const huge = map(); huge.root.note = 'a'.repeat(MAX_BACKUP_BYTES + 1);
    BackupService.getFullWorkspaceData = async () => ({ version: '12.5.8', exportedAt: 1, documents: [huge], inboxItems: [], snapshots: [] });
    const before = clicks;
    try { await assert.rejects(() => BackupService.exportFullWorkspaceBackup(), /20 MB/); assert.equal(clicks, before); }
    finally { BackupService.getFullWorkspaceData = getData; }
  });
  await run('object-based workspace preview cannot bypass the restore size limit', async () => {
    const huge = map(); huge.root.note = 'a'.repeat(MAX_BACKUP_BYTES + 1);
    await assert.rejects(() => BackupService.previewFullWorkspaceData({ documents: [huge] }), /20 MB/);
  });
} finally {
  g.document = saved.document; g.window = saved.window;
  URL.createObjectURL = saved.create; URL.revokeObjectURL = saved.revoke;
}
console.log(`${passed} integrity tests passed; ${failed} failed`);
if (failed) process.exitCode = 1;
