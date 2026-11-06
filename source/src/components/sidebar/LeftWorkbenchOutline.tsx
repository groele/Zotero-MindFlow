import { Plus, Trash2 } from 'lucide-react';
import type { MindMapNode } from '../../core/model/types';
import type { LeftWorkbenchGroupProps } from './LeftWorkbenchTypes';

export const LeftWorkbenchOutline = ({ ctx }: LeftWorkbenchGroupProps) => {
  const {
    activeTab, currentDoc, selectedId, editingOutlineId, editingOutlineText,
    setEditingOutlineId, setEditingOutlineText, onSelectNode, onUpdateNodeText,
    onAddChildNode, onDeleteNode,
  } = ctx;

  // Outline sub-tree component
  const renderOutlineTree = (node: MindMapNode, level: number) => {
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedId === node.id;

    return (
      <div key={node.id} className="flex flex-col">
        <div
          onClick={() => onSelectNode(node.id)}
          className={`group flex items-center gap-1.5 py-1 px-2 rounded-lg cursor-pointer transition-colors ${
            isSelected
              ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 font-semibold'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
          style={{ paddingLeft: `${level * 14 + 6}px` }}
        >
          <span className="w-3.5 text-center text-[10px] text-slate-400">
            {hasChildren ? '•' : '–'}
          </span>
          {editingOutlineId === node.id ? (
            <input
              autoFocus
              data-mindflow-node-draft={node.id}
              value={editingOutlineText}
              onChange={(e) => setEditingOutlineText(e.target.value)}
              onBlur={() => {
                if (editingOutlineText.trim()) {
                  onUpdateNodeText(node.id, editingOutlineText.trim());
                }
                setEditingOutlineId(null);
              }}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
                e.stopPropagation();
                if (e.key === 'Enter') {
                  if (editingOutlineText.trim()) {
                    onUpdateNodeText(node.id, editingOutlineText.trim());
                  }
                  setEditingOutlineId(null);
                } else if (e.key === 'Escape') {
                  setEditingOutlineId(null);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-1 py-0.5 text-xs bg-white dark:bg-slate-800 border border-blue-400 rounded outline-none"
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingOutlineId(node.id);
                setEditingOutlineText(node.text);
              }}
              className="flex-1 truncate text-xs leading-relaxed"
              title="双击可编辑文本"
            >
              {node.text || (node.image ? '图片节点' : '未命名主题')}
            </span>
          )}

          <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 flex items-center gap-0.5 ml-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddChildNode(node.id);
              }}
              title="插入子项"
              className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"
            >
              <Plus className="w-3 h-3" />
            </button>
            {level > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNode(node.id);
                }}
                title="删除"
                className="p-0.5 hover:bg-red-50 hover:text-red-600 rounded text-slate-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {hasChildren && node.children.map(child => renderOutlineTree(child, level + 1))}
      </div>
    );
  };

  return (
    <>
      {/* TAB 2: OUTLINE */}
      {activeTab === 'outline' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-2 text-xs">
          {renderOutlineTree(currentDoc.root, 0)}
        </div>
      )}
    </>
  );
};
