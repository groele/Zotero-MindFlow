import React, { useState, useEffect, useRef } from 'react';
import type { NodeShape } from '../../core/model/types';
import { safeExternalUrl } from '../../core/model/links';
import { isSafeNodeImage } from '../../core/model/nodeImage';
import { DocumentSummary, StorageService } from '../../services/storage/storageService';
import { X } from 'lucide-react';
import { computeNoteRows } from './PropertySidebarUtils';
import type { PropertySidebarProps, PropertySidebarCtx } from './PropertySidebarUtils';
import { PropertySidebarNodeFields } from './PropertySidebarNodeFields';
import { PropertySidebarRelationshipFields } from './PropertySidebarRelationshipFields';
import { PropertySidebarFooterFields } from './PropertySidebarFooterFields';

export const PropertySidebar: React.FC<PropertySidebarProps> = ({
  selectedNode,
  currentDoc,
  onUpdateNode,
  onImportImage,
  onOpenInternalLink,
  onClose,
  dockSide = 'right',
}) => {
  const [noteText, setNoteText] = useState('');
  const [nodeText, setNodeText] = useState('');
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [linkText, setLinkText] = useState('');
  const [newTagText, setNewTagText] = useState('');
  const [linkError, setLinkError] = useState('');
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [targetNodes, setTargetNodes] = useState<Array<{ id: string; text: string; depth: number }>>([]);
  const [targetSearch, setTargetSearch] = useState('');
  const [isSyncingToZotero, setIsSyncingToZotero] = useState(false);
  const [isOpeningPdf, setIsOpeningPdf] = useState(false);
  const [isLocatingItem, setIsLocatingItem] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = () => StorageService.getDocumentList()
      .then(list => { if (active) setDocuments(list); })
      .catch(() => { if (active) setDocuments([]); });
    void refresh();
    return () => {
      active = false;
    };
  }, [currentDoc.id]);

  useEffect(() => {
    const documentId = selectedNode?.internalLink?.documentId;
    if (!documentId) { setTargetNodes([]); return; }
    let active = true;
    const load = async () => {
      const targetDoc = documentId === currentDoc.id
        ? currentDoc
        : await StorageService.getDocument(documentId, { trackRevision: false });
      if (!active) return;
      if (!targetDoc) { setTargetNodes([]); return; }
      const nodes: Array<{ id: string; text: string; depth: number }> = [];
      const pending = [{ node: targetDoc.root, depth: 0 }];
      while (pending.length) {
        const { node, depth } = pending.pop()!;
        nodes.push({ id: node.id, text: node.text, depth });
        for (let i = node.children.length - 1; i >= 0; i -= 1) pending.push({ node: node.children[i], depth: depth + 1 });
      }
      setTargetNodes(nodes);
    };
    load().catch(() => { if (active) setTargetNodes([]); });
    return () => { active = false; };
  }, [selectedNode?.internalLink?.documentId, currentDoc.id, currentDoc.root]);

  useEffect(() => {
    if (selectedNode) {
      setNoteText(selectedNode.note || '');
      setImageError('');
      setLinkText(selectedNode.link || '');
      setLinkError('');
      setTargetSearch('');
    }
  }, [selectedNode?.id]);

  useEffect(() => { setNodeText(selectedNode?.text || ''); }, [selectedNode?.id, selectedNode?.text]);

  if (!selectedNode) return null;
  const nodeImage = isSafeNodeImage(selectedNode.image) ? selectedNode.image : null;

  const handleShapeChange = (shape: NodeShape) => {
    onUpdateNode(selectedNode.id, { shape });
  };

  const handleColorChange = (color: string) => {
    onUpdateNode(selectedNode.id, { color });
  };

  const handleNoteBlur = () => {
    onUpdateNode(selectedNode.id, { note: noteText.trim() || undefined });
  };

  const handleLinkBlur = () => {
    const trimmed = linkText.trim();
    if (trimmed && !safeExternalUrl(trimmed)) {
      setLinkError('仅支持 HTTPS、HTTP、DOI、mailto 或 zotero 链接');
      return;
    }
    setLinkError('');
    onUpdateNode(selectedNode.id, { link: trimmed || undefined });
  };

  const handleAddTag = () => {
    const trimmed = newTagText.trim();
    if (!trimmed) return;
    const currentTags = selectedNode.tags || [];
    if (!currentTags.includes(trimmed)) {
      onUpdateNode(selectedNode.id, { tags: [...currentTags, trimmed] });
    }
    setNewTagText('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = selectedNode.tags || [];
    onUpdateNode(selectedNode.id, {
      tags: currentTags.filter(t => t !== tagToRemove)
    });
  };

  const toggleIcon = (iconName: string) => {
    const currentIcons = selectedNode.icons || [];
    if (currentIcons.includes(iconName)) {
      onUpdateNode(selectedNode.id, {
        icons: currentIcons.filter(i => i !== iconName)
      });
    } else {
      onUpdateNode(selectedNode.id, {
        icons: [...currentIcons, iconName]
      });
    }
  };

  const currentIcons = selectedNode.icons || [];
  const noteRows = computeNoteRows(noteText);

  const ctx: PropertySidebarCtx = {
    selectedNode, currentDoc, onUpdateNode, onImportImage, onOpenInternalLink, onClose, dockSide,
    noteText, setNoteText, nodeText, setNodeText,
    imageBusy, setImageBusy, imageError, setImageError, imageInputRef,
    linkText, setLinkText, newTagText, setNewTagText, linkError, setLinkError,
    documents, targetNodes, targetSearch, setTargetSearch,
    isSyncingToZotero, setIsSyncingToZotero, isOpeningPdf, setIsOpeningPdf,
    isLocatingItem, setIsLocatingItem, syncStatusMsg, setSyncStatusMsg,
    handleShapeChange, handleColorChange, handleNoteBlur, handleLinkBlur,
    handleAddTag, handleRemoveTag, toggleIcon,
    nodeImage, currentIcons, noteRows,
  };

  return (
    <aside className={`mindflow-inspector w-72 shrink-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col h-full z-20 select-none ${dockSide === 'left' ? 'border-r order-first animate-in slide-in-from-left duration-150' : 'border-l order-last animate-in slide-in-from-right duration-150'}`}>
      {/* Header */}
      <div className="h-12 shrink-0 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 ">
          主题样式与属性
        </span>
        <button
          onClick={onClose}
          aria-label="关闭属性栏"
          title="关闭属性栏"
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5 text-xs text-slate-700 dark:text-slate-300">
        <PropertySidebarNodeFields ctx={ctx} />
        <PropertySidebarRelationshipFields ctx={ctx} />
        <PropertySidebarFooterFields ctx={ctx} />
      </div>
    </aside>
  );
};
