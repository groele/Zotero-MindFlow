import { requestWebDAV } from '../src/services/sync/webdavRequest';
import assert from 'node:assert/strict';
import { cloneTree, replaceNodeText, replaceAllNodeText, expandAncestors, deleteNode, nextTaskStatus, setCollapseByLevel } from '../src/core/model/treeOps';
import { validRelationships, captureNodeDrafts, retargetDocumentLinks } from '../src/core/model/editorState';
import { HistoryManager } from '../src/core/history/historyManager';
import { InboxService } from '../src/services/storage/inboxService';
import { SettingsService, sanitizeSettings } from '../src/services/storage/settingsService';
import { safeStorage } from '../src/services/storage/safeStorage';
import { parseOPMLString, importFromMarkdown, importMarkdownDocument, exportToMarkdown, exportToInteractiveHTML, generateMermaidMindmap } from '../src/services/io/exporter';
import { computeLayout, measureNodeWithLines } from '../src/core/layout/layoutEngine';
import { computeWorldViewport, cullViewportNodes, cullViewportConnections } from '../src/core/layout/viewportCull';
import { THEMES } from '../src/core/theme/themes';
import { uiText } from '../src/services/zotero/zoteroBridge';
import { BackupService } from '../src/services/storage/backupService';
import { WebDAVService } from '../src/services/sync/webdavService';
import type { MindMapNode, MindMapDocument } from '../src/core/model/types';
import { saveStatusLabel } from '../src/core/model/saveStatus';
import { shouldHandleCanvasShortcut } from '../src/core/keyboard/shortcuts';
import { APP_VERSION } from '../src/core/version';

