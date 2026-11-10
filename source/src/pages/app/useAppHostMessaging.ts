import { useEffect } from 'react';
import { convertZoteroItemToNode, extractZoteroItemData, getZoteroInstance } from '../../services/zotero/zoteroBridge';
import { addChildNode, updateNode } from '../../core/model/treeOps';
import type { AppContext } from './appContext';

export const useAppHostMessaging = (ctx: AppContext): void => {
  const { doc, selectedId, zoteroHostConnectedRef, workspaceBootRef, hostActionQueueRef,
         executeHostActionRef, initialZoteroActionRef, appMountedRef, analyzeRequestRef, createBlankDocRef,
         aiAbortRef, aiRequestTokenRef, importFileInputRef, pendingFileImportRef, settings,
         setSaveStatus, latestDocRef, pendingSaveTokenRef, containerRef, setContainerSize,
         centerCanvas, flushCurrentDocument, reloadWorkspace, openIncomingZoteroDocument, createMindMapFromZoteroItems,
         importZoteroCollection } = ctx;
  // The file input mounts with the document. A cold import request must wait
  // for React to commit that render after workspace storage finishes loading.
  useEffect(() => {
    if (!doc || !pendingFileImportRef.current || !importFileInputRef.current) return;
    pendingFileImportRef.current = false;
    importFileInputRef.current.click();
  }, [doc]);

  // Load active document or requested Zotero literature map on mount
  useEffect(() => {
    let disposed = false;

    // Check if opened with specific Zotero items or document via context menu, toolbar or tab argument
    const initialAction = typeof window !== 'undefined'
      ? ((window as any)._mindflowInitialAction || (window.frameElement as any)?._mindflowInitialAction || window.arguments?.[0]?.wrappedJSObject || window.arguments?.[0])
      : null;

    const hasInitialAction = Boolean(initialAction && (
      initialAction.mode === 'create_blank' ||
      initialAction.mode === 'import_file' ||
      initialAction.mode === 'open_document' ||
      initialAction.mode === 'create_from_selection' ||
      initialAction.mode === 'create_from_items' ||
      initialAction.mode === 'create_from_collection' ||
      initialAction.mode === 'ai_analyze'
    ));

    let workspaceReady: Promise<void>;
    if (hasInitialAction && !initialZoteroActionRef.current) {
      initialZoteroActionRef.current = true;
      workspaceReady = (async () => {
        try {
          if (initialAction.mode === 'import_file') {
            pendingFileImportRef.current = true;
            await reloadWorkspace();
          } else if (initialAction.mode === 'create_blank') {
            await createBlankDocRef.current();
          } else if (initialAction.mode === 'open_document') {
            if (initialAction.doc) {
              await openIncomingZoteroDocument(initialAction.doc, initialAction.workspaceDocumentId);
            } else {
              throw new Error('未读取到有效的导图数据，无法打开文档');
            }
          } else if (initialAction.mode === 'create_from_selection' || initialAction.mode === 'create_from_items') {
            if (Array.isArray(initialAction.items) && initialAction.items.length > 0) {
              await createMindMapFromZoteroItems(initialAction.items, true, initialAction.forceNew === true);
            } else {
              await createBlankDocRef.current();
            }
          } else if (initialAction.mode === 'create_from_collection') {
            await importZoteroCollection(initialAction.collectionName || initialAction.collection?.name || '文献分类', initialAction.items || []);
          } else if (initialAction.mode === 'ai_analyze') {
            const uri = initialAction.items?.[0]?.zoteroUri;
            if (uri) {
              void analyzeRequestRef.current(uri);
            } else {
              setSaveStatus({ state: 'warning', message: '未指定目标文献，无法启动 AI 论文分析；已创建独立空白导图。' });
              await createBlankDocRef.current();
            }
          }
        } catch (e: any) {
          console.error('[MindFlow] Failed to load initial Zotero action:', e);
          if (appMountedRef.current) setSaveStatus({ state: 'error', message: `打开 Zotero 文献失败：${e?.message || e}` });
          // Ensure a clean blank document is active rather than exposing a stale previous document
          try {
            await createBlankDocRef.current();
          } catch (_) {}
        }
      })();
    } else {
      workspaceReady = workspaceBootRef.current || (hasInitialAction ? Promise.resolve() : reloadWorkspace());
    }

    workspaceBootRef.current = workspaceReady;

    // Listen for live imports and document loads when running inside a persistent Zotero tab or standalone window
    const executeImportMessage = async (event: any) => {
      // Gecko sends chrome-privileged postMessage calls with no source and
      // an empty origin. Accept only native events in a host-owned editor;
      // synthetic events and messages from other frames keep the usual checks.
      const nativeHostMessage = event.type === 'message' && event.isTrusted === true &&
        event.source === null && event.origin === '' &&
        getZoteroInstance()?.MindFlow?.ownsWorkspaceWindow?.(window) === true;
      if (event.type === 'message' && !nativeHostMessage && !event.source) return;
      if (event.type === 'message' && !nativeHostMessage && window.parent !== window && event.source !== window.parent) return;
      if (event.type === 'message' && !nativeHostMessage && window.parent === window &&
          event.source !== window && event.source !== window.opener && event.source !== getZoteroInstance()?.getMainWindow?.()) return;
      const data = event.data || event.detail;
      if (!data) return;

      if (data.type === 'MINDFLOW_ZOTERO_CONNECTED') {
        zoteroHostConnectedRef.current = true;
        if (window.parent !== window) {
          try { window.parent.postMessage({ type: 'MINDFLOW_HOST_ACK' }, '*'); } catch (_) {}
        }
      } else if (data.type === 'MINDFLOW_OPEN_ACTION' && data.action) {
        const action = data.action;
        if (action.mode === 'open_document') {
          if (action.doc) await openIncomingZoteroDocument(action.doc, action.workspaceDocumentId);
          else {
            setSaveStatus({ state: 'error', message: '打开导图失败：未接收到有效的文档数据。' });
            await createBlankDocRef.current();
          }
        }
        else if (action.mode === 'import_file') {
          if (importFileInputRef.current) importFileInputRef.current.click();
          else pendingFileImportRef.current = true;
        }
        else if (action.mode === 'create_blank') await createBlankDocRef.current();
        else if (action.mode === 'ai_analyze') {
          const uri = action.items?.[0]?.zoteroUri;
          if (uri) await analyzeRequestRef.current(uri);
          else {
            setSaveStatus({ state: 'warning', message: '未指定目标文献，无法启动 AI 论文分析。' });
          }
        }
        else if (action.mode === 'create_from_collection') await importZoteroCollection(action.collectionName || '文献分类', action.items || []);
        else if (action.mode === 'create_from_selection' || action.mode === 'create_from_items') {
          if (Array.isArray(action.items) && action.items.length > 0) {
            await createMindMapFromZoteroItems(action.items, true, action.forceNew === true);
          } else {
            await createBlankDocRef.current();
          }
        }
        else if (Array.isArray(action.items) && action.items.length > 0) await createMindMapFromZoteroItems(action.items, true, action.forceNew === true);
      } else if (data.type === 'MINDFLOW_LOAD_DOCUMENT' && data.doc) {
        await openIncomingZoteroDocument(data.doc).catch((e: any) => {
          console.error('[MindFlow] Failed to load document from message:', e);
          setSaveStatus({ state: 'error', message: `打开 Zotero 附件失败：${e?.message || e}` });
        });
      } else if (
        data.type === 'MINDFLOW_CREATE_FROM_ITEMS' ||
        (data.mode === 'create_from_selection' && Array.isArray(data.items))
      ) {
        const items = data.items || [];
        if (items.length === 0) {
          await createBlankDocRef.current();
        } else {
          await createMindMapFromZoteroItems(items, true, data.forceNew === true);
        }
      } else if (data.type === 'MINDFLOW_IMPORT_ZOTERO_ITEMS' || data.type === 'MINDFLOW_APPEND_ZOTERO_ITEMS') {
        const items = data.items || [];
        if (data.action === 'append' || data.type === 'MINDFLOW_APPEND_ZOTERO_ITEMS') {
          // Explicitly requested to append as branch to current map
          const current = latestDocRef.current;
          if (current) {
            const parentId = selectedId || current.root.id;
            let currentRoot = current.root;
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
            ctx.commitRootChange(currentRoot);
          }
        } else {
          // Default: create a dedicated independent mind map document
          await createMindMapFromZoteroItems(items, event.type === 'message' && window.parent !== window, data.forceNew === true);
        }
      } else if (data.type === 'MINDFLOW_IMPORT_ZOTERO_COLLECTION' || data.mode === 'create_from_collection') {
        const items = data.items || [];
        await importZoteroCollection(data.collectionName || '文献分类', items);
      } else if (data.type === 'MINDFLOW_AI_ANALYZE' && typeof data.reference === 'string') {
        await analyzeRequestRef.current(data.reference);
      } else if (data.type === 'MINDFLOW_CENTER_CANVAS') {
        centerCanvas();
      }
    };

    executeHostActionRef.current = executeImportMessage;
    const handleImportMessage = (event: any) => {
      // Connection messages are immediate; mutations await the initial action
      // and are serialized so slow earlier imports cannot finish over later ones.
      if (event.data?.type === 'MINDFLOW_ZOTERO_CONNECTED') {
        void workspaceReady.then(() => { if (!disposed) void executeImportMessage(event); });
        return;
      }
      hostActionQueueRef.current = hostActionQueueRef.current.catch(() => {})
        .then(() => workspaceReady).then(() => { if (appMountedRef.current) return executeHostActionRef.current(event); })
        .catch((error: any) => setSaveStatus({ state: 'error', message: `打开操作失败：${error?.message || error}` }));
    };
    window.addEventListener('message', handleImportMessage);
    window.addEventListener('mindflow-import-items', handleImportMessage);
    if (window.parent !== window) {
      void workspaceReady.then(() => {
        if (!disposed) {
          try {
            getZoteroInstance()?.MindFlow?.connectWorkspace?.(window);
            window.parent.postMessage({ type: 'MINDFLOW_READY' }, '*');
            window.parent.postMessage({ type: 'MINDFLOW_HOST_ACK' }, '*');
          } catch (_) {}
        }
      }).catch((error) => setSaveStatus({ state: 'error', message: `加载工作区失败：${error?.message || error}` }));
    }

    const handleBeforeUnload = () => {
      ++aiRequestTokenRef.current;
      aiAbortRef.current?.abort();
      aiAbortRef.current = null;
      pendingSaveTokenRef.current += 1;
      const host = getZoteroInstance()?.MindFlow;
      if (typeof host?.captureWorkspaceOnClose === 'function') host.captureWorkspaceOnClose(window);
      else void flushCurrentDocument();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    const handleResize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('message', handleImportMessage);
      window.removeEventListener('mindflow-import-items', handleImportMessage);
    };
  }, [centerCanvas, createMindMapFromZoteroItems, flushCurrentDocument, importZoteroCollection, openIncomingZoteroDocument, reloadWorkspace]);
  Object.assign(ctx, {});
};
