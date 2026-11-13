/**
 * Zotero MindFlow - shared host test fixture.
 * Loads the runtime script and all seven domain modules into a vm context,
 * providing deterministic Zotero/IOUtils/PathUtils doubles for host tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = fs.readFileSync(process.env.MINDFLOW_HOST_FILE || path.join(root, 'chrome/content/scripts/index.js'), 'utf8');

function hangingTurn(_request, _onEvent, { signal }) {
  return new Promise((_resolve, reject) => {
    const abort = () => reject(Object.assign(new Error('cancelled'), { name: 'AbortError' }));
    if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
  });
}


function fixture(options = {}) {
  const items = new Map(), disk = new Map(), prefs = new Map(), elements = new Map(), listeners = new Map();
  let nextID = 10;
  let nextTimerID = 1;
  const activeTimers = new Map();
  const bindEventHelpers = (target, onEmpty = () => {}, onSet = () => {}) => {
    const table = new Map();
    const abortCleanups = [];
    const removeListener = (type, fn) => {
      const set = table.get(type);
      if (set) {
        set.delete(fn);
        if (set.size === 0) {
          table.delete(type);
          onEmpty(type);
        } else {
          onSet(type, [...set][set.size - 1]);
        }
      }
      for (let i = abortCleanups.length - 1; i >= 0; i--) {
        const entry = abortCleanups[i];
        if (entry.type === type && entry.fn === fn) {
          entry.signal?.removeEventListener?.('abort', entry.handler);
          abortCleanups.splice(i, 1);
        }
      }
    };
    const addListener = (type, fn, opts) => {
      const sig = typeof opts === 'object' ? opts?.signal : null;
      const once = typeof opts === 'object' ? Boolean(opts?.once) : false;
      if (sig?.aborted || typeof fn !== 'function') return;
      const wrapped = once ? (...args) => { removeListener(type, wrapped); return fn(...args); } : fn;
      let set = table.get(type);
      if (!set) { set = new Set(); table.set(type, set); }
      set.add(wrapped);
      onSet(type, wrapped);
      if (sig) {
        const onAbort = () => removeListener(type, wrapped);
        abortCleanups.push({ type, fn: wrapped, signal: sig, handler: onAbort });
        sig.addEventListener('abort', onAbort, { once: true });
      }
    };
    const dispatchEvent = (event) => {
      const list = [...(table.get(event?.type) || [])];
      for (const fn of list) fn(event);
    };
    return { addListener, removeListener, dispatchEvent, table };
  };
  function element(tag) {
    const node = { localName: tag, children: [], childNodes: [], style: {}, attrs: {}, ownerDocument: doc, isConnected: true,
      replaceChildren(...children) { this.children = []; for (const c of children) this.appendChild(c); },
      setAttribute(k,v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; }, removeAttribute(k) { delete this.attrs[k]; },
      appendChild(child) { this.children.push(child); child.parentNode = this; },
      querySelector(sel) { return this.children.find(x => x.localName === 'iframe') || null; },
      querySelectorAll() { return []; }, remove() {} };
    const ev = bindEventHelpers(node, (type) => { delete node[type]; }, (type, fn) => { node[type] = fn; });
    node.addEventListener = ev.addListener;
    node.removeEventListener = ev.removeListener;
    node.dispatchEvent = ev.dispatchEvent;
    node._eventListeners = ev.table;
    if (tag === 'iframe') node.contentWindow = { messages: [], postMessage(data) { this.messages.push(data); } };
    return node;
  }
  const doc = { getElementById: id => elements.get(id) || null,
    querySelector: () => null,
    querySelectorAll: () => [...elements.values()].flatMap(n => n.children || []).filter(n => n.localName === 'iframe'),
    createElement: tag => element(tag), addEventListener() {}, removeEventListener() {}, head: { appendChild() {} } };
  const tabs = { _tabs: [{ id: 'zotero-pane', type: 'library' }], selectedID: 'zotero-pane',
    add({type, title, data, onClose}) { const id = `tab-${nextID++}`; const container = element('tab-content');
      elements.set(id, container); this._tabs.push({ id, type, title, data, onClose }); this.selectedID = id; return { id, container }; },
    close(id) { const idx = this._tabs.findIndex(t => t.id === id);
      if (idx >= 0) { const [removed] = this._tabs.splice(idx, 1); removed.onClose?.(); } },
    getTabContent(id) { return elements.get(id); }, select(id) { this.selectedID = id; },
    rename(id, title) { this._tabs.find(t=>t.id===id).title = title; } };
  const win = { document: doc, Zotero_Tabs: tabs, ZoteroPane: { getSelectedItems: () => [] }, focus() {},
    fetch: options.fetch, AbortController,
    _activeTimers: activeTimers,
    setTimeout(fn) { const id = nextTimerID++; activeTimers.set(id, fn); return id; },
    clearTimeout(id) { activeTimers.delete(id); } };
  const winEv = bindEventHelpers(win, (type) => { listeners.delete(type); }, (type, fn) => { listeners.set(type, fn); });
  win.addEventListener = winEv.addListener;
  win.removeEventListener = winEv.removeListener;
  win.dispatchEvent = winEv.dispatchEvent;
  win._eventListeners = winEv.table;
  const Zotero = { log() {}, logError() {}, getMainWindow: () => win, getActiveZoteroPane: () => win.ZoteroPane,
    File: { getContentsFromURL: async () => fs.readFileSync(path.join(root, 'chrome/content/research-templates.json'), 'utf8') },
    Search: class {
      constructor() { this.conditions = []; this.libraryID = 1; }
      addCondition(field, operator, val) { this.conditions.push({ field, operator, val }); }
      async search() {
        const doiCond = this.conditions.find(c => c.field === 'DOI');
        if (doiCond) {
          const matched = [...items.values()].filter(i => {
            const itDoi = (typeof i.getField === 'function' ? i.getField('DOI') : (i.doi || i.fields?.DOI));
            if (!itDoi) return false;
            const targetVal = String(doiCond.val).toLowerCase();
            const fieldVal = String(itDoi).toLowerCase();
            return doiCond.operator === 'contains' ? fieldVal.includes(targetVal) : fieldVal === targetVal;
          });
          return matched.map(m => m.id);
        }
        const extraCond = this.conditions.find(c => c.field === 'extra');
        if (extraCond) {
          const matched = [...items.values()].filter(i => {
            const itExtra = (typeof i.getField === 'function' ? i.getField('extra') : (i.extra || i.fields?.extra));
            if (!itExtra) return false;
            const targetVal = String(extraCond.val).toLowerCase();
            const fieldVal = String(itExtra).toLowerCase();
            return extraCond.operator === 'contains' ? fieldVal.includes(targetVal) : fieldVal === targetVal;
          });
          return matched.map(m => m.id);
        }
        return [];
      }
    },
    Items: { get: id => items.get(id), getByLibraryAndKey: (lib,key) => [...items.values()].find(i => i.libraryID === lib && i.key === key) },
    Libraries: { userLibraryID: 1, get: id => ({ libraryID:id, groupID:id===2?55:undefined, editable:true, filesEditable:true }),
      getAll: () => [{libraryID:1},{libraryID:2}] }, Groups: { getLibraryIDFromGroupID: id => id===55?2:null },
    Prefs: { get: key => prefs.get(key), set: (k,v) => prefs.set(k,v), clear: k => prefs.delete(k) },
    DataDirectory: { dir: '/data' }, Utilities: { randomString: () => String(nextID++) },
    ProgressWindow: class { changeHeadline() {} addDescription() {} show() {} startCloseTimer() {} },
    Notifier: { observers: new Map(),
      registerObserver(observer, types, id) { this.observers.set(id, observer); return id; },
      unregisterObserver(id) { this.observers.delete(id); },
      trigger(event, type, ids) { for (const obs of this.observers.values()) obs.notify?.(event, type, ids); } },
    ItemPaneManager: { sections: new Map(),
      registerSection(section) { const id = 'sec_' + nextID++; this.sections.set(id, section); return id; },
      unregisterSection(id) { this.sections.delete(id); } },
    Item: class { constructor() { this.id=nextID++; this.key=('KEY'+this.id).padEnd(8,'X'); this.fields={}; this.notes=[]; }
      setField(k,v) { this.fields[k]=v; } getField(k) { return this.fields[k] || ''; } isNote() { return true; }
      setNote(v) { this.note=v; } async saveTx() { items.set(this.id,this); items.get(this.parentItemID)?.notes.push(this.id); } },
    Attachments: { async importFromFile({file,parentItemID,libraryID,title}) {
      const att = attachment(('ATT'+nextID).padEnd(8,'X'),libraryID,parentItemID, `/storage/${nextID}.mindflow`);
      att.title=title; disk.set(att.path,disk.get(file)); items.get(parentItemID).attachments.push(att.id); return att;
    } } };
  const IOUtils = { exists: async p => disk.has(p) || [...disk.keys()].some(key=>key.startsWith(p+'/')), readUTF8: async p => { if (!disk.has(p)) throw new Error('ENOENT'); return disk.get(p); },
    writeUTF8: async (p,v,options={}) => { if (options.backupFile && disk.has(p)) disk.set(options.backupFile,disk.get(p)); disk.set(p,v); },
    makeDirectory: async () => {}, getChildren: async dir => [...disk.keys()].filter(p=>p.startsWith(dir+'/')),
    move: async (p,q) => {disk.set(q,disk.get(p));disk.delete(p);},
    remove: async p => { for (const k of disk.keys()) if (k===p||k.startsWith(p+'/')) disk.delete(k); } };
  IOUtils.write = async (path, bytes) => disk.set(path, new Uint8Array(bytes));
  IOUtils.read = async path => disk.get(path);
  const scriptloader = {
    loadSubScript(url, targetCtx) {
      const scope = targetCtx || ctx;
      let resolvedPath;
      if (url.startsWith('chrome://mindflow/content/')) {
        resolvedPath = path.join(root, 'chrome/content', url.slice('chrome://mindflow/content/'.length));
      } else if (url.startsWith('file://')) {
        resolvedPath = fileURLToPath(url);
      } else if (path.isAbsolute(url)) {
        resolvedPath = url;
      } else {
        resolvedPath = path.join(root, 'chrome/content', String(url).replace(/^.*?chrome\/content\//, ''));
      }
      const code = fs.readFileSync(resolvedPath, 'utf8');
      vm.runInNewContext(code, scope);
    }
  };
  const ctx = { Zotero, window:win, ChromeUtils: { importESModule: () => ({ FilePicker: options.exportPicker }) }, Services: { scriptloader, wm: { addListener() {}, removeListener() {}, getEnumerator: () => ({hasMoreElements:()=>false}) } },
    IOUtils, PathUtils: { join: (...parts)=>parts.join('/'), parent:p=>p.slice(0,p.lastIndexOf('/')), filename:p=>p.split('/').pop(), tempDir:'/tmp' },
    URL, setTimeout, clearTimeout, console };
  if (options.omitWindow) delete ctx.window;
  vm.runInNewContext(runtime.replace('  Zotero.MindFlow.init();','  Zotero.MindFlow._testLLMRequest = callLLMForZotero;'), ctx);
  const host = Zotero.MindFlow;
  function paper(key, libraryID=1) {
    const item = { id:nextID++, key, libraryID, attachments:[], notes:[], title:key, fields:{},
      isRegularItem:()=>true, isAttachment:()=>false,
      getField(k) {return k==='title'?this.title:(this.fields?.[k]||'');},
      setField(k,v) {this.fields=this.fields||{};this.fields[k]=v;},
      getAttachments() {return this.attachments;}, getNotes() {return this.notes;}, getCreators:()=>[], getTags:()=>[] };
    items.set(item.id,item); return item;
  }
  function attachment(key,libraryID,parentItemID,file) {
    const att = { id:nextID++,key,libraryID,parentItemID,path:file,attachmentFilename:'map.mindflow', title:'map.mindflow',
      isAttachment:()=>true, isRegularItem:()=>false, getField() {return this.title;}, setField(k,v) {this.title=v;},
      getFilePathAsync: async function() {return this.path;}, saveTx:async()=>{},
      eraseTx:async function() {items.delete(this.id);const p=items.get(this.parentItemID);p.attachments=p.attachments.filter(id=>id!==this.id);} };
    items.set(att.id,att); return att;
  }
  const map = (id='doc_a',title='A') => ({id,title,revision:1,root:{id:'root',text:title,children:[]},updatedAt:100,createdAt:1,themeId:'classic-blue',layoutType:'mindmap'});
  return { host, Zotero, items, disk, prefs, doc, tabs, win, listeners, IOUtils, paper, attachment, map };
}


const llmPref = 'extensions.zotero.llmforzotero.';

const llmGroups = () => [{ id: 'provider-one', apiBase: 'https://upstream.invalid/v1',
  apiKey: 'upstream-secret', authMode: 'api_key', providerProtocol: 'openai_chat_compat',
  models: [{ id: 'model-one', model: 'gpt-5.4' }, { id: 'model-two', model: 'deepseek-reasoner' }] }];

function llmFixture(runTurn = async () => ({ kind: 'completed', text: '{"sections":{"findings":[]}}' })) {
  const f = fixture({ fetch: () => { throw new Error('MindFlow must not issue HTTP'); } });
  f.prefs.set(llmPref + 'modelProviderGroups', JSON.stringify(llmGroups()));
  f.prefs.set(llmPref + 'lastUsedModelEntryId', 'model-one');
  f.Zotero.LLMForZotero = { data: { alive: true, initialized: true },
    api: { agent: { runTurn, getCapabilities: () => ({ reasoning: true }) } } };
  f.host.serializeZoteroItem = (item) => ({ title: item.title,
    zoteroUri: `zotero://select/library/items/${item.key}`, abstract: 'The experiment shows enhanced emission.',
    notes: [{ text: 'private excluded note', uri: 'zotero://note' }], annotations: [] });
  return f;
}


export { root, runtime, fixture, hangingTurn, llmPref, llmGroups, llmFixture };
