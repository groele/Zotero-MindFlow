import { GraduationCap, ChevronDown, FileText, Sparkles, Download, Paperclip } from 'lucide-react';
import type { ToolbarGroupProps } from './ToolbarConfig';

export const ToolbarZoteroGroup = ({ ctx }: ToolbarGroupProps) => {
  const {
    isZoteroMenuOpen, setIsZoteroMenuOpen, setIsExportMenuOpen, setIsLevelMenuOpen,
    setIsThemeMenuOpen, setIsLayoutMenuOpen, isZoteroMode, boundItemKey, boundItemTitle,
    onLocateBoundItem, onOpenBoundPdf, onAnalyzeZoteroPaper, isAiAnalyzing,
    onCreateFromZoteroItems, onAppendZoteroItems, onSaveToZoteroAttachment, onSaveToZoteroNote,
    setPopup,
  } = ctx;

  return (
    <>
      {/* Standalone AI Paper Analysis Button on Toolbar */}
      {onAnalyzeZoteroPaper && (
        <button
          type="button"
          disabled={isAiAnalyzing}
          onClick={() => {
            setPopup?.(null);
            setIsZoteroMenuOpen(false);
            setIsExportMenuOpen(false);
            setIsLevelMenuOpen(false);
            setIsThemeMenuOpen(false);
            setIsLayoutMenuOpen(false);
            onAnalyzeZoteroPaper();
          }}
          title="AI 解析论文并生成导图：研究问题、体系、证据、意义与局限"
          aria-label="AI 解析论文并生成导图"
          className={`flex shrink-0 items-center gap-1.5 px-2 py-1 sm:px-2.5 rounded-lg text-xs font-medium transition-colors ${
            isAiAnalyzing
              ? 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 opacity-80 cursor-wait'
              : 'text-violet-700 dark:text-violet-300 bg-violet-50/80 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/60 border border-violet-200/70 dark:border-violet-800/60 shadow-xs'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0 ${isAiAnalyzing ? 'animate-spin' : ''}`} />
          <span className="hidden 2xl:inline whitespace-nowrap">
            {isAiAnalyzing ? '正在解析论文…' : 'AI 解析论文并生成导图'}
          </span>
          <span className="hidden sm:inline 2xl:hidden whitespace-nowrap">
            {isAiAnalyzing ? '正在解析…' : 'AI 解析导图'}
          </span>
        </button>
      )}

      {/* Zotero Academic Hub */}
      <div className="relative">
        <button data-mindflow-popup-trigger="zotero" aria-haspopup="menu" aria-expanded={isZoteroMenuOpen}
          onClick={() => {
            setIsZoteroMenuOpen(!isZoteroMenuOpen);
            setIsExportMenuOpen(false);
            setIsLevelMenuOpen(false);
            setIsThemeMenuOpen(false);
            setIsLayoutMenuOpen(false);
          }}
          title="Zotero 学术文献联动"
          className={`flex items-center gap-1 p-1.5 rounded-lg transition-colors ${
            isZoteroMenuOpen
              ? 'bg-sky-100 dark:bg-sky-950/50 text-sky-600'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span className="hidden xl:inline text-xs font-medium text-sky-600 dark:text-sky-400">Zotero</span>
          <ChevronDown className="w-3 h-3 opacity-60 text-sky-600 dark:text-sky-400" />
        </button>

        {isZoteroMenuOpen && (
          <div data-mindflow-popup="zotero" className="absolute right-0 mt-1 w-64 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 py-1.5 z-50">
            <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Zotero 伴读联动</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-normal ${
                isZoteroMode
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
              }`}>
                {isZoteroMode ? '已连接 Zotero' : '独立演示模式'}
              </span>
            </div>

            {boundItemKey && (
              <div className="px-3 py-2 bg-sky-50/70 dark:bg-sky-950/30 border-b border-sky-100 dark:border-sky-900/40">
                <div className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">当前导图关联文献</div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5" title={boundItemTitle || boundItemKey}>
                  {boundItemTitle || '已绑定文献条目'}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {onLocateBoundItem && (
                    <button
                      type="button"
                      onClick={() => { onLocateBoundItem(); setIsZoteroMenuOpen(false); }}
                      className="flex-1 py-1 px-2 text-[11px] bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <GraduationCap className="w-3 h-3 text-sky-500" />
                      <span>文库定位</span>
                    </button>
                  )}
                  {onOpenBoundPdf && (
                    <button
                      type="button"
                      onClick={() => { onOpenBoundPdf(); setIsZoteroMenuOpen(false); }}
                      className="flex-1 py-1 px-2 text-[11px] bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <FileText className="w-3 h-3 text-sky-500" />
                      <span>打开 PDF</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {isZoteroMode && onAnalyzeZoteroPaper && (
              <button
                type="button"
                disabled={isAiAnalyzing}
                onClick={() => { onAnalyzeZoteroPaper(); setIsZoteroMenuOpen(false); }}
                title="将选中文献的摘要、笔记、批注及可读取的 PDF 文字通过 llm-for-zotero 发送至其已配置的大模型"
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-violet-600 shrink-0" />
                <span><span className="block font-semibold">{isAiAnalyzing ? '正在解析论文…' : 'AI 解析论文并生成导图'}</span>
                  <span className="block text-[10px] text-slate-400">研究问题、体系、证据、意义与局限</span></span>
              </button>
            )}

            {onCreateFromZoteroItems && (
              <button
                onClick={() => {
                  onCreateFromZoteroItems();
                  setIsZoteroMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">从选中文献新建导图</div>
                  <div className="text-[10px] text-slate-400">独立导图文件，专属归档至该文献附件</div>
                </div>
              </button>
            )}

            {onAppendZoteroItems && (
              <button
                onClick={() => {
                  onAppendZoteroItems();
                  setIsZoteroMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">追加文献至当前分支</div>
                  <div className="text-[10px] text-slate-400">作为参考引用节点追加进当前导图</div>
                </div>
              </button>
            )}

            {onSaveToZoteroAttachment && (
              <button
                onClick={() => {
                  onSaveToZoteroAttachment();
                  setIsZoteroMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2"
              >
                <Paperclip className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">存为文献条目附件 (.mindflow)</div>
                  <div className="text-[10px] text-slate-400">作为源文件附件挂载，本地存储 + 云同步</div>
                </div>
              </button>
            )}

            {onSaveToZoteroNote && (
              <button
                onClick={() => {
                  onSaveToZoteroNote();
                  setIsZoteroMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2"
              >
                <FileText className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">存为 Zotero 大纲笔记</div>
                  <div className="text-[10px] text-slate-400">生成富文本大纲存入文献库</div>
                </div>
              </button>
            )}

            <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />

            <div className="px-3 py-1 text-[10px] text-slate-400 leading-relaxed">
              {isZoteroMode
                ? '在 Zotero 文献库中选中条目后，点击上方即可一键导入'
                : '提示：安装 MindFlow Zotero 插件（.xpi）后可直接与本地文献库实时双向联动'}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
