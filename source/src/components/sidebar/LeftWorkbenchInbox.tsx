import { Plus, Inbox, ArrowRight, Trash2 } from 'lucide-react';
import { InboxService } from '../../services/storage/inboxService';
import type { LeftWorkbenchGroupProps } from './LeftWorkbenchTypes';

export const LeftWorkbenchInbox = ({ ctx }: LeftWorkbenchGroupProps) => {
  const {
    activeTab, inboxInput, setInboxInput, handleAddInboxItem, inboxItems,
    handleClearProcessedInbox, runOperation, onInsertInboxItem, setInboxItems,
    handleDeleteInboxItem,
  } = ctx;

  return (
    <>
      {/* TAB 3: INBOX */}
      {activeTab === 'inbox' && (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="捕捉闪念/文献灵感..."
                value={inboxInput}
                onChange={(e) => setInboxInput(e.target.value)}
                onKeyDown={(e) => { if (!e.nativeEvent.isComposing && e.nativeEvent.keyCode !== 229 && e.key === 'Enter') void handleAddInboxItem(); }}
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:border-blue-400"
              />
              <button
                onClick={handleAddInboxItem}
                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>网页划词直接存入此处</span>
              {inboxItems.some(i => i.isProcessed) && (
                <button onClick={handleClearProcessedInbox} className="text-blue-500 hover:underline">
                  清空已入图
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
            {inboxItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-1">
                <Inbox className="w-6 h-6 mx-auto opacity-30 text-amber-500" />
                <p className="text-xs">收集箱空空如也</p>
              </div>
            ) : (
              inboxItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-xl border transition-all space-y-1.5 group ${
                    item.isProcessed
                      ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/50 opacity-60'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {item.text}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
                    <button
                      onClick={() => void runOperation(async () => {
                        if (!(await onInsertInboxItem(item))) return;
                        await InboxService.markProcessed(item.id, true);
                        setInboxItems(await InboxService.getItems());
                      })}
                      className="flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
                    >
                      <ArrowRight className="w-3 h-3" />
                      <span>{item.isProcessed ? '再次加入' : '加入导图'}</span>
                    </button>
                    <button
                      onClick={(e) => handleDeleteInboxItem(item.id, e)}
                      className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};
