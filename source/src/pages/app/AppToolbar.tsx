import { Toolbar } from '../../components/toolbar/Toolbar';
import { LayoutType } from '../../core/model/types';
import { locateItemInZotero, openItemPdfInZotero } from '../../services/zotero/zoteroBridge';
import { Minimize2 } from 'lucide-react';
import type { AppContext } from './appContext';

export const AppToolbar = ({ ctx }: { ctx: AppContext }) => {
  const { isSidepanelMode, doc, setDoc, selectedId, isZoteroMode,
         isAiAnalyzing, isArchivingAiDraft, viewport, setViewport, isWorkbenchOpen,
         workbenchTab, setIsShortcutsOpen, setIsCommandPaletteOpen, setIsTemplateModalOpen, isZenMode,
         setIsZenMode, setIsSearchOpen, setIsPresentationOpen, settings, saveStatus,
         canUndo, canRedo, centerCanvas, showWorkbenchTab, toggleZen,
         layout, handleAddChild, handleAddSibling, handleDeleteNode, handleImportNodeImage,
         handleUndo, handleRedo, handleCollapseByLevel, handleOpenSettings, handleCreateFromZoteroItems,
         handleAnalyzeZoteroPaper, handleArchiveAiDraft, handleAppendZoteroItems, handleSaveToZoteroNote, handleSaveToZoteroAttachment,
         handleExportCurrentDocument, handleImportFile } = ctx;
  const boundTargetKey = !doc.metadata?.mindflowUnlinkedContainer ? doc.metadata?.zoteroItemKey : undefined;
  const boundTargetTitle = boundTargetKey ? doc.metadata?.zoteroItemTitle : undefined;
  return (
    <>
      {/* Top Toolbar (Hidden in Zen mode) */}
      {!isZenMode && (
        <Toolbar
          title={doc.title}
          saveStatus={saveStatus}
          onTitleChange={(t) => setDoc((prev: any) => prev ? { ...prev, title: t } : null)}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onAddChild={handleAddChild}
          onImportNodeImage={(file) => { void handleImportNodeImage(file, undefined, true).catch((error: any) => alert(`图片导入失败：${error?.message || '未知错误'}`)); }}
          onAddSibling={() => handleAddSibling(false)}
          onDeleteNode={handleDeleteNode}
          hasSelection={!!selectedId && selectedId !== doc.root.id}
          currentLayout={doc.layoutType}
          onLayoutChange={(l: LayoutType) => setDoc((prev: any) => prev ? { ...prev, layoutType: l } : null)}
          currentThemeId={doc.themeId}
          onThemeChange={(th: string) => setDoc((prev: any) => prev ? { ...prev, themeId: th } : null)}
          scale={viewport.scale}
          onZoomIn={() => setViewport((v: any) => ({ ...v, scale: Math.min(v.scale * (1 + settings.zoomStep), 3.0) }))}
          onZoomOut={() => setViewport((v: any) => ({ ...v, scale: Math.max(v.scale / (1 + settings.zoomStep), 0.05) }))}
          onResetZoom={() => centerCanvas(layout.bounds)}
          isOutlineOpen={isWorkbenchOpen && workbenchTab === 'outline'}
          onToggleOutline={() => { void showWorkbenchTab('outline', true); }}
          isInboxOpen={isWorkbenchOpen && workbenchTab === 'inbox'}
          onToggleInbox={() => { void showWorkbenchTab('inbox', true); }}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenSearch={() => setIsSearchOpen((prev: any) => !prev)}
          onStartPresentation={() => setIsPresentationOpen(true)}
          onFitScreen={() => centerCanvas(layout.bounds)}
          onOpenTemplates={() => setIsTemplateModalOpen(true)}
          onToggleZen={() => { void toggleZen(); }}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          onOpenSettings={handleOpenSettings}
          isPro={true}
          toolbarButtons={settings.toolbarButtons}
          toolbarTemplatesPlacement={settings.toolbarTemplatesPlacement}
          toolbarPresentationPlacement={settings.toolbarPresentationPlacement}
          toolbarExportPlacement={settings.toolbarExportPlacement}
          onExportPNG={() => { void handleExportCurrentDocument('png'); }}
          onExportSVG={() => { void handleExportCurrentDocument('svg'); }}
          onExportMarkdown={() => { void handleExportCurrentDocument('markdown'); }}
          onExportJSON={() => { void handleExportCurrentDocument('json'); }}
          onExportOPML={() => { void handleExportCurrentDocument('opml'); }}
          onExportHTML={() => { void handleExportCurrentDocument('html'); }}
          onExportMermaid={() => { void handleExportCurrentDocument('mermaid'); }}
          onExportPDF={isZoteroMode ? undefined : () => { void handleExportCurrentDocument('pdf'); }}
          onCollapseByLevel={handleCollapseByLevel}
          onImportFile={handleImportFile}
          isSidepanelMode={isSidepanelMode}
          isZoteroMode={isZoteroMode}
          onCreateFromZoteroItems={handleCreateFromZoteroItems}
          onAppendZoteroItems={handleAppendZoteroItems}
          onSaveToZoteroNote={handleSaveToZoteroNote}
          onSaveToZoteroAttachment={handleSaveToZoteroAttachment}
          onAnalyzeZoteroPaper={() => { void handleAnalyzeZoteroPaper(); }}
          isAiAnalyzing={isAiAnalyzing}
          boundItemKey={boundTargetKey}
          boundItemTitle={boundTargetTitle}
          onLocateBoundItem={boundTargetKey ? () => { void locateItemInZotero(boundTargetKey, boundTargetTitle); } : undefined}
          onOpenBoundPdf={boundTargetKey ? () => { void openItemPdfInZotero(boundTargetKey, boundTargetTitle); } : undefined}
        />
      )}

      {isZoteroMode && doc.metadata?.aiDraft && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-950 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100">
          <span><strong>AI 研究导图草稿</strong> · 已保存到本机。请在画布修改节点、核对原文后归档到关联文献。</span>
          <button type="button" onClick={() => { void handleArchiveAiDraft(); }} disabled={isArchivingAiDraft}
            className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {isArchivingAiDraft ? '正在归档…' : '归档到 Zotero'}
          </button>
        </div>
      )}

      {/* Floating Exit Button for Zen Mode */}
      {isZenMode && (
        <button
          onClick={() => setIsZenMode(false)}
          title="退出禅模式 (Esc)"
          className="absolute top-4 right-4 z-40 px-3 py-1.5 bg-white/90 dark:bg-slate-800/90 shadow-lg rounded-xl text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-700 flex items-center gap-1.5 border border-purple-200 dark:border-purple-800 transition-all backdrop-blur-md"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          <span>退出专注模式 (Esc)</span>
        </button>
      )}
    </>
  );
};
