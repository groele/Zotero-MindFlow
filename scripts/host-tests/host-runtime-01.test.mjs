/**
 * Zotero MindFlow - host runtime tests (shard 01).
 * Split from the former monolithic test-host.mjs; behaviour is unchanged.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  root, runtime, fixture, hangingTurn, llmPref, llmGroups, llmFixture,
} from '../host-fixture.mjs';

test('persistence domains stay under 360 lines with no duplicate facade methods', () => {
  for (const name of ['storage.js', 'workspace-lifecycle.js', 'note-sync.js', 'item-pane-visibility.js']) {
    const code = fs.readFileSync(path.join(root, 'chrome/content/scripts/modules', name), 'utf8');
    assert.ok(code.trimEnd().split(/\r?\n/).length <= 360, name);
  }
  assert.doesNotMatch(runtime, /if \(mfStorage\) return/);
  assert.doesNotMatch(runtime, /async drainPendingWrites\(/);
  assert.doesNotMatch(runtime, /const directory = PathUtils.join\(root, 'mindflow', 'workspace'\)/);
});

test('editor relationship schema survives storage and outline export without obsolete endpoint names', async () => {
  const f = fixture(), document = f.map();
  document.root.children = [{ id: 'child', text: 'evidence', children: [] }];
  document.relationships = [{ id: 'edge', fromId: 'root', toId: 'child', label: 'supports', style: 'dashed' }];
  const saved = await f.host.workspaceStorage('commitDocument', { doc: document, expectedRevision: 0 });
  assert.deepEqual(JSON.parse(await f.host.workspaceStorage('get', { key: 'mindflow_doc_doc_a' })).relationships, document.relationships);
  const parent = f.paper('EDGE0001'), attachment = f.attachment('EDGEMAP1', 1, parent.id, '/edges.mindflow');
  f.disk.set(attachment.path, JSON.stringify(saved));
  await f.host.exportAttachmentToNote(attachment, f.win);
  assert.equal(parent.notes.length, 1);
  for (const relationships of [[{ id: 'old', fromNodeId: 'root', toNodeId: 'child' }],
    [{ id: 'dangling', fromId: 'root', toId: 'missing' }]]) {
    await assert.rejects(() => f.host.workspaceStorage('commitDocument', {
      doc: { ...saved, relationships }, expectedRevision: saved.revision,
    }), /关系线/);
  }
});

test('queued mutation snapshots revision and force flags before the caller can change them', async () => {
  const f = fixture();
  await f.host.workspaceStorage('commitDocument', { doc: f.map(), expectedRevision: 0 });
  const payload = { doc: f.map(), expectedRevision: 0, force: false };
  const pending = f.host.workspaceStorage('commitDocument', payload);
  payload.expectedRevision = 1;
  payload.force = true;
  await assert.rejects(() => pending, /CONFLICT/);
  assert.equal(JSON.parse(await f.host.workspaceStorage('get', { key: 'mindflow_doc_doc_a' })).revision, 1);
});

test('draining includes archive work appended while a close save is settling', async () => {
  const f = fixture();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  f.host._closeSaveQueue = Promise.resolve().then(() => { f.host._archiveWriteQueue = gate; });
  let drained = false;
  const pending = f.host.drainPendingWrites().then(() => { drained = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(drained, false);
  release();
  await pending;
});

test('late outline export cannot write after disable deletes the public singleton', async () => {
  const f = fixture(), parent = f.paper('LATEOUTA');
  const att = f.attachment('MAPAAAAA', 1, parent.id, '/late.mindflow');
  f.disk.set(att.path, JSON.stringify(f.map()));
  const read = f.IOUtils.readUTF8;
  f.IOUtils.readUTF8 = async path => { const contents = await read(path); await f.host.shutdown(); return contents; };
  await assert.rejects(() => f.host.exportAttachmentToNote(att, f.win), /停用|disabled/);
  assert.equal(parent.notes.length, 0);
});

test('drainPendingWrites waits for the actual storage module and work enqueued while draining', async () => {
  const f = fixture();
  let release, entered;
  const started = new Promise(resolve => { entered = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const original = f.IOUtils.writeUTF8;
  f.IOUtils.writeUTF8 = async (...args) => { entered(); await gate; return original(...args); };
  const write = f.host.workspaceStorage('commitDocument', { doc: f.map(), expectedRevision: 0 });
  await started;
  let drained = false;
  const draining = f.host.drainPendingWrites().then(() => { drained = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(drained, false, 'shutdown must not finish with a blocked module write');
  const second = f.host.workspaceStorage('commitDocument', { doc: f.map('doc_second'), expectedRevision: 0 });
  release();
  await draining;
  assert.ok(f.disk.has('/data/mindflow/workspace/mindflow_doc_doc_second.json'));
  await Promise.all([write, second]);
});

test('failed close capture can retry the same unsaved editor snapshot', async () => {
  const f = fixture(), original = f.IOUtils.writeUTF8;
  const editor = { _mindflowCaptureState: () => ({ doc: { ...f.map(), revision: 0 } }) };
  f.IOUtils.writeUTF8 = async () => { throw new Error('disk temporarily unavailable'); };
  await f.host.captureWorkspaceOnClose(editor);
  f.IOUtils.writeUTF8 = original;
  await f.host.captureWorkspaceOnClose(editor);
  assert.ok(await f.host.workspaceStorage('get', { key: 'mindflow_doc_doc_a' }));
});

test('disable captures standalone editors, drains writes and closes owned windows', async () => {
  const f = fixture();
  let closed = false;
  const standalone = { closed: false, _mindflowCaptureState: () => ({ doc: { ...f.map(), revision: 0 } }),
    close() { closed = true; this.closed = true; } };
  f.host._standaloneWindows = new Map([['workspace', standalone]]);
  await f.host.shutdown();
  assert.equal(closed, true);
  assert.ok(f.disk.has('/data/mindflow/workspace/mindflow_doc_doc_a.json'));
  assert.equal(f.Zotero.MindFlow, undefined);
});

for (const invalidation of ['deleted', 'inTrash', 'readonly', 'attachment-deleted']) {
  test(`outline export rechecks ${invalidation} after asynchronous file read`, async () => {
    const f = fixture(), parent = f.paper('OUTLINEA');
    const att = f.attachment('MAPAAAAA', 1, parent.id, '/outline.mindflow');
    f.disk.set(att.path, JSON.stringify(f.map()));
    const read = f.IOUtils.readUTF8;
    f.IOUtils.readUTF8 = async path => {
      const content = await read(path);
      if (invalidation === 'readonly') parent.isEditable = () => false;
      else if (invalidation === 'attachment-deleted') att.deleted = true;
      else parent[invalidation] = true;
      return content;
    };
    await assert.rejects(() => f.host.exportAttachmentToNote(att, f.win), /只读|回收站|read-only|Trash/i);
    assert.equal(parent.notes.length, 0);
  });
}

test('item-pane sidenav localization is tooltip-only so the narrow rail stays icon-only', () => {
  const zh = fs.readFileSync(path.join(root, 'locale/zh-CN/mindflow.ftl'), 'utf8');
  const en = fs.readFileSync(path.join(root, 'locale/en-US/mindflow.ftl'), 'utf8');
  assert.match(runtime, /sidenav:\s*\{\s*l10nID:\s*'mindflow-item-pane-sidenav'/);
  for (const locale of [zh, en]) {
    const block = locale.match(/mindflow-item-pane-sidenav\s*=([\s\S]*?)(?=\n\S|$)/)?.[1] || '';
    assert.match(block, /\.tooltiptext\s*=/);
    assert.doesNotMatch(block, /\.label\s*=/);
  }
});

test('new workspace frames use a versioned page URL to invalidate old chrome caches', () => {
  const f = fixture();
  f.host.openMindFlow({ mode: 'open' }, f.win);
  const tab = f.tabs._tabs.find(tab => tab.type === 'mindflow');
  const frame = f.tabs.getTabContent(tab.id).children[0];
  assert.equal(frame.attrs.src, f.host.workspaceURL);
  assert.match(frame.attrs.src, /index\.html\?v=development$/);
});

test('host inbox concurrent additions preserve both durable records', async () => {
  const f = fixture(), item = id => ({ id, text: id, createdAt: 1, isProcessed: false });
  await Promise.all(['one', 'two'].map(id => f.host.workspaceStorage('mutateInbox', { additions: [item(id)] })));
  const items = JSON.parse(await f.host.workspaceStorage('get', { key: 'mindflow_inbox_items' }));
  assert.equal(items.length, 2); assert.ok(f.disk.has('/data/mindflow/workspace/mindflow_inbox_items.json'));
});
test('host inbox migrates legacy preferences and serializes restore plus processing', async () => {
  const f = fixture(), item = id => ({ id, text: id, createdAt: 1, isProcessed: false });
  f.prefs.set('mindflow.mindflow_inbox_items', JSON.stringify([item('legacy')]));
  await Promise.all([f.host.workspaceStorage('mutateInbox', { processedId: 'legacy', isProcessed: true }),
    f.host.workspaceStorage('mutateInbox', { additions: [item('restored')] })]);
  const items = JSON.parse(await f.host.workspaceStorage('get', { key: 'mindflow_inbox_items' }));
  assert.equal(items.length, 2); assert.equal(items.find(item => item.id === 'legacy').isProcessed, true);
  assert.equal(f.prefs.get('mindflow.mindflow_inbox_items'), undefined);
  await f.host.workspaceStorage('mutateInbox', { clearProcessed: true });
  assert.equal(JSON.parse(await f.host.workspaceStorage('get', { key: 'mindflow_inbox_items' }))[0].id, 'restored');
});
test('invalid inbox additions cannot overwrite a valid inbox', async () => {
  const f = fixture();
  await f.host.workspaceStorage('mutateInbox', { additions: [{ id: 'valid', text: 'v', createdAt: 1, isProcessed: false }] });
  await assert.rejects(() => f.host.workspaceStorage('mutateInbox', { additions: [{ id: 'bad', text: 1 }] }), /无效/);
  assert.equal(JSON.parse(await f.host.workspaceStorage('get', { key: 'mindflow_inbox_items' })).length, 1);
});
test('inbox write verification failure is reported rather than a successful operation', async () => {
  const f = fixture(); const write = f.IOUtils.writeUTF8;
  f.IOUtils.writeUTF8 = async (...args) => { await write(...args); f.disk.set(args[0], '[]'); };
  await assert.rejects(() => f.host.workspaceStorage('mutateInbox', { additions: [{ id: 'v', text: 'v', createdAt: 1, isProcessed: false }] }), /校验失败/);
});

test('host MINDFLOW_LOCATE_ITEM selects database item by DOI and switches to library tab', async () => {
  const f = fixture();
  f.host.addToWindow(f.win);
  f.host.openMindFlow({ mode: 'open' }, f.win);
  const tab = f.tabs._tabs.find(t => t.type === 'mindflow');
  const frame = f.tabs.getTabContent(tab.id).children[0];

  const paper = f.paper('PAPER_DOI');
  paper.setField('DOI', '10.1038/s41563-022-01459-z');
  let selectedItemId = null;
  f.win.ZoteroPane.selectItem = (id) => { selectedItemId = id; };
  f.tabs.selectedID = 'other-tab';

  const onMessage = f.listeners.get('message');
  assert.ok(typeof onMessage === 'function', 'message listener registered');

  onMessage({
    source: frame.contentWindow,
    origin: 'chrome://mindflow',
    data: {
      type: 'MINDFLOW_LOCATE_ITEM',
      requestId: 'req-doi-1',
      key: 'https://doi.org/10.1038/s41563-022-01459-z',
      text: 'DOI: 10.1038/s41563-022-01459-z',
    },
  });

  await new Promise((r) => setTimeout(r, 20));

  assert.equal(f.tabs.selectedID, 'zotero-pane');
  assert.equal(selectedItemId, paper.id);
  const replied = frame.contentWindow.messages.find(m => m.type === 'MINDFLOW_LOCATE_ITEM_RESULT');
  assert.equal(replied?.success, true);
  assert.equal(replied?.requestId, 'req-doi-1');
});

test('host MINDFLOW_LOCATE_ITEM matches item even if library DOI field contains full URL prefix', async () => {
  const f = fixture();
  f.host.addToWindow(f.win);
  f.host.openMindFlow({ mode: 'open' }, f.win);
  const tab = f.tabs._tabs.find(t => t.type === 'mindflow');
  const frame = f.tabs.getTabContent(tab.id).children[0];

  const paper = f.paper('PAPER_FULL_URL_DOI');
  paper.setField('DOI', 'https://doi.org/10.1038/s41563-022-01459-z');
  let selectedItemId = null;
  f.win.ZoteroPane.selectItem = (id) => { selectedItemId = id; };
  f.tabs.selectedID = 'other-tab';

  const onMessage = f.listeners.get('message');
  onMessage({
    source: frame.contentWindow,
    origin: 'chrome://mindflow',
    data: {
      type: 'MINDFLOW_LOCATE_ITEM',
      requestId: 'req-doi-url-1',
      key: '10.1038/s41563-022-01459-z',
    },
  });

  await new Promise((r) => setTimeout(r, 20));

  assert.equal(f.tabs.selectedID, 'zotero-pane');
  assert.equal(selectedItemId, paper.id);
  const replied = frame.contentWindow.messages.find(m => m.type === 'MINDFLOW_LOCATE_ITEM_RESULT' && m.requestId === 'req-doi-url-1');
  assert.equal(replied?.success, true);
});

test('host MINDFLOW_LOCATE_ITEM matches item when DOI is stored in extra field', async () => {
  const f = fixture();
  f.host.addToWindow(f.win);
  f.host.openMindFlow({ mode: 'open' }, f.win);
  const tab = f.tabs._tabs.find(t => t.type === 'mindflow');
  const frame = f.tabs.getTabContent(tab.id).children[0];

  const paper = f.paper('PAPER_EXTRA_DOI');
  paper.setField('extra', 'Publisher: Nature\nDOI: 10.1038/s41563-022-01459-z');
  let selectedItemId = null;
  f.win.ZoteroPane.selectItem = (id) => { selectedItemId = id; };
  f.tabs.selectedID = 'other-tab';

  const onMessage = f.listeners.get('message');
  onMessage({
    source: frame.contentWindow,
    origin: 'chrome://mindflow',
    data: {
      type: 'MINDFLOW_LOCATE_ITEM',
      requestId: 'req-doi-extra-1',
      note: 'DOI: 10.1038/s41563-022-01459-z',
    },
  });

  await new Promise((r) => setTimeout(r, 20));

  assert.equal(f.tabs.selectedID, 'zotero-pane');
  assert.equal(selectedItemId, paper.id);
  const replied = frame.contentWindow.messages.find(m => m.type === 'MINDFLOW_LOCATE_ITEM_RESULT' && m.requestId === 'req-doi-extra-1');
  assert.equal(replied?.success, true);
});
