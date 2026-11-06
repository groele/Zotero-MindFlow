import type { MindMapDocument, InboxItem } from '../../core/model/types';
import type { WorkspaceBackupData, DocSnapshot } from '../../services/storage/backupService';
import type { DocumentSummary } from '../../services/storage/storageService';
import type { TagFacet } from '../../core/model/tagUtils';

export type WorkbenchTab = 'docs' | 'outline' | 'tags' | 'inbox' | 'backup';

export interface LeftWorkbenchProps {
  currentDoc: MindMapDocument;
  selectedId: string | null;
  focusedTag: string | null;
  onFocusTag: (tag: string | null) => void;
  isOpen: boolean;
  activeTab: WorkbenchTab;
  dockPosition: 'left' | 'right';
  onToggleOpen: () => void;
  onTabChange: (tab: WorkbenchTab) => void;
  onToggleDockPosition: () => void;
  onOpenSettings?: () => void;
  onSelectDoc: (docId: string) => void;
  onNewDoc: () => void;
  onSelectNode: (nodeId: string) => void;
  onUpdateNodeText: (id: string, text: string) => void;
  onAddChildNode: (parentId: string) => void;
  onDeleteNode: (id: string) => void;
  onInsertInboxItem: (item: InboxItem) => Promise<boolean>;
  onRestoreSnapshot: (snapshotId: string) => Promise<boolean>;
  onRestoreWorkspace: (input: string | WorkspaceBackupData) => Promise<boolean>;
  onFlushCurrentDocument: () => Promise<boolean>;
  isZoteroMode?: boolean;
}

/**
 * Everything the extracted workbench groups need. Props keep their declared
 * types (via extends); resolved state/handlers are collected here so each
 * JSX block can be kept byte-for-byte identical after the split.
 */
export interface LeftWorkbenchContext extends LeftWorkbenchProps {
  tagFacets: TagFacet[];
  activeTag: TagFacet | undefined;
  docList: DocumentSummary[];
  docSearch: any;
  setDocSearch: any;
  inboxItems: InboxItem[];
  inboxInput: any;
  setInboxInput: any;
  setInboxItems: any;
  operationBusy: any;
  operationError: any;
  snapshots: DocSnapshot[];
  quota: any;
  backupNotice: any;
  backupFileRef: any;
  editingOutlineId: any;
  editingOutlineText: any;
  setEditingOutlineId: any;
  setEditingOutlineText: any;
  runOperation: any;
  handleDeleteDoc: any;
  handleAddInboxItem: any;
  handleDeleteInboxItem: any;
  handleClearProcessedInbox: any;
  handleCreateSnapshot: any;
  handleRestoreSnapshot: any;
  handleDeleteSnapshot: any;
  handleExportWorkspace: any;
  handleImportWorkspace: any;
  isLeftDock: any;
}

export interface LeftWorkbenchGroupProps {
  ctx: LeftWorkbenchContext;
}
