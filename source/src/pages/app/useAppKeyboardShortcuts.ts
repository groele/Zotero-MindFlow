import { useEffect } from 'react';
import { shouldHandleCanvasShortcut } from '../../core/keyboard/shortcuts';
import { saveMindMapToZoteroAttachment } from '../../services/zotero/zoteroBridge';
import { findAdjacentNode } from '../../core/model/treeOps';
import type { AppContext } from './appContext';

export const useAppKeyboardShortcuts = (ctx: AppContext): void => {
  const { selectedId, setSelectedId, selectedIds, setSelectedIds, editingId,
         setEditingId, isZoteroMode, aiWorkflow, setViewport, isShortcutsOpen,
         setIsShortcutsOpen, isCommandPaletteOpen, setIsCommandPaletteOpen, isTemplateModalOpen, isWelcomeOpen,
         isSettingsOpen, isZenMode, setIsZenMode, isSearchOpen, setIsSearchOpen,
         isPresentationOpen, setIsPresentationOpen, contextMenuState, setContextMenuState, canvasContextMenuState,
         setCanvasContextMenuState, setSaveStatus, latestDocRef, zoteroSyncQueueRef, currentDocIdRef,
         containerRef, centerCanvas, flushCurrentDocument, persistArchiveAssociation, layout,
         handleAddChild, handleAddSibling, handleCopyNode, handleDuplicateNode, handleDeleteNode,
         handleToggleCollapse, handleUndo, handleRedo, handleCollapseByLevel, handleOpenSettings } = ctx;
  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.keyCode === 229) return;
      if (aiWorkflow) return;
      // Escape closes floating search or context menu
      if (e.key === 'Escape') {
        if (contextMenuState) {
          setContextMenuState(null);
          return;
        }
        if (canvasContextMenuState) {
          setCanvasContextMenuState(null);
          return;
        }
        if (isSearchOpen) {
          setIsSearchOpen(false);
          return;
        }
        if (isPresentationOpen) {
          setIsPresentationOpen(false);
          return;
        }
        if (isZenMode) {
          setIsZenMode(false);
          return;
        }
        if (selectedId || selectedIds.length > 0) {
          setSelectedId(null);
          setSelectedIds([]);
          return;
        }
      }

      if (isSettingsOpen || isShortcutsOpen || isTemplateModalOpen || isWelcomeOpen || isPresentationOpen) return;
      if (isCommandPaletteOpen && !((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) return;

      // Command Palette: Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev: any) => !prev);
        return;
      }

      // Preserve editing controls and the host's native text-entry behavior.
      if (editingId) return;
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;
      if (document.activeElement?.closest('[contenteditable]:not([contenteditable="false"])')) return;

      // Let Zotero and the focused control keep their native keyboard behavior.
      // In particular, consuming Tab here prevents keyboard users from moving
      // through the toolbar and sidebars, while consuming Enter/Space can stop
      // the focused button from activating. Canvas shortcuts remain available
      // when focus is on the canvas or the document body.
      if (!shouldHandleCanvasShortcut(e.target)) return;

      // Fullscreen: F11
      if (e.key === 'F11') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
        return;
      }

      // Quick save & sync to Zotero attachment: Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void (async () => {
          if (!(await flushCurrentDocument())) return;
          const latest = latestDocRef.current;
          if (!latest || !isZoteroMode) {
            setSaveStatus({ state: 'saved', message: '已保存到本地' });
            return;
          }
          if (latest.metadata?.aiDraft) {
            setSaveStatus({ state: 'saved', message: 'AI 草稿已保存到本机；审阅后点击“归档到 Zotero”。' });
            return;
          }
          await zoteroSyncQueueRef.current;
          const result = await saveMindMapToZoteroAttachment(latest);
          if (currentDocIdRef.current !== latest.id) return;
          if (result.success && result.parentItemUri &&
              (latest.metadata?.zoteroAttachmentKey !== result.attachmentKey || latest.metadata?.zoteroItemKey !== result.parentItemUri ||
               Boolean(latest.metadata?.mindflowUnlinkedContainer) !== Boolean(result.usedUnlinkedContainer)) &&
              !(await persistArchiveAssociation(latest.id, result))) return;
          setSaveStatus({ state: result.success && (!result.noteRequested || result.savedNote) ? 'saved' : 'warning', message: result.message });
        })().catch((error) => setSaveStatus({ state: 'error', message: `保存失败：${error?.message || error}` }));
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen((prev: any) => !prev);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        centerCanvas(layout.bounds);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        if (containerRef.current) {
          setViewport({
            x: containerRef.current.clientWidth / 2,
            y: containerRef.current.clientHeight / 2,
            scale: 1,
          });
        }
        return;
      }

      if (e.key === 'F5' || ((e.altKey || e.metaKey) && e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        setIsPresentationOpen(true);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        handleOpenSettings();
        return;
      }

      // Clipboard shortcuts: Ctrl+C (Copy), Ctrl+D (Duplicate). Paste is handled
      // by the native paste event so image data remains available.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        handleCopyNode();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateNode();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        handleAddChild();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          handleAddSibling(true);
        } else {
          handleAddSibling(false);
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteNode();
        return;
      }

      if ((e.key === ' ' || e.key === 'F2') && selectedId) {
        e.preventDefault();
        setEditingId(selectedId);
        return;
      }

      // Fast toggle fold/collapse for selected node
      if (e.key === '/' && selectedId) {
        e.preventDefault();
        handleToggleCollapse(selectedId);
        return;
      }

      // Quick branch level collapse shortcuts (Alt+1, Alt+2, Alt+3, Alt+0/9)
      if (e.altKey && !e.ctrlKey && !e.metaKey && ['1', '2', '3', '4', '9', '0'].includes(e.key)) {
        e.preventDefault();
        const level = e.key === '0' || e.key === '9' ? 99 : parseInt(e.key, 10);
        handleCollapseByLevel(level);
        return;
      }

      if (e.key === '?') {
        setIsShortcutsOpen(true);
        return;
      }

      // Directional arrow navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedId) {
        e.preventDefault();
        const dirMap: Record<string, 'up' | 'down' | 'left' | 'right'> = {
          ArrowUp: 'up',
          ArrowDown: 'down',
          ArrowLeft: 'left',
          ArrowRight: 'right',
        };
        const nextId = findAdjacentNode(selectedId, dirMap[e.key], layout.nodes);
        if (nextId) {
          setSelectedId(nextId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    aiWorkflow, editingId, selectedId, layout.nodes, isZenMode, flushCurrentDocument, isZoteroMode,
    isSettingsOpen, isShortcutsOpen, isTemplateModalOpen, isWelcomeOpen, isPresentationOpen,
    isCommandPaletteOpen, isSearchOpen, contextMenuState, canvasContextMenuState,
    persistArchiveAssociation,
    handleAddChild, handleAddSibling, handleDeleteNode, handleUndo, handleRedo,
    handleCopyNode, handleDuplicateNode, handleToggleCollapse, handleCollapseByLevel
  ]);
  Object.assign(ctx, {});
};
