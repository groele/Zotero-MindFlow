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

test('item-pane selection switches, empty selection, cache hits, and refresh keep actions isolated', async () => {
  const f = fixture();
  const paper1 = f.paper('PANE_P1');
  paper1.title = 'First Paper';
  const pdf1 = f.attachment('PANE_PDF1', 1, paper1.id, '/storage/p1.pdf');
  pdf1.attachmentFilename = 'p1.pdf';
  const mapAtt = f.attachment('PANE_MAP1', 1, paper1.id, '/storage/p1.mindflow');
  mapAtt.attachmentFilename = 'p1.mindflow';
  mapAtt.title = 'p1.mindflow';
  paper1.attachments.push(pdf1.id, mapAtt.id);

  const paper2 = f.paper('PANE_P2');
  paper2.title = 'Second Paper Without PDF';

  f.host.registerItemPaneSection();
  const section = f.Zotero.ItemPaneManager.sections.get(f.host.itemPaneSectionID);
  const body = f.doc.createElement('div');
  const all = node => [node, ...node.children.flatMap(all)];
  const findByClass = cls => all(body).find(node => String(node.className || '').split(/\s+/).includes(cls));
  const findByAction = id => all(body).find(node => node.attrs?.['data-mindflow-action'] === id);
  const findExport = () => all(body).find(node => node.attrs?.['data-l10n-id'] === 'mindflow-item-pane-card-export');

  section.onRender({ body, item: pdf1 });
  const createBtn = findByClass('mf-btn-primary');
  const templateBtn = findByClass('mf-btn-template-create');
  const aiBtn = findByAction('ai');
  const pdfBtn = findByAction('pdf');
  const exportBtn = findExport();
  const workbenchBtn = findByAction('workbench');
  assert.ok(createBtn && templateBtn && aiBtn && pdfBtn && exportBtn && workbenchBtn);

  const opened = [];
  let exported = 0;
  f.host.openMindFlow = async (opts) => { opened.push(opts); };
  f.host.exportAttachmentToNote = async () => { exported++; };

  // Empty selection disables all item-scoped buttons and blocks stale clicks.
  section.onItemChange({ body, item: null, setEnabled() {} });
  assert.equal(createBtn.disabled, true);
  assert.equal(templateBtn.disabled, true);
  assert.equal(aiBtn.disabled, true);
  assert.equal(pdfBtn.disabled, true);
  assert.equal(exportBtn.disabled, true);
  assert.equal(createBtn.attrs['aria-disabled'], 'true');
  assert.equal(templateBtn.attrs['aria-disabled'], 'true');
  assert.equal(exportBtn.attrs['aria-disabled'], 'true');

  await createBtn.click({ preventDefault() {}, stopPropagation() {} });
  await templateBtn.click({ preventDefault() {}, stopPropagation() {} });
  await aiBtn.click({ preventDefault() {}, stopPropagation() {} });
  await pdfBtn.click({ preventDefault() {}, stopPropagation() {} });
  await exportBtn.click({ preventDefault() {}, stopPropagation() {} });
  assert.equal(opened.length, 0);
  assert.equal(exported, 0);

  await workbenchBtn.click({ preventDefault() {}, stopPropagation() {} });
  assert.equal(opened.length, 1);
  assert.equal(opened[0].mode, 'open');
  assert.equal(opened[0].targetMode, 'tab');
  assert.equal(opened[0].items, undefined);

  // Scheduled/state refresh while deselected must not resurrect Paper 1.
  const state = [...f.host._itemPaneStates][0];
  await state.refresh();
  assert.equal(createBtn.disabled, true);
  assert.equal(aiBtn.disabled, true);

  // Re-selecting the same PDF hits the signature cache and must re-enable all actions.
  section.onRender({ body, item: pdf1 });
  assert.equal(createBtn.disabled, false);
  assert.equal(templateBtn.disabled, false);
  assert.equal(aiBtn.disabled, false);
  assert.equal(pdfBtn.disabled, false);
  assert.equal(exportBtn.disabled, false);
  assert.equal(createBtn.attrs['aria-disabled'], undefined);
  assert.equal(templateBtn.attrs['aria-disabled'], undefined);
  assert.equal(exportBtn.attrs['aria-disabled'], undefined);

  // Switching via onItemChange without body re-renders the active body for Paper 2.
  section.onItemChange({ item: paper2, setEnabled() {} });
  assert.equal(findByClass('mf-target-title')?.textContent, 'Second Paper Without PDF');
  assert.equal(findByAction('pdf'), undefined);

  // Empty fallback button resets disabled in finally even if openMindFlow throws.
  section.onRender({ body, item: null });
  const fallbackBtn = findByClass('mf-btn-primary');
  f.host.openMindFlow = async () => { throw new Error('simulated blank failure'); };
  await assert.rejects(() => fallbackBtn.click({ preventDefault() {}, stopPropagation() {} }), /simulated blank failure/);
  assert.equal(fallbackBtn.disabled, false);
});

