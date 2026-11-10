import { BookOpen } from 'lucide-react';
import type { AIResearchModalContext } from './useAIResearchModal';

export const AIResearchPreviewCard = ({ ctx }: { ctx: AIResearchModalContext }) => {
  const { preview, scope } = ctx;
  if (!preview) return null;
  return (
    <div className="rounded-xl border border-blue-200/80 bg-blue-50/30 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
      <div className="flex items-start gap-2.5 font-bold text-slate-900 dark:text-white">
        <BookOpen size={18} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
        <span className="break-words leading-snug">{preview.title}</span>
      </div>
      <div className="mt-3 grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <span className="font-medium text-slate-500 dark:text-slate-400">摘要：</span>
          <span>{scope?.hasAbstract ? scope.abstractSource === 'pdf' ? '已从 PDF 提取' : scope.abstractSource === 'pdf-selected' ? '已选取 PDF 摘要' : scope.abstractSource === 'manual' ? '已补充，来源待核对' : '本次可用' : scope?.paperHasAbstract ? '未纳入当前范围' : '该条目摘要为空'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <span className="font-medium text-slate-500 dark:text-slate-400">PDF：</span>
          <span className="truncate">{scope?.pdfState}</span>
        </div>
        {scope?.pdfAttachmentTitle && (
          <div className="min-w-0 break-words sm:col-span-2 text-slate-600 dark:text-slate-400 text-[11px]">
            <span className="font-medium text-slate-500 dark:text-slate-400">关联附件：</span>{scope.pdfAttachmentTitle}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <span className="font-medium text-slate-500 dark:text-slate-400">Zotero 笔记：</span>
          <span>{scope?.noteCount || 0} 条{scope?.omittedNotes ? `，另有 ${scope.omittedNotes} 条未纳入` : ''}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <span className="font-medium text-slate-500 dark:text-slate-400">批注划线：</span>
          <span>{scope?.annotationCount || 0} 条{scope?.omittedAnnotations ? `，另有 ${scope.omittedAnnotations} 条未纳入` : ''}</span>
        </div>
        <div className="sm:col-span-2 text-slate-500 dark:text-slate-400 text-[11px] pt-1.5 border-t border-blue-100/70 dark:border-blue-900/50 flex flex-wrap items-center justify-between gap-1">
          <span>归档位置：{preview.archiveState}</span>
          <span>本次预计：约 {preview.estimatedCharacters.toLocaleString()} 字符（PDF 纳入 {scope?.pdfCharacters || 0} 字）</span>
        </div>
      </div>
      {Boolean(scope?.sectionStatus?.missing.length) && <p role="status" className="mt-3 text-xs text-amber-700 dark:text-amber-300">
        未可靠识别：{scope?.sectionStatus?.missing.map(section => ({ abstract: '摘要', introduction: '引言', conclusion: '结论' } as Record<string, string>)[section] || section).join('、')}。这些部分未发送；可改选其他范围。
      </p>}
      {scope && Boolean(scope.abstractTruncated || scope.trimmedNotes || scope.trimmedHighlights || scope.trimmedComments) &&
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
          长内容已截取：{[
            scope.abstractTruncated ? '摘要' : '',
            scope.trimmedNotes ? `${scope.trimmedNotes} 条笔记` : '',
            scope.trimmedHighlights ? `${scope.trimmedHighlights} 条划线` : '',
            scope.trimmedComments ? `${scope.trimmedComments} 条评论` : '',
          ].filter(Boolean).join('、')}。请对照原始资料核验。
        </p>}
      {scope && Boolean(scope.noteReadErrors || scope.annotationReadErrors) &&
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
          读取异常：笔记 {scope.noteReadErrors || 0} 处，批注 {scope.annotationReadErrors || 0} 处；受影响的内容未进入本次预览。
        </p>}
      {scope?.pdfTruncated && Boolean(scope.pdfCharacters) && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
        PDF 超出读取范围或已跨区间采样；导图会标注资料不完整。
      </p>}
    </div>
  );
};
