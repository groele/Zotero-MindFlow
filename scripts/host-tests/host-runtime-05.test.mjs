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
