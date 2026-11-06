import React from 'react';
import { Link2, Trash2 } from 'lucide-react';
import type { CanvasProps } from './CanvasTypes';
import { useCanvasInteractions } from './CanvasInteractions';
import { CanvasRelationships } from './CanvasRelationships';
import { CanvasNodes } from './CanvasNodes';

export const Canvas: React.FC<CanvasProps> = (props) => {
  const ctx = useCanvasInteractions(props);
  const {
    containerRef, nodeImageInputRef, imageTargetIdRef, handleMouseDown,
    handleMouseMove, handleMouseUp, onContextMenuCanvas, theme,
    canvasBackground, isDraggingCanvas, isSelectingBox, connectingFromId,
    setConnectingFromId, onImportNodeImage, viewport, boxStart, boxCurrent,
    activeSelectedSet, onBatchColor, onBatchDelete,
  } = ctx;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => {
        // If clicking on canvas background directly, trigger canvas context menu
        const target = e.target as HTMLElement;
        const isCanvasBg = target === containerRef.current ||
          target.classList.contains('canvas-background') ||
          target.tagName.toLowerCase() === 'svg' ||
          target.id === 'canvas-svg-layer';
        if (isCanvasBg) {
          e.preventDefault();
          onContextMenuCanvas?.(e.clientX, e.clientY);
        }
      }}
      className={`
        relative w-full h-full overflow-hidden select-none canvas-background
        ${theme.isDark ? 'bg-slate-950' : 'bg-slate-50'}
        ${
          canvasBackground === 'blank'
            ? ''
            : canvasBackground === 'grid'
            ? theme.isDark ? 'canvas-grid-lines-dark' : 'canvas-grid-lines'
            : theme.isDark ? 'canvas-grid-dots-dark' : 'canvas-grid-dots'
        }
        ${isDraggingCanvas ? 'cursor-grabbing' : isSelectingBox || connectingFromId ? 'cursor-crosshair' : 'cursor-default'}
      `}
      style={{ backgroundColor: theme.background }}
    >
      <input
        ref={nodeImageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        aria-label="选择当前节点图片"
        className="hidden"
        onChange={event => {
          const file = event.target.files?.[0];
          const targetId = imageTargetIdRef.current;
          event.target.value = '';
          imageTargetIdRef.current = null;
          if (file && targetId && onImportNodeImage) {
            void onImportNodeImage(targetId, file).catch(error => {
              window.alert(`图片导入失败：${error?.message || '未知错误'}`);
            });
          }
        }}
      />
      {/* Connecting Relationship Banner on Top */}
      {connectingFromId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2.5 z-50 animate-bounce">
          <Link2 className="w-4 h-4" />
          <span>请在画布上点击目标节点以完成关联线连接</span>
          <button
            type="button"
            onClick={() => setConnectingFromId(null)}
            className="ml-2 px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[10px] transition-colors"
          >
            ESC 取消
          </button>
        </div>
      )}

      {/* Transformed Stage */}
      <div
        className="absolute inset-0 origin-top-left pointer-events-none"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
        }}
      >
        <CanvasRelationships ctx={ctx} />
        <CanvasNodes ctx={ctx} />
      </div>

      {/* Marquee Selection Box Overlay */}
      {isSelectingBox && (
        <div
          className="absolute pointer-events-none border-2 border-blue-500 bg-blue-500/15 rounded-md shadow-sm z-30"
          style={{
            left: Math.min(boxStart.x, boxCurrent.x),
            top: Math.min(boxStart.y, boxCurrent.y),
            width: Math.abs(boxCurrent.x - boxStart.x),
            height: Math.abs(boxCurrent.y - boxStart.y),
          }}
        />
      )}

      {/* Enhanced Multi-selection Floating Batch Toolbar */}
      {activeSelectedSet.size > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white text-xs px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur flex items-center gap-3 z-40 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span className="font-semibold text-blue-400">已多选 {activeSelectedSet.size} 个节点</span>
          <div className="w-px h-3.5 bg-slate-700" />
          {/* Quick Batch Color */}
          <div className="flex items-center gap-1.5">
            {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onBatchColor?.(c)}
                title={`批量设为此主题色`}
                className="w-3.5 h-3.5 rounded-full hover:scale-125 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="w-px h-3.5 bg-slate-700" />
          <button
            type="button"
            onClick={() => onBatchDelete?.()}
            className="px-2 py-1 rounded bg-red-950/60 hover:bg-red-900 text-[11px] text-red-300 font-medium flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> 批量删除
          </button>
        </div>
      )}
    </div>
  );
};
