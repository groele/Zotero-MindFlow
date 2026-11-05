/**
 * Zotero MindFlow - host runtime tests (shard 06).
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

test('item pane section resolves parent for literature item and sibling PDF, displays names without expanding, and allows adding map', async () => {
  const f = fixture();
  const paper = f.paper('PAPER_ITEM_PANE');
  const pdf = {
    id: 991,
    key: 'PDF991XX',
    libraryID: 1,
    parentItemID: paper.id,
    attachmentFilename: 'paper.pdf',
    title: 'paper.pdf',
    isAttachment: () => true,
    isRegularItem: () => false,
  };
  f.items.set(pdf.id, pdf);

  const mapAtt = f.attachment('MAP992XX', 1, paper.id, '/storage/992.mindflow');
  mapAtt.title = 'Deep Learning Survey (MindFlow 导图源文件)';
  paper.attachments.push(pdf.id, mapAtt.id);

  // 1. Target resolution
  assert.equal(f.host.resolveLiteratureTarget(paper)?.id, paper.id);
  assert.equal(f.host.resolveLiteratureTarget(pdf)?.id, paper.id);

  // 2. getMindflowAttachments when queried with paper or sibling PDF
  const mapsFromPaper = f.host.getMindflowAttachments(paper);
  const mapsFromPdf = f.host.getMindflowAttachments(pdf);
  assert.equal(mapsFromPaper.length, 1);
  assert.equal(mapsFromPdf.length, 1);
  assert.equal(mapsFromPaper[0].id, mapAtt.id);
  assert.equal(mapsFromPdf[0].id, mapAtt.id);

  // 3. Register section
  f.host.registerItemPaneSection();
  assert.ok(f.host.itemPaneSectionID);
  const sectionConfig = f.Zotero.ItemPaneManager.sections.get(f.host.itemPaneSectionID);
  assert.ok(sectionConfig);

  // 4. onItemChange enables for paper and sibling PDF
  let enabled = false;
  sectionConfig.onItemChange({ item: paper, setEnabled: (v) => { enabled = v; } });
  assert.equal(enabled, true);
  enabled = false;
  sectionConfig.onItemChange({ item: pdf, setEnabled: (v) => { enabled = v; } });
  assert.equal(enabled, true);

  // 5. onRender with sibling PDF
  const body = f.doc.createElement('div');
  let summaryArg = null;
  sectionConfig.onRender({
    body,
    item: pdf,
    setSectionSummary: (s) => { summaryArg = s; }
  });

  assert.equal(summaryArg, '1');
  assert.ok(body.children.length > 0);
  const container = body.children[0];

  // Inspect the rendered content: mind map card displaying name, not expanding nodes
  const card = container.children.flatMap(c => c.children || []).find(c => c.title?.includes('Deep Learning Survey'));
  assert.ok(card, 'Mind map card should be rendered');
  assert.equal(card.title, '打开导图：Deep Learning Survey');

  // Verify clicking map card calls openMindflowAttachment
  let openedAttachment = null;
  f.host.openMindflowAttachment = (att) => { openedAttachment = att; };
  card.click?.(); // or click listener
  if (card['click']) card['click']({ preventDefault() {}, stopPropagation() {} });
  assert.equal(openedAttachment?.id, mapAtt.id);

  // The template creation action remains available when maps already exist.
  const allNodes = node => [node, ...node.children.flatMap(allNodes)];
  const addBtn = allNodes(container).find(c => c.className === 'mf-btn-primary');
  assert.ok(addBtn, 'Add mind map button must be present');

  // Verify clicking "+ 新增思维导图" invokes openMindFlow with parent paper
  let openOptions = null;
  f.host.openMindFlow = (opts) => { openOptions = opts; };
  if (addBtn['click']) addBtn['click']({ preventDefault() {}, stopPropagation() {} });
  assert.ok(openOptions);
  assert.equal(openOptions.mode, 'create_from_selection');
  assert.equal(openOptions.items[0]?.id, paper.id);
  assert.equal(openOptions.forceNew, true);
});

test('item pane refresh follows the newly selected item and stops observing after destroy', () => {
  const f = fixture();
  const first = f.paper('PAPER_FIRST');
  const second = f.paper('PAPER_SECOND');
  f.host.registerItemPaneSection();
  const section = f.Zotero.ItemPaneManager.sections.get(f.host.itemPaneSectionID);
  const body = f.doc.createElement('div');
  let renderCount = 0;
  const originalReplaceChildren = body.replaceChildren;
  body.replaceChildren = function (...children) { renderCount += 1; return originalReplaceChildren.apply(this, children); };
  section.onRender({ body, item: first });
  section.onItemChange({ item: second, setEnabled() {} });
  const all = node => [node, ...node.children.flatMap(all)];
  const create = all(body).find(node => node.className === 'mf-btn-primary');
  let options = null;
  f.host.openMindFlow = value => { options = value; };
  create.click({ preventDefault() {}, stopPropagation() {} });
  assert.equal(options.items[0].id, second.id);
  const countAtDestroy = renderCount;
  section.onDestroy({ body });
  f.Zotero.Notifier.trigger('modify', 'item', [second.id]);
  assert.equal(renderCount, countAtDestroy);
});

test('item pane stays expandable without a literature selection and creates a blank map', () => {
  const f = fixture();
  f.host.registerItemPaneSection();
  const section = f.Zotero.ItemPaneManager.sections.get(f.host.itemPaneSectionID);
  let enabled = false;
  section.onItemChange({ item: null, setEnabled: value => { enabled = value; } });
  assert.equal(enabled, true);

  const body = f.doc.createElement('div');
  section.onRender({ body, item: null });
  const container = body.children[0];
  const create = container.children.find(node => node.localName === 'button');
  assert.equal(create.textContent, '新建空白思维导图');
  let options = null;
  f.host.openMindFlow = value => { options = value; };
  create.click({ preventDefault() {}, stopPropagation() {} });
  assert.equal(options.mode, 'create_blank');
  assert.equal(options.forceNew, true);
});

test('item-pane makes quick actions available while preserving native collapsed state', () => {
  const f = fixture();
  f.host.registerItemPaneSection();
  const section = f.Zotero.ItemPaneManager.sections.get(f.host.itemPaneSectionID);
  const collapsible = { empty: true, open: false,
    removeAttribute(name) { if (name === 'empty') this.empty = false; } };
  const body = Object.assign(f.doc.createElement('div'), { parentElement: collapsible, isConnected: true });
  let expand;
  f.doc.defaultView = { requestAnimationFrame: callback => { expand = callback; } };
  section.onInit({ doc: f.doc, body });
  assert.equal(collapsible.empty, false);
  assert.equal(collapsible.open, false);
  collapsible.open = false;
  expand();
  assert.equal(collapsible.empty, false);
  assert.equal(collapsible.open, false);
  section.onDestroy({ body });
  collapsible.empty = true;
  expand();
  assert.equal(collapsible.empty, true, 'a detached pane must not be resurrected by a late animation frame');
});

test('native sidenav navigation expands only its section and detaches its exact listener', () => {
  const f = fixture();
  f.host.registerItemPaneSection();
  const config = f.Zotero.ItemPaneManager.sections.get(f.host.itemPaneSectionID);
  let navigate, removed;
  f.doc.addEventListener = (type, listener, capture) => { if (type === 'click' && capture) navigate = listener; };
  f.doc.removeEventListener = (type, listener, capture) => { if (type === 'click' && capture) removed = listener; };
  const owner = { open: false, removeAttribute() {}, getAttribute: () => 'mindflow-pane' };
  const body = Object.assign(f.doc.createElement('div'), { parentElement: owner });
  config.onInit({ doc: f.doc, body });
  assert.equal(owner.open, false);
  navigate({ button: 0, target: { closest: () => ({ getAttribute: () => 'other-pane' }) } });
  assert.equal(owner.open, false);
  navigate({ button: 0, target: { closest: () => ({ getAttribute: () => 'mindflow-pane' }) } });
  assert.equal(owner.open, true);
  config.onDestroy({ body });
  assert.equal(removed, navigate);
  owner.open = false;
  navigate({ button: 0, target: { closest: () => ({ getAttribute: () => 'mindflow-pane' }) } });
  assert.equal(owner.open, false);
});

test('sidebar quick actions follow the selected PDF parent and keep standalone imports unlinked', async () => {
  const f = fixture(), paper = f.paper('QUICK001');
  const pdf = f.attachment('QUICKPDF', 1, paper.id, '/storage/paper.pdf');
  pdf.attachmentFilename = 'paper.pdf';
  paper.attachments.push(pdf.id);
  f.host.registerItemPaneSection();
  const config = f.Zotero.ItemPaneManager.sections.get(f.host.itemPaneSectionID);
  const body = f.doc.createElement('div');
  config.onRender({ body, item: pdf });
  const all = node => [node, ...node.children.flatMap(all)];
  const action = id => all(body).find(node => node.attrs['data-mindflow-action'] === id);
  const opened = [];
  f.host.openMindFlow = options => opened.push(options);
  await action('ai').click();
  assert.equal(opened[0].mode, 'ai_analyze');
  assert.equal(opened[0].items[0].id, paper.id);
  await action('workspace').click();
  await action('import').click();
  await action('blank').click();
  assert.deepEqual(opened.slice(1).map(o => o.mode), ['open', 'import_file', 'create_blank']);
  assert.ok(opened.slice(1).every(o => !o.items));
  assert.equal(action('pdf').disabled, false);
  let readerID;
  f.Zotero.Reader = { open: id => { readerID = id; } };
  await action('pdf').click();
  assert.equal(readerID, pdf.id);
  config.onItemChange({ item: null, setEnabled() {} });
  assert.equal(action('ai').disabled, true);
  assert.equal(action('pdf').disabled, true);
  await action('ai').click();
  assert.equal(opened.length, 4, 'disabled AI action must not open another paper');
  assert.equal(action('import').disabled, false);
  await action('workbench').click();
  assert.equal(opened[4].mode, 'open');
  assert.equal(opened[4].targetMode, 'tab');
  assert.equal(opened[4].items, undefined, 'workbench must not bind the selected paper');
  assert.equal(opened[4].forceNew, undefined, 'workbench must not create another document');
});

test('sidebar PDF works without a sandbox window and awaits reader failures before fallback', async () => {
  const f = fixture({ omitWindow: true }), paper = f.paper('PDFOPEN1');
  const pdf = f.attachment('PDFOPEN2', 1, paper.id, '/paper.pdf');
  pdf.attachmentFilename = 'paper.pdf'; paper.attachments.push(pdf.id);
  f.host.registerItemPaneSection();
  const config = f.Zotero.ItemPaneManager.sections.get(f.host.itemPaneSectionID);
  const body = f.doc.createElement('div'); config.onRender({ body, item: paper });
  const all = n => [n, ...n.children.flatMap(all)];
  const button = all(body).find(n => n.attrs['data-mindflow-action'] === 'pdf');
  let opened;
  f.Zotero.Reader = { async open(id) { opened = id; } };
  await button.click(); assert.equal(opened, pdf.id);
  f.Zotero.Reader.open = async () => { throw new Error('reader rejected'); };
  let fallback;
  f.win.ZoteroPane.viewAttachment = async id => { fallback = id; };
  await button.click(); assert.equal(fallback, pdf.id);
  f.win.ZoteroPane.viewAttachment = async () => { throw new Error('missing file'); };
  await button.click();
  assert.equal(button.disabled, false);
  const status = all(body).find(n => n.attrs.role === 'status');
  assert.equal(status.attrs['data-l10n-id'], 'mindflow-item-pane-pdf-open-failed');
  f.Zotero.Reader.open = async id => { opened = id; };
  await button.click(); assert.equal(status.textContent, '');
});

test('sidebar creates the first map with the selected template', async () => {
  const f = fixture(), paper = f.paper('TEMPLATE01');
  f.host.registerItemPaneSection();
  const config = f.Zotero.ItemPaneManager.sections.get(f.host.itemPaneSectionID);
  const body = f.doc.createElement('div');
  config.onRender({ body, item: paper });
  const all = node => [node, ...node.children.flatMap(all)];
  const select = all(body).find(node => node.className === 'mf-template-select');
  const primary = all(body).find(node => node.className === 'mf-btn-primary');
  assert.ok(select && primary);
  select.value = 'review';
  let opened;
  f.host.openMindFlow = async options => { opened = options; };
  await primary.click({ preventDefault() {}, stopPropagation() {} });
  assert.equal(opened.mode, 'create_from_selection');
  assert.equal(opened.template, 'review');
  assert.equal(opened.items[0].id, paper.id);
});

test('sidebar errors are visible and repeated renders register only one refresh per body', async () => {
  const f = fixture(), paper = f.paper('QUICK002');
  f.host.registerItemPaneSection();
  const config = f.Zotero.ItemPaneManager.sections.get(f.host.itemPaneSectionID);
  const body = f.doc.createElement('div');
  config.onRender({ body, item: paper });
  config.onRender({ body, item: paper });
  const actions = body.children[0].children.find(node => node.className === 'mindflow-pane-actions');
  const ai = actions.children.find(node => node.attrs['data-mindflow-action'] === 'ai');
  f.host.openMindFlow = async () => { throw new Error('simulated open failure'); };
  await ai.click();
  assert.equal(ai.disabled, false);
  assert.equal(body.children[0].children.find(node => node.attrs.role === 'status').textContent, '操作失败，请重试。');
  let count = 0;
  const replace = body.replaceChildren;
  body.replaceChildren = function (...children) { count++; return replace.apply(this, children); };
  const queued = [];
  const mainWin = f.Zotero.getMainWindow();
  mainWin.setTimeout = fn => queued.push(fn);
  mainWin.clearTimeout = () => {};
  f.Zotero.Notifier.trigger('modify', 'item', [paper.id]);
  f.Zotero.Notifier.trigger('modify', 'item', [paper.id]);
  f.Zotero.Notifier.trigger('redraw', 'item', [paper.id]);
  assert.equal(count, 0, 'refresh is debounced');
  assert.equal(queued.length, 1, 'bursts coalesce into one timer');
  queued[0]();
  assert.equal(count, 0, 'unchanged content skips the rebuild');
  paper.title = 'Changed title';
  f.Zotero.Notifier.trigger('modify', 'item', [paper.id]);
  queued[1]();
  assert.equal(count, 1);
});
