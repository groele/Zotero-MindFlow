/**
 * Zotero MindFlow - Bridge Module
 * Manages postMessage communication, context synchronization and command routing.
 */

import type { MindFlowConstants } from './constants.js';

export function createBridgeModule(deps: any = {}) {
  const getZotero = () => deps.Zotero || (globalThis as any).Zotero;
  const getHost = () => deps.host || (globalThis as any).Zotero?.MindFlow;
  const getConstants = () => deps.constants || (globalThis as any).MindFlowConstants || {};

  const sameWindow = (a: any, b: any) => {
    const constants = getConstants();
    if (typeof constants.sameWindow === 'function') return constants.sameWindow(a, b);
    if (!a || !b) return false;
    try { return (a.wrappedJSObject || a) === (b.wrappedJSObject || b); }
    catch (_) { return a === b; }
  };

  function tabContainer(tabs: any, tab: any, win: any) {
    return tab?.container ||
      tabs?.getTabContent?.(tab?.id) || tabs?.getTabContainer?.(tab?.id) ||
      win?.document?.getElementById?.(tab?.id);
  }

  function workspaceOwner(host: any, source: any) {
    const Zotero = getZotero();
    const windows = [...(host._injectedElements?.keys() || [])];
    const main = Zotero?.getMainWindow?.();
    if (main && !windows.includes(main)) windows.push(main);
    for (const win of windows) {
      for (const tab of win.Zotero_Tabs?._tabs || []) {
        if (tab.type !== 'mindflow') continue;
        const frame = tabContainer(win.Zotero_Tabs, tab, win)?.querySelector?.('iframe');
        if (sameWindow(frame?.contentWindow, source)) return { win, tab, frame };
      }
    }
    return null;
  }

  function ownsWorkspaceWindow(host: any, source: any) {
    return Boolean(workspaceOwner(host, source) || [...(host._standaloneWindows?.values() || [])]
      .some(win => !win.closed && sameWindow(win, source)));
  }

  function connectWorkspace(host: any, source: any) {
    const owner = workspaceOwner(host, source);
    if (!owner) return false;
    owner.frame._mindflowReady = true;
    if (owner.frame._mindflowPending) {
      source.postMessage(owner.frame._mindflowPending, '*');
      owner.frame._mindflowPending = null;
    }
    return true;
  }

  function updateWorkspaceContext(host: any, source: any, data: any) {
    const owner = workspaceOwner(host, source);
    if (!owner || typeof data.documentId !== 'string' || typeof data.title !== 'string') return false;
    const { win, tab } = owner;
    const switched = tab.data?.docId && tab.data.docId !== data.documentId;
    tab.data = {
      ...tab.data,
      docId: data.documentId,
      doc: null,
      parentItemUri: data.parentItemUri || null,
      openedAttachmentKey: data.attachmentKey || null,
      openedAttachmentLibraryID: data.attachmentLibraryID || null,
    };
    if (data.attachmentKey && data.attachmentLibraryID) {
      tab.data.targetItemId = `attachment:${data.attachmentLibraryID}:${data.attachmentKey}`;
    } else if (data.parentItemUri && !data.unlinkedContainer && !data.aiDraft) {
      const parent = host.resolveItemReference?.(data.parentItemUri);
      tab.data.targetItemId = parent ? `items:${parent.libraryID}:${parent.key}` : `document:${data.documentId}`;
    } else if (switched) {
      tab.data.targetItemId = `document:${data.documentId}`;
    }
    win.Zotero_Tabs?.rename?.(tab.id, `MindFlow - ${data.title.trim().slice(0, 140)}`);
    return true;
  }

  function updateStandaloneContext(host: any, source: any, data: any) {
    if (!host._standaloneWindows) return;
    const entry = [...host._standaloneWindows].find(([, win]) => sameWindow(win, source));
    if (!entry) return;
    let target = entry[0];
    if (data.attachmentKey && data.attachmentLibraryID) {
      target = `attachment:${data.attachmentLibraryID}:${data.attachmentKey}`;
    } else if (data.parentItemUri && !data.unlinkedContainer && !data.aiDraft) {
      const parent = host.resolveItemReference?.(data.parentItemUri);
      target = parent ? `items:${parent.libraryID}:${parent.key}` : `document:${data.documentId}`;
    } else if (source._mindflowDocumentId && source._mindflowDocumentId !== data.documentId) {
      target = `document:${data.documentId}`;
    }
    source._mindflowDocumentId = data.documentId;
    if (target !== entry[0]) {
      host._standaloneWindows.delete(entry[0]);
      host._standaloneWindows.set(target, entry[1]);
    }
  }

  function openTargetIdentity(options: any, items: any[] = []) {
    if (options.forceNew) return `new:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    if (options.mode === 'open_document') {
      const metadata = options.doc?.metadata || {};
      const key = options.openedAttachmentKey || metadata.zoteroAttachmentKey;
      const library = options.openedAttachmentLibraryID || metadata.zoteroAttachmentLibraryID;
      if (key && library) return `attachment:${library}:${key}`;
      return `document:${metadata.zoteroUri || metadata.zoteroItemKey || 'unlinked'}:${options.doc?.id}`;
    }
    if (options.mode === 'create_from_collection') {
      return `collection:${options.collectionLibraryID}:${options.collectionKey}`;
    }
    if (options.mode === 'create_blank') return `blank:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    if (items.length) {
      return `${options.mode === 'ai_analyze' ? 'ai' : 'items'}:${items.map(i => `${i.libraryID}:${i.key}`).sort().join('|')}`;
    }
    return 'workspace';
  }

  function openActionMessage(options: any, items: any[] = []) {
    return {
      type: 'MINDFLOW_OPEN_ACTION',
      action: { ...options, items },
      requestId: `open-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
  }

  return {
    sameWindow,
    tabContainer,
    workspaceOwner,
    ownsWorkspaceWindow,
    connectWorkspace,
    updateWorkspaceContext,
    updateStandaloneContext,
    openTargetIdentity,
    openActionMessage,
  };
}

export const MindFlowBridge = {
  createBridgeModule,
};

(function (global: any) {
  global.MindFlowBridge = MindFlowBridge;
})(typeof globalThis !== 'undefined' ? globalThis : this);
