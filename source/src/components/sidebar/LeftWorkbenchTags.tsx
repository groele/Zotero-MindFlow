import type { LeftWorkbenchGroupProps } from './LeftWorkbenchTypes';

export const LeftWorkbenchTags = ({ ctx }: LeftWorkbenchGroupProps) => {
  const { activeTab, tagFacets, focusedTag, onFocusTag, activeTag, selectedId, onSelectNode } = ctx;

  return (
    <>
      {activeTab === 'tags' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 text-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span>{tagFacets.length} 个标签 · 点击后聚焦画布</span>
            {focusedTag && <button type="button" onClick={() => onFocusTag(null)} className="text-teal-600 font-medium">清除聚焦</button>}
          </div>
          {tagFacets.length === 0 && <p className="py-8 text-center text-slate-500">为主题添加标签后，可在这里筛选与定位。</p>}
          <div className="flex flex-wrap gap-1.5">
            {tagFacets.map(facet => (
              <button key={facet.tag} type="button" onClick={() => onFocusTag(focusedTag === facet.tag ? null : facet.tag)}
                aria-pressed={focusedTag === facet.tag}
                className={`px-2.5 py-1 rounded-lg border ${focusedTag === facet.tag ? 'border-teal-500 bg-teal-600 text-white' : 'border-slate-200 dark:border-slate-700 hover:border-teal-400'}`}>
                {facet.tag} <span className="opacity-70">{facet.nodes.length}</span>
              </button>
            ))}
          </div>
          {activeTag && <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
            <p className="font-semibold text-slate-600 dark:text-slate-300">匹配主题</p>
            {activeTag.nodes.map(node => <button key={node.id} type="button" onClick={() => onSelectNode(node.id)}
              className={`block w-full text-left truncate px-2 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-slate-800 ${selectedId === node.id ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700' : ''}`}
              title={node.text}>{node.text}</button>)}
          </div>}
        </div>
      )}
    </>
  );
};
