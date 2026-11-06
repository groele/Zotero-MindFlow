import {
  Plus, ArrowDown, Edit3, ImagePlus, Link2, Palette, Trash2, X
} from 'lucide-react';
import { NodeCard } from '../node/NodeCard';
import type { CanvasCtx } from './CanvasInteractions';

export const CanvasNodes = ({ ctx }: { ctx: CanvasCtx }) => {
  const {
    curves, onEditRelationshipLabel, onDeleteRelationship, nodes, activeSelectedSet,
    editingId, searchMatchedIds, focusedTag, selectedId, onSelectNode,
    connectingFromId, onCreateRelationship, setConnectingFromId, onContextMenuNode,
    onStartEditNode, onCommitEditNode, onCancelEditNode, onToggleCollapse,
    onCycleTaskStatus, onOpenInternalLink, handleNodeDragStart, setDraggedNodeId,
    handleNodeDragOver, handleNodeDrop, activeMicroNode, onAddChildNode,
    onAddSiblingNode, showQuickColors, setShowQuickColors, onQuickColorNode,
    onDeleteSelectedNode, imageTargetIdRef, nodeImageInputRef,
  } = ctx;
  return (
    <div className="absolute inset-0 pointer-events-auto">
      {/* Relationship Editable Labels */}
      {curves.map(({ link: rel, labelX, labelY }) => {
        return (
          <div
            key={`label-${rel.id}`}
            style={{
              left: `${labelX}px`,
              top: `${labelY}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute group flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-[10px] px-2 py-0.5 rounded-full shadow-md backdrop-blur-xs cursor-pointer hover:scale-105 transition-transform z-30 select-none"
            onClick={(e) => {
              e.stopPropagation();
              const nextLabel = window.prompt('编辑关联线描述文本:', rel.label || '');
              if (nextLabel !== null) {
                onEditRelationshipLabel?.(rel.id, nextLabel.trim());
              }
            }}
          >
            <Link2 className="w-2.5 h-2.5 opacity-70" />
            <span>{rel.label || '关联'}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteRelationship?.(rel.id);
              }}
              title="删除此关联线"
              className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity ml-0.5"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        );
      })}

      {/* Mind Map Nodes */}
      {nodes.map((layoutNode) => (
        <NodeCard
          key={layoutNode.id}
          layoutNode={layoutNode}
          isSelected={activeSelectedSet.has(layoutNode.id)}
          isEditing={editingId === layoutNode.id}
          isSearchMatched={searchMatchedIds.includes(layoutNode.id)}
          isTagMatched={Boolean(focusedTag && layoutNode.node.tags?.includes(focusedTag))}
          isTagDimmed={Boolean(focusedTag && !layoutNode.node.tags?.includes(focusedTag) && selectedId !== layoutNode.id)}
          onSelect={(id, e) => {
            e.stopPropagation();
            if (connectingFromId) {
              if (id !== connectingFromId) {
                onCreateRelationship?.(connectingFromId, id);
              }
              setConnectingFromId(null);
              return;
            }
            onSelectNode(id, e.shiftKey || e.ctrlKey || e.metaKey);
          }}
          onContextMenu={(id, e) => {
            if (onContextMenuNode) {
              onContextMenuNode(id, e.clientX, e.clientY);
            }
          }}
          onStartEdit={(id) => onStartEditNode(id)}
          onCommitEdit={(id, text) => onCommitEditNode(id, text)}
          onCancelEdit={onCancelEditNode}
          onToggleCollapse={onToggleCollapse}
          onCycleTaskStatus={onCycleTaskStatus}
          onOpenInternalLink={onOpenInternalLink}
          onDragStart={handleNodeDragStart}
          onDragEnd={() => setDraggedNodeId(null)}
          onDragOver={handleNodeDragOver}
          onDrop={handleNodeDrop}
        />
      ))}

      {/* Floating Micro-Toolbar above Selected Node */}
      {activeMicroNode && (
        <div
          className="absolute -translate-x-1/2 -translate-y-full mb-2.5 flex items-center gap-0.5 p-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/80 z-40 pointer-events-auto transition-all animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: `${activeMicroNode.x + activeMicroNode.width / 2}px`,
            top: `${activeMicroNode.y - 6}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onAddChildNode?.(activeMicroNode.id)}
            title="添加子节点 (Tab)"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
          </button>
          <button
            type="button"
            onClick={() => onAddSiblingNode?.()}
            title="添加同级节点 (Enter)"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <ArrowDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
          </button>
          <button
            type="button"
            onClick={() => onStartEditNode(activeMicroNode.id)}
            title="编辑文字 (Space / 双击)"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
          </button>
          <button
            type="button"
            onClick={() => {
              imageTargetIdRef.current = activeMicroNode.id;
              nodeImageInputRef.current?.click();
            }}
            title={activeMicroNode.node.image ? '替换当前节点图片' : '插入图片到当前节点'}
            aria-label={activeMicroNode.node.image ? '替换当前节点图片' : '插入图片到当前节点'}
            className="p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/40 text-violet-600 transition-colors"
          >
            <ImagePlus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setConnectingFromId(activeMicroNode.id)}
            title="建立跨分支关联线"
            className="p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-600 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowQuickColors(!showQuickColors)}
              title="节点快捷换色"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
            {showQuickColors && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 p-1.5 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 z-50">
                {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#64748b'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      onQuickColorNode?.(activeMicroNode.id, c);
                      setShowQuickColors(false);
                    }}
                    className="w-4 h-4 rounded-full border border-white dark:border-slate-800 shadow-sm hover:scale-125 transition-transform"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700" />
          <button
            type="button"
            onClick={() => onDeleteSelectedNode?.(activeMicroNode.id)}
            title="删除节点 (Delete)"
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
