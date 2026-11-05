/**
 * Zotero MindFlow - host runtime tests (shard 02).
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

test('host MINDFLOW_LOCATE_ITEM matches item when DOI field has different DOI but extra field has target DOI', async () => {
  const f = fixture();
  f.host.addToWindow(f.win);
  f.host.openMindFlow({ mode: 'open' }, f.win);
  const tab = f.tabs._tabs.find(t => t.type === 'mindflow');
  const frame = f.tabs.getTabContent(tab.id).children[0];

  const paper = f.paper('PAPER_SHADOW_DOI');
  paper.setField('DOI', '10.1000/arxiv.initial');
  paper.setField('extra', 'Publisher: Springer\nDOI: 10.1038/s41563-022-01459-z');
  let selectedItemId = null;
  f.win.ZoteroPane.selectItem = (id) => { selectedItemId = id; };
  f.tabs.selectedID = 'other-tab';

  const onMessage = f.listeners.get('message');
  onMessage({
    source: frame.contentWindow,
    origin: 'chrome://mindflow',
    data: {
      type: 'MINDFLOW_LOCATE_ITEM',
      requestId: 'req-doi-shadow-1',
      doi: '10.1038/s41563-022-01459-z',
    },
  });

  await new Promise((r) => setTimeout(r, 20));

  assert.equal(f.tabs.selectedID, 'zotero-pane');
  assert.equal(selectedItemId, paper.id);
  const replied = frame.contentWindow.messages.find(m => m.type === 'MINDFLOW_LOCATE_ITEM_RESULT' && m.requestId === 'req-doi-shadow-1');
  assert.equal(replied?.success, true);
});

test('host MINDFLOW_OPEN_PDF opens reader and replies with MINDFLOW_OPEN_PDF_RESULT', async () => {
  const f = fixture();
  f.host.addToWindow(f.win);
  f.host.openMindFlow({ mode: 'open' }, f.win);
  const tab = f.tabs._tabs.find(t => t.type === 'mindflow');
  const frame = f.tabs.getTabContent(tab.id).children[0];

  const paper = f.paper('PAPER_PDF_MSG');
  paper.setField('DOI', '10.1038/s41563-022-01459-pdf');
  const pdfAtt = {
    id: 4441,
    libraryID: paper.libraryID,
    deleted: false,
    isAttachment: () => true,
    isPDFAttachment: () => true,
    attachmentContentType: 'application/pdf',
    attachmentFilename: 'article.pdf',
  };
  f.items.set(4441, pdfAtt);
  paper.attachments.push(4441);
  paper.getAttachments = () => [4441];
  paper.getBestAttachment = async () => pdfAtt;

  let readerOpenedId = null;
  f.Zotero.Reader = {
    open: async (id) => { readerOpenedId = id; return true; },
  };

  const onMessage = f.listeners.get('message');
  onMessage({
    source: frame.contentWindow,
    origin: 'chrome://mindflow',
    data: {
      type: 'MINDFLOW_OPEN_PDF',
      requestId: 'req-pdf-open-1',
      doi: '10.1038/s41563-022-01459-pdf',
    },
  });

  await new Promise((r) => setTimeout(r, 25));

  assert.equal(readerOpenedId, 4441);
  const replied = frame.contentWindow.messages.find(m => m.type === 'MINDFLOW_OPEN_PDF_RESULT' && m.requestId === 'req-pdf-open-1');
  assert.equal(replied?.success, true);
});

test('host saveMindMapToItem resolves parent item by DOI when parentItemKey is a DOI URL', async () => {
  const f = fixture();
  const paper = f.paper('PAPER_ARCHIVE_DOI');
  paper.setField('DOI', '10.1038/s41563-022-01459-z');
  const doc = {
    id: 'doc_archive_doi',
    title: 'Archive DOI Map',
    themeId: 'classic-light',
    layoutType: 'mindmap',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    revision: 1,
    root: { id: 'root', text: 'Root', children: [] },
  };

  const res = await f.host._saveMindMapToItem({ doc, parentItemKey: 'https://doi.org/10.1038/s41563-022-01459-z' });
  assert.equal(res.success, true);
  assert.equal(res.parentLibraryID, paper.libraryID);
  assert.equal(paper.attachments.length, 1);
});

test('host MINDFLOW_LOCATE_ITEM selects database item by key', async () => {
  const f = fixture();
  f.host.addToWindow(f.win);
  f.host.openMindFlow({ mode: 'open' }, f.win);
  const tab = f.tabs._tabs.find(t => t.type === 'mindflow');
  const frame = f.tabs.getTabContent(tab.id).children[0];

  const paper = f.paper('KEY12345');
  let selectedItemId = null;
  f.win.ZoteroPane.selectItem = (id) => { selectedItemId = id; };
  f.tabs.selectedID = 'other-tab';

  const onMessage = f.listeners.get('message');
  onMessage({
    source: frame.contentWindow,
    origin: 'chrome://mindflow',
    data: {
      type: 'MINDFLOW_LOCATE_ITEM',
      requestId: 'req-key-1',
      key: 'KEY12345',
    },
  });

  await new Promise((r) => setTimeout(r, 20));

  assert.equal(f.tabs.selectedID, 'zotero-pane');
  assert.equal(selectedItemId, paper.id);
  const replied = frame.contentWindow.messages.find(m => m.type === 'MINDFLOW_LOCATE_ITEM_RESULT');
  assert.equal(replied?.success, true);
});

test('host MINDFLOW_LAUNCH_URL invokes Zotero.launchURL for external links', () => {
  const f = fixture();
  f.host.addToWindow(f.win);
  f.host.openMindFlow({ mode: 'open' }, f.win);
  const tab = f.tabs._tabs.find(t => t.type === 'mindflow');
  const frame = f.tabs.getTabContent(tab.id).children[0];

  let launchedUrl = null;
  f.Zotero.launchURL = (url) => { launchedUrl = url; };

  const onMessage = f.listeners.get('message');
  onMessage({
    source: frame.contentWindow,
    origin: 'chrome://mindflow',
    data: {
      type: 'MINDFLOW_LAUNCH_URL',
      url: 'https://doi.org/10.1038/s41563-022-01459-z',
    },
  });

  assert.equal(launchedUrl, 'https://doi.org/10.1038/s41563-022-01459-z');
});

test('host MINDFLOW_LOCATE_ITEM accepts commands from registered standalone workspace windows', async () => {
  const f = fixture();
  f.host.addToWindow(f.win);
  const standaloneWin = {
    closed: false,
    postMessage(data) { this.messages.push(data); },
    messages: [],
  };
  f.host._standaloneWindows = new Map([['standalone-target', standaloneWin]]);

  const paper = f.paper('PAPER_STANDALONE');
  paper.setField('DOI', '10.1038/s41586-020-2649-2');
  let selectedItemId = null;
  let selectedCollectionFlag = null;
  f.win.ZoteroPane.selectItem = (id, flag) => { selectedItemId = id; selectedCollectionFlag = flag; };

  const onMessage = f.listeners.get('message');
  onMessage({
    source: standaloneWin,
    origin: 'chrome://mindflow',
    data: {
      type: 'MINDFLOW_LOCATE_ITEM',
      requestId: 'req-standalone-1',
      doi: '10.1038/s41586-020-2649-2',
    },
  });

  await new Promise((r) => setTimeout(r, 20));

  assert.equal(selectedItemId, paper.id);
  assert.equal(selectedCollectionFlag, true);
  const replied = standaloneWin.messages.find(m => m.type === 'MINDFLOW_LOCATE_ITEM_RESULT');
  assert.equal(replied?.success, true);
  assert.equal(replied?.requestId, 'req-standalone-1');
});
for (const mode of ['cancel', 'shutdown']) {
  test(`${mode} releases PDF preparation before an unresponsive worker finishes`, async () => {
    const f = llmFixture(), paper = f.paper('WAITPDF1'), controller = new AbortController();
    const pdf = f.attachment('WAITPDF2', 1, paper.id, '/waiting.pdf'); pdf.isPDFAttachment = () => true;
    paper.attachments.push(pdf.id); f.disk.set('/waiting.pdf', 'PDF');
    f.IOUtils.stat = async () => ({ size: 100, lastModified: 1 });
    let started, release, watchdog;
    const ready = new Promise(resolve => { started = resolve; });
    f.Zotero.PDFWorker = { getFullText: () => { started(); return new Promise(resolve => { release = resolve; }); } };
    const pending = f.host.preparePaperAnalysis(`zotero://select/library/items/${paper.key}`,
      { readingMode: 'full', signal: controller.signal });
    await ready;
    if (mode === 'shutdown') f.host.shutdown(); else controller.abort();
    try {
      await assert.rejects(Promise.race([pending, new Promise((_, reject) => {
        watchdog = setTimeout(() => reject(new Error('PDF cancellation is still waiting')), 100);
      })]), /已取消/);
      assert.equal(f.host._aiCancellers.size, 0);
    } finally {
      clearTimeout(watchdog); release({ text: 'Late worker text', extractedPages: 1, totalPages: 1 });
      await pending.catch(() => {});
    }
    assert.equal(f.host._aiPdfTextCache?.size || 0, 0);
    assert.equal(f.host._aiPrepared?.size || 0, 0);
  });
}
test('upstream call timeout remains effective when a caller supplies cancellation signal', async () => {
  const f = llmFixture(hangingTurn), controller = new AbortController();
  let watchdog;
  try {
    await assert.rejects(() => Promise.race([
      f.host._testLLMRequest({ config: f.host.getAIConfiguration(), payload: {}, timeout: 20, signal: controller.signal }),
      new Promise((_resolve, reject) => { watchdog = setTimeout(() => reject(new Error('timeout guard never fired')), 250); }),
    ]), /超时/);
  } finally { clearTimeout(watchdog); controller.abort(); }
});
test('explicit upstream cancellation is not mislabeled as a timeout', async () => {
  const f = llmFixture(hangingTurn), controller = new AbortController();
  const request = f.host._testLLMRequest({ config: f.host.getAIConfiguration(), payload: {}, timeout: 1000, signal: controller.signal });
  controller.abort();
  await assert.rejects(() => request, /已取消/);
});

test('shutdown cancels direct AI work, clears prepared material and rejects further analysis', async () => {
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const f = llmFixture((request, onEvent, options) => { started(); return hangingTurn(request, onEvent, options); });
  const paper = f.paper('SHUTDOWN'), ref = `zotero://select/library/items/${paper.key}`;
  const preview = await f.host.preparePaperAnalysis(ref);
  const controller = new AbortController();
  const pending = f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId, signal: controller.signal });
  await ready;
  let watchdog;
  try {
    f.host.shutdown();
    await assert.rejects(() => Promise.race([pending,
      new Promise((_resolve, reject) => { watchdog = setTimeout(() => reject(new Error('shutdown left AI work running')), 250); }),
    ]), /取消/);
    assert.equal(f.host._aiPrepared?.size || 0, 0);
    assert.equal(f.host._aiCancellers?.size || 0, 0);
    await assert.rejects(() => f.host.preparePaperAnalysis(ref), /取消/);
    await assert.rejects(() => f.host.analyzePaperWithAI(ref), /取消/);
  } finally { clearTimeout(watchdog); controller.abort(); await pending.catch(() => {}); }
});

test('missing or old upstream plugin produces an actionable error without own HTTP fallback', () => {
  const f = fixture();
  assert.throws(() => f.host.getAIConfiguration(), /安装并启用 llm-for-zotero/);
  f.Zotero.LLMForZotero = { data: { initialized: true }, api: {} };
  assert.throws(() => f.host.getAIConfiguration(), /3.9.11/);
});
