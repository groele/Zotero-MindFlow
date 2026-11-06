import { useCallback } from 'react';
import { ZoteroItemData, convertZoteroItemToNode, extractZoteroItemData, saveMindMapToZoteroAttachment } from '../../services/zotero/zoteroBridge';
import { MindMapDocument, MindMapNode } from '../../core/model/types';
import { generateId } from '../../core/model/treeOps';
import { StorageService } from '../../services/storage/storageService';
import type { AppContext } from './appContext';

export const useAppZoteroCreation = (ctx: AppContext): void => {
  const { setDoc, setSelectedId, setSelectedIds, isZoteroMode, zoteroHostConnectedRef,
         setIsWelcomeOpen, setRelationships, settings, setSaveStatus, cleanDocRef,
         cleanRelationshipsRef, latestDocRef, latestRelationshipsRef, activeDocLoadTokenRef, currentDocIdRef,
         historyRef, syncHistoryState, centerCanvas, flushCurrentDocument, persistArchiveAssociation } = ctx;
  /**
   * Create a brand-new dedicated mind map document from Zotero literature item(s),
   * set the root node and document title to the paper, and immediately archive
   * into Zotero as a child attachment (.mindflow) and outline note.
   */
  const createMindMapFromZoteroItems = useCallback(
    async (rawItems: any[] | ZoteroItemData[], fromZoteroHost = false, forceNew = false) => {
      if (!Array.isArray(rawItems) || rawItems.length === 0) return;
      const parsedItems: ZoteroItemData[] = [];
      for (const raw of rawItems) {
        const d = extractZoteroItemData(raw);
        if (d) parsedItems.push(d);
      }
      if (parsedItems.length === 0) return;

      const token = ++activeDocLoadTokenRef.current;
      if (!(await flushCurrentDocument()) || token !== activeDocLoadTokenRef.current) return;

      let newDoc: MindMapDocument;
      const primaryItem = parsedItems[0];
      const primaryItemKey = primaryItem.zoteroUri;

      // If this tab already has this single item open, don't overwrite user's work unless explicitly forced
      const isForcedNew = forceNew;
      if (parsedItems.length === 1 && latestDocRef.current && !isForcedNew) {
        const currentMetaUri = latestDocRef.current.metadata?.zoteroUri || latestDocRef.current.metadata?.zoteroItemKey;
        if (currentMetaUri && currentMetaUri === primaryItemKey) {
          setSaveStatus({ state: 'saved', message: `当前标签页正在研读文献【${primaryItem.title || ''}】` });
          setTimeout(() => centerCanvas(), 60);
          return;
        }
      }

      if (parsedItems.length === 1) {
        const item = parsedItems[0];
        const itemNode = convertZoteroItemToNode(item, {
          includeAbstract: settings.zoteroIncludeAbstract,
          includeAnnotations: settings.zoteroIncludeAnnotations,
          includeTags: false,
        });
        const rootNode: MindMapNode = {
          id: generateId(),
          text: item.title || '文献导图',
          link: item.zoteroUri,
          color: '#0284c7',
          isExpanded: true,
          children: itemNode.children,
        };

        newDoc = {
          id: 'doc_' + generateId(),
          title: item.title || '文献导图',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          root: rootNode,
          themeId: settings.defaultThemeId,
          layoutType: settings.defaultLayout,
          metadata: {
            zoteroItemKey: item.zoteroUri,
            zoteroLibraryID: item.libraryID,
            zoteroItemTitle: item.title,
            zoteroUri: item.zoteroUri,
            zoteroYear: item.year,
            zoteroAuthors: item.authors,
            autoSyncToZotero: true,
          },
        };
      } else {
        const title = `Zotero 文献专题导图 (${parsedItems.length} 篇)`;
        const rootNode: MindMapNode = {
          id: generateId(),
          text: `文献研读专题 (${parsedItems.length} 篇)`,
          color: '#0284c7',
          isExpanded: true,
          children: parsedItems.map((item) => convertZoteroItemToNode(item, {
            includeAbstract: settings.zoteroIncludeAbstract,
            includeAnnotations: settings.zoteroIncludeAnnotations,
            includeTags: false,
          })),
        };

        newDoc = {
          id: 'doc_' + generateId(),
          title,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          root: rootNode,
          themeId: settings.defaultThemeId,
          layoutType: settings.defaultLayout,
          metadata: {
            zoteroItemKeys: parsedItems.map((i) => i.zoteroUri),
            zoteroLibraryID: primaryItem.libraryID,
            // A multi-paper map has no single Zotero parent item. Linking it
            // to the first paper would archive the entire topic under an
            // unrelated child attachment on every subsequent save.
            autoSyncToZotero: false,
          },
        };
      }

      let savedDoc: MindMapDocument;
      try {
        savedDoc = await StorageService.saveDocument(newDoc);
        if (token !== activeDocLoadTokenRef.current) return;
        await StorageService.setActiveDocumentId(savedDoc.id);
      } catch (error: any) {
        setSaveStatus({ state: 'error', message: `新导图未完成本地保存：${error?.message || error}` });
        return;
      }
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
      setTimeout(() => centerCanvas(), 60);

      // Auto archive directly into Zotero literature item attachment (.mindflow) and child note!
      const archiveInZotero = isZoteroMode || fromZoteroHost || zoteroHostConnectedRef.current;
      if (archiveInZotero && parsedItems.length === 1) {
        setSaveStatus({ state: 'saving', message: '正在自动归档至 Zotero 文献条目…' });
        try {
          const res = await saveMindMapToZoteroAttachment(savedDoc, primaryItemKey, { silent: false });
          if (res.success) await persistArchiveAssociation(savedDoc.id, res);
          setSaveStatus({ state: res.success && (!res.noteRequested || res.savedNote) ? 'saved' : 'warning', message: res.message });
        } catch (e: any) {
          console.warn('[MindFlow] Auto-archive note:', e);
          setSaveStatus({ state: 'warning', message: '导图已创建，但归档至条目附件受阻：' + (e?.message || e) });
        }
      } else {
        if (archiveInZotero && parsedItems.length > 1) {
          setSaveStatus({ state: 'saving', message: '正在将专题导图归档到 MindFlow 独立导图位置…' });
          try {
            const result = await saveMindMapToZoteroAttachment(savedDoc, {
              archiveToUnlinkedContainer: true,
            });
            if (result.success && !(await persistArchiveAssociation(savedDoc.id, result))) return;
            setSaveStatus({ state: result.success ? 'saved' : 'warning', message: result.message });
          } catch (error: any) {
            setSaveStatus({ state: 'warning', message: `专题导图已保存在本机，Zotero 归档失败：${error?.message || error}` });
          }
        } else {
          setSaveStatus({ state: 'saved', message: '已在当前工作区创建学术文献导图' });
        }
      }
    },
    [centerCanvas, flushCurrentDocument, isZoteroMode, persistArchiveAssociation, settings, syncHistoryState]
  );

  /**
   * Import an entire Zotero collection as a structured knowledge map
   */
  const importZoteroCollection = useCallback(
    async (collectionName: string, items: any[]) => {
      const token = ++activeDocLoadTokenRef.current;
      const parsedItems: ZoteroItemData[] = [];
      for (const raw of items) {
        const d = extractZoteroItemData(raw);
        if (d) parsedItems.push(d);
      }

      if (!(await flushCurrentDocument()) || token !== activeDocLoadTokenRef.current) return;

      const rootNode: MindMapNode = {
        id: generateId(),
        text: collectionName || '专题文献分类',
        color: '#0284c7',
        isExpanded: true,
        children: parsedItems.map((item) => convertZoteroItemToNode(item, {
          includeAbstract: settings.zoteroIncludeAbstract,
          includeAnnotations: settings.zoteroIncludeAnnotations,
          includeTags: false,
        })),
      };

      const newDoc: MindMapDocument = {
        id: 'doc_' + generateId(),
        title: `${collectionName || '文献分类'} 知识脉络导图`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        root: rootNode,
        themeId: settings.defaultThemeId,
        layoutType: settings.defaultLayout,
        metadata: {
          zoteroCollectionName: collectionName,
          zoteroItemKeys: parsedItems.map((i) => i.zoteroUri),
          zoteroLibraryID: parsedItems[0]?.libraryID,
          // Zotero collections cannot own child attachments. Keep the
          // collection map in the workspace until a deliberate target is set.
          autoSyncToZotero: false,
        },
      };

      let saved: MindMapDocument;
      try {
        saved = await StorageService.saveDocument(newDoc);
        if (token !== activeDocLoadTokenRef.current) return;
        await StorageService.setActiveDocumentId(saved.id);
      } catch (error: any) {
        setSaveStatus({ state: 'error', message: `分类导图未完成本地保存：${error?.message || error}` });
        return;
      }
      if (token !== activeDocLoadTokenRef.current) return;
      cleanDocRef.current = saved;
      cleanRelationshipsRef.current = [];
      latestDocRef.current = saved;
      latestRelationshipsRef.current = cleanRelationshipsRef.current;
      currentDocIdRef.current = saved.id;
      setRelationships(cleanRelationshipsRef.current);
      setDoc(saved);
      setSelectedId(saved.root.id);
      setSelectedIds([]);
      historyRef.current.clear();
      syncHistoryState();
      setIsWelcomeOpen(false);
      setTimeout(() => centerCanvas(), 60);

      if (isZoteroMode || zoteroHostConnectedRef.current) {
        setSaveStatus({ state: 'saving', message: '正在将分类导图归档到 MindFlow 独立导图位置…' });
        try {
          const result = await saveMindMapToZoteroAttachment(saved, {
            archiveToUnlinkedContainer: true,
          });
          if (result.success && !(await persistArchiveAssociation(saved.id, result))) return;
          setSaveStatus({ state: result.success ? 'saved' : 'warning', message: result.message });
        } catch (error: any) {
          setSaveStatus({ state: 'warning', message: `分类导图已保存在本机，Zotero 归档失败：${error?.message || error}` });
        }
      } else {
        setSaveStatus({ state: 'saved', message: '分类导图已保存到本机工作区。' });
      }
    },
    [centerCanvas, flushCurrentDocument, isZoteroMode, persistArchiveAssociation, settings, syncHistoryState]
  );
  Object.assign(ctx, { createMindMapFromZoteroItems, importZoteroCollection });
};