test('context routing clears stale initial ai/items targets while preserving collection target until switch', () => {
  const f = fixture();
  const paper = f.paper('CTX_PAPER');

  // 1. Initial AI tab receiving an unrelated blank document drops stale ai: key and items array.
  f.host.openMindFlow({ mode: 'ai_analyze', items: [paper] }, f.win);
  const aiTab = f.tabs._tabs.find(tab => tab.type === 'mindflow');
  const aiFrame = f.tabs.getTabContent(aiTab.id).children[0];
  assert.match(aiTab.data.targetItemId, /^ai:/);
  assert.equal(aiTab.data.docId, null);
  assert.equal(f.host.updateWorkspaceContext(aiFrame.contentWindow, {
    documentId: 'doc_blank_after_ai',
    title: '未命名空白导图',
    unlinkedContainer: false,
    aiDraft: false,
  }), true);
  assert.equal(aiTab.data.targetItemId, 'document:doc_blank_after_ai');
  assert.equal(aiTab.data.items.length, 0);
  assert.equal(aiTab.data.parentItemUri, null);
  assert.equal(aiTab.data.mode, 'open_document');

  // 2. Collection tab keeps collection: key on first unlinked-container archive, then clears on doc switch.
  f.host.openMindFlow({
    mode: 'create_from_collection',
    collectionLibraryID: 1,
    collectionKey: 'COL_KEY_1',
    collectionName: 'Research Collection',
    items: [paper],
  }, f.win);
  const colTab = f.tabs._tabs.at(-1);
  const colFrame = f.tabs.getTabContent(colTab.id).children[0];
  assert.equal(colTab.data.targetItemId, 'collection:1:COL_KEY_1');
  f.host.updateWorkspaceContext(colFrame.contentWindow, {
    documentId: 'doc_collection_1',
    title: 'Research Collection',
    parentItemUri: 'zotero://select/library/items/UNLINKED01',
    unlinkedContainer: true,
    aiDraft: false,
  });
  assert.equal(colTab.data.targetItemId, 'collection:1:COL_KEY_1');
  assert.equal(colTab.data.collectionKey, 'COL_KEY_1');

  f.host.updateWorkspaceContext(colFrame.contentWindow, {
    documentId: 'doc_other_2',
    title: 'Other Doc',
    unlinkedContainer: false,
    aiDraft: false,
  });
  assert.equal(colTab.data.targetItemId, 'document:doc_other_2');
  assert.equal(colTab.data.collectionKey, undefined);
  assert.equal(colTab.data.collectionName, undefined);
  assert.equal(colTab.data.mode, 'open_document');

  // 3. Open-workspace tab keeps mode === 'open' on document updates so workspace reuse keeps working.
  const fWs = fixture();
  fWs.host.openMindFlow({ mode: 'open' }, fWs.win);
  const wsTab = fWs.tabs._tabs.find(tab => tab.type === 'mindflow');
  const wsFrame = fWs.tabs.getTabContent(wsTab.id).children[0];
  assert.equal(wsTab.data.mode, 'open');
  fWs.host.updateWorkspaceContext(wsFrame.contentWindow, { documentId: 'doc_ws_1', title: 'Workspace Map' });
  assert.equal(wsTab.data.targetItemId, 'document:doc_ws_1');
  assert.equal(wsTab.data.mode, 'open');

  // 4. Standalone window clears initial items: key when blank doc reports without parent URI.
  const standalone = { closed: false };
  f.host._standaloneWindows = new Map([[`items:${paper.libraryID}:${paper.key}`, standalone]]);
  f.host.updateStandaloneContext(standalone, { documentId: 'doc_standalone_blank', title: 'Standalone Blank' });
  assert.equal(f.host._standaloneWindows.has(`items:${paper.libraryID}:${paper.key}`), false);
  assert.equal(f.host._standaloneWindows.get('document:doc_standalone_blank'), standalone);
});
