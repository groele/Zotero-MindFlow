import React, { useState, useEffect, useRef } from 'react';
import { LayoutNode } from '../../core/model/types';
import { imageDisplayHeight } from '../../core/model/nodeImage';
import { ChevronRight, ChevronDown, Plus, Star, Flag, CheckCircle2, HelpCircle } from 'lucide-react';
import { locateItemInZotero, openExternalUrl, isZoteroEnvironment } from '../../services/zotero/zoteroBridge';
import { resolveNodeCardDerived, type NodeCardCtx } from './NodeCardUtils';
import { NodeCardContent } from './NodeCardContent';

interface NodeCardProps {
  layoutNode: LayoutNode;
  isSelected: boolean;
  isEditing: boolean;
  isSearchMatched?: boolean;
  isTagMatched?: boolean;
  isTagDimmed?: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onContextMenu?: (id: string, e: React.MouseEvent) => void;
  onStartEdit: (id: string) => void;
  onCommitEdit: (id: string, newText: string) => void;
  onCancelEdit: () => void;
  onToggleCollapse: (id: string) => void;
  onCycleTaskStatus?: (id: string) => void;
  onOpenInternalLink?: (documentId: string, nodeId?: string) => void;
  onDragStart?: (id: string, e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDragOver?: (id: string, e: React.DragEvent) => void;
  onDrop?: (targetId: string, e: React.DragEvent) => void;
}

export const NodeCard: React.FC<NodeCardProps> = ({
  layoutNode,
  isSelected,
  isEditing,
  isSearchMatched = false,
  isTagMatched = false,
  isTagDimmed = false,
  onSelect,
  onContextMenu,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onToggleCollapse,
  onCycleTaskStatus,
  onOpenInternalLink,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}) => {
  const { node, x, y, width, height, level, color, shape } = layoutNode;
  const reading = Boolean(layoutNode.readingStyle);
  const wrapped = Boolean(layoutNode.textLines);
  const [editText, setEditText] = useState(node.text);
  const [isDragOverTarget, setIsDragOverTarget] = useState(false);
  const [showNotePopover, setShowNotePopover] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const isComposingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditText(node.text);
  }, [node.text]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposingRef.current || e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      onCommitEdit(node.id, editText);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setEditText(node.text);
      onCancelEdit();
    }
  };

  const handleBlur = () => {
    if (isEditing) {
      onCommitEdit(node.id, editText);
    }
  };

  const hasChildren = node.children && node.children.length > 0;
  const { externalUrl, isDoi, nodeImage } = resolveNodeCardDerived(node);
  const isCollapsed = node.isExpanded === false;

  const handleExternalClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!externalUrl) return;

    // Ctrl/Cmd/Alt click: bypass Zotero locate and directly open web URL
    if (e.ctrlKey || e.metaKey || e.altKey) {
      if (isZoteroEnvironment()) {
        e.preventDefault();
        openExternalUrl(externalUrl);
      }
      return;
    }

    // When DOI is present, prioritize jumping to the local Zotero library database item
    if (isDoi) {
      e.preventDefault();
      if (isLocating) return;
      setIsLocating(true);
      try {
        const located = await locateItemInZotero(externalUrl, node.text, { noteText: node.note });
        if (!located) {
          openExternalUrl(externalUrl);
        }
      } finally {
        setTimeout(() => setIsLocating(false), 800);
      }
      return;
    }

    // For general non-DOI web links inside Zotero, open via launchURL
    if (isZoteroEnvironment()) {
      e.preventDefault();
      openExternalUrl(externalUrl);
    }
  };

  // Visual shape style
  let shapeClasses = 'rounded-xl';
  if (shape === 'pill') shapeClasses = 'rounded-full';
  else if (shape === 'rectangle') shapeClasses = 'rounded-none';
  else if (shape === 'underline') shapeClasses = 'rounded-none border-b-2 bg-transparent shadow-none';

  // Level styles
  const isRoot = level === 0;
  const isLevel1 = level === 1;

  // Custom or theme colors
  const nodeStyle: React.CSSProperties = {
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`,
  };

  if (isRoot) {
    nodeStyle.backgroundColor = layoutNode.bgColor;
    nodeStyle.color = layoutNode.textColor;
  } else if (shape === 'underline') {
    nodeStyle.borderBottomColor = color;
    nodeStyle.color = layoutNode.textColor;
  } else {
    nodeStyle.backgroundColor = layoutNode.bgColor;
    nodeStyle.borderColor = isSelected ? '#3b82f6' : (isLevel1 ? color : '#e2e8f0');
    nodeStyle.color = layoutNode.textColor;
  }
  if (reading) {
    nodeStyle.backgroundColor = layoutNode.bgColor;
    nodeStyle.borderColor = isSelected ? '#3b82f6' : layoutNode.borderColor;
    nodeStyle.borderWidth = level === 1 ? 1 : 0;
    nodeStyle.borderRadius = level <= 1 ? 5 : 0;
    nodeStyle.boxShadow = 'none';
    nodeStyle.fontFamily = '"Microsoft YaHei", "PingFang SC", sans-serif';
    nodeStyle.fontSize = 14;
    nodeStyle.fontWeight = level <= 1 ? 600 : 400;
  }

  // Render icons
  const renderIconBadge = (iconName: string) => {
    switch (iconName) {
      case 'star': return <Star key={iconName} className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />;
      case 'flag': return <Flag key={iconName} className="w-3.5 h-3.5 text-red-500 fill-red-500" />;
      case 'check': return <CheckCircle2 key={iconName} className="w-3.5 h-3.5 text-emerald-500" />;
      case 'question': return <HelpCircle key={iconName} className="w-3.5 h-3.5 text-sky-500" />;
      case 'priority-1': return <span key={iconName} className="px-1 text-[10px] font-bold bg-red-500 text-white rounded">1</span>;
      case 'priority-2': return <span key={iconName} className="px-1 text-[10px] font-bold bg-amber-500 text-white rounded">2</span>;
      case 'priority-3': return <span key={iconName} className="px-1 text-[10px] font-bold bg-blue-500 text-white rounded">3</span>;
      default: return null;
    }
  };

  const ctx: NodeCardCtx = {
    node, layoutNode, reading, wrapped, level, color, shape, x, y, width, height,
    isRoot, isLevel1, isSelected, isEditing, isSearchMatched, isTagMatched,
    isTagDimmed, editText, setEditText, isDragOverTarget, setIsDragOverTarget,
    showNotePopover, setShowNotePopover, isLocating, setIsLocating,
    isComposingRef, inputRef, handleKeyDown, handleBlur, handleExternalClick,
    renderIconBadge, hasChildren, externalUrl, isDoi, nodeImage, isCollapsed,
    shapeClasses, nodeStyle, onSelect, onContextMenu, onStartEdit, onCommitEdit,
    onCancelEdit, onToggleCollapse, onCycleTaskStatus, onOpenInternalLink,
    onDragStart, onDragEnd, onDragOver, onDrop,
  };

  return (
    <div
      style={nodeStyle}
      draggable={!isEditing && !isRoot}
      onDragStart={(e) => onDragStart && onDragStart(node.id, e)}
      onDragEnd={() => { setIsDragOverTarget(false); onDragEnd?.(); }}
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDragOverTarget(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragOverTarget(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!isDragOverTarget) setIsDragOverTarget(true);
        onDragOver && onDragOver(node.id, e);
      }}
      onDrop={(e) => {
        setIsDragOverTarget(false);
        onDrop && onDrop(node.id, e);
      }}
      onClick={(e) => onSelect(node.id, e)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu && onContextMenu(node.id, e);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onStartEdit(node.id);
      }}
      className={`
        absolute select-none flex px-3 cursor-pointer transition-all duration-150
        ${nodeImage ? 'flex-col items-center justify-center gap-1 py-2' : 'items-center justify-between'}
        ${shapeClasses}
        ${isRoot ? 'shadow-lg font-bold text-base' : 'text-sm font-medium border'}
        ${isDragOverTarget ? 'ring-2 ring-indigo-500 ring-offset-2 scale-[1.04] bg-indigo-50/40 dark:bg-indigo-950/50 shadow-xl z-40' : ''}
        ${isSelected && !isDragOverTarget ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent shadow-node-selected z-20' : 'shadow-node hover:shadow-node-hover z-10'}
        ${isSearchMatched ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-amber-100 dark:ring-offset-slate-900 shadow-lg scale-105 z-30' : ''}
        ${isTagMatched ? 'ring-2 ring-teal-500 ring-offset-2 ring-offset-teal-50 dark:ring-offset-slate-900 z-30' : ''}
        ${isTagDimmed ? 'opacity-25' : ''}
        ${shape !== 'underline' ? 'backdrop-blur-sm' : ''}
      `}
    >
      {/* Visual Drop Target Badge */}
      {isDragOverTarget && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full shadow-md whitespace-nowrap animate-bounce pointer-events-none z-50">
          <Plus className="mr-1 inline h-3 w-3" />移至此分支
        </div>
      )}
      {nodeImage && (
        <img
          src={nodeImage.dataUrl}
          alt={node.text || '导图节点图片'}
          draggable={false}
          style={{ width: nodeImage.width, height: imageDisplayHeight(nodeImage) }}
          className="max-w-full object-contain rounded-md pointer-events-none"
        />
      )}
      {/* Content wrapper */}
      <NodeCardContent ctx={ctx} />

      {/* Collapse/Expand button for nodes with children */}
      {hasChildren && !isRoot && (
        <button
          type="button"
          draggable={false}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse(node.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onDragStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? `展开 ${node.children.length} 个子主题` : `收起 ${node.children.length} 个子主题`}
          title={isCollapsed ? `展开 ${node.children.length} 个子主题` : `收起 ${node.children.length} 个子主题`}
          className={`
            absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center
            border shadow-md transition-all duration-150 z-30 touch-manipulation
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
            hover:scale-110 active:scale-95
            ${isCollapsed
              ? 'bg-blue-600 border-blue-700 text-white hover:bg-blue-700'
              : 'bg-white border-slate-300 text-slate-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700'}
          `}
        >
          {isCollapsed
            ? <ChevronRight className="w-4 h-4" aria-hidden="true" />
            : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
          {isCollapsed && (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 min-w-4 h-4 px-0.5 rounded-full flex items-center justify-center bg-white text-blue-700 border border-blue-200 text-[9px] leading-none font-bold shadow-sm"
            >
              {node.children.length > 99 ? '99+' : node.children.length}
            </span>
          )}
        </button>
      )}
    </div>
  );
};
