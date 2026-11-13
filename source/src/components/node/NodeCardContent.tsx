import React, { useEffect, useRef } from 'react';
import { CheckCircle2, Clock3, Circle, Tag, FileText, Link2, Loader2, GraduationCap, ExternalLink } from 'lucide-react';
import { openZoteroUri, uiText } from '../../services/zotero/zoteroBridge';
import type { NodeCardCtx } from './NodeCardUtils';

export const NodeCardContent: React.FC<{ ctx: NodeCardCtx }> = ({ ctx }) => {
  const {
    node, layoutNode, nodeImage, wrapped, isRoot, isEditing, editText,
    setEditText, handleKeyDown, handleBlur, isComposingRef, inputRef,
    renderIconBadge, onCycleTaskStatus, showNotePopover, setShowNotePopover,
    onOpenInternalLink, externalUrl, isDoi, isLocating, setIsLocating,
    handleExternalClick,
  } = ctx;
  const locateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (locateTimerRef.current) {
      clearTimeout(locateTimerRef.current);
      locateTimerRef.current = null;
    }
  }, []);

  return (
    <div className={`flex items-center gap-1.5 min-w-0 overflow-hidden ${nodeImage ? 'w-full justify-center' : 'flex-1'}`}>
      {node.task && !isEditing && (() => {
        const statusText = node.task.status === 'done'
          ? uiText('已完成', 'Done')
          : node.task.status === 'doing'
            ? uiText('进行中', 'In Progress')
            : uiText('待办', 'To Do');
        return (
        <button
          type="button"
          draggable={false}
          aria-label={uiText(`任务状态：${statusText}；点击切换状态`, `Task status: ${statusText}; click to cycle`)}
          aria-pressed={node.task.status === 'done'}
          title={uiText(`任务状态：${statusText}；点击切换`, `Task status: ${statusText}; click to cycle`)}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onCycleTaskStatus?.(node.id);
          }}
          onDragStart={(event) => { event.preventDefault(); event.stopPropagation(); }}
          className={`flex-shrink-0 rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            node.task.status === 'done' ? 'text-emerald-600 hover:text-emerald-700' :
              node.task.status === 'doing' ? 'text-blue-600 hover:text-blue-700' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {node.task.status === 'done' ? <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> :
            node.task.status === 'doing' ? <Clock3 className="w-4 h-4" aria-hidden="true" /> :
              <Circle className="w-4 h-4" aria-hidden="true" />}
        </button>
        );
      })()}
      {/* Node icons */}
      {node.icons && node.icons.length > 0 && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {node.icons.map(renderIconBadge)}
        </div>
      )}

      {/* Text or Input */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          data-mindflow-node-draft={node.id}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={() => { isComposingRef.current = false; }}
          className="w-full bg-white/90 text-slate-900 px-1 py-0.5 rounded outline-none border border-blue-400 font-normal text-sm"
          onClick={(e) => e.stopPropagation()}
        />
      ) : node.text ? (
        <span
          title={node.text}
          style={wrapped ? { fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif' } : undefined}
          className={`${wrapped ? 'whitespace-pre leading-[20px] text-[14px]' : 'truncate tracking-wide leading-tight'} flex-1 ${isRoot ? 'font-semibold text-sm' : ''} ${node.task?.status === 'done' ? 'line-through opacity-70' : ''}`}
        >
          {layoutNode.textLines?.join('\n') || node.text}
        </span>
      ) : null}

      {/* Tags (do not render tags inside root node to prevent cluttering literature title) */}
      {!isRoot && node.tags && node.tags.length > 0 && (
        <div className="flex items-center gap-1 flex-shrink-0 max-w-[45%] overflow-hidden">
          {node.tags.slice(0, 2).map((t) => (
            <span key={t} title={t} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700 max-w-[100px] truncate">
              <Tag className="w-2.5 h-2.5 opacity-60 flex-shrink-0" />
              <span className="truncate">{t}</span>
            </span>
          ))}
        </div>
      )}

      {/* Note indicator with interactive preview */}
      {node.note && (
        <div
          className="relative flex-shrink-0"
          onMouseEnter={() => setShowNotePopover(true)}
          onMouseLeave={() => setShowNotePopover(false)}
        >
          <button
            type="button"
            aria-label={`查看完整备注或摘要（${node.note.length} 字）`}
            aria-expanded={showNotePopover}
            title={`查看完整备注或摘要（${node.note.length} 字）`}
            onClick={(e) => {
              e.stopPropagation();
              setShowNotePopover(!showNotePopover);
            }}
            className="p-1 -m-1 text-slate-400 hover:text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded transition-colors cursor-pointer flex items-center"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
          {showNotePopover && (
            <div
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="完整摘要或备注"
              style={{ width: 'min(70vw, 32rem)', maxHeight: 'min(60vh, 32rem)' }}
              className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 p-3 rounded-xl bg-slate-900/95 text-slate-100 text-xs shadow-2xl backdrop-blur-md border border-slate-700/80 z-50 pointer-events-auto leading-relaxed overflow-y-auto overscroll-contain whitespace-pre-wrap break-words animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="sticky top-0 -mt-0.5 pb-1.5 mb-1.5 bg-slate-900/95 text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between gap-2">
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> 完整摘要 / 备注</span>
                <span className="font-normal normal-case text-slate-400">{node.note.length} 字</span>
              </div>
              <div className="font-normal text-[11px] text-slate-200">
                {node.note}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hyperlink button */}
      {node.internalLink && (
        <button
          type="button"
          title="打开关联导图主题"
          aria-label="打开关联导图主题"
          onClick={(event) => {
            event.stopPropagation();
            onOpenInternalLink?.(node.internalLink!.documentId, node.internalLink!.nodeId);
          }}
          className="flex-shrink-0 text-violet-600 hover:text-violet-800 p-0.5 rounded hover:bg-violet-50 transition-colors"
        >
          <Link2 className="w-3.5 h-3.5" />
        </button>
      )}
      {externalUrl && (
        externalUrl.startsWith('zotero://') ? (
          <button
            type="button"
            title={externalUrl.startsWith('zotero://open-pdf/') ? '在 Zotero PDF 阅读器中查看原批注' : '在 Zotero 中定位关联条目'}
            aria-label={externalUrl.startsWith('zotero://open-pdf/') ? '查看原 PDF 批注' : '在 Zotero 中定位关联条目'}
            onClick={async (e) => {
              e.stopPropagation();
              if (isLocating) return;
              setIsLocating(true);
              try {
                await openZoteroUri(externalUrl, node.text, { noteText: node.note });
              } finally {
                if (locateTimerRef.current) clearTimeout(locateTimerRef.current);
                locateTimerRef.current = setTimeout(() => {
                  locateTimerRef.current = null;
                  setIsLocating(false);
                }, 800);
              }
            }}
            className="flex-shrink-0 text-sky-600 hover:text-sky-800 p-0.5 rounded hover:bg-sky-100 dark:hover:bg-sky-950 transition-colors flex items-center"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <GraduationCap className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={isDoi ? `在 Zotero 数据库中定位对应条目（未找到或按住 Ctrl 点击打开网页）\n${externalUrl}` : externalUrl}
            aria-label={isDoi ? '在 Zotero 数据库中定位对应条目' : '打开外部链接'}
            onClick={handleExternalClick}
            className={`flex-shrink-0 p-0.5 rounded transition-colors ${
              isLocating
                ? 'cursor-wait text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50'
                : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40'
            }`}
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5" />
            )}
          </a>
        )
      )}
    </div>
  );
};
