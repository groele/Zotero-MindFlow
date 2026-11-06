import type React from 'react';
import type {
  MindMapDocument, MindMapNode, NodeImage, NodeShape
} from '../../core/model/types';
import type { DocumentSummary } from '../../services/storage/storageService';

export interface PropertySidebarProps {
  selectedNode: MindMapNode | null;
  currentDoc: MindMapDocument;
  onUpdateNode: (id: string, patch: Partial<MindMapNode>) => void;
  onImportImage: (id: string, file: File) => Promise<void>;
  onOpenInternalLink?: (documentId: string, nodeId?: string) => void;
  onClose: () => void;
  dockSide?: 'left' | 'right';
}

export const COLOR_PRESETS = [
  '#2563eb', '#0891b2', '#059669', '#16a34a',
  '#ca8a04', '#ea580c', '#dc2626', '#db2777',
  '#9333ea', '#4f46e5', '#334155', '#475569'
];

/** Number of textarea rows for the note editor, clamped to a readable range. */
export const computeNoteRows = (noteText: string): number =>
  Math.min(18, Math.max(4, noteText.split('\n').reduce(
    (rows, line) => rows + Math.max(1, Math.ceil(line.length / 42)),
    0
  )));

/** Context object shared by the PropertySidebar render sub-components. */
export interface PropertySidebarCtx {
  // props (defaults applied; selectedNode is non-null past the early return)
  selectedNode: MindMapNode;
  currentDoc: MindMapDocument;
  onUpdateNode: (id: string, patch: Partial<MindMapNode>) => void;
  onImportImage: (id: string, file: File) => Promise<void>;
  onOpenInternalLink?: (documentId: string, nodeId?: string) => void;
  onClose: () => void;
  dockSide: 'left' | 'right';
  // state
  noteText: string;
  setNoteText: React.Dispatch<React.SetStateAction<string>>;
  nodeText: string;
  setNodeText: React.Dispatch<React.SetStateAction<string>>;
  imageBusy: boolean;
  setImageBusy: React.Dispatch<React.SetStateAction<boolean>>;
  imageError: string;
  setImageError: React.Dispatch<React.SetStateAction<string>>;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  linkText: string;
  setLinkText: React.Dispatch<React.SetStateAction<string>>;
  newTagText: string;
  setNewTagText: React.Dispatch<React.SetStateAction<string>>;
  linkError: string;
  setLinkError: React.Dispatch<React.SetStateAction<string>>;
  documents: DocumentSummary[];
  targetNodes: Array<{ id: string; text: string; depth: number }>;
  targetSearch: string;
  setTargetSearch: React.Dispatch<React.SetStateAction<string>>;
  isSyncingToZotero: boolean;
  setIsSyncingToZotero: React.Dispatch<React.SetStateAction<boolean>>;
  isOpeningPdf: boolean;
  setIsOpeningPdf: React.Dispatch<React.SetStateAction<boolean>>;
  isLocatingItem: boolean;
  setIsLocatingItem: React.Dispatch<React.SetStateAction<boolean>>;
  syncStatusMsg: string | null;
  setSyncStatusMsg: React.Dispatch<React.SetStateAction<string | null>>;
  // handlers
  handleShapeChange: (shape: NodeShape) => void;
  handleColorChange: (color: string) => void;
  handleNoteBlur: () => void;
  handleLinkBlur: () => void;
  handleAddTag: () => void;
  handleRemoveTag: (tag: string) => void;
  toggleIcon: (iconName: string) => void;
  // computed
  nodeImage: NodeImage | null;
  currentIcons: string[];
  noteRows: number;
}
