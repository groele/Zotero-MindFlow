import {
  Download, Upload, ChevronDown, Image, Shapes, FileText, Braces,
  ListTree as ListTreeIcon, Globe, Code2, GraduationCap, MoreHorizontal,
} from 'lucide-react';
import type { ToolbarGroupProps } from './ToolbarConfig';

export const ToolbarExportGroup = ({ ctx }: ToolbarGroupProps) => {
  const {
    buttons, toolbarExportPlacement, isExportMenuOpen, setIsExportMenuOpen,
    setIsThemeMenuOpen, setIsLayoutMenuOpen, onExportPNG, onExportSVG,
    onExportMarkdown, onExportJSON, onExportOPML, onExportHTML, onExportMermaid,
    onExportPDF, isZoteroMode, onSaveToZoteroNote, fileInputRef, popup, setPopup,
    toolbarTemplatesPlacement, onOpenTemplates, onStartPresentation,
    toolbarPresentationPlacement, onOpenShortcuts, onOpenSettings,
  } = ctx;

  return (
    <>
      {/* Export / Import dropdown */}
      {buttons.export && toolbarExportPlacement !== 'hidden' && (
        <div className="relative">
          {toolbarExportPlacement === 'toolbar' && <>
          <button data-mindflow-popup-trigger="export" aria-haspopup="menu" aria-expanded={isExportMenuOpen}
            onClick={() => {
              setIsExportMenuOpen(!isExportMenuOpen);
              setIsThemeMenuOpen(false);
              setIsLayoutMenuOpen(false);
            }}
            title="导入与导出"
            className="flex items-center gap-1 p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          </>}
          {isExportMenuOpen && (
            <div data-mindflow-popup="export" className="absolute right-0 mt-1 w-64 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 py-1.5 z-50">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                导出格式
              </div>
              <button
                onClick={() => { onExportPNG(); setIsExportMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                <Image className="mr-2 w-4 h-4" />PNG 图片 · 分享与插图
              </button>
              <button
                onClick={() => { onExportSVG(); setIsExportMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                <Shapes className="mr-2 w-4 h-4" />SVG 矢量图 · 排版与打印
              </button>
              <button
                onClick={() => { onExportMarkdown(); setIsExportMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                <FileText className="mr-2 w-4 h-4" />Markdown 大纲 (.md)
              </button>
              <button
                onClick={() => { onExportJSON(); setIsExportMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                <Braces className="mr-2 w-4 h-4" />JSON 工程备份 · 可再次编辑
              </button>
              <button
                onClick={() => { onExportOPML?.(); setIsExportMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                <ListTreeIcon className="mr-2 w-4 h-4" />OPML 2.0 大纲 (.opml)
              </button>
              <button
                onClick={() => { onExportHTML?.(); setIsExportMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center"
              >
                <Globe className="mr-2 w-4 h-4" />独立离线交互网页 (.html)
              </button>
              <button
                onClick={() => { onExportMermaid?.(); setIsExportMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center"
              >
                <Code2 className="mr-2 w-4 h-4" />Mermaid 语法 (.mmd) · 知识库通用
              </button>
              {!isZoteroMode && onExportPDF && <>
              <button
                onClick={() => { onExportPDF?.(); setIsExportMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                <FileText className="mr-2 w-4 h-4" />矢量 PDF 打印排版 (PDF)
              </button>
              </>}
              {onSaveToZoteroNote && (
                <button
                  onClick={() => { onSaveToZoteroNote(); setIsExportMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-sky-600 dark:text-sky-400 font-medium"
                >
                  <GraduationCap className="mr-2 w-4 h-4" />存为 Zotero 导图笔记
                </button>
              )}

              <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />

              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                导入
              </div>
              <button
                onClick={() => { fileInputRef.current?.click(); setIsExportMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>导入 Markdown / JSON / OPML</span>
              </button>
            </div>
          )}
        </div>
      )}

      <div className="relative">
        <button data-mindflow-popup-trigger="more" aria-haspopup="menu" aria-expanded={popup === 'more'}
          title="更多操作" aria-label="更多操作" onClick={() => setPopup(popup === 'more' ? null : 'more')}
          className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"><MoreHorizontal className="w-4 h-4" /></button>
        {popup === 'more' && <div data-mindflow-popup="more" className="absolute right-0 mt-1 w-52 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1 z-50">
          {buttons.templates && onOpenTemplates && toolbarTemplatesPlacement === 'more' && <button onClick={() => { setPopup(null); onOpenTemplates(); }} className="mindflow-menu-action">模板库</button>}
          {onStartPresentation && toolbarPresentationPlacement === 'more' && <button onClick={() => { setPopup(null); onStartPresentation(); }} className="mindflow-menu-action">演示导图</button>}
          {buttons.export && toolbarExportPlacement === 'more' && <>
            <button className="mindflow-menu-action" onClick={() => setPopup('export')}>导出文件…</button>
            <button className="mindflow-menu-action" onClick={() => { setPopup(null); fileInputRef.current?.click(); }}>导入导图…</button>
          </>}
          <button className="mindflow-menu-action" onClick={() => { setPopup(null); onOpenShortcuts(); }}>快捷键帮助</button>
          {onOpenSettings && <button className="mindflow-menu-action" onClick={() => { setPopup(null); onOpenSettings(); }}>工具栏与偏好设置…</button>}
        </div>}
      </div>
    </>
  );
};