let passed = 0, failed = 0;
async function run(name: string, fn: () => unknown) {
  try { await fn(); passed++; console.log(`PASS: ${name}`); }
  catch (error) { failed++; console.error(`FAIL: ${name}: ${(error as Error).message}`); }
}
const root: MindMapNode = { id: 'root', text: 'MoS2 mos2 MOS2', note: 'MOS2 evidence', children: [], task: { status: 'todo' } };
await run('save indicator distinguishes pending local edits from completed local writes awaiting archive', () => {
  assert.equal(saveStatusLabel({ state: 'saving', message: '等待本地保存…' }), '待保存…');
  assert.equal(saveStatusLabel({ state: 'saving', message: '本地文件已保存，正在归档 Zotero 附件…' }), '本地已保存 · 归档中');
  assert.equal(saveStatusLabel({ state: 'saved', message: '已保存到本地' }), '已保存');
});
await run('toolbar placement choices persist independently and retain legacy visibility switches', async () => {
  const original = await SettingsService.getSettings();
  try {
    await SettingsService.updateSettings({ toolbarTemplatesPlacement: 'toolbar', toolbarPresentationPlacement: 'hidden' });
    await SettingsService.updateSettings({ toolbarExportPlacement: 'more', toolbarButtons: { ...original.toolbarButtons, templates: false } });
    const restored = await SettingsService.getSettings();
    assert.equal(restored.toolbarTemplatesPlacement, 'toolbar');
    assert.equal(restored.toolbarPresentationPlacement, 'hidden');
    assert.equal(restored.toolbarExportPlacement, 'more');
    assert.equal(restored.toolbarButtons.templates, false);
  } finally { await SettingsService.updateSettings(original); }
});
await run('native controls retain Tab, Enter, and Space while canvas shortcuts remain available elsewhere', () => {
  const button = { closest: (selector: string) => selector.includes('button') ? {} : null } as unknown as EventTarget;
  const combobox = { closest: (selector: string) => selector.includes('[role="combobox"]') ? {} : null } as unknown as EventTarget;
  const canvas = { closest: () => null } as unknown as EventTarget;
  assert.equal(shouldHandleCanvasShortcut(button), false);
  assert.equal(shouldHandleCanvasShortcut(combobox), false);
  const summary = { closest: (selector: string) => selector.includes('summary') ? {} : null } as unknown as EventTarget;
  assert.equal(shouldHandleCanvasShortcut(summary), false);
  assert.equal(shouldHandleCanvasShortcut(canvas), true);
  assert.equal(shouldHandleCanvasShortcut(null), true);
});
await run('status distinguishes AI review and archive warnings from real backup failures', () => {
  assert.equal(saveStatusLabel({ state: 'warning', message: 'AI 草稿已保存在本机，但没有原文片段核对' }), '待核对');
  assert.equal(saveStatusLabel({ state: 'warning', message: '本地已保存；云端备份失败：401' }), '云备份失败');
  assert.equal(saveStatusLabel({ state: 'warning', message: '本地已保存；Zotero 附件归档失败：只读' }), '归档待处理');
  assert.equal(saveStatusLabel({ state: 'warning', message: '请先选择一篇论文' }), '需注意');
});
await run('cloned tasks cannot mutate original or undo history', () => {
  const copy = cloneTree(root); copy.task!.status = 'done';
  assert.equal(root.task!.status, 'todo');
});
await run('task status cycles todo to doing to done and back without changing task metadata', () => {
  assert.equal(nextTaskStatus('todo'), 'doing');
  assert.equal(nextTaskStatus('doing'), 'done');
  assert.equal(nextTaskStatus('done'), 'todo');
  const task = { status: nextTaskStatus('doing'), priority: 2 as const, dueDate: '2026-10-10', progress: 60 };
  assert.deepEqual(task, { status: 'done', priority: 2, dueDate: '2026-10-10', progress: 60 });
});
await run('replace-current uses the same case-insensitive matching as search', () => {
  const replaced = replaceNodeText(root, 'root', 'mos2', 'TMD');
  assert.equal(replaced.text, 'TMD TMD TMD'); assert.equal(replaced.note, 'TMD evidence');
});
await run('replace-all counts actual case-insensitive occurrences', () => {
  const replaced = replaceAllNodeText(root, 'mos2', 'TMD');
  assert.equal(replaced.count, 4); assert.equal(replaced.newRoot.text, 'TMD TMD TMD');
});
await run('concurrent inbox additions preserve both records', async () => {
  safeStorage.removeItem('mindflow_inbox_items');
  await Promise.all([InboxService.addItem('first'), InboxService.addItem('second')]);
  assert.equal((await InboxService.getItems()).length, 2);
});
await run('corrupt inbox entries are rejected before rendering', async () => {
  safeStorage.setItem('mindflow_inbox_items', '[{"id":"broken","text":23}]');
  await assert.rejects(() => InboxService.getItems(), /无效|损坏/);
  safeStorage.removeItem('mindflow_inbox_items');
});
await run('concurrent setting edits merge different fields', async () => {
  await SettingsService.resetSettings();
  await Promise.all([SettingsService.updateSettings({ soundEffects: false }), SettingsService.updateSettings({ rainbowBranches: true })]);
  const settings = await SettingsService.getSettings();
  assert.equal(settings.soundEffects, false); assert.equal(settings.rainbowBranches, true);
});
await run('settings read and reset return independent nested values', async () => {
  const settings = await SettingsService.resetSettings();
  settings.webdav.serverUrl = 'https://mutated.invalid';
  assert.equal((await SettingsService.getSettings()).webdav.serverUrl, '');
  await SettingsService.resetSettings();
  const read = await SettingsService.getSettings();
  read.webdav.serverUrl = 'https://mutated.invalid';
  assert.equal((await SettingsService.getSettings()).webdav.serverUrl, '');
});
await run('malformed OPML does not silently become a successful empty map', () => {
  assert.throws(() => parseOPMLString('<opml><body><outline text="Lost"></body></opml>'), /OPML|XML|闭合/);
});
await run('backup rejects duplicate inbox IDs before any writes', async () => {
  const item = { id: 'dup', text: 'a', createdAt: 1, isProcessed: false };
  await assert.rejects(() => BackupService.previewFullWorkspaceData({ documents: [], inboxItems: [item, item] }), /重复/);
});
await run('node deletion prunes links to all deleted descendants, preserves unrelated links', () => {
  const tree = { id: 'root', text: 'root', children: [{ id: 'a', text: 'a', children: [{ id: 'nested', text: 'nested', children: [] }] }, { id: 'b', text: 'b', children: [] }] };
  const links = [{ id: 'one', fromId: 'root', toId: 'nested' }, { id: 'two', fromId: 'root', toId: 'b' }];
  const deleted = deleteNode(tree, 'a').newRoot;
  assert.deepEqual(validRelationships(deleted, links).map(link => link.id), ['two']);
});
await run('undo and redo restore the tree and relationships as one edit', () => {
  const history = new HistoryManager();
  const before = { root: { ...root, children: [{ id: 'child', text: 'c', children: [] }] }, relationships: [{ id: 'rel', fromId: 'root', toId: 'child' }] };
  const after = { root: { ...root, children: [] }, relationships: [] };
  history.push(before);
  assert.equal(JSON.stringify(history.undo(after)), JSON.stringify(before));
  assert.equal(JSON.stringify(history.redo(before)), JSON.stringify(after));
});
await run('literal replacement handles regex syntax and dollar characters literally', () => {
  const changed = replaceNodeText({ ...root, text: 'a.[x] A.[X]' }, 'root', 'a.[x]', '$&');
  assert.equal(changed.text, '$& $&');
});
await run('search reveals ancestors without expanding target or unrelated branches', () => {
  const tree = { ...root, isExpanded: false, children: [{ id: 'child', text: 'child', isExpanded: false, children: [{ id: 'target', text: 'target', isExpanded: false, children: [] }] }] };
  const expanded = expandAncestors(tree, 'target');
  assert.equal(expanded.isExpanded, true); assert.equal(expanded.children[0].isExpanded, true);
  assert.equal(expanded.children[0].children[0].isExpanded, false); assert.equal(tree.isExpanded, false);
  assert.equal(expandAncestors(tree, 'missing'), tree);
});
await run('switch/save draft capture includes latest text and ignores stale missing IDs', () => {
  const doc = { id: 'doc', root, updatedAt: 1, metadata: { autoSyncToZotero: false } } as MindMapDocument;
  const captured = captureNodeDrafts(doc, [{ id: 'root', text: ' Latest Chinese text ' }, { id: 'missing', text: 'foreign' }])!;
  assert.equal(captured.root.text, 'Latest Chinese text'); assert.equal(captured.metadata, doc.metadata);
  assert.equal(doc.root.text, 'MoS2 mos2 MOS2'); assert.ok(captured.updatedAt > 1);
});
await run('document copy remaps self links but preserves links to other documents', () => {
  const tree = { ...root, internalLink: { documentId: 'old', nodeId: 'root' }, children: [{ id: 'external', text: 'e', children: [], internalLink: { documentId: 'other' } }] };
  const copy = retargetDocumentLinks(tree, 'old', 'new');
  assert.equal(copy.internalLink?.documentId, 'new'); assert.equal(copy.children[0].internalLink?.documentId, 'other');
  assert.equal(tree.internalLink.documentId, 'old');
});
await run('partial WebDAV updates preserve other concurrent fields', async () => {
  await SettingsService.resetSettings();
  await Promise.all([SettingsService.updateSettings({ webdav: { lastSyncStatus: 'success' } }),
    SettingsService.updateSettings({ webdav: { lastSyncMessage: 'done' } }),
    SettingsService.updateSettings({ webdav: { lastSyncTime: 123 } })]);
  const settings = await SettingsService.getSettings();
  assert.equal(settings.webdav.lastSyncStatus, 'success'); assert.equal(settings.webdav.lastSyncMessage, 'done');
  assert.equal(settings.webdav.lastSyncTime, 123); assert.equal(settings.webdav.serverUrl, '');
});
await run('inbox merge, processing and additions cannot overwrite each other', async () => {
  safeStorage.removeItem('mindflow_inbox_items');
  const first = await InboxService.addItem('one');
  await Promise.all([InboxService.markProcessed(first.id), InboxService.addItem('two'),
    InboxService.mergeItems([{ id: 'restored', text: 'restored', createdAt: 1, isProcessed: false }])]);
  const items = await InboxService.getItems();
  assert.equal(items.length, 3); assert.equal(items.find(item => item.id === first.id)?.isProcessed, true);
  await InboxService.clearProcessed(); assert.equal((await InboxService.getItems()).length, 2);
});
await run('queued WebDAV autosync is invalidated by disabled service or changed credentials', async () => {
  const config = (await SettingsService.getSettings()).webdav;
  assert.equal(WebDAVService.sameAutoSyncConfig(config, { ...config, lastSyncTime: 999 }), true);
  assert.equal(WebDAVService.sameAutoSyncConfig(config, { ...config, enabled: !config.enabled }), false);
  assert.equal(WebDAVService.sameAutoSyncConfig(config, { ...config, password: 'changed' }), false);
  assert.equal(WebDAVService.sameAutoSyncConfig(config, { ...config, serverUrl: 'https://different.invalid' }), false);
});
await run('WebDAV timeout rejects even when the transport ignores abort', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (() => new Promise(() => {})) as typeof fetch;
  try { await assert.rejects(() => requestWebDAV('https://example.invalid', { method: 'PUT' }, { timeoutMs: 20 }), /超时/); }
  finally { globalThis.fetch = original; }
});
await run('WebDAV deadline includes a response body that stalls after headers', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response(new ReadableStream({ start() {} }), { status: 200 })) as typeof fetch;
  try { await assert.rejects(() => requestWebDAV('https://example.invalid', { method: 'GET' }, { timeoutMs: 20 }), /超时/); }
  finally { globalThis.fetch = original; }
});
await run('WebDAV preserves caller cancellation separately from its timeout', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (() => new Promise(() => {})) as typeof fetch;
  const caller = new AbortController();
  try {
    const pending = requestWebDAV('https://example.invalid', { method: 'GET', signal: caller.signal }, { timeoutMs: 1000 });
    caller.abort();
    await assert.rejects(() => pending, (error: any) => error?.name === 'AbortError');
  } finally { globalThis.fetch = original; }
});
await run('WebDAV streamed bodies without content length stop at the byte limit', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response('中文中文', { status: 200 })) as typeof fetch;
  try { await assert.rejects(() => requestWebDAV('https://example.invalid', { method: 'GET' }, { maxBytes: 6 }), /上限/); }
  finally { globalThis.fetch = original; }
});
await run('WebDAV 204 connection checks do not fabricate an invalid response body', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response(null, { status: 204 })) as typeof fetch;
  try { assert.equal((await requestWebDAV('https://example.invalid', { method: 'PROPFIND' })).status, 204); }
  finally { globalThis.fetch = original; }
});
await run('failed WebDAV directory creation stops before uploading any backup', async () => {
  const original = globalThis.fetch, calls: string[] = [];
  globalThis.fetch = (async (_url, init) => { calls.push(init?.method || 'GET'); return new Response(null, { status: 403 }); }) as typeof fetch;
  const config = { ...(await SettingsService.getSettings()).webdav, serverUrl: 'https://example.invalid/dav/', username: 'u', basePath: '/maps/' };
  try {
    const result = await WebDAVService.uploadBackup(config, { documents: [] } as any);
    assert.equal(result.success, false); assert.deepEqual(calls, ['MKCOL']);
  } finally { globalThis.fetch = original; }
});
await run('WebDAV backup path cannot escape the configured server directory', () => {
  assert.equal(WebDAVService.buildUrl('https://example.invalid/dav/', '/maps/archive.json'),
    'https://example.invalid/dav/maps/archive.json');
  for (const path of ['../outside.json', '%2e%2e/outside.json', 'maps\\outside.json',
    'maps/archive.json?redirect=1', 'maps/%2foutside.json']) {
    assert.throws(() => WebDAVService.buildUrl('https://example.invalid/dav/', path), /目标路径/);
  }
});
await run('WebDAV creates nested backup directories in parent-first order', async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (url) => {
    calls.push(String(url));
    return new Response(null, { status: calls.length === 1 ? 405 : 201 });
  }) as typeof fetch;
  const config = { ...(await SettingsService.getSettings()).webdav,
    serverUrl: 'https://example.invalid/dav/', username: 'u', basePath: '/research/maps/' };
  try {
    assert.equal(await WebDAVService.ensureRemoteFolder(config), true);
    assert.deepEqual(calls, ['https://example.invalid/dav/research/', 'https://example.invalid/dav/research/maps/']);
  } finally { globalThis.fetch = original; }
});
await run('oversize WebDAV backup is rejected before any remote request', async () => {
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = (async () => { requests++; return new Response(null, { status: 201 }); }) as typeof fetch;
  const config = { ...(await SettingsService.getSettings()).webdav,
    serverUrl: 'https://example.invalid/dav/', username: 'u', basePath: '/maps/' };
  try {
    const result = await WebDAVService.uploadBackup(config,
      { documents: [{ title: 'x'.repeat(20 * 1024 * 1024) }] } as any);
    assert.equal(result.success, false);
    assert.equal(requests, 0);
  } finally { globalThis.fetch = original; }
});
await run('queued WebDAV upload freezes credentials, destination and document contents', async () => {
  const original = globalThis.fetch, calls: Array<{url: string; method: string; body: string; auth: string}> = [];
  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), method: init?.method || 'GET', body: String(init?.body || ''), auth: (init?.headers as any)?.Authorization });
    return new Response(null, { status: 201 });
  }) as typeof fetch;
  const config = { ...(await SettingsService.getSettings()).webdav, serverUrl: 'https://example.invalid/dav/', username: 'original', password: 'before', basePath: '/maps/' };
  const data = { documents: [{ title: 'original' }] } as any;
  try {
    const pending = WebDAVService.uploadBackup(config, data);
    config.serverUrl = 'https://changed.invalid'; config.password = 'after'; data.documents[0].title = 'changed';
    assert.equal((await pending).success, true);
    const uploads = calls.filter(call => call.method === 'PUT');
    assert.equal(uploads.length, 2);
    for (const call of uploads) {
      assert.ok(call.url.startsWith('https://example.invalid/dav/maps/'));
      assert.equal(JSON.parse(call.body).documents[0].title, 'original');
      assert.equal(call.auth, 'Basic ' + btoa('original:before'));
    }
  } finally { globalThis.fetch = original; }
});
await run('importFromMarkdown successfully parses and preserves zotero://, web, file:// and attachment:// links', () => {
  const md = `# 文献综述导图\n- 核心论点 [🔗](zotero://select/library/items/ABC12345)\n  - 实验证据 [🔗](https://doi.org/10.1000/182)\n  - 本地PDF [🔗](file:///C:/Users/papers/example.pdf)\n  - 内部附件 [🔗](attachment://att_xyz987)`;
  const parsed = importFromMarkdown(md);
  assert.equal(parsed.text, '文献综述导图');
  assert.equal(parsed.children.length, 1);
  assert.equal(parsed.children[0].text, '核心论点');
  assert.equal(parsed.children[0].link, 'zotero://select/library/items/ABC12345');
  assert.equal(parsed.children[0].children.length, 3);
  assert.equal(parsed.children[0].children[0].text, '实验证据');
  assert.equal(parsed.children[0].children[0].link, 'https://doi.org/10.1000/182');
  assert.equal(parsed.children[0].children[1].text, '本地PDF');
  assert.equal(parsed.children[0].children[1].link, 'file:///C:/Users/papers/example.pdf');
  assert.equal(parsed.children[0].children[2].text, '内部附件');
  assert.equal(parsed.children[0].children[2].link, 'attachment://att_xyz987');
});
await run('SettingsService sanitizes invalid layout and out-of-range numerical settings', async () => {
  const sanitized = sanitizeSettings({
    defaultLayout: 'invalid-layout' as any,
    defaultThemeId: 'deprecated-theme' as any,
    maxSnapshotsPerDoc: -10,
    zoomStep: 999,
    canvasBackground: 'unknown-bg' as any,
    toolbarPosition: 'floating' as any,
    webdav: { enabled: true, serverUrl: '  https://dav.example.com  ' } as any,
  });
  assert.equal(sanitized.defaultLayout, 'mindmap');
  assert.equal(sanitized.defaultThemeId, 'classic-blue');
  assert.equal(sanitized.maxSnapshotsPerDoc, 20);
  assert.equal(sanitized.zoomStep, 0.15);
  assert.equal(sanitized.canvasBackground, 'dots');
  assert.equal(sanitized.toolbarPosition, 'top');
  assert.equal(sanitized.webdav.serverUrl, 'https://dav.example.com');
  assert.equal(sanitized.webdav.basePath, '/MindFlow/');
});
await run('BackupService rejects future major version backups and validates schemaVersion 2', async () => {
  const futureBackup = {
    version: '999.0.0',
    exportedAt: Date.now(),
    documents: [],
  };
  await assert.rejects(async () => {
    await BackupService.previewFullWorkspaceData(futureBackup);
  }, /更高版本/);

  const futureSchemaBackup = {
    version: APP_VERSION,
    schemaVersion: 99,
    exportedAt: Date.now(),
    documents: [],
  };
  await assert.rejects(async () => {
    await BackupService.previewFullWorkspaceData(futureSchemaBackup);
  }, /架构版本/);

  const invalidTimeBackup = {
    version: APP_VERSION,
    exportedAt: -1,
    documents: [],
  };
  await assert.rejects(async () => {
    await BackupService.previewFullWorkspaceData(invalidTimeBackup);
  }, /时间戳/);

  const validBackup = {
    version: APP_VERSION,
    schemaVersion: 2,
    exportedAt: Date.now(),
    documents: [],
    researchPresets: [{
      id: 'preset_test-1',
      name: '测试预设',
      templateId: 'paper-story',
      customPrompt: '请重点提取结论',
      presentation: null,
    }],
  };
  const preview = await BackupService.previewFullWorkspaceData(validBackup);
  assert.equal(preview.researchPresets, 1);
  assert.equal(preview.documents, 0);
});
await run('exportToInteractiveHTML renders task status badge and completed line-through', () => {
  let capturedBlob: Blob | null = null;
  const mockNodes: any[] = [
    {
      id: 'node-done',
      node: { id: 'node-done', text: '完成的任务', task: { status: 'done' }, children: [] },
      x: 10, y: 10, width: 120, height: 40, level: 1, bgColor: '#fff', borderColor: '#ccc',
      shape: 'rounded', children: [], textColor: '#000',
    },
    {
      id: 'node-doing',
      node: { id: 'node-doing', text: '进行中的任务', task: { status: 'doing' }, children: [] },
      x: 10, y: 60, width: 120, height: 40, level: 1, bgColor: '#fff', borderColor: '#ccc',
      shape: 'rounded', children: [], textColor: '#000',
    },
  ];
  const theme: any = { background: '#ffffff', surface: '#ffffff', text: '#000', nodeText: '#000' };
  exportToInteractiveHTML(
    mockNodes,
    [],
    { minX: 0, maxX: 200, minY: 0, maxY: 200 },
    theme,
    'Task Test',
    { download: (blob) => { capturedBlob = blob; } }
  );
  assert.ok(capturedBlob, 'Interactive HTML was generated');
});
await run('exportToInteractiveHTML includes touch pinch-to-zoom support for mobile and tablet devices', async () => {
  let html = '';
  const mockNodes: any[] = [{
    id: 'root',
    node: { id: 'root', text: 'Root', children: [] },
    x: 0, y: 0, width: 100, height: 40, level: 0, bgColor: '#fff', borderColor: '#ccc',
    shape: 'rounded', children: [], textColor: '#000',
  }];
  const theme: any = { background: '#fff', surface: '#fff', text: '#000', nodeText: '#000' };
  exportToInteractiveHTML(
    mockNodes,
    [],
    { minX: 0, maxX: 100, minY: 0, maxY: 100 },
    theme,
    'Pinch Test',
    { download: (blob) => {
      void blob.text().then(t => { html = t; });
    } }
  );
  await new Promise(resolve => setTimeout(resolve, 15));
  assert.ok(html.includes('isPinching'), 'Interactive HTML contains isPinching flag');
  assert.ok(html.includes('initialPinchDist'), 'Interactive HTML contains initialPinchDist logic');
});
await run('generateMermaidMindmap produces valid Mermaid mindmap with escaped labels', async () => {
  const tree: MindMapNode = {
    id: 'root',
    text: 'Research Paper ("Title")',
    children: [
      {
        id: 'c1',
        text: 'Methodology & Data',
        children: [
          { id: 'c1_1', text: 'Dataset [A]', children: [] },
        ],
      },
      {
        id: 'c2',
        text: 'Results & Evaluation',
        children: [],
      },
    ],
  };
  const mermaid = generateMermaidMindmap(tree);
  assert.ok(mermaid.startsWith('mindmap\n'), 'Starts with mindmap keyword');
  assert.ok(mermaid.includes('root(("Research Paper (\'Title\')"))'), 'Escapes double quotes in root node');
  assert.ok(mermaid.includes('    ("Methodology & Data")'), 'Contains level 1 child at 4 spaces');
  assert.ok(mermaid.includes('      ("Dataset [A]")'), 'Contains level 2 child at 6 spaces');
});
await run('setCollapseByLevel controls expansion up to level 3', async () => {
  const deepTree: MindMapNode = {
    id: 'r',
    text: 'Root',
    isExpanded: true,
    children: [
      {
        id: 'l1',
        text: 'Level 1',
        children: [
          {
            id: 'l2',
            text: 'Level 2',
            children: [
              {
                id: 'l3',
                text: 'Level 3',
                children: [
                  { id: 'l4', text: 'Level 4', children: [] },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  const collapsedTo3 = setCollapseByLevel(deepTree, 3);
  assert.equal(collapsedTo3.isExpanded, true);
  assert.equal(collapsedTo3.children[0].isExpanded, true);
  assert.equal(collapsedTo3.children[0].children[0].isExpanded, true);
  assert.equal(collapsedTo3.children[0].children[0].children[0].isExpanded, false);
});
await run('Markdown round-trip preserves doi:, bare DOI, mailto:, #123 in titles, internalLink and relationships', () => {
  const md = [
    '# Issue #42 Review',
    '- Bare DOI branch [🔗](10.1038/s41586-021-03819-2)',
    '- Prefixed DOI [🔗](doi:10.1145/12345.67890)',
    '- Contact [🔗](mailto:author@example.org)',
    '- Issue #123 handling #bug #priority',
    '- Issue #456 only',
  ].join('\n');
  const parsed = importFromMarkdown(md);
  assert.equal(parsed.text, 'Issue #42 Review');
  assert.equal(parsed.children[0].link, '10.1038/s41586-021-03819-2');
  assert.equal(parsed.children[1].link, 'doi:10.1145/12345.67890');
  assert.equal(parsed.children[2].link, 'mailto:author@example.org');
  assert.equal(parsed.children[3].text, 'Issue #123 handling');
  assert.deepEqual(parsed.children[3].tags, ['bug', 'priority']);
  assert.equal(parsed.children[4].text, 'Issue #456 only');
  assert.equal(parsed.children[4].tags, undefined);
});
await run('exportToMarkdown + importMarkdownDocument round-trip internalLink, #123 titles and relationships', async () => {
  let mdOut = '';
  const srcRoot: MindMapNode = {
    id: 'n_root',
    text: 'Doc #99',
    internalLink: { documentId: 'doc_other', nodeId: 'n_target' },
    children: [
      { id: 'n_a', text: 'Branch A', children: [] },
      { id: 'n_b', text: 'Issue #123', tags: ['v1'], children: [] },
    ],
  };
  const rels = [{ id: 'rel_1', fromId: 'n_a', toId: 'n_b', label: 'supports', style: 'dashed' as const }];
  let pendingText: Promise<string> | null = null;
  exportToMarkdown(srcRoot, 'test', (blob) => { pendingText = blob.text(); }, { relationships: rels });
  mdOut = await pendingText!;
  const imported = importMarkdownDocument(mdOut);
  assert.equal(imported.root.text, 'Doc #99');
  assert.deepEqual(imported.root.internalLink, { documentId: 'doc_other', nodeId: 'n_target' });
  assert.equal(imported.root.children[1].text, 'Issue #123');
  assert.deepEqual(imported.root.children[1].tags, ['v1']);
  assert.equal(imported.relationships?.length, 1);
  assert.equal(imported.relationships![0].fromId, imported.root.children[0].id);
  assert.equal(imported.relationships![0].toId, imported.root.children[1].id);
  assert.equal(imported.relationships![0].label, 'supports');
});
await run('layout memoization, collapsed subtree skip, and viewport culling preserve pinned nodes', () => {
  const sampleNode: MindMapNode = { id: 'm1', text: 'Memoized node with long text for wrapping check', children: [] };
  const m1 = measureNodeWithLines(sampleNode, 1, false);
  const m2 = measureNodeWithLines(sampleNode, 1, false);
  assert.equal(m1, m2);

  const manyChildren: MindMapNode[] = Array.from({ length: 150 }, (_, idx) => ({
    id: `c_${idx}`,
    text: `Topic ${idx}`,
    isExpanded: true,
    children: idx === 0 ? [{ id: 'gc_0', text: 'Grandchild 0', children: [] }] : [],
  }));
  const largeRoot: MindMapNode = {
    id: 'r_large',
    text: 'Large Root',
    isExpanded: true,
    children: [
      { id: 'collapsed', text: 'Collapsed', isExpanded: false, children: [{ id: 'hidden_child', text: 'Hidden', children: [] }] },
      ...manyChildren,
    ],
  };
  const layout = computeLayout(largeRoot, 'logic-right', THEMES['classic-blue']);
  assert.equal(layout.nodes.some(n => n.id === 'hidden_child'), false);
  const world = computeWorldViewport({ x: 0, y: 0, scale: 1 }, 800, 600, 50);
  const culled = cullViewportNodes(layout.nodes, world, { threshold: 120, pinnedIds: new Set(['c_149']) });
  assert.ok(culled.length < layout.nodes.length);
  assert.ok(culled.some(n => n.id === 'c_149'));
  const culledConns = cullViewportConnections(layout.connections, layout.nodes, world, 120);
  assert.ok(culledConns.length < layout.connections.length);
  assert.equal(culledConns.some(c => c.toId === 'gc_0'), false);
});
await run('uiText switches between Chinese default and English Zotero locale', () => {
  const g = globalThis as any;
  const origWindow = g.window;
  const hadWindow = Object.prototype.hasOwnProperty.call(g, 'window');
  const origZotero = g.Zotero;
  try {
    g.window = g;
    g.Zotero = { locale: 'en-US' };
    assert.equal(uiText('关联', 'Link'), 'Link');
    g.Zotero = { locale: 'zh-CN' };
    assert.equal(uiText('关联', 'Link'), '关联');
  } finally {
    g.Zotero = origZotero;
    if (hadWindow) g.window = origWindow;
    else delete g.window;
  }
});
console.log(`${passed} logic tests passed; ${failed} failed`);
if (failed) process.exitCode = 1;
