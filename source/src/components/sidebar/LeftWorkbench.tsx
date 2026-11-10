import React, { useState, useEffect, useRef, useMemo } from 'react';
import { InboxItem } from '../../core/model/types';
import { StorageService, DocumentSummary } from '../../services/storage/storageService';
import { InboxService } from '../../services/storage/inboxService';
import { BackupService, DocSnapshot, StorageQuotaInfo, MAX_BACKUP_BYTES } from '../../services/storage/backupService';
import { collectTagFacets } from '../../core/model/tagUtils';
import type { LeftWorkbenchProps, LeftWorkbenchContext } from './LeftWorkbenchTypes';
import { LeftWorkbenchRail } from './LeftWorkbenchRail';
import { LeftWorkbenchDrawer } from './LeftWorkbenchDrawer';

export type { WorkbenchTab } from './LeftWorkbenchTypes';

export const LeftWorkbench: React.FC<LeftWorkbenchProps> = ({
  currentDoc,
  selectedId,
  focusedTag,
  onFocusTag,
  isOpen,
  activeTab,
  dockPosition,
  onToggleOpen,
  onTabChange,
  onToggleDockPosition,
  onOpenSettings,
  onSelectDoc,
  onNewDoc,
  onSelectNode,
  onUpdateNodeText,
  onAddChildNode,
  onDeleteNode,
  onInsertInboxItem,
  onRestoreSnapshot,
  onRestoreWorkspace,
  onFlushCurrentDocument,
  isZoteroMode = false,
}) => {
  const tagFacets = useMemo(() => collectTagFacets(currentDoc.root), [currentDoc.root]);
  const activeTag = tagFacets.find(facet => facet.tag === focusedTag);
  // Docs state
  const [docList, setDocList] = useState<DocumentSummary[]>([]);
  const [docSearch, setDocSearch] = useState('');

  // Inbox state
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [inboxInput, setInboxInput] = useState('');
  const operationBusyRef = useRef(false);
  const [operationBusy, setOperationBusy] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);

  // Backup state
  const [snapshots, setSnapshots] = useState<DocSnapshot[]>([]);
  const [quota, setQuota] = useState<StorageQuotaInfo | null>(null);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const backupFileRef = useRef<HTMLInputElement>(null);

  // Outline inline editing state
  const [editingOutlineId, setEditingOutlineId] = useState<string | null>(null);
  const [editingOutlineText, setEditingOutlineText] = useState('');

  // Load data for active tab
  useEffect(() => {
    let disposed = false;
    const load = async () => {
      if (isOpen) {
        if (activeTab === 'docs') {
          const list = await StorageService.getDocumentList();
          if (!disposed) setDocList(list);
        } else if (activeTab === 'inbox') {
          const list = await InboxService.getItems();
          if (!disposed) setInboxItems(list);
        } else if (activeTab === 'backup') {
          const [snaps, space] = await Promise.all([BackupService.getSnapshots(currentDoc.id), BackupService.getStorageQuota()]);
          if (!disposed) { setSnapshots(snaps); setQuota(space); }
        }
      }
    };
    void load().catch(error => { if (!disposed) setOperationError(`读取失败：${error?.message || error}`); });
    return () => { disposed = true; };
  }, [isOpen, activeTab, currentDoc.id]);

  const runOperation = async (operation: () => Promise<void>) => {
    if (operationBusyRef.current) return;
    operationBusyRef.current = true;
    setOperationBusy(true);
    setOperationError(null);
    try { await operation(); }
    catch (error: any) { setOperationError(`操作失败：${error?.message || error}`); }
    finally { operationBusyRef.current = false; setOperationBusy(false); }
  };

  const showBackupNotice = (msg: string) => {
    setBackupNotice(msg);
    setTimeout(() => setBackupNotice(null), 3000);
  };

  // --- Handlers for Docs ---
  const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定删除该导图文档吗？此操作无法撤销。')) {
      try {
        const isCurrent = currentDoc.id === id;
        await StorageService.deleteDocument(id);
        const remaining = await StorageService.getDocumentList();
        setDocList(remaining);
        if (isCurrent) {
          const nextDoc = remaining.find((d) => d.id !== id);
          if (nextDoc) {
            onSelectDoc(nextDoc.id);
          } else {
            onNewDoc();
          }
        }
      } catch (error: any) {
        alert(`删除失败：${error?.message || '请稍后重试'}`);
        setDocList(await StorageService.getDocumentList());
      }
    }
  };

  // --- Handlers for Inbox ---
  const handleAddInboxItem = async () => {
    if (!inboxInput.trim()) return;
    const text = inboxInput.trim();
    await runOperation(async () => {
      await InboxService.addItem(text);
      setInboxInput(current => current.trim() === text ? '' : current);
      setInboxItems(await InboxService.getItems());
    });
  };

  const handleDeleteInboxItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await runOperation(async () => {
      await InboxService.deleteItem(id);
      setInboxItems(await InboxService.getItems());
    });
  };

  const handleClearProcessedInbox = async () => {
    await runOperation(async () => {
      await InboxService.clearProcessed();
      setInboxItems(await InboxService.getItems());
    });
  };

  // --- Handlers for Backup ---
  const handleCreateSnapshot = async () => {
    await runOperation(async () => {
      if (!(await onFlushCurrentDocument())) return;
      const saved = await StorageService.getDocument(currentDoc.id, { trackRevision: false });
      if (!saved) throw new Error('当前导图已不存在');
      await BackupService.createSnapshot(saved);
      setSnapshots(await BackupService.getSnapshots(currentDoc.id));
      showBackupNotice('已生成新快照！');
    });
  };

  const handleRestoreSnapshot = async (snapId: string) => {
    if (!confirm('确认将当前导图回滚至此历史快照？回滚前会保存当前编辑并创建恢复快照。')) return;
    await runOperation(async () => {
      if (!(await onRestoreSnapshot(snapId))) return;
      setSnapshots(await BackupService.getSnapshots(currentDoc.id));
      showBackupNotice('已成功还原至该快照！');
    });
  };

  const handleDeleteSnapshot = async (snapId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await runOperation(async () => {
      await BackupService.deleteSnapshot(currentDoc.id, snapId);
      setSnapshots(await BackupService.getSnapshots(currentDoc.id));
    });
  };

  const handleExportWorkspace = async () => {
    await runOperation(async () => {
      if (!(await onFlushCurrentDocument())) return;
      await BackupService.exportFullWorkspaceBackup();
      showBackupNotice('全量工作区导出成功！');
    });
  };

  const handleImportWorkspace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await runOperation(async () => {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('备份文件超过 20 MB 安全导入上限');
      const content = await file.text();
      const preview = await BackupService.previewFullWorkspaceBackup(content);
      if (!confirm(BackupService.describeRestorePreview(preview))) return;
      if (!(await onRestoreWorkspace(content))) return;
      showBackupNotice(`已还原 ${preview.documents} 篇思维导图与 ${preview.inboxItems} 条收集箱记录！`);
    });
  };

  const isLeftDock = dockPosition === 'left';

  const ctx: LeftWorkbenchContext = {
    currentDoc, selectedId, focusedTag, onFocusTag, isOpen, activeTab, dockPosition,
    onToggleOpen, onTabChange, onToggleDockPosition, onOpenSettings, onSelectDoc,
    onNewDoc, onSelectNode, onUpdateNodeText, onAddChildNode, onDeleteNode,
    onInsertInboxItem, onRestoreSnapshot, onRestoreWorkspace, onFlushCurrentDocument, isZoteroMode,
    tagFacets, activeTag, docList, docSearch, setDocSearch, inboxItems, inboxInput,
    setInboxInput, setInboxItems, operationBusy, operationError, snapshots, quota,
    backupNotice, backupFileRef, editingOutlineId, editingOutlineText,
    setEditingOutlineId, setEditingOutlineText, runOperation,
    handleDeleteDoc, handleAddInboxItem, handleDeleteInboxItem, handleClearProcessedInbox,
    handleCreateSnapshot, handleRestoreSnapshot, handleDeleteSnapshot,
    handleExportWorkspace, handleImportWorkspace, isLeftDock,
  };

  return (
    <div className={`mindflow-workbench relative flex h-full min-h-0 z-30 select-none ${isLeftDock ? 'order-first' : 'order-last'}`}>
      <LeftWorkbenchRail ctx={ctx} />
      <LeftWorkbenchDrawer ctx={ctx} />
    </div>
  );
};
