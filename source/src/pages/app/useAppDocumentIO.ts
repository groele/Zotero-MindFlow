import { useEffect, useCallback } from 'react';
import { DocumentConflictError, StorageService } from '../../services/storage/storageService';
import { generateId } from '../../core/model/treeOps';
import { retargetDocumentLinks } from '../../core/model/editorState';
import { detachedMetadata, planIncomingDocument, sameDocumentSource } from '../../services/zotero/documentIdentity';
import { WorkbenchTab } from '../../components/sidebar/LeftWorkbench';
import { ZoteroArchiveResult } from '../../services/zotero/zoteroBridge';
import { validateMindMapDocument } from '../../services/storage/backupService';
import { MindMapDocument } from '../../core/model/types';
import type { AppContext } from './appContext';

export const useAppDocumentIO = (ctx: AppContext): void => {
  const { workspaceRestoringRef, setDoc, setSelectedId, setSelectedIds,
         setEditingId, aiArchivingRef, setViewport, setIsWorkbenchOpen, isWorkbenchOpen,
         setWorkbenchTab, workbenchTab, setIsWelcomeOpen, setIsZenMode, 
         setRelationships, setSaveStatus, cleanDocRef, cleanRelationshipsRef, latestDocRef,
         latestRelationshipsRef, saveQueueRef, pendingSaveTokenRef, activeDocLoadTokenRef, currentDocIdRef,
         captureCurrentDrafts, historyRef, containerRef, setContainerSize, syncHistoryState } = ctx;
  // Center canvas on root or specific node
  const centerCanvas = useCallback((bounds?: { minX: number; maxX: number; minY: number; maxY: number }, minimumScale = 0.05) => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth || 1000;
    const ch = containerRef.current.clientHeight || 800;
    setContainerSize({ width: cw, height: ch });

    if (bounds) {
      const bw = bounds.maxX - bounds.minX;
      const bh = bounds.maxY - bounds.minY;
      const scaleW = (cw - 120) / Math.max(bw, 200);
      const scaleH = (ch - 120) / Math.max(bh, 200);
      const fitScale = Math.min(Math.max(Math.min(scaleW, scaleH), minimumScale), 1.15);

      const midX = (bounds.minX + bounds.maxX) / 2;
      const midY = (bounds.minY + bounds.maxY) / 2;

      setViewport({
        x: cw / 2 - midX * fitScale,
        y: ch / 2 - midY * fitScale,
        scale: fitScale,
      });
    } else {
      setViewport({
        x: cw / 2,
        y: ch / 2,
        scale: 1,
      });
    }
  }, []);

  // Document changes cancel the debounced save. Flush the latest editor state
  // first so switching maps cannot silently discard recent typing.
  const flushCurrentDocument = useCallback(async (allowDuringAiArchive = false): Promise<boolean> => {
    if (workspaceRestoringRef.current) return false;
    if (aiArchivingRef.current && !allowDuringAiArchive) {
      setSaveStatus({ state: 'warning', message: '正在归档 AI 草稿，请等待完成后再切换或保存导图。' });
      return false;
    }
    try {
      const captured = captureCurrentDrafts();
      if (captured && captured !== latestDocRef.current) {
        historyRef.current.push({ root: latestDocRef.current!.root, relationships: latestRelationshipsRef.current });
        syncHistoryState();
        latestDocRef.current = captured;
        setDoc(captured);
        setEditingId(null);
      }
      pendingSaveTokenRef.current += 1;
      await saveQueueRef.current;
      const latest = latestDocRef.current;
      const latestRelationships = latestRelationshipsRef.current;
      if (!latest || (cleanDocRef.current === latest && cleanRelationshipsRef.current === latestRelationships)) return true;
      try {
        const saved = await StorageService.saveDocument({ ...latest, relationships: latestRelationships });
        if (latestDocRef.current !== latest || latestRelationshipsRef.current !== latestRelationships) {
          setSaveStatus({ state: 'warning', message: '保存期间又有新编辑；请暂停编辑后重试切换。' });
          return false;
        }
        cleanDocRef.current = saved;
        cleanRelationshipsRef.current = latestRelationships;
        latestDocRef.current = saved;
        setDoc((previous: any) => previous === latest ? saved : previous);
        return true;
      } catch (error) {
        if (!(error instanceof DocumentConflictError)) throw error;
        const copyId = 'doc_' + generateId();
        const copy = await StorageService.saveDocument({
          ...latest,
          root: retargetDocumentLinks(latest.root, latest.id, copyId),
          relationships: latestRelationships,
          metadata: detachedMetadata(latest.metadata),
          id: copyId,
          title: `${latest.title}（冲突副本）`,
          revision: 0,
          createdAt: Date.now(),
        });
        if (currentDocIdRef.current !== latest.id) return false;
        await StorageService.setActiveDocumentId(copy.id);
        if (currentDocIdRef.current !== latest.id) return false;
        cleanDocRef.current = copy;
        cleanRelationshipsRef.current = latestRelationships;
        setDoc((previous: any) => previous?.id === latest.id ? {
          ...previous, root: retargetDocumentLinks(previous.root, latest.id, copy.id), id: copy.id, title: copy.title,
          revision: copy.revision, createdAt: copy.createdAt, metadata: copy.metadata,
        } : previous);
        setSaveStatus({ state: 'warning', message: `原导图发生版本冲突；编辑已切换到「${copy.title}」。请核对副本，再重试刚才的操作。` });
        // Stop the requested switch/archive so it cannot act on the stale original.
        return false;
      }
    } catch (error: any) {
      setSaveStatus({ state: 'error', message: `切换已停止：当前导图保存失败：${error?.message || '存储不可用'}` });
      return false;
    }
  }, [captureCurrentDrafts, syncHistoryState]);

  const showWorkbenchTab = useCallback(async (tab: WorkbenchTab, toggle = false) => {
    const sourceId = currentDocIdRef.current;
    if (!(await flushCurrentDocument()) || sourceId !== currentDocIdRef.current) return;
    setWorkbenchTab(tab);
    setIsWorkbenchOpen(!(toggle && isWorkbenchOpen && workbenchTab === tab));
  }, [flushCurrentDocument, isWorkbenchOpen, workbenchTab]);

  const toggleZen = useCallback(async () => {
    if (await flushCurrentDocument()) setIsZenMode((previous: any) => !previous);
  }, [flushCurrentDocument]);

  useEffect(() => {
    const editor = window as any;
    editor._mindflowCaptureState = () => {
      const latest = captureCurrentDrafts();
      if (!latest || (latest === cleanDocRef.current && latestRelationshipsRef.current === cleanRelationshipsRef.current)) return null;
      return { doc: { ...latest, relationships: latestRelationshipsRef.current } };
    };
    return () => { delete editor._mindflowCaptureState; };
  }, [captureCurrentDrafts]);

  // Reload current workspace (e.g. after full backup restore)
  const reloadWorkspace = useCallback(async (force = false) => {
    const token = ++activeDocLoadTokenRef.current;
    const currentId = currentDocIdRef.current;
    const loadedDoc = (currentId ? await StorageService.getDocument(currentId) : null) || await StorageService.getActiveDocument();
    if (token !== activeDocLoadTokenRef.current) return;
    // Guard against race conditions: don't overwrite if current doc is already active and same or newer
    if (!force && currentDocIdRef.current === loadedDoc.id && latestDocRef.current &&
        (loadedDoc.revision || 0) <= (latestDocRef.current.revision || 0) && loadedDoc.updatedAt <= latestDocRef.current.updatedAt) {
      return;
    }
    const loadedRelationships = loadedDoc.relationships || [];
    setDoc(loadedDoc);
    setRelationships(loadedRelationships);
    cleanDocRef.current = loadedDoc;
    cleanRelationshipsRef.current = loadedRelationships;
    latestDocRef.current = loadedDoc;
    latestRelationshipsRef.current = loadedRelationships;
    currentDocIdRef.current = loadedDoc.id;
    setEditingId(null);
    setSelectedId(loadedDoc.root.id);
    setSelectedIds([]);
    historyRef.current.clear();
    syncHistoryState();
    setTimeout(() => centerCanvas(), 50);
  }, [centerCanvas, syncHistoryState]);

  const persistArchiveAssociation = useCallback(async (documentId: string, result: ZoteroArchiveResult, reviewedAiDraft = false): Promise<boolean> => {
    if (!result.parentItemUri) {
      setSaveStatus({ state: 'warning', message: '附件已归档，但 Zotero 未返回归档位置；本地导图关联尚未保存。' });
      return false;
    }
    if (!(await flushCurrentDocument(reviewedAiDraft))) return false;
    const latest = latestDocRef.current;
    if (latest?.id !== documentId) {
      setSaveStatus({ state: 'warning', message: '附件已归档，但当前导图已切换；请重新打开导图检查归档关联。' });
      return false;
    }
    const linkedMetadata = {
      ...latest.metadata,
      zoteroItemKey: result.parentItemUri,
      zoteroUri: result.parentItemUri,
      zoteroLibraryID: result.parentLibraryID,
      zoteroItemTitle: result.parentItemTitle,
      zoteroAttachmentKey: result.attachmentKey,
      zoteroAttachmentLibraryID: result.attachmentLibraryID,
      mindflowUnlinkedContainer: result.usedUnlinkedContainer === true,
      autoSyncToZotero: true,
      ...(reviewedAiDraft ? { aiDraft: false } : {}),
    };
    try {
      const saved = await StorageService.saveDocument({ ...latest, metadata: linkedMetadata });
      if (currentDocIdRef.current !== saved.id) return false;
      cleanDocRef.current = saved;
      cleanRelationshipsRef.current = saved.relationships || latestRelationshipsRef.current;
      if (latestDocRef.current === latest) latestDocRef.current = saved;
      setDoc((previous: any) => previous?.id === saved.id
        ? previous === latest ? saved : { ...previous, metadata: linkedMetadata, revision: saved.revision }
        : previous);
      return true;
    } catch (error: any) {
      setSaveStatus({ state: 'warning', message: `附件已归档，但本地关联保存失败：${error?.message || error}。请重试归档。` });
      return false;
    }
  }, [flushCurrentDocument]);

  const openIncomingZoteroDocument = useCallback(async (rawDoc: unknown, workspaceDocumentId?: string) => {
    const token = ++activeDocLoadTokenRef.current;
    if (!(await flushCurrentDocument()) || token !== activeDocLoadTokenRef.current) return;
    const rawIncoming = validateMindMapDocument(rawDoc, '打开文献导图');
    let documentToOpen: MindMapDocument;
    if (workspaceDocumentId !== undefined) {
      // Session/undo-close targets are canonical workspace records, including
      // detached copies. They must not re-enter attachment import/fork logic.
      documentToOpen = await StorageService.resolveWorkspaceOpen(workspaceDocumentId, rawIncoming);
    } else {
      if (latestDocRef.current && sameDocumentSource(latestDocRef.current, rawIncoming)) {
        setTimeout(() => centerCanvas(), 60);
        return;
      }
      const sourceLocal = await StorageService.getDocumentBySource(rawIncoming);
      const incoming = sourceLocal ? { ...rawIncoming, id: sourceLocal.id } : rawIncoming;
      const local = sourceLocal || await StorageService.getDocument(incoming.id, { trackRevision: false });
      if (token !== activeDocLoadTokenRef.current) return;
      const plan = planIncomingDocument(incoming, local);
      documentToOpen = incoming;
      if (plan === 'local' && local) {
        const merged = { ...local, metadata: { ...local.metadata, ...incoming.metadata } };
        documentToOpen = JSON.stringify(merged.metadata) === JSON.stringify(local.metadata) ? local
          : await StorageService.saveDocumentDirect(merged, local.revision || 0);
        setSaveStatus({ state: 'warning', message: '已保留同一附件的较新本地编辑。' });
      } else if (plan === 'fork') {
        // Copying a .mindflow file preserves its embedded ID. Give the second
        // physical attachment its own workspace ID; never open the first file.
        documentToOpen = await StorageService.saveDocument({ ...incoming,
          id: 'doc_' + generateId(), revision: 0 });
        setSaveStatus({ state: 'warning', message: '附件文档 ID 与另一来源重复；已隔离为独立工作区，原导图保留。' });
      } else {
        if (local) {
          await StorageService.saveDocument({ ...local,
            id: 'doc_' + generateId(), title: `${local.title}（附件导入前副本）`,
            revision: 0, createdAt: Date.now(), metadata: detachedMetadata(local.metadata) });
        }
        documentToOpen = await StorageService.saveDocumentDirect(incoming, local?.revision || 0);
        if (local) setSaveStatus({ state: 'warning', message: '已打开较新的附件，原本地编辑已保存为独立副本。' });
      }
    }
    if (token !== activeDocLoadTokenRef.current) return;
    await StorageService.setActiveDocumentId(documentToOpen.id);
    if (token !== activeDocLoadTokenRef.current) return;
    cleanDocRef.current = documentToOpen;
    cleanRelationshipsRef.current = documentToOpen.relationships || [];
    latestDocRef.current = documentToOpen;
    latestRelationshipsRef.current = cleanRelationshipsRef.current;
    currentDocIdRef.current = documentToOpen.id;
    setRelationships(cleanRelationshipsRef.current);
    setDoc(documentToOpen);
    setSelectedId(documentToOpen.root.id);
    setSelectedIds([]);
    historyRef.current.clear();
    syncHistoryState();
    setIsWelcomeOpen(false);
    setTimeout(() => centerCanvas(), 60);
  }, [centerCanvas, flushCurrentDocument, syncHistoryState]);
  Object.assign(ctx, { centerCanvas, flushCurrentDocument, showWorkbenchTab, toggleZen, reloadWorkspace,
                      persistArchiveAssociation, openIncomingZoteroDocument });
};
