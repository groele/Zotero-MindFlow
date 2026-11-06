import { X, Tag, FileText, Plus } from 'lucide-react';
import type { PropertySidebarCtx } from './PropertySidebarUtils';

export const PropertySidebarFooterFields = ({ ctx }: { ctx: PropertySidebarCtx }) => {
  const {
    selectedNode, noteText, setNoteText, newTagText, setNewTagText,
    handleRemoveTag, handleAddTag, handleNoteBlur, noteRows,
  } = ctx;
  return (
    <>
      {/* Tags */}
      <div>
        <label className="flex items-center gap-1.5 font-medium text-slate-500 mb-1.5">
          <Tag className="w-3.5 h-3.5" /> 标签
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedNode.tags?.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px]"
            >
              {t}
              <button
                onClick={() => handleRemoveTag(t)}
                className="hover:text-blue-900"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <input
            type="text"
            value={newTagText}
            placeholder="新增标签名"
            onChange={(e) => setNewTagText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            className="flex-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-blue-400 text-xs"
          />
          <button
            onClick={handleAddTag}
            className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="flex items-center justify-between gap-1.5 font-medium text-slate-500 mb-1.5">
          <FileText className="w-3.5 h-3.5" /> 备注注释
          <span className="ml-auto text-[10px] font-normal text-slate-400">{noteText.length} 字</span>
        </label>
        <textarea
          rows={noteRows}
          value={noteText}
          placeholder="为该主题添加长文本备注、文献摘要或深度批注..."
          onChange={(e) => setNoteText(e.target.value)}
          onBlur={handleNoteBlur}
          className="w-full min-h-24 max-h-[55vh] overflow-y-auto px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-blue-400 text-xs resize-y"
        />
      </div>
    </>
  );
};
