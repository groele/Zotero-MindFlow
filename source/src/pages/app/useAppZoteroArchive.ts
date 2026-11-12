import { useEffect, useRef, useCallback } from 'react';
import { convertZoteroItemToNode, extractZoteroItemData, getSelectedZoteroItems, getZoteroInstance, getZoteroSelectionSnapshot, saveMindMapToZoteroAttachment, saveMindMapToZoteroNote } from '../../services/zotero/zoteroBridge';
import { addChildNode, generateId, updateNode } from '../../core/model/treeOps';
import { BackupService, MAX_BACKUP_BYTES, WorkspaceBackupData, validateMindMapDocument } from '../../services/storage/backupService';
import { getTheme } from '../../core/theme/themes';
import { computeLayout } from '../../core/layout/layoutEngine';
import { exportToInteractiveHTML, exportToJSON, exportToMarkdown, exportToMermaid, exportToOPML, exportToPNG, exportToSVG, importMarkdownDocument, importFromOPML, printToPDF } from '../../services/io/exporter';
import { MindMapDocument } from '../../core/model/types';
import { retargetDocumentLinks } from '../../core/model/editorState';
import { StorageService } from '../../services/storage/storageService';
import { detachedMetadata } from '../../services/zotero/documentIdentity';
import type { AppContext } from './appContext';

