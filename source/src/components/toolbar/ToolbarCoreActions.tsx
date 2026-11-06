import { Plus, CornerDownRight, Trash2, Undo2, Redo2, ImagePlus } from 'lucide-react';
import type { ToolbarGroupProps } from './ToolbarConfig';

export const ToolbarCoreActions = ({ ctx }: ToolbarGroupProps) => {
  const {
    buttons, canUndo, canRedo, onUndo, onRedo, onAddChild,
    onImportNodeImage, nodeImageInputRef, onAddSibling, onDeleteNode, hasSelection,
  } = ctx;

  return (
    <>
      {/* Center: Core Action Buttons */}
      {(buttons.history || buttons.insert) && (
        <div className="flex w-max flex-nowrap shrink-0 items-center gap-1 whitespace-nowrap px-1 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/30">
          {/* Undo / Redo */}
          {buttons.history && (
            <>
              <button
                onClick={onUndo}
                disabled={!canUndo}
                title="撤销 (Ctrl+Z)"
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                title="重做 (Ctrl+Y)"
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </>
          )}

          {buttons.history && buttons.insert && (
            <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
          )}

          {/* Insert Child */}
          {buttons.insert && (
            <>
              <button
                onClick={onAddChild}
                title="插入子主题 (Tab)"
                className="flex shrink-0 flex-nowrap items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                <span className="hidden xl:inline whitespace-nowrap">子主题</span>
                <kbd className="hidden 2xl:inline shrink-0 text-[10px] text-slate-400 bg-slate-200/60 dark:bg-slate-700 px-1 rounded">Tab</kbd>
              </button>

              {onImportNodeImage && <>
                <button onClick={() => nodeImageInputRef.current?.click()} title="添加图片节点（可再编辑文字）"
                  aria-label="添加图片节点"
                  className="flex shrink-0 flex-nowrap items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors">
                  <ImagePlus className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                  <span className="hidden xl:inline whitespace-nowrap">图片节点</span>
                </button>
                <input ref={nodeImageInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label="选择节点图片"
                  onChange={event => { const file = event.target.files?.[0]; if (file) onImportNodeImage(file); event.target.value = ''; }} />
              </>}

              {/* Insert Sibling */}
              <button
                onClick={onAddSibling}
                title="插入同级主题 (Enter)"
                className="flex shrink-0 flex-nowrap items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors"
              >
                <CornerDownRight className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                <span className="hidden xl:inline whitespace-nowrap">同级主题</span>
                <kbd className="hidden 2xl:inline shrink-0 text-[10px] text-slate-400 bg-slate-200/60 dark:bg-slate-700 px-1 rounded">Enter</kbd>
              </button>
            </>
          )}

          {/* Delete */}
          <button
            onClick={onDeleteNode}
            disabled={!hasSelection}
            title="删除主题 (Delete)"
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-red-600 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
};
