import { useEffect, useMemo, useCallback } from 'react';
import { getTheme } from '../../core/theme/themes';
import { computeLayout } from '../../core/layout/layoutEngine';
import { relationshipBounds, relationshipCurves } from '../../core/layout/relationshipGeometry';
import { MindMapNode } from '../../core/model/types';
import { validRelationships } from '../../core/model/editorState';
import { addChildNode, addSiblingNode, deleteMultipleNodes, deleteNode, duplicateNode, findNode, moveNode, nextTaskStatus, pasteSubtree, toggleNodeCollapse, updateNode } from '../../core/model/treeOps';
import { playAddNode, playDeleteNode } from '../../services/audio/soundService';
import { prepareNodeImage } from '../../core/model/nodeImage';
import type { AppContext } from './appContext';

export const useAppEditorCore = (ctx: AppContext): void => {
  const { doc, setDoc, setSelectedId, selectedId, setSelectedIds,
         selectedIds, setEditingId, editingId, aiWorkflow, clipboardSubtreeRef,
         clipboardNodeTokenRef, clipboardNodeTextRef, imageImportBusyRef, setIsPropertySidebarOpen, isShortcutsOpen,
         isCommandPaletteOpen, isTemplateModalOpen, isSettingsOpen, isZenMode, isSearchOpen,
         isPresentationOpen, relationships, setRelationships, settings, latestDocRef,
         latestRelationshipsRef, activeDocLoadTokenRef, historyRef, syncHistoryState } = ctx;
  // Theme
  const theme = useMemo(() => {
    return getTheme(doc?.themeId);
  }, [doc?.themeId]);

  // Layout calculation
  const layout = useMemo(() => {
    if (!doc) return { nodes: [], connections: [], bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };
    const result = computeLayout(doc.root, doc.layoutType, theme, {
      rainbowBranches: settings.rainbowBranches,
      curveStyle: settings.curveStyle,
    });
    return { ...result, bounds: relationshipBounds(result.bounds, relationshipCurves(result.nodes, relationships)) };
  }, [doc, theme, relationships, settings.rainbowBranches, settings.curveStyle]);

  // Commit changes to root and push history
  const commitRootChange = useCallback((newRoot: MindMapNode, nextRelationships = latestRelationshipsRef.current) => {
    const current = latestDocRef.current;
    if (!current || current.id !== doc?.id) return;
    const valid = validRelationships(newRoot, nextRelationships);
    if (newRoot === current.root && valid === latestRelationshipsRef.current) return;
    historyRef.current.push({ root: current.root, relationships: latestRelationshipsRef.current });
    syncHistoryState();
    const updated = { ...current, root: newRoot, relationships: valid, updatedAt: Date.now() };
    latestDocRef.current = updated;
    latestRelationshipsRef.current = valid;
    setRelationships(valid);
    setDoc(updated);
  }, [doc?.id, syncHistoryState]);

  // Selection handlers
  const handleSelectNode = useCallback((id: string | null, isMulti = false) => {
    if (!id) {
      setSelectedId(null);
      setSelectedIds([]);
      return;
    }
    if (isMulti) {
      const set = new Set(selectedIds);
      if (selectedId) set.add(selectedId);
      if (set.has(id)) set.delete(id); else set.add(id);
      const next = Array.from(set);
      setSelectedIds(next);
      setSelectedId(next.includes(id) ? id : next[next.length - 1] || null);
    } else {
      setSelectedId(id);
      setSelectedIds([]);
    }
    if (id && !isZenMode) {
      setIsPropertySidebarOpen(true);
    }
  }, [selectedId, selectedIds, isZenMode]);

  const handleSelectMultipleNodes = useCallback((ids: string[]) => {
    setSelectedIds(ids);
    if (ids.length > 0) {
      setSelectedId(ids[ids.length - 1]);
      if (!isZenMode) {
        setIsPropertySidebarOpen(true);
      }
    } else {
      setSelectedId(null);
    }
  }, [isZenMode]);

  // Actions
  const handleAddChild = useCallback(() => {
    if (!doc) return;
    const targetId = selectedId || doc.root.id;
    let rootToUse = doc.root;
    if (settings.autoExpandOnAddChild) {
      rootToUse = updateNode(rootToUse, targetId, { isExpanded: true });
    }
    const { newRoot, newNodeId } = addChildNode(rootToUse, targetId, '分支主题');
    commitRootChange(newRoot);
    setSelectedId(newNodeId);
    setSelectedIds([]);
    setEditingId(newNodeId);
    playAddNode(settings.soundEffects);
  }, [doc, selectedId, settings.autoExpandOnAddChild, settings.soundEffects, commitRootChange]);

  const handleAddSibling = useCallback((insertBefore = false) => {
    if (!doc) return;
    const targetId = selectedId || doc.root.id;
    const { newRoot, newNodeId } = addSiblingNode(doc.root, targetId, '分支主题', insertBefore);
    commitRootChange(newRoot);
    setSelectedId(newNodeId);
    setSelectedIds([]);
    setEditingId(newNodeId);
    playAddNode(settings.soundEffects);
  }, [doc, selectedId, settings.soundEffects, commitRootChange]);

  const handleCopyNode = useCallback((idToCopy?: string, writeSystemClipboard = false) => {
    if (!doc) return;
    const targetId = idToCopy || selectedId;
    if (!targetId) return;
    const target = findNode(doc.root, targetId);
    if (target) {
      clipboardSubtreeRef.current = JSON.parse(JSON.stringify(target));
      clipboardNodeTokenRef.current = crypto.randomUUID();
      clipboardNodeTextRef.current = target.text;
      if (writeSystemClipboard) {
        void navigator.clipboard.writeText(target.text).catch(error => {
          console.warn('MindFlow clipboard write failed', error);
        });
      }
    }
  }, [doc, selectedId]);

  useEffect(() => {
    const handleCopy = (event: ClipboardEvent) => {
      if (!doc || !selectedId || !clipboardSubtreeRef.current || !clipboardNodeTokenRef.current || editingId) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, [contenteditable]:not([contenteditable="false"])')) return;
      if (!event.clipboardData) return;
      event.clipboardData.setData('text/plain', clipboardNodeTextRef.current || '');
      event.clipboardData.setData('application/x-mindflow-node', clipboardNodeTokenRef.current);
      event.preventDefault();
    };
    window.addEventListener('copy', handleCopy);
    return () => window.removeEventListener('copy', handleCopy);
  }, [doc, selectedId, editingId]);

  const handlePasteNode = useCallback((targetParentId?: string) => {
    if (!doc || !clipboardSubtreeRef.current) return;
    const parentId = targetParentId || selectedId || doc.root.id;
    const { newRoot, newNodeId } = pasteSubtree(doc.root, parentId, clipboardSubtreeRef.current);
    commitRootChange(newRoot);
    setSelectedId(newNodeId);
    setSelectedIds([]);
    playAddNode(settings.soundEffects);
  }, [doc, selectedId, commitRootChange, settings.soundEffects]);

  const handleDuplicateNode = useCallback((idToDuplicate?: string) => {
    if (!doc) return;
    const targetId = idToDuplicate || selectedId;
    if (!targetId || targetId === doc.root.id) return;
    const { newRoot, newNodeId } = duplicateNode(doc.root, targetId);
    commitRootChange(newRoot);
    setSelectedId(newNodeId);
    setSelectedIds([]);
    playAddNode(settings.soundEffects);
  }, [doc, selectedId, commitRootChange, settings.soundEffects]);

  const handleDeleteNode = useCallback((idToDelete?: string) => {
    if (!doc) return;
    if (idToDelete) {
      if (idToDelete === doc.root.id) return;
      const { newRoot, nextSelectedId } = deleteNode(doc.root, idToDelete);
      commitRootChange(newRoot);
      setSelectedId(nextSelectedId);
      setSelectedIds([]);
      playDeleteNode(settings.soundEffects);
      return;
    }

    const ids = selectedIds.length > 0
      ? selectedIds.filter((id: any) => id !== doc.root.id)
      : (selectedId && selectedId !== doc.root.id ? [selectedId] : []);

    if (ids.length === 0) return;

    if (ids.length === 1) {
      const { newRoot, nextSelectedId } = deleteNode(doc.root, ids[0]);
      commitRootChange(newRoot);
      setSelectedId(nextSelectedId);
      setSelectedIds([]);
    } else {
      const { newRoot, nextSelectedId } = deleteMultipleNodes(doc.root, ids);
      commitRootChange(newRoot);
      setSelectedId(nextSelectedId || doc.root.id);
      setSelectedIds([]);
    }
    playDeleteNode(settings.soundEffects);
  }, [doc, selectedId, selectedIds, commitRootChange, settings.soundEffects]);

  const handleToggleCollapse = useCallback((id: string) => {
    if (!doc) return;
    const newRoot = toggleNodeCollapse(doc.root, id);
    commitRootChange(newRoot);
  }, [doc, commitRootChange]);

  const handleMoveNode = useCallback((sourceId: string, targetId: string) => {
    if (!doc) return;
    const newRoot = moveNode(doc.root, sourceId, targetId);
    commitRootChange(newRoot);
  }, [doc, commitRootChange]);

  const handleUpdateNodePatch = useCallback((id: string, patch: Partial<MindMapNode>) => {
    if (!doc) return;
    const newRoot = updateNode(doc.root, id, patch);
    commitRootChange(newRoot);
  }, [doc, commitRootChange]);

  const handleCycleTaskStatus = useCallback((id: string) => {
    if (!doc) return;
    const node = findNode(doc.root, id);
    if (!node?.task) return;
    handleUpdateNodePatch(id, { task: { ...node.task, status: nextTaskStatus(node.task.status) } });
  }, [doc, handleUpdateNodePatch]);

  const handleImportNodeImage = useCallback(async (file: File, targetId?: string, createChild = false): Promise<void> => {
    if (imageImportBusyRef.current) throw new Error('另一张图片正在处理中，请稍后再试');
    imageImportBusyRef.current = true;
    try {
      const sourceDocId = doc?.id;
      const sourceLoadToken = activeDocLoadTokenRef.current;
      if (!sourceDocId) throw new Error('请先打开导图');
      const image = await prepareNodeImage(file);
      const latest = latestDocRef.current;
      if (!latest || latest.id !== sourceDocId || sourceLoadToken !== activeDocLoadTokenRef.current) throw new Error('导图已切换，请重新选择图片');
      const parentId = targetId || selectedId || latest.root.id;
      const target = findNode(latest.root, parentId);
      if (!target) throw new Error('目标节点已删除，请重新选择');
      let newRoot: MindMapNode;
      let nextSelectedId = parentId;
      if (createChild) {
        const added = addChildNode(latest.root, parentId, '');
        nextSelectedId = added.newNodeId;
        newRoot = updateNode(added.newRoot, nextSelectedId, { type: 'image', image });
      } else {
        newRoot = updateNode(latest.root, parentId, { image });
      }
      commitRootChange(newRoot);
      setSelectedId(nextSelectedId);
      setSelectedIds([]);
      setIsPropertySidebarOpen(true);
    } finally {
      imageImportBusyRef.current = false;
    }
  }, [doc?.id, selectedId, commitRootChange]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (!doc || aiWorkflow || editingId || isSettingsOpen || isShortcutsOpen || isCommandPaletteOpen || isTemplateModalOpen || isSearchOpen || isPresentationOpen) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, [contenteditable]:not([contenteditable="false"])')) return;

      const imageItem = Array.from(event.clipboardData?.items || []).find(item => item.kind === 'file' && item.type.startsWith('image/'));
      const copiedToken = event.clipboardData?.getData('application/x-mindflow-node');
      const copiedText = event.clipboardData?.getData('text/plain');
      const isInternalNode = !!clipboardSubtreeRef.current && (
        (!!copiedToken && copiedToken === clipboardNodeTokenRef.current) ||
        (!copiedToken && !imageItem && copiedText !== undefined && copiedText === clipboardNodeTextRef.current)
      );
      if (isInternalNode) {
        event.preventDefault();
        handlePasteNode();
      } else if (imageItem) {
        const file = imageItem.getAsFile();
        if (!file) return;
        event.preventDefault();
        const targetId = selectedId || doc.root.id;
        void handleImportNodeImage(file, targetId).catch(error => {
          window.alert(`图片粘贴失败：${error?.message || '未知错误'}`);
        });
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [doc, aiWorkflow, editingId, selectedId, isSettingsOpen, isShortcutsOpen, isCommandPaletteOpen, isTemplateModalOpen, isSearchOpen, isPresentationOpen, handleImportNodeImage, handlePasteNode]);
  Object.assign(ctx, { theme, layout, commitRootChange, handleSelectNode, handleSelectMultipleNodes,
                      handleAddChild, handleAddSibling, handleCopyNode, handlePasteNode, handleDuplicateNode,
                      handleDeleteNode, handleToggleCollapse, handleMoveNode, handleUpdateNodePatch, handleCycleTaskStatus,
                      handleImportNodeImage });
};
