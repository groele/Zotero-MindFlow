import { useEffect, useCallback } from 'react';
import { deleteMultipleNodes, expandAncestors, findNode, generateId, replaceAllNodeText, replaceLiteral, replaceNodeText, setCollapseByLevel, updateMultipleNodes } from '../../core/model/treeOps';
import { StorageService } from '../../services/storage/storageService';
import { RelationshipLink } from '../../core/model/types';
import { playDeleteNode } from '../../services/audio/soundService';
import type { AppContext } from './appContext';

export const useAppEditorActions = (ctx: AppContext): void => {
  const { doc, setDoc, setSelectedId, setSelectedIds, selectedIds,
         setEditingId, setViewport, setContextMenuState, setCanvasContextMenuState, relationships,
         setRelationships, settings, setSaveStatus, cleanDocRef, cleanRelationshipsRef,
         latestDocRef, latestRelationshipsRef, emergencyDraftRef, pendingNavigationRef, activeDocLoadTokenRef,
         currentDocIdRef, historyRef, containerRef, syncHistoryState, centerCanvas,
         flushCurrentDocument, layout, commitRootChange, handleUpdateNodePatch } = ctx;
  const handleCommitEdit = useCallback((id: string, newText: string) => {
    emergencyDraftRef.current = null;
    setEditingId(null);
    if (!doc) return;
    const target = findNode(doc.root, id);
    if (target && target.text !== newText && newText.trim()) {
      handleUpdateNodePatch(id, { text: newText.trim() });
    }
  }, [doc, handleUpdateNodePatch]);

  const handleUndo = useCallback(() => {
    if (!doc) return;
    const prev = historyRef.current.undo({ root: doc.root, relationships });
    if (prev) {
      const updated = { ...doc, ...prev, updatedAt: Date.now() };
      latestDocRef.current = updated;
      latestRelationshipsRef.current = prev.relationships;
      setDoc(updated);
      setRelationships(prev.relationships);
      setSelectedId((id: any) => id && findNode(prev.root, id) ? id : prev.root.id);
      setSelectedIds((ids: any) => ids.filter((id: any) => !!findNode(prev.root, id)));
      setEditingId(null);
      syncHistoryState();
    }
  }, [doc, relationships, syncHistoryState]);

  const handleRedo = useCallback(() => {
    if (!doc) return;
    const next = historyRef.current.redo({ root: doc.root, relationships });
    if (next) {
      const updated = { ...doc, ...next, updatedAt: Date.now() };
      latestDocRef.current = updated;
      latestRelationshipsRef.current = next.relationships;
      setDoc(updated);
      setRelationships(next.relationships);
      setSelectedId((id: any) => id && findNode(next.root, id) ? id : next.root.id);
      setSelectedIds((ids: any) => ids.filter((id: any) => !!findNode(next.root, id)));
      setEditingId(null);
      syncHistoryState();
    }
  }, [doc, relationships, syncHistoryState]);

  // Select node and smoothly center canvas on it
  const handleSelectAndCenterNode = useCallback((nodeId: string) => {
    const current = latestDocRef.current;
    if (!current || !findNode(current.root, nodeId)) return;
    const revealed = expandAncestors(current.root, nodeId);
    if (revealed !== current.root) {
      pendingNavigationRef.current = { documentId: current.id, nodeId };
      commitRootChange(revealed);
    }
    setSelectedId(nodeId);
    const target = layout.nodes.find((n: any) => n.id === nodeId);
    if (target && containerRef.current) {
      const cw = containerRef.current.clientWidth || 1000;
      const ch = containerRef.current.clientHeight || 800;
      setViewport((v: any) => ({
        ...v,
        x: cw / 2 - (target.x + target.width / 2) * v.scale,
        y: ch / 2 - (target.y + target.height / 2) * v.scale,
      }));
    }
  }, [layout.nodes, commitRootChange]);

  const openDocumentAt = useCallback(async (documentId: string, nodeId?: string) => {
    const token = ++activeDocLoadTokenRef.current;
    const current = latestDocRef.current;
    if (current?.id === documentId) {
      if (nodeId && findNode(current.root, nodeId)) handleSelectAndCenterNode(nodeId);
      else handleSelectAndCenterNode(current.root.id);
      return;
    }
    if (!(await flushCurrentDocument()) || token !== activeDocLoadTokenRef.current) return;
    try {
      const selectedDoc = await StorageService.getDocument(documentId);
      if (token !== activeDocLoadTokenRef.current) return;
      if (!selectedDoc) {
        setSaveStatus({ state: 'warning', message: '链接目标导图已不存在，当前导图保持打开。' });
        return;
      }
      if (!(await flushCurrentDocument()) || token !== activeDocLoadTokenRef.current) return;
      await StorageService.setActiveDocumentId(documentId);
      if (token !== activeDocLoadTokenRef.current) return;
      if (nodeId) selectedDoc.root = expandAncestors(selectedDoc.root, nodeId);
      const loadedRelationships = selectedDoc.relationships || [];
      cleanDocRef.current = selectedDoc;
      cleanRelationshipsRef.current = loadedRelationships;
      latestDocRef.current = selectedDoc;
      latestRelationshipsRef.current = loadedRelationships;
      currentDocIdRef.current = selectedDoc.id;
      pendingNavigationRef.current = { documentId, nodeId };
      setRelationships(loadedRelationships);
      setDoc(selectedDoc);
      setSelectedIds([]);
      setSelectedId(selectedDoc.root.id);
      historyRef.current.clear();
      syncHistoryState();
    } catch (error: any) {
      setSaveStatus({ state: 'error', message: `打开导图失败：${error?.message || '读取本地数据失败'}` });
    }
  }, [doc, flushCurrentDocument, handleSelectAndCenterNode, syncHistoryState]);

  useEffect(() => {
    const pending = pendingNavigationRef.current;
    if (!doc || pending?.documentId !== doc.id) return;
    const target = layout.nodes.find((node: any) => node.id === pending.nodeId)
      || layout.nodes.find((node: any) => node.id === doc.root.id);
    pendingNavigationRef.current = null;
    if (!target) return;
    setSelectedId(target.id);
    centerCanvas({ minX: target.x, maxX: target.x + target.width, minY: target.y, maxY: target.y + target.height });
    if (pending.nodeId && target.id !== pending.nodeId) {
      setSaveStatus({ state: 'warning', message: '目标主题已不存在，已打开目标导图的中心主题。' });
    }
  }, [doc, layout, centerCanvas]);

  // Handle node right click
  const handleContextMenuNode = useCallback((nodeId: string, clientX: number, clientY: number) => {
    if (!doc) return;
    const target = findNode(doc.root, nodeId);
    if (target) {
      setSelectedId(nodeId);
      setCanvasContextMenuState(null);
      setContextMenuState({ x: clientX, y: clientY, node: target });
    }
  }, [doc]);

  // Handle canvas background right click
  const handleContextMenuCanvas = useCallback((clientX: number, clientY: number) => {
    setContextMenuState(null);
    setCanvasContextMenuState({ x: clientX, y: clientY });
  }, []);

  // Relationships Handlers
  const handleCreateRelationship = useCallback((fromId: string, toId: string) => {
    if (fromId === toId || !doc || !findNode(doc.root, fromId) || !findNode(doc.root, toId)) return;
    const exists = relationships.some(
      (r: any) => (r.fromId === fromId && r.toId === toId) || (r.fromId === toId && r.toId === fromId)
    );
    if (exists) return;

    const newRel: RelationshipLink = {
      id: generateId(),
      fromId,
      toId,
      label: '关联',
      style: 'dashed',
      color: '#8b5cf6',
    };
    const nextRels = [...relationships, newRel];
    commitRootChange(doc.root, nextRels);
  }, [doc, relationships, commitRootChange]);

  const handleDeleteRelationship = useCallback((id: string) => {
    if (!doc) return;
    const nextRels = relationships.filter((r: any) => r.id !== id);
    commitRootChange(doc.root, nextRels);
  }, [doc, relationships, commitRootChange]);

  const handleEditRelationshipLabel = useCallback((id: string, label: string) => {
    if (!doc) return;
    const nextRels = relationships.map((r: any) => (r.id === id ? { ...r, label } : r));
    commitRootChange(doc.root, nextRels);
  }, [doc, relationships, commitRootChange]);

  // Search & Replace Handlers
  const handleReplaceNodeText = useCallback((nodeId: string, fromText: string, toText: string) => {
    if (!doc) return 0;
    const target = findNode(doc.root, nodeId);
    if (!target) return 0;
    const count = replaceLiteral(target.text, fromText, toText).count + replaceLiteral(target.note || '', fromText, toText).count;
    if (!count) return 0;
    const newRoot = replaceNodeText(doc.root, nodeId, fromText, toText);
    commitRootChange(newRoot);
    return count;
  }, [doc, commitRootChange]);

  const handleReplaceAllNodeText = useCallback((fromText: string, toText: string) => {
    if (!doc) return 0;
    const { newRoot, count } = replaceAllNodeText(doc.root, fromText, toText);
    if (count > 0) {
      commitRootChange(newRoot);
    }
    return count;
  }, [doc, commitRootChange]);

  // Level Collapse / Expand Handler
  const handleCollapseByLevel = useCallback((level: number) => {
    if (!doc) return;
    const newRoot = setCollapseByLevel(doc.root, level);
    commitRootChange(newRoot);
  }, [doc, commitRootChange]);

  // Batch Selection Handlers
  const handleBatchColor = useCallback((color: string) => {
    if (!doc || selectedIds.length === 0) return;
    const newRoot = updateMultipleNodes(doc.root, selectedIds, { color });
    commitRootChange(newRoot);
  }, [doc, selectedIds, commitRootChange]);



  const handleBatchDelete = useCallback(() => {
    if (!doc || selectedIds.length === 0) return;
    const { newRoot, nextSelectedId } = deleteMultipleNodes(doc.root, selectedIds);
    commitRootChange(newRoot);
    setSelectedIds([]);
    setSelectedId(nextSelectedId);
    playDeleteNode(settings.soundEffects);
  }, [doc, selectedIds, commitRootChange, settings.soundEffects]);
  Object.assign(ctx, { handleCommitEdit, handleUndo, handleRedo, handleSelectAndCenterNode, openDocumentAt,
                      handleContextMenuNode, handleContextMenuCanvas, handleCreateRelationship, handleDeleteRelationship, handleEditRelationshipLabel,
                      handleReplaceNodeText, handleReplaceAllNodeText, handleCollapseByLevel, handleBatchColor, handleBatchDelete });
};
