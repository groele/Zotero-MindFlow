/**
 * Zotero MindFlow - host runtime tests (shard 05).
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

test('delete checks revision inside the same host queue as writes', async () => {
  const f=fixture(),first=await f.host.workspaceStorage('commitDocument',{doc:f.map(),expectedRevision:0});
  const update=f.host.workspaceStorage('commitDocument',{doc:{...first,title:'updated'},expectedRevision:1});
  const deletion=f.host.workspaceStorage('deleteDocument',{id:first.id,expectedRevision:1});
  await update;await assert.rejects(()=>deletion,/CONFLICT/);
  assert.equal(JSON.parse(await f.host.workspaceStorage('get',{key:'mindflow_doc_doc_a'})).title,'updated');
});
test('deletion marker hides a file when physical cleanup fails', async () => {
  const f=fixture(),first=await f.host.workspaceStorage('commitDocument',{doc:f.map(),expectedRevision:0});
  f.IOUtils.remove=async()=>{throw new Error('locked');};
  await f.host.workspaceStorage('deleteDocument',{id:first.id,expectedRevision:1});
  assert.equal(await f.host.workspaceStorage('get',{key:'mindflow_doc_doc_a'}),null);
  await assert.rejects(()=>f.host.workspaceStorage('commitDocument',{doc:f.map(),expectedRevision:0}),/删除/);
});
test('explicit backup restore removes the deletion marker', async () => {
  const f=fixture(),first=await f.host.workspaceStorage('commitDocument',{doc:f.map(),expectedRevision:0});
  await f.host.workspaceStorage('deleteDocument',{id:first.id,expectedRevision:1});
  const restored=await f.host.workspaceStorage('commitDocument',{doc:f.map(),expectedRevision:0,force:true});
  assert.equal(restored.revision,1);assert.ok(await f.host.workspaceStorage('get',{key:'mindflow_doc_doc_a'}));
});
test('one unreadable workspace record cannot block exporting other records', async () => {
  const f=fixture();f.disk.set('/data/mindflow/workspace/mindflow_doc_bad.json','{bad');
  f.disk.set('/data/mindflow/workspace/mindflow_doc_doc_a.json',JSON.stringify(f.map()));
  const records=await f.host.workspaceStorage('getAll');assert.ok(records.mindflow_doc_doc_a);assert.equal(records.mindflow_doc_bad,undefined);
});
test('closing captures latest state before the iframe is destroyed', async () => {
  const f=fixture(),first=await f.host.workspaceStorage('commitDocument',{doc:f.map(),expectedRevision:0});
  const editor={_mindflowCaptureState:()=>({doc:{...first,title:'latest close'}})};
  const operation=f.host.captureWorkspaceOnClose(editor);delete editor._mindflowCaptureState;
  await operation;assert.equal(JSON.parse(await f.host.workspaceStorage('get',{key:'mindflow_doc_doc_a'})).title,'latest close');
});
test('close conflict saves a detached recovery copy rather than overwriting another editor', async () => {
  const f=fixture(),first=await f.host.workspaceStorage('commitDocument',{doc:f.map(),expectedRevision:0});
  await f.host.workspaceStorage('commitDocument',{doc:{...first,title:'other window'},expectedRevision:1});
  await f.host.captureWorkspaceOnClose({_mindflowCaptureState:()=>({doc:{...first,root:{...first.root,internalLink:{documentId:first.id,nodeId:first.root.id}},title:'unsaved close',metadata:{zoteroItemKey:'PAPERAAA',zoteroAttachmentKey:'ATTACHAA'}}})});
  const records=await f.host.workspaceStorage('getAll');const copy=Object.values(records).map(JSON.parse).find(d=>d.title?.includes('关闭恢复副本'));
  assert.equal(copy.metadata.autoSyncToZotero,false);assert.equal(copy.metadata.zoteroAttachmentKey,undefined);
  assert.equal(copy.root.internalLink.documentId, copy.id);
  assert.equal(JSON.parse(records.mindflow_doc_doc_a).title,'other window');
});
test('host rejects duplicate nodes and unsafe IDs before any write', async () => {
  const f=fixture(),doc=f.map();doc.root.children=[{...doc.root}];
  await assert.rejects(()=>f.host.workspaceStorage('commitDocument',{doc,expectedRevision:0}),/重复/);
  await assert.rejects(()=>f.host.workspaceStorage('commitDocument',{doc:{...f.map(),id:'../unsafe'},expectedRevision:0}),/结构|存储键/);
  assert.equal(f.disk.size,0);
});
test('host storage applies the same strict document-shape checks before any write', async () => {
  const f=fixture();
  const invalidDocuments = [
    { ...f.map(), themeId: undefined },
    { ...f.map(), revision: -1 },
    { ...f.map(), root: { ...f.map().root, task: { status: 'done', progress: 101 } } },
    { ...f.map(), root: { ...f.map().root, image: { dataUrl: 'data:image/gif;base64,AAAA', width: 200, aspectRatio: 1 } } },
    { ...f.map(), root: { ...f.map().root, internalLink: { documentId: '' } } },
    { ...f.map(), relationships: [{ id: 'same', fromId: 'root', toId: 'root' }, { id: 'same', fromId: 'root', toId: 'root' }] },
    { ...f.map(), relationships: [{ id: 'dangling', fromId: 'missing', toId: 'root' }] },
  ];
  for (const doc of invalidDocuments) {
    await assert.rejects(() => f.host.workspaceStorage('commitDocument', { doc, expectedRevision: 0 }));
  }
  assert.equal(f.disk.size, 0);
});
test('stale revision-one writer cannot recreate a deleted document', async () => {
  const f=fixture();f.disk.set('/data/mindflow/workspace/mindflow_deleted_doc_doc_a.json','123');
  await assert.rejects(()=>f.host.workspaceStorage('setMany',{items:{mindflow_doc_doc_a:JSON.stringify(f.map())}}),/删除|CONFLICT/);
});

test('host rejects invalid calendar dates and rendering attributes without touching disk', async () => {
  const f = fixture();
  for (const attributes of [
    { task: { status: 'todo', dueDate: '2025-02-29' } },
    { task: { status: 'todo', dueDate: '2026-04-31' } },
    { task: { status: 'todo', dueDate: '0000-01-01' } },
    { isExpanded: 'false' }, { shape: 'circle' }, { type: {} }, { textColor: {} },
  ]) {
    const doc = f.map(); Object.assign(doc.root, attributes);
    await assert.rejects(() => f.host.workspaceStorage('commitDocument', { doc, expectedRevision: 0 }));
  }
  for (const attributes of [{ label: {} }, { style: 'unknown' }, { color: 123 }]) {
    const doc = f.map(); doc.relationships = [{ id: 'rel', fromId: doc.root.id, toId: doc.root.id, ...attributes }];
    await assert.rejects(() => f.host.workspaceStorage('commitDocument', { doc, expectedRevision: 0 }));
  }
  assert.equal(f.disk.size, 0);
  const doc = f.map(); doc.root.task = { status: 'todo', dueDate: '2024-02-29' };
  assert.equal((await f.host.workspaceStorage('commitDocument', { doc, expectedRevision: 0 })).root.task.dueDate, '2024-02-29');
});
test('archive refuses a document deleted from workspace', async () => {
  const f=fixture(),p=f.paper('PAPERAAA');f.disk.set('/data/mindflow/workspace/mindflow_deleted_doc_doc_a.json','123');
  const result=await f.host.saveMindMapToItem({doc:f.map(),parentItemKey:p.key});
  assert.equal(result.success,false);assert.equal(p.attachments.length,0);
});
test('explicit missing group item never falls through to same user-library key', () => {
  const f=fixture();f.paper('SAMEKEY1',1);assert.equal(f.host.resolveItemReference('zotero://select/groups/55/items/SAMEKEY1'),null);
});
test('bare ambiguous keys, mismatched scopes and missing groups are rejected', () => {
  const f=fixture();f.paper('SAMEKEY1',1);f.paper('SAMEKEY1',2);
  assert.equal(f.host.resolveItemReference('SAMEKEY1'),null);
  assert.equal(f.host.resolveItemReference('zotero://select/library/items/SAMEKEY1',2),null);
  assert.equal(f.host.resolveItemReference('zotero://select/groups/404/items/SAMEKEY1'),null);
});
test('eight-digit item keys stay keys; numeric API IDs remain explicit numbers', () => {
  const f=fixture();const p=f.paper('12345678');assert.equal(f.host.resolveItemReference('12345678',1),p);
  assert.equal(f.host.resolveItemReference(p.id,1),p);p.deleted=true;assert.equal(f.host.resolveItemReference('12345678',1),null);
});
test('same embedded document ID from two different papers opens separate tabs', () => {
  const f=fixture();const a=f.map(),b=f.map();a.metadata={zoteroUri:'zotero://select/library/items/PAPERAAA'};b.metadata={zoteroUri:'zotero://select/library/items/PAPERBBB'};
  f.host.openMindFlow({mode:'open_document',doc:a,openedAttachmentKey:'ATTACHAA',openedAttachmentLibraryID:1},f.win);
  f.host.openMindFlow({mode:'open_document',doc:b,openedAttachmentKey:'ATTACHBB',openedAttachmentLibraryID:1},f.win);
  assert.equal(f.tabs._tabs.length,3);
});
test('two maps under same parent never reuse each other', () => {
  const f=fixture();const a=f.map('doc_a'),b=f.map('doc_b');a.metadata=b.metadata={zoteroUri:'zotero://select/library/items/PAPERAAA'};
  for (const [doc,key] of [[a,'ATTACHAA'],[b,'ATTACHBB']]) f.host.openMindFlow({mode:'open_document',doc,openedAttachmentKey:key,openedAttachmentLibraryID:1},f.win);
  assert.equal(f.tabs._tabs.length,3);
});
test('same attachment key in different libraries never collides', () => {
  const f=fixture();for(const library of [1,2]) f.host.openMindFlow({mode:'open_document',doc:f.map(),openedAttachmentKey:'ATTACHAA',openedAttachmentLibraryID:library},f.win);
  assert.equal(f.tabs._tabs.length,3);
});
test('exact reopen uses Zotero getTabContent and preserves live edits', () => {
  const f=fixture();const options={mode:'open_document',doc:f.map(),openedAttachmentKey:'ATTACHAA',openedAttachmentLibraryID:1};
  f.host.openMindFlow(options,f.win);const id=f.tabs.selectedID;f.tabs.select('zotero-pane');f.host.openMindFlow(options,f.win);
  assert.equal(f.tabs.selectedID,id);assert.equal(f.tabs._tabs.length,2);assert.equal(f.tabs.getTabContent(id).children[0].contentWindow.messages.length,0);
});
test('same-name collections and multi-library topics have distinct identities', () => {
  const f=fixture(); const id=(o,it=[])=>f.host.openTargetIdentity(o,it);
  assert.notEqual(id({mode:'create_from_collection',collectionKey:'COLLECTA',collectionLibraryID:1}),id({mode:'create_from_collection',collectionKey:'COLLECTB',collectionLibraryID:1}));
  assert.notEqual(id({mode:'create_from_selection'},[{key:'SAMEKEY1',libraryID:1}]),id({mode:'create_from_selection'},[{key:'SAMEKEY1',libraryID:2}]));
});
test('forceNew always bypasses an existing tab', () => {
  const f=fixture();const p=f.paper('PAPERAAA');for(let i=0;i<2;i++) f.host.openMindFlow({mode:'create_from_selection',items:[p],forceNew:true},f.win);
  assert.equal(f.tabs._tabs.length,3);
});
test('toolbar reader target uses selectedID rather than stale library selection', async () => {
  const f=fixture(),a=f.paper('PAPERAAA'),b=f.paper('PAPERBBB');const pdf=f.attachment('PDFKEYAA',1,b.id,'/b.pdf');
  f.win.ZoteroPane.getSelectedItems=()=>[a];f.tabs._tabs.push({id:'reader-1',type:'reader',data:{itemID:pdf.id}});f.tabs.selectedID='reader-1';
  const calls=[];f.host.openMindFlow=(o)=>calls.push(o);await f.host.triggerMindFlowOpen(f.win);assert.equal(calls[0].items[0],b);
});
test('only the owning frame can update its tab title and binding', () => {
  const f=fixture();f.host.addToWindow(f.win);
  for(const key of ['ATTACHAA','ATTACHBB'])f.host.openMindFlow({mode:'open_document',doc:f.map(),openedAttachmentKey:key,openedAttachmentLibraryID:1},f.win);
  const [a,b]=f.tabs._tabs.slice(1), frame=f.tabs.getTabContent(b.id).children[0];
  f.listeners.get('message')({source:frame.contentWindow,origin:'null',data:{type:'MINDFLOW_SET_TAB_TITLE',title:'Only B'}});
  assert.equal(b.title,'MindFlow - Only B');assert.notEqual(a.title,b.title);
  f.listeners.get('message')({source:{},origin:'null',data:{type:'MINDFLOW_SET_PREF',key:'aiApiKey',value:'bad'}});
  assert.equal(f.prefs.size,0);
});
test('document filenames, primary payload and backup IDs must agree', async () => {
  const f=fixture();f.disk.set('/data/mindflow/workspace/mindflow_doc_doc_a.json',JSON.stringify(f.map('doc_b')));
  await assert.rejects(()=>f.host.workspaceStorage('get',{key:'mindflow_doc_doc_a'}),/身份/);
  f.disk.set('/data/mindflow/workspace/mindflow_doc_doc_a.json.bak',JSON.stringify(f.map('doc_b')));
  await assert.rejects(()=>f.host.workspaceStorage('get',{key:'mindflow_doc_doc_a'}),/身份/);
});
test('attachment enumeration excludes wrong parents, libraries and trash', () => {
  const f=fixture(),p=f.paper('PAPERAAA'),q=f.paper('PAPERBBB');const a=f.attachment('ATTACHAA',1,p.id,'/a'),b=f.attachment('ATTACHBB',1,q.id,'/b');b.deleted=true;
  p.attachments=[a.id,b.id];assert.deepEqual(Array.from(f.host.getMindflowAttachments(p)),[a]);
});
test('archive never binds an unlinked map to current selection', async () => {
  const f=fixture(),a=f.paper('PAPERAAA'),container=f.paper('CONTAIN1');f.win.ZoteroPane.getSelectedItems=()=>[a];f.host.ensureUnlinkedMapContainer=async()=>container;
  const r=await f.host.saveMindMapToItem({doc:f.map()});assert.equal(r.success,true);assert.equal(a.attachments.length,0);assert.equal(container.attachments.length,1);
});
test('archive verifies actual content and parent registration before success', async () => {
  const f=fixture(),p=f.paper('PAPERAAA');const r=await f.host.saveMindMapToItem({doc:f.map(),parentItemKey:'zotero://select/library/items/PAPERAAA'});
  assert.equal(r.success,true);assert.ok(r.attachmentKey);assert.equal(r.attachmentLibraryID,1);
  const att=f.items.get(p.attachments[0]);assert.equal(JSON.parse(f.disk.get(att.path)).id,'doc_a');
});
test('filename token collision never overwrites another document', async () => {
  const f=fixture(),p=f.paper('PAPERAAA');const a=f.attachment('ATTACHAA',1,p.id,'/a');p.attachments.push(a.id);a.attachmentFilename='A-doc_a.mindflow';f.disk.set('/a',JSON.stringify(f.map('other')));
  const r=await f.host.saveMindMapToItem({doc:f.map(),parentItemKey:'zotero://select/library/items/PAPERAAA'});
  assert.equal(r.success,true);assert.equal(p.attachments.length,2);assert.equal(JSON.parse(f.disk.get('/a')).id,'other');
});
test('update failure never falls back to duplicate import', async () => {
  const f=fixture(),p=f.paper('PAPERAAA'),a=f.attachment('ATTACHAA',1,p.id,'/a');p.attachments.push(a.id);f.disk.set('/a',JSON.stringify(f.map()));
  const write=f.IOUtils.writeUTF8;f.IOUtils.writeUTF8=async(path,...args)=>{if(path==='/a')throw Error('denied');return write(path,...args);};
  const r=await f.host.saveMindMapToItem({doc:f.map(),parentItemKey:'zotero://select/library/items/PAPERAAA'});
  assert.equal(r.success,false);assert.equal(p.attachments.length,1);
});
test('read-back corruption fails and cleans only newly created attachment', async () => {
  const f=fixture(),p=f.paper('PAPERAAA');const orig=f.Zotero.Attachments.importFromFile;
  f.Zotero.Attachments.importFromFile=async options=>{const a=await orig(options);f.disk.set(a.path,'bad');return a;};
  const r=await f.host.saveMindMapToItem({doc:f.map(),parentItemKey:'zotero://select/library/items/PAPERAAA'});
  assert.equal(r.success,false);assert.equal(p.attachments.length,0);
});
test('explicit source attachment cannot move or silently become another parent', async () => {
  const f=fixture(),p=f.paper('PAPERAAA'),q=f.paper('PAPERBBB'),a=f.attachment('ATTACHAA',1,p.id,'/a');p.attachments.push(a.id);f.disk.set('/a',JSON.stringify(f.map()));
  const doc=f.map();doc.metadata={zoteroAttachmentKey:a.key,zoteroAttachmentLibraryID:1};
  const r=await f.host.saveMindMapToItem({doc,parentItemKey:'zotero://select/library/items/PAPERBBB'});
  assert.equal(r.success,false);assert.equal(q.attachments.length,0);
});
test('concurrent same-document archives create one attachment', async () => {
  const f=fixture(),p=f.paper('PAPERAAA'),data={doc:f.map(),parentItemKey:'zotero://select/library/items/PAPERAAA'};
  const results=await Promise.all([f.host.saveMindMapToItem(data),f.host.saveMindMapToItem(data)]);
  assert.ok(results.every(r=>r.success));assert.equal(p.attachments.length,1);
});
test('stale workspace revision cannot overwrite latest attachment', async () => {
  const f=fixture(),p=f.paper('PAPERAAA');f.disk.set('/data/mindflow/workspace/mindflow_doc_doc_a.json',JSON.stringify({...f.map(),revision:3}));
  const r=await f.host.saveMindMapToItem({doc:f.map(),parentItemKey:'zotero://select/library/items/PAPERAAA'});
  assert.equal(r.success,false);assert.equal(p.attachments.length,0);
});
test('undo-close explicitly restores a canonical detached workspace identity', async () => {
  const f=fixture();f.tabs.tabHooks={undoClose:{},restoreState:{}};
  f.Zotero.Prefs.set('extensions.mindflow.windowMode','window');
  const saved=await f.host.workspaceStorage('commitDocument',{doc:f.map('detached_restore'),expectedRevision:0});
  f.host.installTabLifecycle(f.win);
  await f.tabs.tabHooks.undoClose.mindflow({data:{docId:saved.id}},1);
  const tab=f.tabs._tabs.find(t=>t.type==='mindflow');
  assert.equal(tab.data.docId,saved.id);assert.equal(tab.data.workspaceDocumentId,saved.id);
  assert.equal(f.tabs.getTabContent(tab.id).children[0]._mindflowInitialAction.workspaceDocumentId,saved.id);
});

test('toolbar button excludes dialog windows such as plugin market', () => {
  const f = fixture();
  let created = false;
  const dialogDoc = {
    getElementById: () => null,
    querySelector: () => ({ parentNode: null }),
    querySelectorAll: () => [],
    createElement: () => { created = true; return { setAttribute() {}, remove() {} }; },
    documentElement: { getAttribute: (k) => k === 'windowtype' ? 'zotero:market' : null }
  };
  const dialogWin = { document: dialogDoc };
  f.host.addToWindow(dialogWin);
  assert.equal(created, false);
});



test('restoreDeleted only revives tombstones and cannot overwrite a concurrent document', async () => {
  const f = fixture(), doc = f.map('doc_restore_guard', 'current');
  const saved = await f.host.workspaceStorage('commitDocument', { doc, expectedRevision: 0 });
  await assert.rejects(() => f.host.workspaceStorage('commitDocument', { doc: { ...doc, title: 'stale backup' }, expectedRevision: 0, restoreDeleted: true }), /REVISION_CONFLICT/);
  assert.equal(JSON.parse(await f.host.workspaceStorage('get', { key: 'mindflow_doc_' + doc.id })).title, 'current');
  await f.host.workspaceStorage('deleteDocument', { id: doc.id, expectedRevision: saved.revision });
  const restored = await f.host.workspaceStorage('commitDocument', { doc, expectedRevision: 0, restoreDeleted: true });
  assert.equal(restored.title, 'current');
  assert.equal(await f.host.workspaceStorage('get', { key: 'mindflow_deleted_doc_' + doc.id }), null);
});

test('snapshot corruption and duplicate additions never overwrite snapshot storage', async () => {
  const f = fixture(), doc = f.map('doc_snapshot_guard', 'snapshot');
  const snap = { id: 'one', docId: doc.id, title: 'snapshot', timestamp: 1, data: JSON.stringify(doc) };
  await assert.rejects(() => f.host.workspaceStorage('mutateSnapshots', { docId: doc.id, snapshots: [snap, snap] }), /重复/);
  const key = 'mindflow_snapshots_' + doc.id;
  await f.host.workspaceStorage('setMany', { items: { [key]: '[null]' } });
  await assert.rejects(() => f.host.workspaceStorage('mutateSnapshots', { docId: doc.id, snapshots: [snap] }), /身份|属性/);
  assert.equal(await f.host.workspaceStorage('get', { key }), '[null]');
});

test('commitDocument preserves baseline updatedAt and detects relationship/title conflicts against newer attachments', async () => {
  const f = fixture(), p = f.paper('PAPERAAA'), a = f.attachment('ATTACHAA', 1, p.id, '/a.mindflow');
  p.attachments.push(a.id);
  const initial = { ...f.map('doc_rel_conflict', 'Original'), updatedAt: 1000, relationships: [{ id: 'rel_1', fromId: 'root', toId: 'root', label: 'old' }] };
  f.disk.set('/a.mindflow', JSON.stringify(initial));

  // Importing attachment preserves its updatedAt baseline (1000)
  const imported = await f.host.workspaceStorage('commitDocument', { doc: initial, expectedRevision: 0, preserveUpdatedAt: true });
  assert.equal(imported.updatedAt, 1000);

  // External edit updates attachment title/relationships at timestamp 2000
  f.disk.set('/a.mindflow', JSON.stringify({ ...initial, updatedAt: 2000, relationships: [{ id: 'rel_1', fromId: 'root', toId: 'root', label: 'external' }] }));

  // Local edit bumps local updatedAt to Date.now() (> 2000) while changing only title/relationships
  const localEdited = await f.host.workspaceStorage('commitDocument', {
    doc: { ...imported, title: 'Local Title', relationships: [{ id: 'rel_1', fromId: 'root', toId: 'root', label: 'local' }] },
    expectedRevision: imported.revision,
  });
  assert.ok(localEdited.updatedAt > 2000);
  const blocked = await f.host.saveMindMapToItem({ doc: localEdited, parentItemKey: 'zotero://select/library/items/PAPERAAA' });
  assert.equal(blocked.success, false);
  assert.match(blocked.message, /附件包含较新的编辑/);
});

test('openMindflowAttachment and listDocs skip getAll/snapshots and reuse stat cache', async () => {
  const f = fixture(), p = f.paper('PAPERAAA'), a = f.attachment('ATTACHAA', 1, p.id, '/att.mindflow');
  p.attachments.push(a.id);
  const stored = { ...f.map('doc_ws_only'), metadata: { zoteroAttachmentKey: a.key, zoteroAttachmentLibraryID: 1 } };
  f.disk.set('/data/mindflow/workspace/mindflow_doc_doc_ws_only.json', JSON.stringify(stored));
  f.disk.set('/data/mindflow/workspace/mindflow_snapshots_doc_ws_only.json', '[{"corrupt_if_read":true}]');
  f.disk.set('/att.mindflow', JSON.stringify({ ...f.map('doc_copy_id') }));

  let readSnapCalls = 0;
  const stats = new Map();
  f.IOUtils.stat = async (pPath) => {
    const content = f.disk.get(pPath);
    if (!content) throw new Error('ENOENT');
    if (!stats.has(pPath)) stats.set(pPath, { size: content.length, lastModified: 12345 });
    return stats.get(pPath);
  };
  const origRead = f.IOUtils.readUTF8;
  let docReadCalls = 0;
  f.IOUtils.readUTF8 = async (pPath) => {
    if (pPath.includes('mindflow_snapshots_')) readSnapCalls += 1;
    if (pPath.includes('mindflow_doc_doc_ws_only.json')) docReadCalls += 1;
    return origRead(pPath);
  };

  let usedGetAll = false;
  const origWs = f.host.workspaceStorage.bind(f.host);
  f.host.workspaceStorage = async (action, payload) => {
    if (action === 'getAll') usedGetAll = true;
    return origWs(action, payload);
  };

  await f.host.openMindflowAttachment(a, f.win);
  assert.equal(usedGetAll, false);
  assert.equal(readSnapCalls, 0);
  assert.equal(docReadCalls, 1);

  const list2 = await f.host.workspaceStorage('listDocs');
  assert.equal(list2.length, 1);
  assert.equal(list2[0].id, 'doc_ws_only');
  assert.equal(docReadCalls, 1, 'second listDocs call should use stat-validated index cache');
});

test('collection command resolves numeric IDs, caps large collections, skips child notes/annotations, and searchItemByDoi avoids getAll on miss', async () => {
  const f = fixture();
  const manyIds = [];
  let noteOrAttReads = 0;
  for (let i = 1; i <= 115; i++) {
    const item = f.paper(`COL${String(i).padStart(5, '0')}`);
    item.getNotes = () => { noteOrAttReads += 1; return []; };
    item.getAttachments = () => { noteOrAttReads += 1; return []; };
    manyIds.push(item.id);
  }
  const col = { id: 9, key: 'COLL9999', libraryID: 1, name: 'BigCol', getChildItems: () => manyIds };
  f.win.ZoteroPane.getSelectedCollections = () => [col];

  let popupMenu = null;
  const colMenu = { children: [], appendChild(el) { this.children.push(el); popupMenu = el; }, addEventListener() {} };
  f.doc.getElementById = (id) => (id === 'zotero-collectionmenu' ? colMenu : null);
  f.host.addToWindow(f.win);
  assert.ok(popupMenu?.command);
  popupMenu.command();

  const tab = f.tabs._tabs.find(t => t.type === 'mindflow');
  assert.ok(tab);
  assert.equal(tab.data.items.length, 100);
  assert.equal(noteOrAttReads, 0);

  let getAllCalls = 0;
  f.Zotero.Items.getAll = () => { getAllCalls += 1; return []; };
  const frame = f.tabs.getTabContent(tab.id).children[0];
  await f.listeners.get('message')({
    source: frame.contentWindow,
    origin: 'null',
    data: { type: 'MINDFLOW_LOCATE_ITEM', requestId: 'doi-miss-test', doi: '10.1000/does-not-exist' },
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(getAllCalls, 0);
  const locateReply = frame.contentWindow.messages.find((m) => m.requestId === 'doi-miss-test');
  assert.equal(locateReply?.success, false);
});

test('outline note preserves ordinary Summary child nodes and respects locale-aware toolbar tooltip', async () => {
  const f = fixture();
  const p = f.paper('PAPERAAA');
  const doc = {
    ...f.map('doc_summary'),
    root: {
      id: 'root',
      text: 'Root Paper',
      children: [
        {
          id: 'sum_parent',
          text: 'Summary',
          note: 'Summary of key experiments across three regimes.',
          children: [
            { id: 'sum_child', text: 'Summary', children: [] },
            { id: 'finding_child', text: 'Key Result', children: [] },
          ],
        },
      ],
    },
  };
  const saved = await f.host.saveMindMapToItem({ doc, parentItemKey: 'zotero://select/library/items/PAPERAAA', createNote: true });
  assert.equal(saved.savedNote, true);
  const noteHtml = f.items.get(p.notes[0]).note;
  assert.match(noteHtml, /<strong[^>]*>Summary<\/strong>.*<strong[^>]*>Summary<\/strong>/s);

  const fEn = fixture();
  fEn.Zotero.locale = 'en-US';
  const createdButtons = [];
  const origCreate = fEn.doc.createElement;
  fEn.doc.createElement = (tag) => {
    const el = origCreate(tag);
    el.hasAttribute = (k) => Object.prototype.hasOwnProperty.call(el.attrs, k);
    el.insertBefore = (child) => { el.appendChild(child); return child; };
    if (tag === 'toolbarbutton') createdButtons.push(el);
    return el;
  };
  const toolbar = fEn.doc.createElement('toolbar');
  toolbar.id = 'zotero-tb-add';
  const parentTb = fEn.doc.createElement('hbox');
  parentTb.id = 'zotero-items-toolbar';
  parentTb.appendChild(toolbar);
  fEn.doc.getElementById = (id) => (id === 'zotero-tb-add' ? toolbar : id === 'zotero-items-toolbar' ? parentTb : null);
  fEn.host.addToWindow(fEn.win);
  assert.equal(createdButtons[0]?.getAttribute('tooltiptext'), 'Open Zotero MindFlow Mind Map Workspace');
});
