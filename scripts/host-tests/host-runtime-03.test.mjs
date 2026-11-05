/**
 * Zotero MindFlow - host runtime tests (shard 03).
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

test('analysis uses the selected upstream model and reasoning and excludes deselected materials', async () => {
  const calls = [], f = llmFixture(async (request, _onEvent, options) => {
    calls.push(request); assert.ok(options.signal);
    return { kind: 'completed', runId: 'verified-run-' + calls.length, text: JSON.stringify({ sections: { findings: [{ text: '发光增强',
      detail: '', basis: 'paper', source: 'abstract', sourceId: 'AB', quote: 'enhanced emission' }] } }) };
  });
  const paper = f.paper('AIARTIC1'), ref = `zotero://select/library/items/${paper.key}`;
  const preview = await f.host.preparePaperAnalysis(ref);
  assert.equal(preview.models.length, 2);
  assert.equal(preview.defaultModelEntryId, 'model-one');
  assert.ok(!JSON.stringify(preview).includes('upstream-secret'));
  assert.ok(!JSON.stringify([...f.host._aiPrepared.values()]).includes('upstream-secret'));
  const opts = { preparedId: preview.preparedId, mode: 'quick', modelEntryId: 'model-two', reasoningLevel: 'high',
    sources: { abstract: true, pdf: false, notes: false, highlights: false, comments: false } };
  const result = await f.host.analyzePaperWithAI(ref, opts);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].model, 'deepseek-reasoner');
  assert.equal(calls[0].apiKey, 'upstream-secret');
  assert.equal(calls[0].providerProtocol, 'openai_chat_compat');
  assert.equal(calls[0].reasoning.provider, 'deepseek');
  assert.equal(calls[0].reasoning.level, 'high');
  assert.equal(calls[0].item, null);
  assert.equal(calls[0].activeItemId, undefined);
  assert.equal(calls[0].history.length, 0);
  assert.ok(!calls[0].userText.includes('private excluded note'));
  assert.equal(result.sections.findings[0].verification, 'matched');
  assert.equal(result.sourceScope.model, 'deepseek-reasoner');
  assert.equal(result.sourceScope.reasoningLevel, 'high');
  assert.equal(result.sourceScope.llmIntegration.api, 'agent.runTurn');
  assert.equal(result.sourceScope.llmIntegration.completedCalls, 1);
  assert.equal(result.sourceScope.llmIntegration.runIds[0], 'verified-run-1');
  assert.equal(f.disk.size, 0, 'analysis must not archive automatically');
  await f.host.analyzePaperWithAI(ref, opts);
  assert.equal(calls.length, 1, 'same scope should reuse its result');
  await f.host.analyzePaperWithAI(ref, { ...opts, reasoningLevel: 'low' });
  await f.host.analyzePaperWithAI(ref, { ...opts, modelEntryId: 'model-one' });
  assert.equal(calls.length, 3, 'model and reasoning changes must not reuse another result');
  assert.equal(new Set(calls.map(call => call.conversationKey)).size, 3);
  assert.ok(!JSON.stringify(result).includes('upstream-secret'));
});

test('upstream extra tool requests are stopped before they can read other sources', async () => {
  let executed = false, signal;
  const f = llmFixture(async (_request, onEvent, options) => {
    signal = options.signal;
    await onEvent({ type: 'tool_call', name: 'paper_read' });
    executed = true;
    return { kind: 'completed', text: '{}' };
  });
  await assert.rejects(() => f.host._testLLMRequest({ config: f.host.getAIConfiguration(), payload: {} }), /额外工具/);
  assert.equal(executed, false); assert.equal(signal.aborted, true);
});

test('upstream incomplete or malformed responses never become a successful analysis', async () => {
  const f = llmFixture(async () => ({ kind: 'fallback', reason: 'unavailable' }));
  await assert.rejects(() => f.host._testLLMRequest({ config: f.host.getAIConfiguration(), payload: {} }), /未完成|调用失败/);
  f.Zotero.LLMForZotero.api.agent.runTurn = async () => { throw new Error('Authorization: Bearer upstream-secret'); };
  await assert.rejects(() => f.host._testLLMRequest({ config: f.host.getAIConfiguration(), payload: {} }),
    error => /调用失败/.test(error.message) && !error.message.includes('upstream-secret'));
  f.Zotero.LLMForZotero.api.agent.runTurn = async () => ({ kind: 'completed', text: 'not JSON' });
  const item = f.paper('BADJSON1'), ref = `zotero://select/library/items/${item.key}`;
  const preview = await f.host.preparePaperAnalysis(ref);
  await assert.rejects(() => f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId }), /JSON 结构/);
});

test('configuration changes and removed model selections invalidate a prepared analysis', async () => {
  const f = llmFixture(), item = f.paper('CHANGED1'), ref = `zotero://select/library/items/${item.key}`;
  const preview = await f.host.preparePaperAnalysis(ref), groups = llmGroups();
  groups[0].apiBase = 'https://different.invalid/v1';
  f.prefs.set(llmPref + 'modelProviderGroups', JSON.stringify(groups));
  await assert.rejects(() => f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId }), /配置已变化/);
  assert.throws(() => f.host.getAIConfiguration('nonexistent'), /已移除/);
});

test('unsupported backend is visible while other upstream models remain selectable', () => {
  const f = llmFixture(), groups = llmGroups();
  groups.push({ id: 'web', authMode: 'webchat', models: [{ id: 'web-one', model: 'chatgpt' }] });
  f.prefs.set(llmPref + 'modelProviderGroups', JSON.stringify(groups));
  const models = f.host.getAIModels();
  assert.equal(models.length, 3);
  assert.equal(models[2].available, false);
  assert.match(models[2].message, /暂支持 API/);
  assert.equal(models[0].available, true);
});

test('upstream custom reasoning options are selectable, validated and forwarded without exposing request configuration', async () => {
  const calls = [], f = llmFixture(async request => {
    calls.push(request);
    return { kind: 'completed', text: JSON.stringify({ sections: { findings: [{ text: 'Result', source: 'abstract', quote: 'enhanced emission' }] } }) };
  });
  const groups = llmGroups();
  groups[0].models[0].profileOverride = { forModel: 'gpt-5.4', extraBody: { private_extension: 'private-profile-data' },
    reasoning: { kind: 'select', options: [
      { id: 'off', label: '关闭推理', controls: { body: { thinking: { type: 'disabled' } } } },
      { id: 'ultra', label: '深度研究', controls: { body: { reasoning_effort: 'high' } } },
      { id: 'disabled', enabled: false }, { id: 'INVALID' }] } };
  groups[0].models[1].profileOverride = { reasoning: { kind: 'none', options: [] } };
  f.prefs.set(llmPref + 'modelProviderGroups', JSON.stringify(groups));
  const paper = f.paper('CUSTOM01'), ref = `zotero://select/library/items/${paper.key}`;
  const preview = await f.host.preparePaperAnalysis(ref);
  assert.deepEqual(Array.from(preview.models[0].reasoningOptions, option => option.id), ['default', 'off', 'ultra']);
  assert.equal(preview.models[1].reasoningSupported, false);
  assert.ok(!JSON.stringify(preview).includes('private-profile-data'));
  assert.equal(preview.models[0].apiBase, undefined);
  assert.equal(preview.models[0].advanced, undefined);
  await assert.rejects(() => f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId, reasoningLevel: 'high' }), /选项无效/);
  await f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId, reasoningLevel: 'ultra' });
  assert.equal(calls[0].reasoning.level, 'ultra');
  assert.equal(calls[0].advanced.profileOverride.reasoning.options[1].controls.body.reasoning_effort, 'high');
  assert.equal(calls.length, 1);
});

test('deep segmented summaries preserve material, conditions and mechanism branches through the same upstream API', async () => {
  const calls = [], f = llmFixture(async request => {
    calls.push(request);
    const payload = JSON.parse(request.userText);
    const sourceId = payload.pdfSegments?.[0]?.id || payload.pdf?.[0]?.id || 'P1';
    return { kind: 'completed', runId: 'deep-run-' + calls.length, text: JSON.stringify({ sections: {
      system: [{ text: 'MoSe2', source: 'pdf', sourceId, quote: 'MoSe2 at 4 K' }],
      conditions: [{ text: '4 K', source: 'pdf', sourceId, quote: 'at 4 K shows' }],
      mechanism: [{ text: 'Charge transfer', source: 'pdf', sourceId, quote: 'charge transfer' }],
      findings: [{ text: 'Enhanced emission', source: 'pdf', sourceId, quote: 'enhanced emission' }],
    } }) };
  });
  const paper = f.paper('DEEP0001'), ref = `zotero://select/library/items/${paper.key}`;
  const preview = await f.host.preparePaperAnalysis(ref);
  const prepared = f.host._aiPrepared.get(preview.preparedId);
  prepared.pdfText = 'MoSe2 at 4 K shows enhanced emission through charge transfer. '.repeat(600);
  prepared.pdfState = 'Synthetic PDF regression';
  prepared.readingMode = 'full';
  const result = await f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId, mode: 'deep', templateId: 'experimental' });
  assert.equal(calls.length, 3);
  assert.equal(result.sourceScope.llmIntegration.completedCalls, 3);
  for (const key of ['system', 'conditions', 'mechanism', 'findings']) {
    assert.equal(result.sections[key].length, 1);
    assert.equal(result.sections[key][0].verification, 'matched');
  }
});

test('abort listeners are released on successful preparation and invalid model responses', async () => {
  const f = llmFixture(), paper = f.paper('CANCEL01'), ref = `zotero://select/library/items/${paper.key}`;
  const listeners = new Set(), signal = { aborted: false,
    addEventListener: (_type, fn) => listeners.add(fn), removeEventListener: (_type, fn) => listeners.delete(fn) };
  const preview = await f.host.preparePaperAnalysis(ref, { signal });
  assert.equal(listeners.size, 0);
  await assert.rejects(() => f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId, signal }), /没有提取/);
  assert.equal(listeners.size, 0);
  signal.aborted = true;
  await assert.rejects(() => f.host.analyzePaperWithAI(ref, { signal }), /取消/);
});

test('reading scopes send only selected article sections and abstract mode never extracts PDF', async () => {
  const calls = [], f = llmFixture(async request => {
    calls.push(request);
    return { kind: 'completed', text: JSON.stringify({ sections: { question: [{ text: 'Research question', basis: 'inference' }] } }) };
  });
  const paper = f.paper('PART0001'), ref = `zotero://select/library/items/${paper.key}`;
  const pdf = f.attachment('PDFPART1', 1, paper.id, '/paper.pdf'); pdf.isPDFAttachment = () => true;
  paper.attachments.push(pdf.id); f.disk.set('/paper.pdf', 'PDF');
  let extractions = 0;
  const intro = 'INTRODUCTION_SELECTED material motivation knowledge gap. '.repeat(8);
  const conclusion = 'CONCLUSION_SELECTED main conclusion and future outlook. '.repeat(4);
  f.Zotero.PDFWorker = { getFullText: async () => { extractions++;
    return { text: `Article title\n1. Introduction\n${intro}\n2. Results\nUNSELECTED_RESULTS_TOKEN\n3. Methods\nUNSELECTED_METHODS_TOKEN\n4. Conclusions\n${conclusion}\nReferences\nUNSELECTED_REFERENCES_TOKEN`, totalPages: 8, extractedPages: 8 }; } };
  for (const readingMode of ['abstract', 'introduction', 'conclusion', 'key-sections', 'full']) {
    const preview = await f.host.preparePaperAnalysis(ref, { readingMode });
    const result = await f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId, mode: 'quick',
      sources: { abstract: true, pdf: true, notes: false, highlights: false, comments: false } });
    const body = calls.at(-1).userText;
    assert.equal(result.sourceScope.readingMode, readingMode);
    assert.equal(body.includes('INTRODUCTION_SELECTED'), ['introduction', 'key-sections', 'full'].includes(readingMode));
    assert.equal(body.includes('CONCLUSION_SELECTED'), ['conclusion', 'key-sections', 'full'].includes(readingMode));
    assert.equal(body.includes('enhanced emission'), ['abstract', 'key-sections', 'full'].includes(readingMode));
    assert.equal(body.includes('UNSELECTED_RESULTS_TOKEN'), readingMode === 'full');
    if (readingMode === 'abstract') { assert.equal(extractions, 0); assert.equal(preview.sourceScope.pdfCharacters, 0); }
  }
  assert.equal(extractions, 4);
});

test('section switching reuses unchanged PDF text and invalidates it after file changes', async () => {
  const f = llmFixture(), paper = f.paper('CACHE001'), ref = `zotero://select/library/items/${paper.key}`;
  const pdf = f.attachment('CACHEPDF', 1, paper.id, '/cached.pdf'); pdf.isPDFAttachment = () => true;
  paper.attachments.push(pdf.id); f.disk.set('/cached.pdf', 'PDF');
  let modified = 1, reads = 0;
  f.IOUtils.stat = async () => ({ size: 100, lastModified: modified });
  f.Zotero.PDFWorker = { getFullText: async () => { reads++; return { text:
    `Introduction\n${'Selected introduction motivation. '.repeat(10)}\nResults\nPRIVATE_RESULT\nConcluding remarks\nA concise conclusion answers the central question.\nReferences\nPRIVATE_REFERENCE`, extractedPages: 8, totalPages: 8 }; } };
  const intro = await f.host.preparePaperAnalysis(ref, { readingMode: 'introduction' });
  const conclusion = await f.host.preparePaperAnalysis(ref, { readingMode: 'conclusion' });
  assert.equal(reads, 1);
  assert.deepEqual(Array.from(intro.sourceScope.sectionStatus.found), ['introduction']);
  assert.deepEqual(Array.from(conclusion.sourceScope.sectionStatus.found), ['conclusion']);
  assert.ok(!f.host._aiPrepared.get(conclusion.preparedId).pdfText.includes('PRIVATE_RESULT'));
  modified++;
  await f.host.preparePaperAnalysis(ref, { readingMode: 'conclusion' });
  assert.equal(reads, 2);
});

test('long selected sections use one analysis call without quick sampling or full-paper leakage', async () => {
  const calls = [], f = llmFixture(async request => { calls.push(request); return { kind: 'completed',
    text: JSON.stringify({ sections: { question: [{ text: 'Selected research question', basis: 'inference' }] } }) }; });
  const paper = f.paper('LONGPART'), ref = `zotero://select/library/items/${paper.key}`;
  const pdf = f.attachment('LONGPDF1', 1, paper.id, '/long.pdf'); pdf.isPDFAttachment = () => true;
  paper.attachments.push(pdf.id); f.disk.set('/long.pdf', 'PDF');
  f.Zotero.PDFWorker = { getFullText: async () => `Introduction\n${'Selected motivation and literature gap. '.repeat(800)}\nSELECTED_TAIL\nResults\nPRIVATE_RESULT` };
  const preview = await f.host.preparePaperAnalysis(ref, { readingMode: 'introduction' });
  assert.equal(preview.deepCalls, 1);
  await f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId, mode: 'quick' });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].userText.includes('SELECTED_TAIL'));
  assert.ok(!calls[0].userText.includes('PRIVATE_RESULT'));
  assert.ok(calls[0].systemPrompt.includes('聚焦研究背景'));
});

test('missing or ambiguous section headings never cause a silent full-paper fallback', async () => {
  let calls = 0;
  const f = llmFixture(async () => { calls++; return { kind: 'completed', text: '{}' }; });
  const paper = f.paper('PART0002'), ref = `zotero://select/library/items/${paper.key}`;
  const pdf = f.attachment('PDFPART2', 1, paper.id, '/paper.pdf'); pdf.isPDFAttachment = () => true;
  paper.attachments.push(pdf.id); f.disk.set('/paper.pdf', 'PDF');
  f.Zotero.PDFWorker = { getFullText: async () => 'Unstructured full paper that must not be sent. '.repeat(20) };
  let preview = await f.host.preparePaperAnalysis(ref, { readingMode: 'conclusion' });
  assert.equal(preview.sourceScope.pdfCharacters, 0);
  assert.equal(preview.sourceScope.sectionStatus.missing[0], 'conclusion');
  await assert.rejects(() => f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId,
    sources: { notes: false, highlights: false, comments: false } }), /未选择/);
  assert.equal(calls, 0);
  f.Zotero.PDFWorker.getFullText = async () => ('Conclusions\nPossible conclusion text. '.repeat(10) + '\nReferences\n').repeat(2);
  preview = await f.host.preparePaperAnalysis(ref, { readingMode: 'conclusion' });
  assert.equal(preview.sourceScope.pdfCharacters, 0);
  assert.equal(preview.sourceScope.sectionStatus.missing.length, 1);
});

test('missing metadata abstract is recovered from PDF front pages without sending the body or widening the reading scope', async () => {
  const calls = [], f = llmFixture(async request => { calls.push(request); return { kind: 'completed',
    text: JSON.stringify({ sections: { findings: [{ text: 'Result', basis: 'paper', source: 'abstract', sourceId: 'AB', quote: 'The experiment shows enhanced emission.' }] } }) }; });
  const paper = f.paper('ABSPDF01'), ref = `zotero://select/library/items/${paper.key}`;
  f.host.serializeZoteroItem = () => ({ title: 'PDF only', zoteroUri: ref, abstract: '  ', notes: [], annotations: [] });
  const pdf = f.attachment('ABSPDF02', 1, paper.id, '/paper.pdf'); pdf.isPDFAttachment = () => true;
  paper.attachments.push(pdf.id); f.disk.set('/paper.pdf', 'PDF');
  const requestedPages = [];
  const paragraph = 'The experiment shows enhanced emission. The abstract describes the material and principal findings only. '.repeat(3);
  f.Zotero.PDFWorker = { getFullText: async (_id, pages) => { requestedPages.push(pages);
    return { text: `Article title\nAbstract: ${paragraph}\nKeywords: physics\n1. Introduction\nPRIVATE_BODY_TOKEN ${'Body text. '.repeat(40)}\n2. Results\nPRIVATE_RESULT_TOKEN`, totalPages: 20, extractedPages: pages }; } };
  const preview = await f.host.preparePaperAnalysis(ref);
  assert.equal(preview.readingMode, 'abstract');
  assert.equal(preview.sourceScope.paperHasAbstract, false);
  assert.equal(preview.sourceScope.pdfAttachmentCount, 1);
  assert.equal(preview.sourceScope.hasAbstract, true);
  assert.equal(preview.sourceScope.abstractSource, 'pdf');
  assert.equal(preview.sourceScope.pdfCharacters, 0);
  assert.equal(preview.sourceScope.pdfTruncated, false);
  assert.deepEqual(requestedPages, [5]);
  assert.equal(calls.length, 0, 'preparation must not send article');
  const result = await f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId });
  assert.equal(result.sourceScope.abstractSource, 'pdf');
  assert.equal(result.sections.findings[0].verification, 'matched');
  assert.ok(!calls[0].userText.includes('PRIVATE_BODY_TOKEN'));
  assert.ok(!calls[0].userText.includes('PRIVATE_RESULT_TOKEN'));
  f.Zotero.PDFWorker.getFullText = async () => `Article title Abstract ${paragraph} Keywords: physics 1. Introduction PRIVATE_BODY_TOKEN`;
  const flattened = await f.host.preparePaperAnalysis(ref);
  assert.equal(flattened.sourceScope.abstractSource, 'pdf');
  await f.host.analyzePaperWithAI(ref, { preparedId: flattened.preparedId });
  assert.ok(!calls.at(-1).userText.includes('PRIVATE_BODY_TOKEN'));
});

test('unrecognized or duplicate PDF abstracts leave an actionable empty preview and never substitute the body', async () => {
  const f = llmFixture(), paper = f.paper('ABSFAIL1'), ref = `zotero://select/library/items/${paper.key}`;
  f.host.serializeZoteroItem = () => ({ title: 'Missing abstract', zoteroUri: ref, abstract: '', notes: [], annotations: [] });
  const pdf = f.attachment('ABSFAIL2', 1, paper.id, '/paper.pdf'); pdf.isPDFAttachment = () => true;
  paper.attachments.push(pdf.id); f.disk.set('/paper.pdf', 'PDF');
  const paragraph = 'A sufficiently long abstract paragraph describing research results and conditions. '.repeat(4);
  for (const text of ['Introduction\nBODY_ONLY '.repeat(20), `Abstract\n${paragraph}\nIntroduction\nBody\nAbstract\n${paragraph}\nReferences`]) {
    f.Zotero.PDFWorker = { getFullText: async () => text };
    const preview = await f.host.preparePaperAnalysis(ref);
    assert.equal(preview.sourceScope.abstractSource, 'none');
    assert.equal(preview.sourceScope.hasAbstract, false);
    assert.equal(preview.sourceCharacters.abstract, 0);
    assert.equal(preview.sourceScope.pdfCharacters, 0);
    assert.equal(preview.sourceScope.pdfAttachmentCount, 1);
    assert.deepEqual(Array.from(preview.sourceScope.sectionStatus.missing), ['abstract']);
    await assert.rejects(() => f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId }), /未选择/);
  }
});
