import {
  FolderOpen, ListTree, Inbox, ShieldCheck, Settings, ArrowLeftRight,
  PanelLeftClose, PanelLeftOpen, Tag,
} from 'lucide-react';
import type { LeftWorkbenchGroupProps } from './LeftWorkbenchTypes';

export const LeftWorkbenchRail = ({ ctx }: LeftWorkbenchGroupProps) => {
  const {
    isLeftDock, isOpen, activeTab, onToggleOpen, onTabChange,
    onOpenSettings, isZoteroMode, onToggleDockPosition,
  } = ctx;

  return (
    <>
      {/* 1. Mini Navigation Rail (Always visible icon strip, 44px) */}
      <aside className={`w-11 shrink-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col items-center py-3 justify-between z-40 ${isLeftDock ? 'border-r' : 'border-l'}`}>
        {/* Top Feature Tabs */}
        <div className="flex flex-col items-center gap-1.5 w-full">
          <button aria-pressed={isOpen && activeTab === 'docs'} aria-label="文档库"
            onClick={() => {
              if (isOpen && activeTab === 'docs') onToggleOpen();
              else { onTabChange('docs'); if (!isOpen) onToggleOpen(); }
            }}
            title="文档库 (Documents)"
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              isOpen && activeTab === 'docs'
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 font-medium'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
          </button>

          <button aria-pressed={isOpen && activeTab === 'outline'} aria-label="结构大纲"
            onClick={() => {
              if (isOpen && activeTab === 'outline') onToggleOpen();
              else { onTabChange('outline'); if (!isOpen) onToggleOpen(); }
            }}
            title="结构大纲 (Outline)"
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              isOpen && activeTab === 'outline'
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 font-medium'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ListTree className="w-4 h-4" />
          </button>



          <button aria-pressed={isOpen && activeTab === 'tags'} aria-label="标签聚焦与主题筛选"
            onClick={() => {
              if (isOpen && activeTab === 'tags') onToggleOpen();
              else { onTabChange('tags'); if (!isOpen) onToggleOpen(); }
            }}
            title="标签聚焦与主题筛选"
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${isOpen && activeTab === 'tags' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Tag className="w-4 h-4" />
          </button>

          <button aria-pressed={isOpen && activeTab === 'inbox'} aria-label="灵感与收集箱"
            onClick={() => {
              if (isOpen && activeTab === 'inbox') onToggleOpen();
              else { onTabChange('inbox'); if (!isOpen) onToggleOpen(); }
            }}
            title="灵感与收集箱 (Inbox)"
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors relative ${
              isOpen && activeTab === 'inbox'
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 font-medium'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Inbox className="w-4 h-4" />
          </button>

          <button aria-pressed={isOpen && activeTab === 'backup'} aria-label="数据安全与备份"
            onClick={() => {
              if (isOpen && activeTab === 'backup') onToggleOpen();
              else { onTabChange('backup'); if (!isOpen) onToggleOpen(); }
            }}
            title="数据安全与备份 (Security & Snapshots)"
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              isOpen && activeTab === 'backup'
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 font-medium'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Utility Controls */}
        <div className="flex flex-col items-center gap-1.5 w-full">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title={isZoteroMode ? '打开 Zotero 插件功能设置 (Ctrl+,)' : '系统设置 (Ctrl+,)'}
              className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onToggleDockPosition}
            title={isLeftDock ? '切换停靠至右侧' : '切换停靠至左侧'}
            className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onToggleOpen}
            title={isOpen ? '收起工作台' : '展开工作台'}
            className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  );
};
