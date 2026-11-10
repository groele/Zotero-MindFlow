import { useEffect } from 'react';
import { MindMapDocument } from '../../core/model/types';
import { DocumentConflictError, StorageService } from '../../services/storage/storageService';
import { generateId } from '../../core/model/treeOps';
import { retargetDocumentLinks } from '../../core/model/editorState';
import { detachedMetadata } from '../../services/zotero/documentIdentity';
import { BackupService } from '../../services/storage/backupService';
import { getZoteroInstance, saveMindMapToZoteroAttachment } from '../../services/zotero/zoteroBridge';
import { WebDAVService } from '../../services/sync/webdavService';
import type { AppContext } from './appContext';

export const useAppAutoSave = (ctx: AppContext): void => {
  const { doc, setDoc, isZoteroMode, zoteroHostConnectedRef, relationships,
         settings, latestWebdavRef, setSaveStatus, cleanDocRef, cleanRelationshipsRef,
         latestDocRef, latestRelationshipsRef, saveQueueRef, zoteroSyncQueueRef, pendingSaveTokenRef,
         autoSyncTimerRef, saveGenerationRef, currentDocIdRef } = ctx;
  // Auto-save locally, create interval-based recovery snapshots, then report
  // local/cloud outcomes separately so failures are visible to the user.
  useEffect(() => {
    if (!doc) return;
    if (cleanDocRef.current === doc && cleanRelationshipsRef.current === relationships) return;
    const saveToken = ++pendingSaveTokenRef.current;
    setSaveStatus({ state: 'saving', message: '等待本地保存…' });
    const timeout = setTimeout(() => {
      if (saveToken !== pendingSaveTokenRef.current) return;
      setSaveStatus({ state: 'saving', message: '保存中…' });
      const runSave = async () => {
      if (saveToken !== pendingSaveTokenRef.current) return;
      if (currentDocIdRef.current !== doc.id) return;
      const documentToSave = { ...doc, relationships };
      let savedDocument: MindMapDocument;
      try {
        savedDocument = await StorageService.saveDocument(documentToSave);
      } catch (error: any) {
        if (error instanceof DocumentConflictError) {
          if (currentDocIdRef.current !== doc.id) return;
          try {
            const latestLocal = latestDocRef.current?.id === doc.id ? latestDocRef.current : documentToSave;
            const latestRelationships = latestRelationshipsRef.current;
            const copyId = 'doc_' + generateId();
            const copy = await StorageService.saveDocument({
              ...latestLocal,
              root: retargetDocumentLinks(latestLocal.root, latestLocal.id, copyId),
              relationships: latestRelationships,
              metadata: detachedMetadata(latestLocal.metadata),
              id: copyId,
              title: `${latestLocal.title}（冲突副本）`,
              revision: 0,
              createdAt: Date.now(),
            });
            if (currentDocIdRef.current !== doc.id) return;
            await StorageService.setActiveDocumentId(copy.id);
            if (currentDocIdRef.current !== doc.id) return;
            cleanDocRef.current = copy;
            cleanRelationshipsRef.current = latestRelationships;
            const afterCopy = latestDocRef.current;
            setDoc(afterCopy?.id === doc.id && afterCopy !== latestLocal
              ? { ...afterCopy, root: retargetDocumentLinks(afterCopy.root, doc.id, copy.id), id: copy.id, title: copy.title, revision: copy.revision, createdAt: copy.createdAt, metadata: copy.metadata }
              : copy);
            setSaveStatus({ state: 'warning', message: '其他窗口已修改原导图；本窗口内容已保存为冲突副本，请检查并合并。' });
          } catch (copyError: any) {
            setSaveStatus({ state: 'error', message: `原导图发生冲突，副本保存失败：${copyError?.message || '未知错误'}` });
          }
          return;
        }
        console.error('MindFlow local save failed', error);
        setSaveStatus({ state: 'error', message: `本地保存失败：${error?.message || '存储空间可能已满'}` });
        return;
      }
      if (currentDocIdRef.current !== doc.id || latestDocRef.current !== doc ||
          latestRelationshipsRef.current !== relationships) return;
      cleanDocRef.current = savedDocument;
      cleanRelationshipsRef.current = relationships;
      latestDocRef.current = savedDocument;
      setDoc((previous: any) => previous === doc ? savedDocument : previous);
      const saveGeneration = ++saveGenerationRef.current;

      let warning = '';
      if (settings.autoSnapshotEnabled) {
        try {
          await BackupService.createAutoSnapshotIfDue(savedDocument, settings.autoSnapshotIntervalMinutes);
        } catch (error: any) {
          console.error('MindFlow recovery snapshot failed', error);
          warning = `本地导图已保存，但自动版本快照失败：${error?.message || String(error)}`;
        }
      }

      // Silently sync updated mind map to the Zotero item attachment (.mindflow) and outline note
      const needsZoteroArchive = (isZoteroMode || zoteroHostConnectedRef.current) &&
        !!savedDocument.metadata?.zoteroItemKey &&
        savedDocument.metadata.autoSyncToZotero !== false;
      if (needsZoteroArchive) {
        const archiveTarget = savedDocument.metadata!.zoteroItemKey!;
        const archive = zoteroSyncQueueRef.current.catch(() => undefined).then(async () => {
          const result = await saveMindMapToZoteroAttachment(
            savedDocument,
            archiveTarget,
            { silent: true }
          );
          if (!result.success && saveGenerationRef.current === saveGeneration) {
            setSaveStatus({ state: 'warning', message: `本地导图已保存；Zotero 附件归档失败：${result.message}` });
          } else if (result.noteRequested && !result.savedNote && saveGenerationRef.current === saveGeneration) {
            setSaveStatus({ state: 'warning', message: `导图附件已归档，但 Zotero 大纲笔记保存失败：${result.noteError || '请检查 Zotero 日志'}` });
          } else if (saveGenerationRef.current === saveGeneration) {
            setSaveStatus(warning
              ? { state: 'warning', message: `Zotero 附件已归档；${warning}` }
              : { state: 'saved', message: '已保存本地文件并归档到 Zotero 文献附件' });
          }
        }).catch((error: any) => {
          if (saveGenerationRef.current === saveGeneration) {
            setSaveStatus({ state: 'warning', message: `本地导图已保存；Zotero 附件归档失败：${error?.message || error}` });
          }
        });
        zoteroSyncQueueRef.current = archive;
      }

      setSaveStatus(warning
        ? { state: 'warning', message: warning }
        : {
          state: needsZoteroArchive ? 'saving' : 'saved',
          message: needsZoteroArchive
            ? '本地文件已保存，正在归档 Zotero 附件…'
            : settings.webdav.enabled && settings.webdav.autoSyncOnSave
            ? '已保存到本地；云端备份将在编辑暂停后运行'
            : '已保存到本地',
        });
      window.clearTimeout(autoSyncTimerRef.current);
      if (settings.webdav.enabled && settings.webdav.autoSyncOnSave) {
        autoSyncTimerRef.current = window.setTimeout(async () => {
          if (!WebDAVService.sameAutoSyncConfig(settings.webdav, latestWebdavRef.current)) return;
          try {
            if (!(await WebDAVService.hasServerPermission(settings.webdav.serverUrl))) {
              throw new Error('请在设置中授权当前 WebDAV 服务器');
            }
            const backupData = await BackupService.getFullWorkspaceData();
            const result = await WebDAVService.uploadBackup(settings.webdav, backupData);
            if (needsZoteroArchive) await zoteroSyncQueueRef.current;
            if (saveGenerationRef.current !== saveGeneration) return;
            setSaveStatus((previous: any) => previous.state === 'warning' || previous.state === 'error'
              ? previous
              : result.success
                ? { state: 'saved', message: needsZoteroArchive
                  ? '本地文件、Zotero 附件和 WebDAV 备份已完成'
                  : '已保存到本地并完成 WebDAV 备份' }
                : { state: 'warning', message: `本地已保存；云端备份失败：${result.message}` });
          } catch (error: any) {
            if (saveGenerationRef.current === saveGeneration) {
              setSaveStatus((previous: any) => previous.state === 'warning' || previous.state === 'error'
                ? previous
                : { state: 'warning', message: `本地已保存；云端备份失败：${error?.message || '网络错误'}` });
            }
          }
        }, 15000);
      }
      };
      saveQueueRef.current = saveQueueRef.current.then(runSave, runSave);
    }, 600);
    return () => clearTimeout(timeout);
  }, [doc, isZoteroMode, relationships, settings.webdav, settings.autoSnapshotEnabled, settings.autoSnapshotIntervalMinutes]);

  useEffect(() => {
    if (!doc) return;
    document.title = `${doc.title} - MindFlow 思维导图`;
    const context = { type: 'MINDFLOW_DOCUMENT_CONTEXT', title: doc.title,
        documentId: doc.id, parentItemUri: doc.metadata?.zoteroUri || doc.metadata?.zoteroItemKey,
        attachmentKey: doc.metadata?.zoteroAttachmentKey,
        attachmentLibraryID: doc.metadata?.zoteroAttachmentLibraryID,
        unlinkedContainer: doc.metadata?.mindflowUnlinkedContainer, aiDraft: doc.metadata?.aiDraft };
    if (window.parent !== window) {
      if (!getZoteroInstance()?.MindFlow?.updateWorkspaceContext?.(window, context)) window.parent.postMessage(context, '*');
    } else {
      const host = getZoteroInstance()?.MindFlow;
      if (!host?.updateWorkspaceContext?.(window, context)) host?.updateStandaloneContext?.(window, context);
    }
  }, [doc?.id, doc?.title, doc?.metadata]);
  Object.assign(ctx, {});
};
