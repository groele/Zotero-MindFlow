import React, { useRef } from 'react';
import { useContextMenu } from './useContextMenu';
import {
  Focus, RotateCcw, Plus,
  Grid, CircleDot, Square, Moon, Sun,
  Maximize2, ClipboardPaste, GraduationCap, FileText
} from 'lucide-react';

export interface CanvasContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onCenterCanvas: () => void;
  onResetZoom: () => void;
  onFitView?: () => void;
  onAddRootChild?: () => void;
  onPasteSubtree?: () => void;
  hasClipboardContent?: boolean;
  canvasBackground: 'dots' | 'grid' | 'blank';
  onChangeCanvasBackground: (bg: 'dots' | 'grid' | 'blank') => void;
  onToggleTheme?: () => void;
  isDark?: boolean;
  onLocateZoteroItem?: () => void;
  onOpenZoteroPdf?: () => void;
  boundItemTitle?: string;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  x,
  y,
  onClose,
  onCenterCanvas,
  onResetZoom,
  onFitView,
  onAddRootChild,
  onPasteSubtree,
  hasClipboardContent = false,
  canvasBackground,
  onChangeCanvasBackground,
  onToggleTheme,
  isDark = false,
  onLocateZoteroItem,
  onOpenZoteroPdf,
  boundItemTitle,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const adjustedStyle = useContextMenu(menuRef, onClose, x, y);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="画布导航与视图"
      style={adjustedStyle}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="mindflow-context-menu fixed z-[100] w-52 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg rounded-md text-xs text-slate-700 dark:text-slate-200 select-none"
    >
      <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 truncate mb-1">
        画布导航与视图
      </div>

      <button
        onClick={() => {
          onCenterCanvas();
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Focus className="w-3.5 h-3.5 text-indigo-500" />
          <span>居中对齐全部主题</span>
        </div>
        <kbd className="text-[10px] font-mono text-slate-400">Space</kbd>
      </button>

      <button
        onClick={() => {
          onResetZoom();
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
          <span>100% 原始缩放</span>
        </div>
        <kbd className="text-[10px] font-mono text-slate-400">Ctrl+0</kbd>
      </button>

      {onFitView && (
        <button
          onClick={() => {
            onFitView();
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Maximize2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>自适应全图视野</span>
          </div>
        </button>
      )}

      {onAddRootChild && (
        <button
          onClick={() => {
            onAddRootChild();
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-3.5 h-3.5 text-indigo-500" />
            <span>添加中心分支</span>
          </div>
          <kbd className="text-[10px] font-mono text-slate-400">Tab</kbd>
        </button>
      )}

      {onPasteSubtree && hasClipboardContent && (
        <button
          onClick={() => {
            onPasteSubtree();
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-600 dark:text-purple-400 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-3.5 h-3.5 text-purple-500" />
            <span>粘贴分支到中心</span>
          </div>
          <kbd className="text-[10px] font-mono text-purple-400">Ctrl+V</kbd>
        </button>
      )}

      {onLocateZoteroItem && (
        <>
          <div className="my-1 border-t border-slate-100 dark:border-slate-800/80" />
          <div className="px-3 py-0.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider truncate" title={boundItemTitle || '当前导图关联文献'}>
            {boundItemTitle ? `文献 · ${boundItemTitle}` : '关联文献联动'}
          </div>
          <button
            onClick={() => {
              onLocateZoteroItem();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5 text-sky-500" />
              <span>在文库中定位文献</span>
            </div>
          </button>
          {onOpenZoteroPdf && (
            <button
              onClick={() => {
                onOpenZoteroPdf();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-sky-500" />
                <span>打开全文 PDF 阅读器</span>
              </div>
            </button>
          )}
        </>
      )}

      <div className="my-1 border-t border-slate-100 dark:border-slate-800/80" />
      <div className="px-3 py-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        画布背景样式
      </div>

      <div className="px-2 py-1 flex items-center justify-between gap-1">
        <button
          onClick={() => {
            onChangeCanvasBackground('dots');
            onClose();
          }}
          className={`flex-1 flex flex-col items-center py-1 rounded transition-colors text-[10px] ${
            canvasBackground === 'dots'
              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 font-semibold'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          <CircleDot className="w-3.5 h-3.5 mb-0.5" />
          点阵
        </button>
        <button
          onClick={() => {
            onChangeCanvasBackground('grid');
            onClose();
          }}
          className={`flex-1 flex flex-col items-center py-1 rounded transition-colors text-[10px] ${
            canvasBackground === 'grid'
              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 font-semibold'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          <Grid className="w-3.5 h-3.5 mb-0.5" />
          网格
        </button>
        <button
          onClick={() => {
            onChangeCanvasBackground('blank');
            onClose();
          }}
          className={`flex-1 flex flex-col items-center py-1 rounded transition-colors text-[10px] ${
            canvasBackground === 'blank'
              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 font-semibold'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          <Square className="w-3.5 h-3.5 mb-0.5" />
          空白
        </button>
      </div>

      {onToggleTheme && (
        <>
          <div className="my-1 border-t border-slate-100 dark:border-slate-800/80" />
          <button
            onClick={() => {
              onToggleTheme();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              {isDark ? (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              )}
              <span>{isDark ? '切换浅色模式' : '切换深色模式'}</span>
            </div>
          </button>
        </>
      )}
    </div>
  );
};
