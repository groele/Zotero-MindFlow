/**
 * Zotero MindFlow - host runtime tests (shard 08).
 * Verifies extracted typed AI/DOI helpers, AbortController & timer lifecycle cleanup,
 * window unload/shutdown guards, and storage/attachment validation edge cases.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fixture, llmFixture, hangingTurn,
} from '../host-fixture.mjs';

test('typed MindFlowConstants AI helpers extract sections, parse JSON, sample segments, and normalize DOIs', () => {
  const f = fixture();
  const c = f.host.Modules.constants;

  const paper = [
    'Title Line',
    'Abstract',
    'A'.repeat(120),
    '1. Introduction',
    'B'.repeat(220),
    '2. Methods',
    'C'.repeat(120),
    '3. Conclusions and Outlook',
    'D'.repeat(60),
    'References',
    '[1] Ref',
  ].join('\n');

  const keySections = c.extractPaperSections(paper, 'key-sections');
  assert.deepEqual([...keySections.found], ['introduction', 'conclusion']);
  assert.deepEqual([...keySections.missing], []);
  assert.ok(keySections.text.includes('B'.repeat(40)));

  const inline = 'Header\nAbstract: ' + 'X'.repeat(130) + '\nKeywords: graphene; transport';
  assert.deepEqual([...c.extractPaperSections(inline, 'abstract').found], ['abstract']);

  const duplicate = 'Abstract\n' + 'A'.repeat(130) + '\nMethods\nM\nAbstract\n' + 'B'.repeat(130) + '\nMethods\nN';
  assert.deepEqual([...c.extractPaperSections(duplicate, 'abstract').missing], ['abstract']);

  assert.deepEqual(JSON.parse(JSON.stringify(c.extractJsonFromLlmOutput('```json\n{"ok":true,"n":2}\n```'))), { ok: true, n: 2 });
  assert.deepEqual(JSON.parse(JSON.stringify(c.extractJsonFromLlmOutput('Answer: {"sections":{"gap":[]}} trailing'))), { sections: { gap: [] } });
  assert.equal(c.extractJsonFromLlmOutput('not json at all'), null);

  const sampled = c.samplePreparedPDF(`First ${'1'.repeat(600)}\n${c.AI_OMISSION_MARKER}\nSecond ${'2'.repeat(600)}`, 200);
  assert.ok(sampled.includes(c.AI_OMISSION_MARKER));
  const segments = c.pdfSegmentsForAI(sampled, 120);
  assert.ok(segments.length >= 2);
  assert.equal(segments[0].id, 'P1');

  const compacted = c.compactSegmentDrafts([
    { findings: [{ text: 'First claim', detail: 'd1', basis: 'quote', source: 'pdf', sourceId: 'P1', quote: 'q1' }] },
    {
      findings: [
        { text: 'First claim', detail: 'd1', basis: 'quote', source: 'pdf', sourceId: 'P1', quote: 'q1' },
        { text: 'Second claim', detail: 'd2', basis: 'quote', source: 'pdf', sourceId: 'P2', quote: 'q2' },
      ],
    },
  ], 5);
  assert.equal(compacted.findings.length, 2);

  assert.equal(c.normalizeDOI('  ＨＴＴＰＳ://dx.doi.org/10.1038/s41586-024-00001-x). '), '10.1038/s41586-024-00001-x');
  assert.equal(c.normalizeDOI('doi: 10.1103/PhysRevLett.130.010001;'), '10.1103/physrevlett.130.010001');
  assert.equal(c.normalizeDOI('not a doi'), '');
});

test('typed MindFlowConstants LLM config helpers mask secrets and evaluate reasoning options', () => {
  const f = fixture();
  const c = f.host.Modules.constants;

  assert.equal(c.isPrivateOrLocalHost('localhost'), true);
  assert.equal(c.isPrivateOrLocalHost('192.168.1.10'), true);
  assert.equal(c.isPrivateOrLocalHost('api.openai.com'), false);
  assert.equal(c.reasoningProvider({ model: 'deepseek-r1', apiBase: 'https://api.example.com' }), 'deepseek');
  assert.equal(c.reasoningProvider({ model: 'llama3', apiBase: 'http://127.0.0.1:11434', local: true }), 'local');

  const pub = c.publicLLMConfig({ model: 'gpt-5', apiBase: 'https://api.example.com', apiKey: 'secret-token' });
  assert.equal('apiKey' in pub, false);
  assert.equal(typeof pub.fingerprint, 'string');

  const unsupported = c.reasoningChoices({ model: 'gpt-5', apiBase: 'https://api.example.com' }, { reasoning: false });
  assert.equal(unsupported.reasoningSupported, false);

  const profiled = c.reasoningChoices({
    model: 'gpt-5',
    apiBase: 'https://api.example.com',
    advanced: {
      profileOverride: {
        forModel: 'GPT-5',
        reasoning: { options: [{ id: 'low', label: 'Low' }, { id: 'bad id!', label: 'Skip' }, { id: 'off', enabled: false }] },
      },
    },
  }, { reasoning: true });
  assert.equal(profiled.reasoningSupported, true);
  assert.deepEqual([...profiled.reasoningOptions.map((o) => o.id)], ['default', 'low']);
});

test('window AbortController detaches listeners/timers on removeFromWindow, unload, and shutdown', async () => {
  const f = fixture();
  const origCreate = f.doc.createElement;
  f.doc.createElement = (tag) => {
    const el = origCreate(tag);
    el.hasAttribute = (k) => Object.prototype.hasOwnProperty.call(el.attrs, k);
    el.insertBefore = (child) => { el.appendChild(child); return child; };
    return el;
  };
  const toolbar = f.doc.createElement('toolbar');
  toolbar.id = 'zotero-tb-add';
  const parentTb = f.doc.createElement('hbox');
  parentTb.id = 'zotero-items-toolbar';
  parentTb.appendChild(toolbar);
  const itemsTree = f.doc.createElement('tree');
  itemsTree.id = 'zotero-items-tree';
  const collectionMenu = f.doc.createElement('menupopup');
  collectionMenu.id = 'zotero-collectionmenu';
  const origGetById = f.doc.getElementById;
  f.doc.getElementById = (id) => ({
    'zotero-tb-add': toolbar,
    'zotero-items-toolbar': parentTb,
    'zotero-items-tree': itemsTree,
    'zotero-collectionmenu': collectionMenu,
  }[id] || origGetById(id));

  f.host.addToWindow(f.win);
  assert.ok(f.win._eventListeners.get('keydown')?.size >= 1);
  assert.ok(f.win._eventListeners.get('message')?.size >= 1);
  assert.ok(f.win._eventListeners.get('unload')?.size >= 1);
  assert.ok(itemsTree._eventListeners.get('dblclick')?.size >= 1);
  assert.ok(collectionMenu._eventListeners.get('popupshowing')?.size >= 1);
  const toolbarBtn = toolbar.parentNode.children.find((el) => el.id === 'mindflow-toolbar-button');
  assert.ok(toolbarBtn);
  assert.equal(toolbarBtn.getAttribute('data-mindflow-handler'), 'true');
  assert.ok(toolbarBtn._eventListeners.get('click')?.size >= 1);

  f.win.dispatchEvent({ type: 'unload' });
  assert.equal(f.win._eventListeners.size, 0);
  assert.equal(itemsTree._eventListeners.size, 0);
  assert.equal(collectionMenu._eventListeners.size, 0);
  assert.equal(toolbarBtn._eventListeners.size, 0);
  assert.equal(toolbarBtn.getAttribute('data-mindflow-handler'), undefined);
  assert.equal(f.win._activeTimers.size, 0);

  await f.host.shutdown();
  assert.equal(f.host._lifecycleActive, false);
  f.host.addToWindow(f.win);
  assert.equal(f.win._eventListeners.size, 0);
});

test('tab onClose and itemPane renderAbort/onDestroy clean up timers and DOM click listeners', async () => {
  const f = fixture();
  const p = f.paper('LIFE0001');
  const doc = f.map('doc_life', 'Lifecycle');
  const att = f.attachment('ATTLIFE1', 1, p.id, '/life.mindflow');
  f.disk.set(att.path, JSON.stringify(doc));
  p.attachments.push(att.id);

  // Tab onClose cleans up iframe load listener and tab icon timers
  f.host.openMindFlow({ mode: 'open_document', doc, targetMode: 'tab' }, f.win);
  const openedTab = f.tabs._tabs.find((t) => t.type === 'mindflow');
  assert.ok(openedTab);
  const container = f.tabs.getTabContent(openedTab.id);
  const iframe = container.querySelector('iframe');
  assert.ok(iframe._eventListeners.get('load')?.size === 1);
  assert.ok(f.win._activeTimers.size >= 2);
  f.tabs.close(openedTab.id);
  assert.equal(iframe._eventListeners.size, 0);
  assert.equal(f.win._activeTimers.size, 0);

  // ItemPane re-render aborts previous DOM listeners and preserves cache hits; onDestroy aborts remaining
  f.host.registerItemPaneSection();
  const section = [...f.Zotero.ItemPaneManager.sections.values()][0];
  const body = f.doc.createElement('div');
  section.onInit({ doc: f.doc, body, item: p, refresh: () => {} });
  await section.onAsyncRender({ doc: f.doc, body, item: p, setSectionSummary: () => {} });
  const firstAiBtn = f.host._itemPaneStates.values().next().value.paneActions.find((a) => a.id === 'ai').button;
  assert.ok(firstAiBtn._eventListeners.get('click')?.size === 1);

  // Cache hit with same item preserves active listener
  await section.onAsyncRender({ doc: f.doc, body, item: p, setSectionSummary: () => {} });
  assert.ok(firstAiBtn._eventListeners.get('click')?.size === 1);

  // Switching to different item rotates AbortController and clears old button listener
  const p2 = f.paper('LIFE0002');
  await section.onAsyncRender({ doc: f.doc, body, item: p2, setSectionSummary: () => {} });
  assert.equal(firstAiBtn._eventListeners.size, 0);
  const secondAiBtn = f.host._itemPaneStates.values().next().value.paneActions.find((a) => a.id === 'ai').button;
  assert.ok(secondAiBtn._eventListeners.get('click')?.size === 1);

  section.onDestroy({ body });
  assert.equal(secondAiBtn._eventListeners.size, 0);
});

test('window unload aborts active AI preparation job tied to that window', async () => {
  const f = llmFixture(hangingTurn);
  const p = f.paper('AIWIN001');
  f.host.addToWindow(f.win);
  const iframe = f.doc.createElement('iframe');
  iframe.className = 'mindflow-workspace-iframe';
  const origQSA = f.doc.querySelectorAll;
  f.doc.querySelectorAll = (sel) => (sel === '.mindflow-workspace-iframe' ? [iframe] : origQSA(sel));

  f.win.dispatchEvent({
    type: 'message',
    source: iframe.contentWindow,
    origin: 'chrome://mindflow',
    data: { type: 'MINDFLOW_PREPARE_PAPER', requestId: 'req-abort-win', reference: p.key, readingMode: 'abstract' },
  });
  assert.equal(f.host._aiJobs.size, 1);
  f.win.dispatchEvent({ type: 'unload' });
  await new Promise((r) => setTimeout(r, 15));
  assert.equal(f.host._aiJobs.size, 0);
});

test('host storage and attachment validation reject malformed dates, relationships, and cross-parent writes', async () => {
  const f = fixture();
  const c = f.host.Modules.constants;

  assert.throws(() => c.validateHostInbox([{ id: 'x', text: 123 }]));
  assert.throws(() => c.validateHostSnapshots([{ id: 's1' }]));
  assert.throws(() => c.validateHostDocument({
    id: 'bad', title: 'Bad', updatedAt: 1,
    root: { id: 'r', text: 'R', children: [], task: { status: 'todo', dueDate: '2025-02-29' } },
  }));

  f.disk.set('/data/mindflow/workspace/mindflow_doc_corrupt.json', '{broken json');
  const docs = await f.host.workspaceStorage('listDocs');
  const corruptEntry = docs.find((d) => d.id === 'corrupt');
  assert.equal(corruptEntry?.corrupt, true);

  const p1 = f.paper('PAR00001');
  const p2 = f.paper('PAR00002');
  const foreignAtt = f.attachment('ATTFOR01', 1, p2.id, '/foreign.mindflow');
  f.disk.set(foreignAtt.path, JSON.stringify(f.map('doc_foreign', 'Foreign')));
  const blocked = await f.host.saveMindMapToItem({
    doc: {
      ...f.map('doc_foreign', 'Foreign'),
      metadata: { zoteroAttachmentKey: foreignAtt.key, zoteroAttachmentLibraryID: 1 },
    },
    parentItemKey: p1.key,
  });
  assert.equal(blocked.success, false);
});
