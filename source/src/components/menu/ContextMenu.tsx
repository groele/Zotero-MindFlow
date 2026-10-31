import React, { useRef } from 'react';
import { useContextMenu } from './useContextMenu';
import {
  CornerDownRight, Plus, Trash2,
  Copy, FolderPlus, FolderMinus, Eye, FileText,
  MapPin, BookOpen
} from 'lucide-react';
import { MindMapNode } from '../../core/model/types';
import { extractDoi } from '../../services/zotero/zoteroBridge';

export interface ContextMenuProps {
  x: number;
  y: number;
  node: MindMapNode;
  onClose: () => void;
  onAddChild: (id: string) => void;
  onAddSibling: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onStartEdit: (id: string) => void;
  onFocusSubtree?: (id: string) => void;
  onCopyNode?: (id: string) => void;
  onDuplicateNode?: (id: string) => void;
  onPasteSubtree?: (id: string) => void;
  hasClipboardContent?: boolean;
  onLocateZoteroItem?: (uri: string, fallbackText?: string, noteText?: string) => void;
  onOpenZoteroPdf?: (uri: string, fallbackText?: string, noteText?: string) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  node,
  onClose,
  onAddChild,
  onAddSibling,
  onDelete,
  onToggleCollapse,
  onStartEdit,
  onFocusSubtree,
  onCopyNode,
  onDuplicateNode,
  onPasteSubtree,
  hasClipboardContent = false,
  onLocateZoteroItem,
  onOpenZoteroPdf,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const adjustedStyle = useContextMenu(menuRef, onClose, x, y);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(node.text);
    } catch (e) {
      console.warn('Failed to copy text:', e);
    }
    onClose();
  };

  const isCollapsed = node.isExpanded === false;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="节点操作"
      style={adjustedStyle}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="mindflow-context-menu fixed z-[100] w-52 max-h-[calc(100vh-24px)] overflow-y-auto py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg rounded-md text-xs text-slate-700 dark:text-slate-200 select-none"
    >
      <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 truncate mb-1">
        {node.text}
      </div>

      <button
        onClick={() => {
          onAddChild(node.id);
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <CornerDownRight className="w-3.5 h-3.5 text-indigo-500" />
          <span>插入子主题</span>
        </div>
        <kbd className="text-[10px] font-mono text-slate-400">Tab</kbd>
      </button>

      <button
        onClick={() => {
          onAddSibling(node.id);
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Plus className="w-3.5 h-3.5 text-slate-500" />
          <span>插入同级主题</span>
        </div>
        <kbd className="text-[10px] font-mono text-slate-400">Enter</kbd>
      </button>

      <button
        onClick={() => {
          onStartEdit(node.id);
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          <span>编辑文本</span>
        </div>
        <kbd className="text-[10px] font-mono text-slate-400">Space</kbd>
      </button>


      {node.children && node.children.length > 0 && (
        <button
          onClick={() => {
            onToggleCollapse(node.id);
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            {isCollapsed ? (
              <FolderPlus className="w-3.5 h-3.5 text-blue-500" />
            ) : (
              <FolderMinus className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>{isCollapsed ? '展开所有子分支' : '折叠此分支'}</span>
          </div>
          <kbd className="text-[10px] font-mono text-slate-400">/</kbd>
        </button>
      )}

      {onFocusSubtree && (
        <button
          onClick={() => {
            onFocusSubtree(node.id);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
        >
          <Eye className="w-3.5 h-3.5 text-purple-500" />
          <span>聚焦此分支 (下钻专注)</span>
        </button>
      )}

      {onCopyNode && (
        <button
          onClick={() => {
            onCopyNode(node.id);
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Copy className="w-3.5 h-3.5 text-blue-500" />
            <span>复制分支节点</span>
          </div>
          <kbd className="text-[10px] font-mono text-slate-400">Ctrl+C</kbd>
        </button>
      )}

      {onDuplicateNode && (
        <button
          onClick={() => {
            onDuplicateNode(node.id);
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Copy className="w-3.5 h-3.5 text-emerald-500" />
            <span>创建副本</span>
          </div>
          <kbd className="text-[10px] font-mono text-slate-400">Ctrl+D</kbd>
        </button>
      )}

      {onPasteSubtree && hasClipboardContent && (
        <button
          onClick={() => {
            onPasteSubtree(node.id);
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-3.5 h-3.5 text-purple-500" />
            <span>粘贴子分支</span>
          </div>
          <kbd className="text-[10px] font-mono text-slate-400">Ctrl+V</kbd>
        </button>
      )}

      <button
        onClick={handleCopyText}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Copy className="w-3.5 h-3.5 text-slate-500" />
          <span>复制主题纯文本</span>
        </div>
      </button>

      {Boolean((node.link && node.link.startsWith('zotero://')) || extractDoi(node.link) || extractDoi(node.text) || extractDoi(node.note)) && (
        <>
          <div className="my-1 border-t border-slate-100 dark:border-slate-800/80" />
          <div className="px-3 py-0.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
            Zotero 伴读联动
          </div>
          {onLocateZoteroItem && (
            <button
              onClick={() => {
                const nodeDoi = extractDoi(node.link) || extractDoi(node.text) || extractDoi(node.note);
                const targetUri = (node.link && node.link.startsWith('zotero://') ? node.link : null) || (nodeDoi ? `https://doi.org/${nodeDoi}` : (node.link || node.text));
                onLocateZoteroItem(targetUri, node.text, node.note);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-700 dark:text-sky-300 transition-colors text-left"
            >
              <MapPin className="w-3.5 h-3.5 text-sky-500" />
              <span>在 Zotero 文库中定位</span>
            </button>
          )}
          {onOpenZoteroPdf && (
            <button
              onClick={() => {
                const nodeDoi = extractDoi(node.link) || extractDoi(node.text) || extractDoi(node.note);
                const targetUri = (node.link && node.link.startsWith('zotero://') ? node.link : null) || (nodeDoi ? `https://doi.org/${nodeDoi}` : (node.link || node.text));
                onOpenZoteroPdf(targetUri, node.text, node.note);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-700 dark:text-sky-300 transition-colors text-left"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-500" />
              <span>打开 PDF 阅读器</span>
            </button>
          )}
        </>
      )}

      <div className="my-1 border-t border-slate-100 dark:border-slate-800/80" />

      <button
        onClick={() => {
          onDelete(node.id);
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Trash2 className="w-3.5 h-3.5" />
          <span>删除主题分支</span>
        </div>
        <kbd className="text-[10px] font-mono text-red-400">Del</kbd>
      </button>
    </div>
  );
};
