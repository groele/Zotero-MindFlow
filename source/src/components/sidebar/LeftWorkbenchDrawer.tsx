import { FolderOpen, ListTree, Tag, Inbox, ShieldCheck, X } from 'lucide-react';
import type { LeftWorkbenchGroupProps } from './LeftWorkbenchTypes';
import { LeftWorkbenchDocs } from './LeftWorkbenchDocs';
import { LeftWorkbenchOutline } from './LeftWorkbenchOutline';
import { LeftWorkbenchTags } from './LeftWorkbenchTags';
import { LeftWorkbenchInbox } from './LeftWorkbenchInbox';
import { LeftWorkbenchBackup } from './LeftWorkbenchBackup';

export const LeftWorkbenchDrawer = ({ ctx }: LeftWorkbenchGroupProps) => {
  const { isOpen, isLeftDock, activeTab, onToggleOpen, operationError } = ctx;

  return (
    <>
      {/* 2. Expandable Content Drawer (280px) */}
      {isOpen && (
        <div className={`w-72 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col h-full animate-in ${isLeftDock ? 'slide-in-from-left border-r' : 'slide-in-from-right border-l'}`}>
          {/* Header */}
          <div className="h-12 shrink-0 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 ">
              {activeTab === 'docs' && <><FolderOpen className="w-4 h-4 text-slate-500" /> 我的导图文档</>}
              {activeTab === 'outline' && <><ListTree className="w-4 h-4 text-slate-500" /> 结构化大纲</>}
              {activeTab === 'tags' && <><Tag className="w-4 h-4 text-slate-500" /> 标签聚焦</>}
              {activeTab === 'inbox' && <><Inbox className="w-4 h-4 text-slate-500" /> 灵感与收集箱</>}
              {activeTab === 'backup' && <><ShieldCheck className="w-4 h-4 text-slate-500" /> 数据安全与备份</>}
            </span>
            <button
              onClick={onToggleOpen}
              aria-label="收起工作台"
              title="收起工作台"
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {operationError && <div role="alert" className="px-3 py-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/30">{operationError}</div>}
          <LeftWorkbenchDocs ctx={ctx} />
          <LeftWorkbenchOutline ctx={ctx} />
          <LeftWorkbenchTags ctx={ctx} />
          <LeftWorkbenchInbox ctx={ctx} />
          <LeftWorkbenchBackup ctx={ctx} />
        </div>
      )}
    </>
  );
};
