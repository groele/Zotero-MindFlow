import React, { useState, useRef, useEffect } from 'react';
import { useToolbarPopup } from './useToolbarPopup';
import type { ToolbarContext, ToolbarProps } from './ToolbarConfig';
import { ToolbarBrandTitle } from './ToolbarBrandTitle';
import { ToolbarCoreActions } from './ToolbarCoreActions';
import { ToolbarViewControls } from './ToolbarViewControls';
import { ToolbarExportGroup } from './ToolbarExportGroup';
import { ToolbarZoteroGroup } from './ToolbarZoteroGroup';
import { ToolbarFileGroup } from './ToolbarFileGroup';

export const Toolbar: React.FC<ToolbarProps> = ({
  toolbarTemplatesPlacement = 'more', toolbarPresentationPlacement = 'more', toolbarExportPlacement = 'more',
  title,
  saveStatus,
  onTitleChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddChild,
  onImportNodeImage,
  onAddSibling,
  onDeleteNode,
  hasSelection,
  currentLayout,
  onLayoutChange,
  currentThemeId,
  onThemeChange,
  scale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitScreen,
  isOutlineOpen,
  onToggleOutline,
  isInboxOpen,
  onToggleInbox,
  onOpenCommandPalette,
  onOpenSearch,
  onStartPresentation,
  onOpenTemplates,
  onToggleZen,
  onOpenShortcuts,
  onOpenSettings,
  isPro: _isPro = false,
  toolbarButtons,
  onExportPNG,
  onExportSVG,
  onExportMarkdown,
  onExportJSON,
  onExportOPML,
  onExportHTML,
  onExportMermaid,
  onExportPDF,
  onCollapseByLevel,
  onImportFile,
  isSidepanelMode,
  isZoteroMode = false,
  onCreateFromZoteroItems,
  onAppendZoteroItems,
  onSaveToZoteroNote,
  onSaveToZoteroAttachment,
  onAnalyzeZoteroPaper,
  isAiAnalyzing = false,
  boundItemKey,
  boundItemTitle,
  onLocateBoundItem,
  onOpenBoundPdf,
}) => {
  const buttons = toolbarButtons || {
    history: true,
    insert: true,
    layout: true,
    theme: true,
    outline: true,
    inbox: true,
    templates: true,
    zen: true,
    export: true,
    zoom: true,
  };

  const [popup, setPopup] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  useToolbarPopup(headerRef, popup, () => setPopup(null));
  const isThemeMenuOpen = popup === 'theme';
  const setIsThemeMenuOpen = (open: boolean) => setPopup(current => open ? 'theme' : current === 'theme' ? null : current);
  const isLayoutMenuOpen = popup === 'layout';
  const setIsLayoutMenuOpen = (open: boolean) => setPopup(current => open ? 'layout' : current === 'layout' ? null : current);
  const isExportMenuOpen = popup === 'export';
  const setIsExportMenuOpen = (open: boolean) => setPopup(current => open ? 'export' : current === 'export' ? null : current);
  const isLevelMenuOpen = popup === 'level';
  const setIsLevelMenuOpen = (open: boolean) => setPopup(current => open ? 'level' : current === 'level' ? null : current);
  const isZoteroMenuOpen = popup === 'zotero';
  const setIsZoteroMenuOpen = (open: boolean) => setPopup(current => open ? 'zotero' : current === 'zotero' ? null : current);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nodeImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportFile(file);
    }
    e.target.value = '';
  };

  const ctx: ToolbarContext = {
    toolbarTemplatesPlacement, toolbarPresentationPlacement, toolbarExportPlacement,
    title, saveStatus, onTitleChange,
    canUndo, canRedo, onUndo, onRedo,
    onAddChild, onImportNodeImage, onAddSibling, onDeleteNode,
    hasSelection, currentLayout, onLayoutChange,
    currentThemeId, onThemeChange,
    scale, onZoomIn, onZoomOut, onResetZoom, onFitScreen,
    isOutlineOpen, onToggleOutline,
    isInboxOpen, onToggleInbox,
    onOpenCommandPalette, onOpenSearch, onStartPresentation, onOpenTemplates, onToggleZen,
    onOpenShortcuts, onOpenSettings,
    isPro: _isPro,
    toolbarButtons,
    onExportPNG, onExportSVG, onExportMarkdown, onExportJSON,
    onExportOPML, onExportHTML, onExportMermaid, onExportPDF,
    onCollapseByLevel, onImportFile,
    isSidepanelMode, isZoteroMode,
    onCreateFromZoteroItems, onAppendZoteroItems, onSaveToZoteroNote, onSaveToZoteroAttachment,
    onAnalyzeZoteroPaper, isAiAnalyzing, boundItemKey, boundItemTitle,
    onLocateBoundItem, onOpenBoundPdf,
    buttons, popup, setPopup,
    isThemeMenuOpen, setIsThemeMenuOpen,
    isLayoutMenuOpen, setIsLayoutMenuOpen,
    isExportMenuOpen, setIsExportMenuOpen,
    isLevelMenuOpen, setIsLevelMenuOpen,
    isZoteroMenuOpen, setIsZoteroMenuOpen,
    isFullscreen, fileInputRef, nodeImageInputRef,
    handleToggleFullscreen, handleFileInputChange,
  };

  return (
    <header ref={headerRef} style={{ display: 'flex', flex: '0 0 auto', flexWrap: 'wrap', alignItems: 'center', alignContent: 'flex-start', gap: 8, minHeight: 56 }} className="mindflow-toolbar py-2 px-4 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 z-30 select-none">
      <ToolbarBrandTitle ctx={ctx} />
      <ToolbarCoreActions ctx={ctx} />
      {/* Right: Layout, Theme, Outline, Export, Zoom & Extensions */}
      <div style={{ flex: '1 1 360px', minWidth: 0, alignContent: 'flex-start' }} className="flex flex-wrap items-center gap-1.5">
        <ToolbarViewControls ctx={ctx} />
        <ToolbarExportGroup ctx={ctx} />
        <ToolbarZoteroGroup ctx={ctx} />
        <ToolbarFileGroup ctx={ctx} />
      </div>
    </header>
  );
};