export const useAppZoteroArchive = (ctx: AppContext): void => {
  const { workspaceRestoringRef, setWorkspaceRestoring, doc, setDoc, selectedId,
         setSelectedId, setSelectedIds, setEditingId, isZoteroMode, zoteroHostConnectedRef,
         setRelationships, settings, setSaveStatus, cleanDocRef,
         cleanRelationshipsRef, latestDocRef, latestRelationshipsRef, zoteroSyncQueueRef, activeDocLoadTokenRef,
         currentDocIdRef, historyRef, syncHistoryState, centerCanvas, flushCurrentDocument,
         reloadWorkspace, persistArchiveAssociation, commitRootChange, handleArchiveAiDraft } = ctx;
  // Explicitly append selected literature as reference child branches to currently selected node
  const handleAppendZoteroItems = useCallback(() => {
    if (!doc) return;
    if (!isZoteroMode) {
      setSaveStatus({ state: 'warning', message: 'Zotero 连接尚未就绪；未追加示例文献。请从 Zotero 打开 MindFlow 后重试。' });
      return;
    }
    const items = getSelectedZoteroItems();
    if (!items.length) {
      setSaveStatus({ state: 'warning', message: '请先在 Zotero 文献列表中选中要追加的文献。' });
      return;
    }

    const parentId = selectedId || doc.root.id;
    let currentRoot = doc.root;
    for (const rawItem of items) {
      const itemData = extractZoteroItemData(rawItem);
      if (itemData) {
        const itemNode = convertZoteroItemToNode(itemData, {
          includeAbstract: settings.zoteroIncludeAbstract,
          includeAnnotations: settings.zoteroIncludeAnnotations,
          includeTags: false,
        });
        const { newRoot, newNodeId } = addChildNode(currentRoot, parentId, itemNode.text);
        currentRoot = updateNode(newRoot, newNodeId, {
          note: itemNode.note,
          link: itemNode.link,
          tags: itemNode.tags,
          color: itemNode.color,
          children: itemNode.children,
        });
      }
    }

    commitRootChange(currentRoot);
    setSaveStatus({ state: 'saved', message: `已将 ${items.length} 篇文献作为参考分支追加至当前导图！` });
  }, [commitRootChange, doc, isZoteroMode, selectedId, settings.zoteroIncludeAbstract, settings.zoteroIncludeAnnotations]);

  const handleSaveToZoteroNote = useCallback(async () => {
    if (!(await flushCurrentDocument())) return;
    const current = latestDocRef.current;
    if (!current) return;
    const res = await saveMindMapToZoteroNote(current);
    if (currentDocIdRef.current !== current.id) return;
    setSaveStatus({ state: res.success ? 'saved' : 'warning', message: res.message });
  }, [flushCurrentDocument]);

  const handleSaveToZoteroAttachment = useCallback(async () => {
    if (!(await flushCurrentDocument())) return;
    const current = latestDocRef.current;
    if (!current) return;
    if (current.metadata?.aiDraft) {
      await handleArchiveAiDraft();
      return;
    }
    let parentKey = current.metadata?.zoteroItemKey;
    let archiveDoc = current;
    if ((isZoteroMode || zoteroHostConnectedRef.current) &&
        (!parentKey || current.metadata?.mindflowUnlinkedContainer)) {
      const snapshot = await getZoteroSelectionSnapshot();
      if (!snapshot.available) {
        setSaveStatus({ state: 'warning', message: '无法读取 Zotero 当前选择；请返回文献列表选中目标条目后重试。' });
        return;
      }
      if (snapshot.selectedCount !== 1 || snapshot.items.length !== 1) {
        setSaveStatus({
          state: 'warning',
          message: '请选择且仅选择一篇 Zotero 文献作为导图附件的归档目标。',
        });
        return;
      }
      parentKey = snapshot.items[0].zoteroUri;
      archiveDoc = { ...current, metadata: { ...current.metadata,
        zoteroItemKey: parentKey, zoteroUri: parentKey, zoteroLibraryID: snapshot.items[0].libraryID,
        zoteroAttachmentKey: undefined, zoteroAttachmentLibraryID: undefined, mindflowUnlinkedContainer: false } };
    }
    await zoteroSyncQueueRef.current;
    const res = await saveMindMapToZoteroAttachment(archiveDoc, parentKey, { silent: false });
    if (currentDocIdRef.current !== current.id) return;
    if (res?.success) {
      if (res.parentItemUri &&
          (current.metadata?.zoteroAttachmentKey !== res.attachmentKey || current.metadata?.zoteroItemKey !== res.parentItemUri ||
           Boolean(current.metadata?.mindflowUnlinkedContainer) !== Boolean(res.usedUnlinkedContainer)) &&
          !(await persistArchiveAssociation(current.id, res))) return;
      if (currentDocIdRef.current !== current.id) return;
      setSaveStatus({ state: res.noteRequested && !res.savedNote ? 'warning' : 'saved',
        message: res.message || '已成功归档至 Zotero 文献条目！' });
    } else {
      setSaveStatus({ state: 'warning', message: res?.message || '归档失败，请检查 Zotero 状态后重试。' });
    }
  }, [flushCurrentDocument, handleArchiveAiDraft, isZoteroMode, persistArchiveAssociation]);

  const handleRestoreCurrentSnapshot = useCallback(async (snapshotId: string): Promise<boolean> => {
    if (workspaceRestoringRef.current) return false;
    if (!(await flushCurrentDocument())) return false;
    const sourceId = currentDocIdRef.current;
    if (!sourceId) return false;
    workspaceRestoringRef.current = true;
    setWorkspaceRestoring('snapshot');
    try {
      const restored = await BackupService.restoreSnapshot(sourceId, snapshotId);
      if (!restored) throw new Error('所选快照已不存在，请刷新后重试');
      if (currentDocIdRef.current !== sourceId) return false;
      const links = restored.relationships || [];
      latestDocRef.current = restored;
      latestRelationshipsRef.current = links;
      cleanDocRef.current = restored;
      cleanRelationshipsRef.current = links;
      setDoc(restored);
      setRelationships(links);
      setEditingId(null);
      setSelectedId(restored.root.id);
      setSelectedIds([]);
      historyRef.current.clear();
      syncHistoryState();
      setSaveStatus({ state: 'saved', message: '已恢复历史快照；回滚前的内容已保留为恢复快照' });
      setTimeout(() => centerCanvas(), 50);
      return true;
    } finally {
      workspaceRestoringRef.current = false;
      setWorkspaceRestoring(null);
    }
  }, [flushCurrentDocument, syncHistoryState, centerCanvas]);

  useEffect(() => {
    const blockEditing = (event: Event) => {
      if (!workspaceRestoringRef.current) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const events = ['keydown', 'beforeinput', 'paste', 'drop'];
    events.forEach(type => window.addEventListener(type, blockEditing, true));
    return () => events.forEach(type => window.removeEventListener(type, blockEditing, true));
  }, []);

  const handleRestoreWorkspace = useCallback(async (input: string | WorkspaceBackupData): Promise<boolean> => {
    if (workspaceRestoringRef.current || !(await flushCurrentDocument())) return false;
    workspaceRestoringRef.current = true;
    setWorkspaceRestoring('workspace');
    try {
      if (typeof input === 'string') await BackupService.importFullWorkspaceBackup(input);
      else await BackupService.importFullWorkspaceData(input);
      return true;
    } finally {
      workspaceRestoringRef.current = false;
      setWorkspaceRestoring(null);
      // Reload even after a partial restore so old editor state cannot write
      // over documents that were already restored successfully.
      await reloadWorkspace(true);
    }
  }, [flushCurrentDocument, reloadWorkspace]);

  const exportBusyRef = useRef(false);
  const handleExportCurrentDocument = useCallback(async (format: 'png' | 'svg' | 'markdown' | 'json' | 'opml' | 'html' | 'pdf' | 'mermaid') => {
    if (exportBusyRef.current) {
      setSaveStatus({ state: 'warning', message: '已有导出正在进行，请先完成或取消保存对话框。' });
      return;
    }
    exportBusyRef.current = true;
    const sourceId = currentDocIdRef.current;
    try {
      if (!(await flushCurrentDocument()) || sourceId !== currentDocIdRef.current) return;
      const current = latestDocRef.current;
      if (!current) return;
      const host = getZoteroInstance()?.MindFlow;
      const saves: Promise<void>[] = [];
      let cancelled = false;
      let savedPath = '';
      const download = host ? (blob: Blob, filename: string) => {
        const pending = (async () => {
          if (typeof host.saveExportFile !== 'function') throw new Error('导出保存通道未就绪，请重启 Zotero 后重试。');
          const bytes = new Uint8Array(await blob.arrayBuffer());
          const result = await host.saveExportFile(window, { filename, bytes });
          if (result.cancelled) cancelled = true;
          else savedPath = result.path;
        })();
        pending.catch(() => {});
        saves.push(pending);
      } : undefined;
      if (isZoteroMode && !host) throw new Error('Zotero 导出通道未连接，请重启 Zotero 后重试。');
      if (format === 'pdf' && isZoteroMode) throw new Error('Zotero 工作台暂不支持直接打印 PDF；请先导出 SVG 或 PNG，再从浏览器或文稿中打印。');
      setSaveStatus({ state: 'saving', message: '正在准备导出文件…' });
      const currentTheme = getTheme(current.themeId);
      const currentLayout = computeLayout(current.root, current.layoutType, currentTheme, {
        rainbowBranches: settings.rainbowBranches, curveStyle: settings.curveStyle,
      });
      if (format === 'json') exportToJSON({ ...current, relationships: latestRelationshipsRef.current }, current.title, download);
      else if (format === 'markdown') exportToMarkdown(current.root, current.title, download, { relationships: latestRelationshipsRef.current });
      else if (format === 'mermaid') exportToMermaid(current.root, current.title, download);
      else if (format === 'opml') exportToOPML(current.root, current.title, download);
      else if (format === 'png') await exportToPNG(currentLayout.nodes, currentLayout.connections, currentLayout.bounds, currentTheme, current.title, { watermark: false, relationships: latestRelationshipsRef.current, download });
      else if (format === 'svg') exportToSVG(currentLayout.nodes, currentLayout.connections, currentLayout.bounds, currentTheme, current.title, { watermark: false, relationships: latestRelationshipsRef.current, download });
      else if (format === 'html') exportToInteractiveHTML(currentLayout.nodes, currentLayout.connections, currentLayout.bounds, currentTheme, current.title, { watermark: false, relationships: latestRelationshipsRef.current, download });
      else {
        // Print uses the live DOM; wait until React has rendered the captured draft.
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        if (sourceId === currentDocIdRef.current) printToPDF();
      }
      await Promise.all(saves);
      if (host && !saves.length) cancelled = true;
      setSaveStatus({ state: 'saved', message: cancelled ? '已取消导出；导图内容未改变。' : savedPath ? `已导出：${savedPath}` : '已请求浏览器下载，请检查下载列表。' });
    } catch (error: any) {
      setSaveStatus({ state: 'error', message: `导出失败：${error?.message || error}` });
    } finally { exportBusyRef.current = false; }
  }, [flushCurrentDocument, settings.rainbowBranches, settings.curveStyle]);

  // Import file handler
  const handleImportFile = async (file: File) => {
    const token = ++activeDocLoadTokenRef.current;
    try {
      if (!(await flushCurrentDocument()) || token !== activeDocLoadTokenRef.current) return;
      if (file.size > MAX_BACKUP_BYTES) throw new Error('导入文件超过 20 MB 安全上限');
      const content = await file.text();
      if (token !== activeDocLoadTokenRef.current) return;
      if (!content.trim()) throw new Error('导入文件为空');
      const fileName = file.name.toLowerCase();
      const id = 'doc_' + generateId();
      let importedDoc: MindMapDocument;
      if (fileName.endsWith('.json') || fileName.endsWith('.mindflow')) {
        const source = validateMindMapDocument(JSON.parse(content), '导入文件');
        importedDoc = { ...source, id, revision: 0, createdAt: Date.now(), updatedAt: Date.now(),
          root: retargetDocumentLinks(source.root, source.id, id),
          metadata: { ...detachedMetadata(source.metadata), aiDraft: false } };
      } else if (/\.(md|markdown|opml)$/.test(fileName)) {
        const mdParsed = fileName.endsWith('.opml') ? null : importMarkdownDocument(content);
        importedDoc = { id, title: file.name.replace(/\.[^/.]+$/, ''),
          themeId: latestDocRef.current?.themeId || 'classic-blue', layoutType: 'mindmap',
          createdAt: Date.now(), updatedAt: Date.now(),
          root: fileName.endsWith('.opml') ? importFromOPML(content) : mdParsed!.root,
          ...(mdParsed?.relationships ? { relationships: mdParsed.relationships } : {}) };
      } else throw new Error('不支持此文件类型；请选择 MindFlow、JSON、Markdown 或 OPML');
      if (!(await flushCurrentDocument()) || token !== activeDocLoadTokenRef.current) return;
      const savedDoc = await StorageService.saveDocument(importedDoc);
      if (token !== activeDocLoadTokenRef.current || !(await flushCurrentDocument())) return;
      if (token !== activeDocLoadTokenRef.current) return;
      await StorageService.setActiveDocumentId(savedDoc.id);
      if (token !== activeDocLoadTokenRef.current) return;
      cleanDocRef.current = savedDoc;
      cleanRelationshipsRef.current = savedDoc.relationships || [];
      latestDocRef.current = savedDoc;
      latestRelationshipsRef.current = cleanRelationshipsRef.current;
      currentDocIdRef.current = savedDoc.id;
      setRelationships(cleanRelationshipsRef.current);
      setDoc(savedDoc);
      setSelectedId(savedDoc.root.id);
      setSelectedIds([]);
      historyRef.current.clear();
      syncHistoryState();
      setSaveStatus({ state: 'saved', message: `已导入并保存「${savedDoc.title}」` });
      setTimeout(() => centerCanvas(), 50);
    } catch (error: any) {
      if (token === activeDocLoadTokenRef.current) setSaveStatus({ state: 'error', message: `导入失败：${error?.message || error}` });
    }
  };
  Object.assign(ctx, { handleAppendZoteroItems, handleSaveToZoteroNote, handleSaveToZoteroAttachment, handleRestoreCurrentSnapshot, handleRestoreWorkspace,
                      exportBusyRef, handleExportCurrentDocument, handleImportFile });
};
