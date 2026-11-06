import { LayoutType } from '../../core/model/types';
import { ToolbarButtonsConfig, ToolbarPlacement } from '../../core/model/settingsTypes';

export interface ToolbarProps {
  toolbarTemplatesPlacement?: ToolbarPlacement;
  toolbarPresentationPlacement?: ToolbarPlacement;
  toolbarExportPlacement?: ToolbarPlacement;
  title: string;
  saveStatus?: { state: 'saving' | 'saved' | 'warning' | 'error'; message: string };
  onTitleChange: (newTitle: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddChild: () => void;
  onImportNodeImage?: (file: File) => void;
  onAddSibling: () => void;
  onDeleteNode: () => void;
  hasSelection: boolean;
  currentLayout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
  currentThemeId: string;
  onThemeChange: (themeId: string) => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitScreen?: () => void;
  isOutlineOpen: boolean;
  onToggleOutline: () => void;
  isInboxOpen?: boolean;
  onToggleInbox?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenSearch?: () => void;
  onStartPresentation?: () => void;
  onOpenTemplates?: () => void;
  onToggleZen?: () => void;
  onOpenShortcuts: () => void;
  onOpenSettings?: () => void;
  isPro?: boolean;
  toolbarButtons?: ToolbarButtonsConfig;
  onExportPNG: () => void;
  onExportSVG: () => void;
  onExportMarkdown: () => void;
  onExportJSON: () => void;
  onExportOPML?: () => void;
  onExportHTML?: () => void;
  onExportMermaid?: () => void;
  onExportPDF?: () => void;
  onCollapseByLevel?: (level: number) => void;
  onImportFile: (file: File) => void;
  isSidepanelMode?: boolean;
  isZoteroMode?: boolean;
  onCreateFromZoteroItems?: () => void;
  onAppendZoteroItems?: () => void;
  onSaveToZoteroNote?: () => void;
  onSaveToZoteroAttachment?: () => void;
  onAnalyzeZoteroPaper?: () => void;
  isAiAnalyzing?: boolean;
  boundItemKey?: string;
  boundItemTitle?: string;
  onLocateBoundItem?: () => void;
  onOpenBoundPdf?: () => void;
}

/**
 * Everything the extracted toolbar groups need. Props keep their declared
 * types (via extends); resolved/derived values are collected here so each
 * JSX block can be kept byte-for-byte identical after the split.
 */
export interface ToolbarContext extends ToolbarProps {
  buttons: any;
  popup: any;
  setPopup: any;
  isThemeMenuOpen: any;
  setIsThemeMenuOpen: any;
  isLayoutMenuOpen: any;
  setIsLayoutMenuOpen: any;
  isExportMenuOpen: any;
  setIsExportMenuOpen: any;
  isLevelMenuOpen: any;
  setIsLevelMenuOpen: any;
  isZoteroMenuOpen: any;
  setIsZoteroMenuOpen: any;
  isFullscreen: any;
  fileInputRef: any;
  nodeImageInputRef: any;
  handleToggleFullscreen: any;
  handleFileInputChange: any;
}

export interface ToolbarGroupProps {
  ctx: ToolbarContext;
}
