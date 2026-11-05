/**
 * Zotero MindFlow - host runtime tests (shard 04).
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

test('confirmed PDF abstract selection enables abstract-only input without leaking local recovery text', async () => {
  const calls = [], f = llmFixture(async request => { calls.push(request); return { kind: 'completed',
    text: JSON.stringify({ sections: { findings: [{ text: '发光增强', basis: 'paper', source: 'abstract', sourceId: 'AB', quote: 'enhanced emission' }] } }) }; });
  const paper = f.paper('MANUALAB'), ref = `zotero://select/library/items/${paper.key}`;
  f.host.serializeZoteroItem = () => ({ title: 'Unlabelled abstract', zoteroUri: ref, abstract: '', notes: [],
    annotations: [{ text: 'PRIVATE_HIGHLIGHT', comment: 'PRIVATE_COMMENT' }] });
  const pdf = f.attachment('MANUALPD', 1, paper.id, '/paper.pdf'); pdf.isPDFAttachment = () => true;
  paper.attachments.push(pdf.id); f.disk.set('/paper.pdf', 'PDF');
  const paragraph = 'The experiment shows enhanced emission in this material under controlled conditions.';
  let reads = 0;
  f.Zotero.PDFWorker = { getFullText: async () => { reads++; return { text: `Authors\n${paragraph}\nPRIVATE_BODY_TOKEN`, extractedPages: 5, totalPages: 19 }; } };
  const empty = await f.host.preparePaperAnalysis(ref);
  assert.equal(empty.sourceScope.hasAbstract, false);
  assert.equal(empty.sourceScope.pdfTruncated, false);
  assert.equal(empty.sourceScope.highlightCount, 1);
  assert.equal(empty.sourceScope.commentCount, 1);
  assert.ok(empty.abstractExcerpt.includes('PRIVATE_BODY_TOKEN'));
  const preview = await f.host.preparePaperAnalysis(ref, { readingMode: 'abstract', abstractSelection: { preparedId: empty.preparedId, text: paragraph } });
  assert.notEqual(preview.preparedId, empty.preparedId);
  assert.equal(reads, 1, 'confirmation should reuse the local snapshot');
  assert.equal(preview.sourceScope.abstractSource, 'pdf-selected');
  assert.equal(preview.sourceCharacters.abstract, paragraph.length);
  assert.equal(preview.sourceScope.pdfCharacters, 0);
  assert.equal(preview.sourceScope.sectionStatus.missing.length, 0);
  assert.equal(calls.length, 0);
  const result = await f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId });
  assert.equal(result.sections.findings[0].basis, 'paper');
  const reconfirmed = await f.host.preparePaperAnalysis(ref, { abstractSelection: { preparedId: preview.preparedId, text: paragraph } });
  assert.equal(reconfirmed.sourceScope.abstractSource, 'pdf-selected', 'reviewing the same confirmed abstract must retain its original source');
  assert.ok(calls[0].userText.includes(paragraph));
  for (const token of ['PRIVATE_BODY_TOKEN', 'PRIVATE_HIGHLIGHT', 'PRIVATE_COMMENT', 'abstractExcerpt']) assert.ok(!calls[0].userText.includes(token));
});

test('pasted abstracts remain unverified and selection snapshots cannot cross papers or expire', async () => {
  const f = llmFixture(async () => ({ kind: 'completed', text: JSON.stringify({ sections: { findings: [{
    text: '待核对摘要中的发光增强', basis: 'paper', source: 'abstract', sourceId: 'AB', quote: 'enhanced emission' }] } }) }));
  const paper = f.paper('PASTEDAB'), other = f.paper('OTHERABS'), ref = `zotero://select/library/items/${paper.key}`;
  f.host.serializeZoteroItem = item => ({ title: 'No PDF', zoteroUri: `zotero://select/library/items/${item.key}`, abstract: '', notes: [], annotations: [] });
  const empty = await f.host.preparePaperAnalysis(ref);
  const selection = { preparedId: empty.preparedId, text: 'The experiment shows enhanced emission in this material under controlled conditions.' };
  await assert.rejects(() => f.host.preparePaperAnalysis(`zotero://select/library/items/${other.key}`, { abstractSelection: selection }), /文献已改变/);
  await assert.rejects(() => f.host.preparePaperAnalysis(ref, { readingMode: 'full', abstractSelection: selection }), /已过期/);
  await assert.rejects(() => f.host.preparePaperAnalysis(ref, { abstractSelection: { ...selection, text: 'short' } }), /50/);
  const preview = await f.host.preparePaperAnalysis(ref, { abstractSelection: selection });
  assert.equal(preview.sourceScope.abstractSource, 'manual');
  const result = await f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId });
  assert.equal(result.sections.findings[0].verification, 'matched');
  assert.equal(result.sections.findings[0].basis, 'inference');
  f.host._aiPrepared.get(empty.preparedId).createdAt -= 16 * 60 * 1000;
  await assert.rejects(() => f.host.preparePaperAnalysis(ref, { abstractSelection: selection }), /已过期/);
});

test('section boundaries handle summary, theory and tight numbering without treating measurements as headings', async () => {
  const calls = [], f = llmFixture(async request => {
    calls.push(request);
    return { kind: 'completed', text: JSON.stringify({ sections: { question: [{ text: 'Question', basis: 'inference' }] } }) };
  });
  const paper = f.paper('BOUND001'), ref = `zotero://select/library/items/${paper.key}`;
  const pdf = f.attachment('BOUND002', 1, paper.id, '/paper.pdf'); pdf.isPDFAttachment = () => true;
  paper.attachments.push(pdf.id); f.disk.set('/paper.pdf', 'PDF');
  const intro = 'Introduction selected motivation and knowledge gap. '.repeat(8);
  const conclusion = 'Conclusion selected major findings and limitations. '.repeat(5);
  for (const boundary of ['Summary and outlook', 'Conclusions and perspectives', 'Theory', '2.Methods']) {
    f.Zotero.PDFWorker = { getFullText: async () => `1.Introduction\n${intro}\n20 K MEASUREMENT_RETAINED\n${boundary}\nUNSELECTED_LATER_SECTION ${conclusion}\nReferences\nUNSELECTED_REFERENCES` };
    const preview = await f.host.preparePaperAnalysis(ref, { readingMode: 'introduction' });
    await f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId, mode: 'quick' });
    assert.ok(calls.at(-1).userText.includes('MEASUREMENT_RETAINED'));
    assert.ok(!calls.at(-1).userText.includes('UNSELECTED_LATER_SECTION'));
    if (boundary.startsWith('Summary') || boundary.startsWith('Conclusions')) {
      const summary = await f.host.preparePaperAnalysis(ref, { readingMode: 'conclusion' });
      assert.equal(summary.sourceScope.sectionStatus.found[0], 'conclusion');
      await f.host.analyzePaperWithAI(ref, { preparedId: summary.preparedId, mode: 'quick' });
      assert.ok(!calls.at(-1).userText.includes('UNSELECTED_REFERENCES'));
    }
  }
  f.Zotero.PDFWorker.getFullText = async () => `Introduction\n${intro}\nUnrecognized remaining manuscript without a reliable boundary. `.repeat(3);
  const missing = await f.host.preparePaperAnalysis(ref, { readingMode: 'introduction' });
  assert.equal(missing.sourceScope.pdfCharacters, 0);
});

test('story synthesis retains more than five candidates, discovery groups and original quotes', async () => {
  const calls = [], f = llmFixture(async request => {
    calls.push(request);
    const payload = JSON.parse(request.userText);
    const segment = payload.pdfSegment;
    const findings = segment ? Array.from({ length: 7 }, (_, index) => ({
      text: `Observation ${segment.id}-${index}`, topic: '光谱响应', subtopic: '定量观测',
      detail: 'The comparison and measurement conditions stay visible.', basis: 'paper',
      source: 'pdf', sourceId: segment.id, quote: `evidence number ${index} measured at 2 K`,
    })) : payload.segmentDrafts.findings.slice(0, 12).map(entry => ({
      candidateId: entry.candidateId, topicId: 'T1', subtopic: '定量观测',
      text: 'MALICIOUS_REWRITE', quote: 'A fabricated synthesis quote must be ignored', sourceId: 'P999',
    }));
    return { kind: 'completed', text: JSON.stringify({ topics: [{ id: 'T1', label: '光谱响应' }], sections: {
      findings, system: segment ? [{ text: `Sample ${segment.id}`, detail: 'Do not erase sample identity',
        source: 'pdf', sourceId: segment.id, basis: 'paper', quote: 'evidence number 1 measured at 2 K' }] : [],
    } }) };
  });
  const paper = f.paper('STORY001'), ref = `zotero://select/library/items/${paper.key}`;
  const preview = await f.host.preparePaperAnalysis(ref);
  const prepared = f.host._aiPrepared.get(preview.preparedId);
  prepared.pdfText = (Array.from({ length: 7 }, (_, index) => `evidence number ${index} measured at 2 K. `).join('') + 'x '.repeat(80)).repeat(80);
  prepared.readingMode = 'full';
  const result = await f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId, mode: 'deep' });
  assert.ok(calls.length >= 3);
  assert.ok(calls[0].systemPrompt.includes('30～100字'));
  assert.ok(calls[0].systemPrompt.includes('最多 8 项'));
  const candidates = JSON.parse(calls.at(-1).userText).segmentDrafts.findings;
  assert.ok(candidates.length > 5);
  assert.ok(candidates.some(entry => entry.sourceId === 'P2'));
  assert.equal(result.sourceScope.templateId, 'paper-story');
  assert.equal(result.sourceScope.synthesisCandidateLimit, 24);
  assert.equal(result.sections.findings.length, 12);
  assert.ok(result.sections.findings.every(entry => entry.topic === '光谱响应' && entry.subtopic === '定量观测' && entry.verification === 'matched'));
  assert.ok(result.sections.findings.every(entry => entry.text.startsWith('Observation P') && entry.quote.startsWith('evidence number')));
  assert.equal(result.sections.system.length, 2, 'Synthesis must not erase extracted sample identity');
  assert.ok(result.sections.system.every(entry => entry.verification === 'matched'));
});

test('plain-string model columns are retained as unverified text instead of silently disappearing', async () => {
  const f = llmFixture(async () => ({ kind: 'completed', text: JSON.stringify({ sections: {
    system: ['MoSe2/FePS3 on SiO2/Si'], conditions: ['Measured at 4 K'],
    findings: [{ text: 'Result', basis: 'inference' }],
  } }) }));
  const paper = f.paper('STRINGS1'), ref = `zotero://select/library/items/${paper.key}`;
  const preview = await f.host.preparePaperAnalysis(ref);
  const result = await f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId, mode: 'quick' });
  assert.equal(result.sections.system[0].text, 'MoSe2/FePS3 on SiO2/Si');
  assert.equal(result.sections.conditions[0].basis, 'inference');
  assert.equal(result.sections.system[0].source, 'none');
  assert.equal(result.sections.system[0].quote, '');
});

test('story rejects unknown topic IDs and too many main discoveries without manufacturing a map', async () => {
  for (const badTopics of [false, true]) {
    const f = llmFixture(async () => ({ kind: 'completed', text: JSON.stringify({
      topics: badTopics ? Array.from({ length: 6 }, (_, index) => ({ id: `T${index}`, label: `Group ${index}` }))
        : [{ id: 'T1', label: 'Observation' }],
      sections: { findings: [{ text: 'Measured result', basis: 'inference', topicId: 'MISSING' }] },
    }) }));
    const paper = f.paper('TOPICS01'), ref = `zotero://select/library/items/${paper.key}`;
    const preview = await f.host.preparePaperAnalysis(ref);
    await assert.rejects(() => f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId, mode: 'quick' }),
      badTopics ? /过多关键发现/ : /主题关联/);
  }
});

test('host defaults extra materials to opt-in and refuses a stale reading scope before calling upstream', async () => {
  const calls = [], f = llmFixture(async request => { calls.push(request);
    return { kind: 'completed', text: JSON.stringify({ sections: { findings: [{ text: 'Result', basis: 'inference' }] } }) }; });
  const paper = f.paper('OPTIN001'), ref = `zotero://select/library/items/${paper.key}`;
  const preview = await f.host.preparePaperAnalysis(ref);
  await assert.rejects(() => f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId, readingMode: 'full' }), /读取范围已变化/);
  assert.equal(calls.length, 0);
  const opts = { preparedId: preview.preparedId };
  const first = await f.host.analyzePaperWithAI(ref, opts);
  assert.ok(!calls[0].userText.includes('private excluded note'));
  first.sections.findings[0].text = 'MUTATED_BY_CALLER';
  const second = await f.host.analyzePaperWithAI(ref, opts);
  assert.equal(second.sections.findings[0].text, 'Result');
  assert.equal(calls.length, 1);
  await f.host.analyzePaperWithAI(ref, { ...opts, sources: { notes: true } });
  assert.ok(calls.at(-1).userText.includes('private excluded note'));
  assert.equal(calls.length, 2);
});

if (process.env.MINDFLOW_REAL_SCOPE_INPUT && process.env.MINDFLOW_REAL_SCOPE_TEXT) {
  test('real article extracted text retains narrow scopes through the current host without a remote model call', async () => {
    const input = JSON.parse(fs.readFileSync(process.env.MINDFLOW_REAL_SCOPE_INPUT, 'utf8'));
    const text = fs.readFileSync(process.env.MINDFLOW_REAL_SCOPE_TEXT, 'utf8'), scopes = {};
    const calls = [], f = llmFixture(async request => { calls.push(request);
      return { kind: 'completed', text: JSON.stringify({ sections: { question: [{ text: 'Question', basis: 'inference' }] } }) }; });
    const paper = f.paper('REAL0001'), ref = `zotero://select/library/items/${paper.key}`;
    f.host.serializeZoteroItem = () => ({ title: input.title, zoteroUri: ref, abstract: input.abstract, notes: [], annotations: [] });
    const pdf = f.attachment('REAL0002', 1, paper.id, '/paper.pdf'); pdf.isPDFAttachment = () => true;
    paper.attachments.push(pdf.id); f.disk.set('/paper.pdf', 'PDF');
    let extractions = 0;
    f.Zotero.PDFWorker = { getFullText: async () => { extractions++; return { text, extractedPages: 8, totalPages: 8 }; } };
    for (const readingMode of ['abstract', 'introduction', 'conclusion', 'key-sections', 'full']) {
      const preview = await f.host.preparePaperAnalysis(ref, { readingMode });
      scopes[readingMode] = { characters: preview.sourceCharacters.abstract + preview.sourceCharacters.pdf,
        found: Array.from(preview.sourceScope.sectionStatus.found), missing: Array.from(preview.sourceScope.sectionStatus.missing) };
      if (readingMode !== 'full') {
        await f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId, mode: 'quick' });
        assert.ok(!calls.at(-1).userText.includes('2. Results and Discussion'));
        assert.ok(!calls.at(-1).userText.includes('4. Experimental Section'));
      }
      if (readingMode === 'abstract') assert.equal(extractions, 0);
    }
    assert.deepEqual(scopes['key-sections'].found, ['introduction', 'conclusion']);
    assert.equal(scopes['key-sections'].missing.length, 0);
    assert.ok(scopes['key-sections'].characters < scopes.full.characters / 4);
    if (process.env.MINDFLOW_REAL_SCOPE_REPORT) fs.writeFileSync(process.env.MINDFLOW_REAL_SCOPE_REPORT,
      JSON.stringify({ test: 'current-host-real-extracted-text', remoteModelCalls: 0, scopes }, null, 2));
  });
}

test('fixed template choice changes the upstream schema, branch keys and cache scope', async () => {
  const calls = [], f = llmFixture(async request => {
    calls.push(request);
    return { kind: 'completed', text: JSON.stringify({ sections: { question: [{ text: 'Question', basis: 'inference' }],
      assumptions: [{ text: 'Model assumption', basis: 'inference' }] } }) };
  });
  const paper = f.paper('TMPL0001'), ref = `zotero://select/library/items/${paper.key}`;
  const preview = await f.host.preparePaperAnalysis(ref);
  await assert.rejects(() => f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId, templateId: 'unknown' }), /模板无效/);
  for (const templateId of ['experimental', 'experimental-compact', 'experimental-evidence', 'experimental-protocol', 'theoretical', 'mechanism', 'review']) {
    const result = await f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId, templateId });
    assert.equal(result.sourceScope.templateId, templateId);
    assert.equal(Boolean(result.sections.assumptions), templateId === 'theoretical');
    assert.ok(calls.at(-1).systemPrompt.includes('各分支要求'));
    if (templateId === 'experimental-compact') assert.ok(calls.at(-1).systemPrompt.includes('每个分支最多 2 项'));
  }
  assert.equal(calls.length, 7);
});

test('custom research prompts reach upstream, remain in provenance and partition cached results', async () => {
  const calls = [], f = llmFixture(async request => {
    calls.push(request);
    return { kind: 'completed', text: JSON.stringify({ sections: {
      question: [{ text: 'What controls emission?', basis: 'inference' }],
    } }) };
  });
  const paper = f.paper('PRESET01'), ref = `zotero://select/library/items/${paper.key}`;
  const preview = await f.host.preparePaperAnalysis(ref);
  for (const prompt of ['', 'Focus on controls.', 'Focus on temperature.', 'Focus on controls.']) {
    const result = await f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId, customPrompt: prompt });
    assert.equal(result.sourceScope.customPrompt, prompt);
  }
  assert.equal(calls.length, 3);
  assert.ok(JSON.stringify(calls[1]).includes('Focus on controls.'));
  assert.ok(calls[1].systemPrompt.includes('不能覆盖上述证据与输出规则'));
  assert.ok(!JSON.stringify(preview).includes('upstream-secret'));
});

test('oversize and nontext research prompts fail before model calls', async () => {
  let calls = 0;
  const f = llmFixture(async () => { calls++; return { kind: 'completed', text: '{}' }; });
  for (const customPrompt of ['a'.repeat(6001), {}, 7, null]) {
    await assert.rejects(() => f.host.analyzePaperWithAI('invalid', { customPrompt }), /补充提示词/);
  }
  assert.equal(calls, 0);
});

test('missing source fields recover only from unique long quotes in submitted material and never override conflicting provenance', async () => {
  const f = llmFixture(async () => ({ kind: 'completed', text: JSON.stringify({ sections: { findings: [
    { text: 'Unique long quote', basis: 'paper', quote: 'The experiment shows enhanced emission.' },
    { text: 'Conflicting ID', basis: 'paper', sourceId: 'WRONG', quote: 'The experiment shows enhanced emission.' },
    { text: 'Conflicting source', basis: 'paper', source: 'note', quote: 'The experiment shows enhanced emission.' },
    { text: 'Short phrase', basis: 'paper', quote: 'enhanced emission' },
  ] } }) }));
  const paper = f.paper('RECOV001'), ref = `zotero://select/library/items/${paper.key}`;
  let preview = await f.host.preparePaperAnalysis(ref);
  const result = await f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId });
  assert.equal(result.sections.findings[0].sourceRecovery, true);
  assert.equal(result.sections.findings[0].sourceId, 'AB');
  assert.equal(result.sections.findings[0].basis, 'paper');
  for (const claim of result.sections.findings.slice(1)) assert.equal(claim.sourceRecovery, false);
  f.host.serializeZoteroItem = item => ({ title: item.title, zoteroUri: ref, abstract: 'The experiment shows enhanced emission.',
    notes: [{ text: 'The experiment shows enhanced emission.' }], annotations: [] });
  preview = await f.host.preparePaperAnalysis(ref);
  const ambiguous = await f.host.analyzePaperWithAI(ref, { preparedId: preview.preparedId, sources: { notes: true } });
  assert.equal(ambiguous.sections.findings[0].sourceRecovery, false);
});

test('tombstoned documents never appear as readable after interrupted deletion', async () => {
  const f=fixture(); f.disk.set('/data/mindflow/workspace/mindflow_doc_doc_a.json',JSON.stringify(f.map()));
  f.disk.set('/data/mindflow/workspace/mindflow_deleted_doc_doc_a.json','123');
  assert.equal(await f.host.workspaceStorage('get',{key:'mindflow_doc_doc_a'}),null);
});
test('two host snapshot updates merge instead of losing the earlier version', async () => {
  const f=fixture();const snapshot=(id,title)=>({id,docId:'doc_a',title,timestamp:1,data:JSON.stringify(f.map('doc_a',title))});
  await Promise.all(['one','two'].map(id=>f.host.workspaceStorage('mutateSnapshots',{docId:'doc_a',snapshots:[snapshot(id,id)]})));
  const saved=JSON.parse(await f.host.workspaceStorage('get',{key:'mindflow_snapshots_doc_a'}));assert.equal(saved.length,2);
  await f.host.workspaceStorage('mutateSnapshots',{docId:'doc_a',removeSnapshotId:'one'});
  assert.equal(JSON.parse(await f.host.workspaceStorage('get',{key:'mindflow_snapshots_doc_a'}))[0].id,'two');
});
test('direct workspace context accepts the owning wrapped window and records actual document ID', () => {
  const f=fixture();f.host.openMindFlow({mode:'open_document',doc:f.map()},f.win);
  const tab=f.tabs._tabs[1],frame=f.tabs.getTabContent(tab.id).children[0];
  assert.equal(f.host.updateWorkspaceContext({wrappedJSObject:frame.contentWindow},{documentId:'forked_actual',title:'Exact B',attachmentKey:'ATTACHBB',attachmentLibraryID:2}),true);
  assert.equal(tab.data.docId,'forked_actual');assert.equal(tab.data.targetItemId,'attachment:2:ATTACHBB');
  assert.equal(f.host.updateWorkspaceContext({},{documentId:'evil',title:'Wrong'}),false);assert.equal(tab.data.docId,'forked_actual');
});
test('direct handshake delivers a pending action once to the actual owning frame', () => {
  const f=fixture();f.host.openMindFlow({mode:'open_document',doc:f.map()},f.win);
  const frame=f.tabs.getTabContent(f.tabs.selectedID).children[0];frame._mindflowPending={type:'MINDFLOW_OPEN_DOCUMENT'};
  assert.equal(f.host.connectWorkspace(frame.contentWindow),true);assert.equal(frame._mindflowReady,true);
  assert.equal(frame._mindflowPending,null);assert.equal(frame.contentWindow.messages.length,1);
  f.host.connectWorkspace(frame.contentWindow);assert.equal(frame.contentWindow.messages.length,1);
});
test('host serializes concurrent compare-and-save as one mutation', async () => {
  const f=fixture(),first=await f.host.workspaceStorage('commitDocument',{doc:f.map(),expectedRevision:0});
  const writes=await Promise.allSettled(['one','two'].map(title=>f.host.workspaceStorage('commitDocument',{doc:{...first,title},expectedRevision:1})));
  assert.equal(writes.filter(r=>r.status==='fulfilled').length,1);assert.equal(writes.filter(r=>r.status==='rejected').length,1);
});
