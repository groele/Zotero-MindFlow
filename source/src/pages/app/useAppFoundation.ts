import { useState, useEffect, useRef, useCallback } from 'react';
import { MindMapDocument, MindMapNode, RelationshipLink, ViewportTransform } from '../../core/model/types';
import { AIResearchStage } from '../../components/modal/AIResearchModal';
import { ResearchInputPreview, ResearchProgress } from '../../services/zotero/researchAnalysis';
import { WorkbenchTab } from '../../components/sidebar/LeftWorkbench';
import { safeStorage } from '../../services/storage/safeStorage';
import { AppSettings, DEFAULT_SETTINGS } from '../../core/model/settingsTypes';
import { EmergencyNodeDraft, emergencyDocument } from '../../core/model/emergencyBackup';
import { captureNodeDrafts } from '../../core/model/editorState';
import { SettingsService } from '../../services/storage/settingsService';
import { getZoteroInstance } from '../../services/zotero/zoteroBridge';
import { HistoryManager } from '../../core/history/historyManager';
import type { AppContext } from './appContext';

export const useAppFoundation = (ctx: AppContext): void => {
  const workspaceRestoringRef = useRef(false);
  const [workspaceRestoring, setWorkspaceRestoring] = useState<'snapshot' | 'workspace' | null>(null);
  const [doc, setDoc] = useState<MindMapDocument | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const isZoteroMode = true;
  const zoteroHostConnectedRef = useRef(false);
  const workspaceBootRef = useRef<Promise<void> | null>(null);
  const hostActionQueueRef = useRef<Promise<void>>(Promise.resolve());
  const executeHostActionRef = useRef<(event: any) => Promise<void>>(async () => {});
  const initialZoteroActionRef = useRef(false);
  const appMountedRef = useRef(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const aiAnalyzingRef = useRef(false);
  const analyzeRequestRef = useRef<(reference?: string) => Promise<void>>(async () => {});
  const createBlankDocRef = useRef<() => Promise<void>>(async () => {});
  const aiAbortRef = useRef<AbortController | null>(null);
  const aiRequestTokenRef = useRef(0);
  const [aiWorkflow, setAiWorkflow] = useState<{
    reference: string;
    stage: AIResearchStage;
    preview: ResearchInputPreview | null;
    progress: ResearchProgress | null;
    error: string;
  } | null>(null);
  const [isArchivingAiDraft, setIsArchivingAiDraft] = useState(false);
  const aiArchivingRef = useRef(false);
  const [viewport, setViewport] = useState<ViewportTransform>({ x: 0, y: 0, scale: 1 });
  const clipboardSubtreeRef = useRef<MindMapNode | null>(null);
  const clipboardNodeTokenRef = useRef<string | null>(null);
  const clipboardNodeTextRef = useRef<string | null>(null);
  const imageImportBusyRef = useRef(false);
  const inboxInsertionsRef = useRef(new Map<string, { documentId: string; nodeId: string }>());

  // Workbench & Sidebar Layout (Ergonomic left-right docking)
  const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(false);
  const [workbenchTab, setWorkbenchTab] = useState<WorkbenchTab>('docs');
  const [dockPosition, setDockPosition] = useState<'left' | 'right'>(() => {
    return (safeStorage.getItem('mindflow_dock_pos') as 'left' | 'right') || 'left';
  });

  const [isPropertySidebarOpen, setIsPropertySidebarOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileImportRef = useRef(false);

  // New features: In-canvas Search, Presentation Mode, Node Context Menu, Commercial License
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchMatchedIds, setSearchMatchedIds] = useState<string[]>([]);
  const [focusedTag, setFocusedTag] = useState<string | null>(null);
  useEffect(() => { setFocusedTag(null); }, [doc?.id]);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [contextMenuState, setContextMenuState] = useState<{ x: number; y: number; node: MindMapNode } | null>(null);
  const [canvasContextMenuState, setCanvasContextMenuState] = useState<{ x: number; y: number } | null>(null);
  const [relationships, setRelationships] = useState<RelationshipLink[]>([]);

  // Settings State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const latestWebdavRef = useRef(settings.webdav);
  latestWebdavRef.current = settings.webdav;
  const [saveStatus, setSaveStatus] = useState<{
    state: 'saving' | 'saved' | 'warning' | 'error';
    message: string;
  }>({ state: 'saved', message: '已保存到本地' });
  const cleanDocRef = useRef<MindMapDocument | null>(null);
  const cleanRelationshipsRef = useRef<RelationshipLink[]>([]);
  const latestDocRef = useRef<MindMapDocument | null>(null);
  const latestRelationshipsRef = useRef<RelationshipLink[]>([]);
  // Lives outside the canvas boundary: its input DOM disappears after a crash.
  const emergencyDraftRef = useRef<EmergencyNodeDraft | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const zoteroSyncQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingSaveTokenRef = useRef(0);
  const autoSyncTimerRef = useRef<number | undefined>(undefined);
  const saveGenerationRef = useRef(0);
  const pendingNavigationRef = useRef<{ documentId: string; nodeId?: string } | null>(null);
  const activeDocLoadTokenRef = useRef(0);
  const currentDocIdRef = useRef<string | null>(null);
  currentDocIdRef.current = doc?.id || null;
  latestDocRef.current = doc;
  latestRelationshipsRef.current = relationships;
  useEffect(() => () => window.clearTimeout(autoSyncTimerRef.current), []);
  useEffect(() => {
    window.clearTimeout(autoSyncTimerRef.current);
  }, [settings.webdav.enabled, settings.webdav.autoSyncOnSave, settings.webdav.serverUrl,
    settings.webdav.basePath, settings.webdav.username, settings.webdav.password]);

  useEffect(() => {
    saveGenerationRef.current += 1;
    emergencyDraftRef.current = null;
    setEditingId(null);
    setContextMenuState(null);
    setCanvasContextMenuState(null);
    setIsPresentationOpen(false);
  }, [doc?.id]);

  const captureCurrentDrafts = useCallback(() => captureNodeDrafts(latestDocRef.current,
    Array.from(document.querySelectorAll<HTMLInputElement>('[data-mindflow-node-draft]'),
      input => ({ id: input.dataset.mindflowNodeDraft || '', text: input.value }))), []);

  const getEmergencyDocument = useCallback(() => emergencyDocument(
    latestDocRef.current, latestRelationshipsRef.current, emergencyDraftRef.current), []);

  // Load Settings on mount & handle Welcome display
  useEffect(() => {
    SettingsService.getSettings().then((loaded) => {
      setSettings(loaded);
      setDockPosition(loaded.workbenchDockPosition);

      // Check if opened directly with context-action arguments
      let hasDirectAction = false;
      const initialAction = typeof window !== 'undefined'
        ? ((window as any)._mindflowInitialAction || (window.frameElement as any)?._mindflowInitialAction || window.arguments?.[0]?.wrappedJSObject || window.arguments?.[0])
        : null;
      if (initialAction && (
        initialAction.mode === 'import_file' ||
        (initialAction.mode === 'open_document' && !!initialAction.doc) ||
        ((initialAction.mode === 'create_from_selection' || initialAction.mode === 'create_from_items') &&
          Array.isArray(initialAction.items) && initialAction.items.length > 0) ||
        (initialAction.mode === 'create_from_collection' && Array.isArray(initialAction.items)) ||
        (initialAction.mode === 'ai_analyze' && Array.isArray(initialAction.items) && !!initialAction.items[0]?.zoteroUri)
      )) {
        hasDirectAction = true;
      }
      if (loaded.showWelcomeOnStartup && !hasDirectAction) {
        setIsWelcomeOpen(true);
      }
    });
  }, []);



  useEffect(() => {
    appMountedRef.current = true;
    return () => {
      appMountedRef.current = false;
      ++aiRequestTokenRef.current;
      aiAbortRef.current?.abort();
      aiAbortRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isZoteroMode) return;
    const zotero = getZoteroInstance();
    const refresh = () => {
      void SettingsService.getSettings().then((loaded) => {
        setSettings(loaded);
        setDockPosition(loaded.workbenchDockPosition);
      }).catch((error) => console.warn('[MindFlow] Could not refresh settings:', error));
    };
    const observer = zotero?.Prefs?.registerObserver?.('mindflow.mindflow_app_settings', refresh, true);
    window.addEventListener('focus', refresh);
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
      if (observer) zotero?.Prefs?.unregisterObserver?.(observer);
    };
  }, [isZoteroMode]);

  // History Manager
  const historyRef = useRef<HistoryManager>(new HistoryManager(50));
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 1000, height: 800 });

  // Update history states
  const syncHistoryState = useCallback(() => {
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  }, []);

  const handleToggleDockPosition = () => {
    const next = dockPosition === 'left' ? 'right' : 'left';
    setDockPosition(next);
    SettingsService.updateSettings({ workbenchDockPosition: next }).then(setSettings);
  };
  Object.assign(ctx, { workspaceRestoringRef, workspaceRestoring, setWorkspaceRestoring, doc, setDoc,
                      selectedId, setSelectedId, selectedIds, setSelectedIds, editingId,
                      setEditingId, isZoteroMode, zoteroHostConnectedRef, workspaceBootRef, hostActionQueueRef,
                      executeHostActionRef, initialZoteroActionRef, appMountedRef, isAiAnalyzing, setIsAiAnalyzing,
                      aiAnalyzingRef, analyzeRequestRef, createBlankDocRef, aiAbortRef, aiRequestTokenRef,
                      aiWorkflow, setAiWorkflow, isArchivingAiDraft, setIsArchivingAiDraft, aiArchivingRef,
                      viewport, setViewport, clipboardSubtreeRef, clipboardNodeTokenRef, clipboardNodeTextRef,
                      imageImportBusyRef, inboxInsertionsRef, isWorkbenchOpen, setIsWorkbenchOpen, workbenchTab,
                      setWorkbenchTab, dockPosition, setDockPosition, isPropertySidebarOpen, setIsPropertySidebarOpen,
                      isShortcutsOpen, setIsShortcutsOpen, isCommandPaletteOpen, setIsCommandPaletteOpen, isTemplateModalOpen,
                      setIsTemplateModalOpen, isWelcomeOpen, setIsWelcomeOpen, isSettingsOpen, setIsSettingsOpen,
                      isZenMode, setIsZenMode, importFileInputRef, pendingFileImportRef, isSearchOpen,
                      setIsSearchOpen, searchMatchedIds, setSearchMatchedIds, focusedTag, setFocusedTag,
                      isPresentationOpen, setIsPresentationOpen, contextMenuState, setContextMenuState, canvasContextMenuState,
                      setCanvasContextMenuState, relationships, setRelationships, settings, setSettings,
                      latestWebdavRef, saveStatus, setSaveStatus, cleanDocRef, cleanRelationshipsRef,
                      latestDocRef, latestRelationshipsRef, emergencyDraftRef, saveQueueRef, zoteroSyncQueueRef,
                      pendingSaveTokenRef, autoSyncTimerRef, saveGenerationRef, pendingNavigationRef, activeDocLoadTokenRef,
                      currentDocIdRef, captureCurrentDrafts, getEmergencyDocument, historyRef, canUndo,
                      setCanUndo, canRedo, setCanRedo, containerRef, containerSize,
                      setContainerSize, syncHistoryState, handleToggleDockPosition });
};
