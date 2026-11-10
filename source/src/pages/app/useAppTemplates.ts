import { useCallback } from 'react';
import { InboxItem, MindMapDocument } from '../../core/model/types';
import { addChildNode, findNode, generateId, updateNode } from '../../core/model/treeOps';
import { TemplateDefinition } from '../../core/model/templates';
import { ZoteroItemData, getZoteroSelectionSnapshot, openZoteroPreferences, saveMindMapToZoteroAttachment } from '../../services/zotero/zoteroBridge';
import { StorageService } from '../../services/storage/storageService';
import { createBlankDocument } from '../../core/model/sampleData';
import type { AppContext } from './appContext';

export const useAppTemplates = (ctx: AppContext): void => {
  const { doc, setDoc, selectedId, setSelectedId, setSelectedIds,
         isZoteroMode, zoteroHostConnectedRef, workspaceBootRef, initialZoteroActionRef, createBlankDocRef,
         inboxInsertionsRef, setIsTemplateModalOpen, setIsWelcomeOpen, setIsSettingsOpen, setRelationships,
         settings, setSaveStatus, cleanDocRef, cleanRelationshipsRef, latestDocRef,
         latestRelationshipsRef, activeDocLoadTokenRef, currentDocIdRef, historyRef, syncHistoryState,
         centerCanvas, flushCurrentDocument, persistArchiveAssociation, commitRootChange, handleSelectAndCenterNode } = ctx;
  // Insert Inbox item to mind map
  const handleInsertInboxItem = useCallback(async (item: InboxItem): Promise<boolean> => {
    if (!doc) return false;
    const pending = inboxInsertionsRef.current.get(item.id);
    if (pending?.documentId === doc.id && findNode(doc.root, pending.nodeId)) {
      const saved = await flushCurrentDocument();
      if (saved) inboxInsertionsRef.current.delete(item.id);
      return saved;
    }
    const parentId = selectedId || doc.root.id;
    const { newRoot, newNodeId } = addChildNode(doc.root, parentId, item.text);
    const finalRoot = updateNode(newRoot, newNodeId, {
      link: item.url,
      note: item.title && item.title !== item.text ? item.title : undefined,
    });
    inboxInsertionsRef.current.set(item.id, { documentId: doc.id, nodeId: newNodeId });
    commitRootChange(finalRoot);
    handleSelectAndCenterNode(newNodeId);
    const saved = await flushCurrentDocument();
    if (saved) inboxInsertionsRef.current.delete(item.id);
    return saved;
  }, [doc, selectedId, commitRootChange, handleSelectAndCenterNode, flushCurrentDocument]);

  // Apply template
  const handleSelectTemplate = useCallback(async (tpl: TemplateDefinition) => {
    const token = ++activeDocLoadTokenRef.current;
    if (!(await flushCurrentDocument()) || token !== activeDocLoadTokenRef.current) return;
    const archiveInZotero = isZoteroMode || zoteroHostConnectedRef.current;
    if (!archiveInZotero && window.location.protocol === 'chrome:' && window.location.host === 'mindflow') {
      setSaveStatus({ state: 'warning', message: 'Zotero 工作区尚未连接完成；请稍后重试，导图尚未创建。' });
      return;
    }
    let selected: ZoteroItemData[] = [];
    if (archiveInZotero) {
      try {
        const snapshot = await getZoteroSelectionSnapshot();
        if (snapshot.available && snapshot.selectedCount === 1 && snapshot.items.length === 1) {
          selected = snapshot.items;
        }
      } catch (_) {}
    }
    const target = selected[0];
    if (token !== activeDocLoadTokenRef.current) return;
    const newDoc: MindMapDocument = {
      id: 'doc_' + generateId(),
      title: tpl.title,
      themeId: tpl.themeId,
      layoutType: tpl.layoutType,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      root: tpl.createRoot(),
      metadata: target ? {
        zoteroItemKey: target.zoteroUri,
        zoteroUri: target.zoteroUri,
        zoteroItemTitle: target.title,
        zoteroLibraryID: target.libraryID,
        autoSyncToZotero: true,
      } : undefined,
    };
    let savedDoc: MindMapDocument;
    try {
      savedDoc = await StorageService.saveDocument(newDoc);
      if (token !== activeDocLoadTokenRef.current) return;
      await StorageService.setActiveDocumentId(savedDoc.id);
    } catch (error: any) {
      setSaveStatus({ state: 'error', message: `模板导图未完成本地保存：${error?.message || error}` });
      return;
    }
    if (token !== activeDocLoadTokenRef.current) return;
    cleanDocRef.current = savedDoc;
    cleanRelationshipsRef.current = [];
    latestDocRef.current = savedDoc;
    latestRelationshipsRef.current = cleanRelationshipsRef.current;
    currentDocIdRef.current = savedDoc.id;
    setRelationships(cleanRelationshipsRef.current);
    setDoc(savedDoc);
    setSelectedId(newDoc.root.id);
    setSelectedIds([]);
    historyRef.current.clear();
    syncHistoryState();
    setIsTemplateModalOpen(false);
    setIsWelcomeOpen(false);
    setTimeout(() => centerCanvas(), 50);
    if (archiveInZotero) {
      setSaveStatus({ state: 'saving', message: '正在将模板导图归档至 Zotero…' });
      try {
        const result = await saveMindMapToZoteroAttachment(savedDoc, target?.zoteroUri, {
          archiveToUnlinkedContainer: !target,
        });
        if (token !== activeDocLoadTokenRef.current || currentDocIdRef.current !== savedDoc.id) return;
        if (result.success && !(await persistArchiveAssociation(savedDoc.id, result))) return;
        if (token !== activeDocLoadTokenRef.current || currentDocIdRef.current !== savedDoc.id) return;
        setSaveStatus({ state: result.success && (!result.noteRequested || result.savedNote) ? 'saved' : 'warning', message: result.message });
      } catch (error: any) {
        if (token !== activeDocLoadTokenRef.current || currentDocIdRef.current !== savedDoc.id) return;
        setSaveStatus({ state: 'warning', message: `模板导图已保存在本机，Zotero 归档失败：${error?.message || error}` });
      }
    }
  }, [centerCanvas, flushCurrentDocument, isZoteroMode, persistArchiveAssociation, syncHistoryState]);

  // Create clean blank document
  const handleCreateBlankDoc = useCallback(async () => {
    const loadToken = ++activeDocLoadTokenRef.current;
    if (!(await flushCurrentDocument())) return;
    if (loadToken !== activeDocLoadTokenRef.current) return;

    // Prevent any pending initial action or workspace boot from running
    workspaceBootRef.current = Promise.resolve();
    initialZoteroActionRef.current = true;

    // Clear any cached initial action arguments to ensure clean state
    if (typeof window !== 'undefined') {
      try { delete (window as any)._mindflowInitialAction; } catch (_) {}
      try { if (window.frameElement) delete (window.frameElement as any)._mindflowInitialAction; } catch (_) {}
      try { if (window.arguments?.[0]) (window.arguments[0] as any).mode = 'open'; } catch (_) {}
    }

    const blankDoc = createBlankDocument('新建思维导图');
    blankDoc.themeId = settings.defaultThemeId;
    blankDoc.layoutType = settings.defaultLayout;
    blankDoc.metadata = {}; // Independent blank document, no residual literature binding

    let savedDoc: MindMapDocument;
    try {
      savedDoc = await StorageService.saveDocument(blankDoc);
      if (loadToken !== activeDocLoadTokenRef.current) return;
      await StorageService.setActiveDocumentId(savedDoc.id);
    } catch (error: any) {
      setSaveStatus({ state: 'error', message: `新导图未完成本地保存：${error?.message || error}` });
      return;
    }

    if (loadToken !== activeDocLoadTokenRef.current) return;

    cleanDocRef.current = savedDoc;
    cleanRelationshipsRef.current = [];
    latestDocRef.current = savedDoc;
    latestRelationshipsRef.current = cleanRelationshipsRef.current;
    currentDocIdRef.current = savedDoc.id;
    setRelationships(cleanRelationshipsRef.current);
    setDoc(savedDoc);
    setSelectedId(savedDoc.root.id);
    setSelectedIds([]);
    historyRef.current.clear();
    syncHistoryState();
    setIsWelcomeOpen(false);
    setTimeout(() => {
      centerCanvas();
    }, 50);

    setSaveStatus({ state: 'saved', message: '已创建空白导图。' });
  }, [centerCanvas, flushCurrentDocument, settings.defaultThemeId, settings.defaultLayout, syncHistoryState]);

  createBlankDocRef.current = handleCreateBlankDoc;

  // Open settings handler: directly opens Zotero Preferences in Zotero environment
  const handleOpenSettings = useCallback(() => {
    if (isZoteroMode) {
      const opened = openZoteroPreferences();
      if (!opened) {
        setIsSettingsOpen(true);
      }
    } else {
      setIsSettingsOpen(true);
    }
  }, [isZoteroMode]);
  Object.assign(ctx, { handleInsertInboxItem, handleSelectTemplate, handleCreateBlankDoc, handleOpenSettings });
};
