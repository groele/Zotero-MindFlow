import { Plus, Search, FileText, Trash2, GraduationCap } from 'lucide-react';
import { locateItemInZotero } from '../../services/zotero/zoteroBridge';
import { formatDate } from './LeftWorkbenchUtils';
import type { LeftWorkbenchGroupProps } from './LeftWorkbenchTypes';

export const LeftWorkbenchDocs = ({ ctx }: LeftWorkbenchGroupProps) => {
  const {
    activeTab, onNewDoc, docSearch, setDocSearch, docList, currentDoc,
    onSelectDoc, handleDeleteDoc,
  } = ctx;

  return (
    <>
      {/* TAB 1: DOCUMENTS */}
      {activeTab === 'docs' && (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
            <button
              onClick={onNewDoc}
              className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> 新建导图 (选择模板)
            </button>
            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索导图文档..."
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:border-blue-400"
              />
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
            {docList
              .filter(d => d.title.toLowerCase().includes(docSearch.toLowerCase()))
              .map((d) => (
                <div
                  key={d.id}
                  onClick={() => onSelectDoc(d.id)}
                  className={`group flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                    d.id === currentDoc.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText className={`w-3.5 h-3.5 ${d.id === currentDoc.id ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`text-xs truncate ${d.id === currentDoc.id ? 'text-blue-700 dark:text-blue-300 font-semibold' : 'text-slate-800 dark:text-slate-200 font-medium'}`}>
                          {d.title}
                        </span>
                        {d.zoteroItemKey && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void locateItemInZotero(d.zoteroItemKey!, d.zoteroItemTitle);
                            }}
                            className="shrink-0 inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-full bg-sky-100 hover:bg-sky-200 dark:bg-sky-900/60 dark:hover:bg-sky-800 text-sky-700 dark:text-sky-300 font-medium leading-none transition-colors cursor-pointer"
                            title={d.zoteroItemTitle ? `已关联 Zotero 文献: ${d.zoteroItemTitle} (点击在文库中定位)` : '已关联 Zotero 文献 (点击在文库中定位)'}
                          >
                            <GraduationCap className="mr-0.5 h-2.5 w-2.5" />Zotero
                          </button>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{formatDate(d.updatedAt)}</span>
                        {d.id === currentDoc.id && (
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">● 当前</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {docList.length > 1 && d.id !== currentDoc.id && (
                    <button
                      onClick={(e) => handleDeleteDoc(d.id, e)}
                      title="删除导图"
                      className="p-1 rounded text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  );
};
