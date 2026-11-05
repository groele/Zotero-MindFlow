/**
 * Zotero MindFlow - host runtime tests (shard 07).
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

test('import shortcut queues before readiness and dispatches again in an existing workspace', () => {
  const f = fixture();
  f.host.openMindFlow({ mode: 'open' }, f.win);
  const tab = f.tabs._tabs.find(tab => tab.type === 'mindflow');
  const frame = f.tabs.getTabContent(tab.id).children[0];
  tab.data.targetItemId = 'attachment:1:LOADED01';
  f.host.openMindFlow({ mode: 'open' }, f.win);
  assert.equal(f.tabs._tabs.filter(tab => tab.type === 'mindflow').length, 1, 'workspace navigation must preserve its loaded editor');
  f.host.openMindFlow({ mode: 'import_file' }, f.win);
  assert.equal(frame._mindflowPending.action.mode, 'import_file');
  frame._mindflowReady = true;
  f.host.openMindFlow({ mode: 'import_file' }, f.win);
  assert.equal(frame.contentWindow.messages.at(-1).action.mode, 'import_file');
  assert.equal(f.tabs._tabs.filter(tab => tab.type === 'mindflow').length, 1);
});

test('privileged message ownership excludes unknown and closed editor windows', () => {
  const f = fixture();
  assert.equal(f.host.ownsWorkspaceWindow(f.win), false);
  f.host.openMindFlow({ mode: 'open' }, f.win);
  const tab = f.tabs._tabs.find(tab => tab.type === 'mindflow');
  const frame = f.tabs.getTabContent(tab.id).children[0];
  assert.equal(f.host.ownsWorkspaceWindow(frame.contentWindow), true);
  const standalone = { closed: false };
  f.host._standaloneWindows = new Map([['workspace', standalone]]);
  assert.equal(f.host.ownsWorkspaceWindow(standalone), true);
  standalone.closed = true;
  assert.equal(f.host.ownsWorkspaceWindow(standalone), false);
  assert.equal(f.host.ownsWorkspaceWindow({}), false);
});

test('native export saves verified bytes, preserves extensions, and handles cancellation and read-back failure', async () => {
  let cancel = false;
  class Picker {
    modeSave = 1; returnOK = 0; returnCancel = 1; returnReplace = 2; file = '/export/result.json';
    init() {} appendFilter() {} async show() { assert.ok(this.defaultString.endsWith('.json')); return cancel ? 1 : 0; }
  }
  const f = fixture({ exportPicker: Picker }), source = { closed: false };
  f.host._standaloneWindows = new Map([['export', source]]);
  const payload = { filename: 'x'.repeat(250) + '.json', bytes: new Uint8Array([123,125]) };
  const saved = await f.host.saveExportFile(source, payload);
  assert.equal(saved.path, '/export/result.json');
  assert.deepEqual(Array.from(f.disk.get(saved.path)), [123,125]);
  cancel = true;
  assert.equal((await f.host.saveExportFile(source, payload)).cancelled, true);
  cancel = false;
  f.IOUtils.read = async () => new Uint8Array([0]);
  await assert.rejects(() => f.host.saveExportFile(source, payload), /校验失败/);
  await assert.rejects(() => f.host.saveExportFile({closed:false}, payload), /来源/);
});

test('serializeZoteroItem reflects read-only and deleted status in isEditable flag', () => {
  const f = fixture();
  const normal = f.paper('NORMAL_ITEM');
  normal.isEditable = () => true;
  const serializedNormal = f.host.serializeZoteroItem(normal);
  assert.equal(serializedNormal.isEditable, true);

  const readonly = f.paper('READONLY_ITEM');
  readonly.isEditable = () => false;
  const serializedReadonly = f.host.serializeZoteroItem(readonly);
  assert.equal(serializedReadonly.isEditable, false);

  const deleted = f.paper('DELETED_ITEM');
  deleted.deleted = true;
  delete deleted.isEditable;
  const serializedDeleted = f.host.serializeZoteroItem(deleted);
  assert.equal(serializedDeleted.isEditable, false);
});

test('saveMindMapToItem protects read-only and deleted items against writes', async () => {
  const f = fixture();
  const roPaper = f.paper('ROARCH01');
  roPaper.isEditable = () => false;
  const doc = f.map('doc_ro_guard', 'Readonly Map');

  const resultRo = await f.host.saveMindMapToItem({ doc, parentItemKey: roPaper.key });
  assert.equal(resultRo.success, false);
  assert.match(resultRo.message, /只读/);
  assert.equal(roPaper.attachments.length, 0);

  const delPaper = f.paper('DELARC01');
  delPaper.deleted = true;
  delete delPaper.isEditable;

  const resultDel = await f.host.saveMindMapToItem({ doc, parentItemKey: delPaper.key });
  assert.equal(resultDel.success, false);
  assert.equal(delPaper.attachments.length, 0);
});

test('item-pane onRender displays read-only badge and disables creation controls on read-only items', () => {
  const f = fixture();
  f.host.registerItemPaneSection();
  const section = f.Zotero.ItemPaneManager.sections.get(f.host.itemPaneSectionID);

  const roPaper = f.paper('RO_UI_ITEM');
  roPaper.isEditable = () => false;

  const body = f.doc.createElement('div');
  section.onRender({ body, item: roPaper });

  const all = node => [node, ...node.children.flatMap(all)];
  const allNodes = all(body);

  const roBadge = allNodes.find(node => node.className && node.className.includes('mf-status-readonly'));
  assert.ok(roBadge, 'Read-only badge must be present');

  const createBtn = allNodes.find(node => node.localName === 'button' && node.className && node.className.includes('mf-btn-primary'));
  assert.ok(createBtn, 'Primary create button must exist');
  assert.equal(createBtn.disabled, true, 'Primary create button must be disabled on read-only item');
});


test('item-pane onRender disables outline export button on read-only items', () => {
  const f = fixture();
  f.host.registerItemPaneSection();
  const section = f.Zotero.ItemPaneManager.sections.get(f.host.itemPaneSectionID);

  const roPaper = f.paper('RO_EXPORT_ITEM');
  roPaper.isEditable = () => false;

  const att = {
    id: 9981,
    parentItemID: roPaper.id,
    libraryID: roPaper.libraryID,
    deleted: false,
    isAttachment: () => true,
    attachmentFilename: 'readonly_map.mindflow',
    getField: () => 'Readonly Map',
  };
  f.items.set(9981, att);
  roPaper.attachments.push(9981);
  roPaper.getAttachments = () => [9981];

  const body = f.doc.createElement('div');
  section.onRender({ body, item: roPaper });

  const all = node => [node, ...node.children.flatMap(all)];
  const allNodes = all(body);
  const exportBtn = allNodes.find(node => node.attrs && node.attrs['data-l10n-id'] === 'mindflow-item-pane-card-export');
  assert.ok(exportBtn, 'Export button must be present in map card');
  assert.equal(exportBtn.disabled, true, 'Export outline button must be disabled for read-only parent item');
});

test('exportAttachmentToNote rejects read-only and deleted parent items', async () => {
  const f = fixture();

  const roPaper = f.paper('RO_NOTE_PARENT');
  roPaper.isEditable = () => false;
  const roAtt = {
    id: 9982,
    parentItemID: roPaper.id,
    libraryID: roPaper.libraryID,
    deleted: false,
    isAttachment: () => true,
    getFilePathAsync: async () => 'C:/dummy/map.mindflow',
  };
  f.items.set(9982, roAtt);

  await assert.rejects(
    () => f.host.exportAttachmentToNote(roAtt, f.win),
    /只读|read-only/i,
    'Should reject exportAttachmentToNote on read-only parent item'
  );

  const delPaper = f.paper('DEL_NOTE_PARENT');
  delPaper.deleted = true;
  delete delPaper.isEditable;
  const delAtt = {
    id: 9983,
    parentItemID: delPaper.id,
    libraryID: delPaper.libraryID,
    deleted: false,
    isAttachment: () => true,
    getFilePathAsync: async () => 'C:/dummy/map.mindflow',
  };
  f.items.set(9983, delAtt);

  await assert.rejects(
    () => f.host.exportAttachmentToNote(delAtt, f.win),
    /删除|deleted|只读|read-only/i,
    'Should reject exportAttachmentToNote on deleted parent item'
  );
});
