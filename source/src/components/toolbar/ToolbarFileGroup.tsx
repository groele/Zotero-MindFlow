import { HelpCircle, Settings, Minimize2, Maximize2, Scan, ZoomOut, ZoomIn } from 'lucide-react';
import type { ToolbarGroupProps } from './ToolbarConfig';

export const ToolbarFileGroup = ({ ctx }: ToolbarGroupProps) => {
  const {
    fileInputRef, handleFileInputChange, onOpenShortcuts, onOpenSettings,
    handleToggleFullscreen, isFullscreen, buttons, onFitScreen, onZoomOut,
    onResetZoom, scale, onZoomIn, isSidepanelMode,
  } = ctx;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".mindflow,.json,.md,.markdown,.opml"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Shortcuts Cheat Sheet */}
      <button
        onClick={onOpenShortcuts}
        title="快捷键大全 (?)"
        className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <HelpCircle className="w-4 h-4 text-slate-500" />
      </button>

      {/* Settings button */}
      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          title="系统设置与偏好 (Ctrl+,)"
          className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Settings className="w-4 h-4 text-slate-500" />
        </button>
      )}

      {/* Fullscreen Toggle */}
      <button
        onClick={handleToggleFullscreen}
        title={isFullscreen ? '退出全屏模式 (F11 / Esc)' : '全屏沉浸研读 (F11)'}
        className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        {isFullscreen ? (
          <Minimize2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        ) : (
          <Maximize2 className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {/* Zoom & Fit controls */}
      {buttons.zoom && (
        <div className="hidden sm:flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
          {onFitScreen && (
            <button
              onClick={onFitScreen}
              title="自适应全屏居中 (Ctrl+1)"
              className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
            >
              <Scan className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            </button>
          )}
          <button
            onClick={onZoomOut}
            title="缩小画布"
            className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onResetZoom}
            title="重置为 100% 原始大小 (Ctrl+0)"
            className="px-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={onZoomIn}
            title="放大画布"
            className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Open in full tab button if in sidepanel mode */}
      {isSidepanelMode && (
        <button
          onClick={() => {
            window.open('index.html', '_blank');
          }}
          title="在独立大标签页中全屏打开"
          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      )}
    </>
  );
};
