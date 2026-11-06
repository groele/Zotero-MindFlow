import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { relationshipCurves } from '../../core/layout/relationshipGeometry';
import type { CanvasProps } from './CanvasTypes';
import { useCanvasTouch } from './CanvasTouch';

export const useCanvasInteractions = ({
  nodes,
  connections,
  relationships = [],
  theme,
  selectedId,
  selectedIds = [],
  editingId,
  viewport,
  onViewportChange,
  onSelectNode,
  onSelectMultipleNodes,
  onStartEditNode,
  onCommitEditNode,
  onCancelEditNode,
  onToggleCollapse,
  onCycleTaskStatus,
  onOpenInternalLink,
  onMoveNode,
  onContextMenuNode,
  onContextMenuCanvas,
  searchMatchedIds = [],
  focusedTag = null,
  canvasBackground = 'dots',
  zoomStep = 0.15,
  onAddChildNode,
  onAddSiblingNode,
  onImportNodeImage,
  onDeleteSelectedNode,
  onQuickColorNode,
  onCreateRelationship,
  onDeleteRelationship,
  onEditRelationshipLabel,
  onBatchColor,
  onBatchDelete,
}: CanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeImageInputRef = useRef<HTMLInputElement>(null);
  const imageTargetIdRef = useRef<string | null>(null);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const isSpacePressedRef = useRef(false);

  // Marquee Selection Box state
  const [isSelectingBox, setIsSelectingBox] = useState(false);
  const [boxStart, setBoxStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [boxCurrent, setBoxCurrent] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Floating Micro-toolbar & Relationship Connection states
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [showQuickColors, setShowQuickColors] = useState(false);
  const curves = useMemo(() => relationshipCurves(nodes, relationships), [nodes, relationships]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          isSpacePressedRef.current = true;
        }
      }
      if (e.key === 'Escape') {
        if (connectingFromId) {
          setConnectingFromId(null);
        }
        setShowQuickColors(false);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [connectingFromId]);

  // Wheel handling: zoom or pan
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    if (e.ctrlKey || e.metaKey) {
      // Zoom centered at mouse pointer
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1 + zoomStep : 1 / (1 + zoomStep);
      const newScale = Math.min(Math.max(viewport.scale * zoomFactor, 0.05), 3.0);

      // Adjust offset so point under mouse remains stable
      const newX = mouseX - (mouseX - viewport.x) * (newScale / viewport.scale);
      const newY = mouseY - (mouseY - viewport.y) * (newScale / viewport.scale);

      onViewportChange({ x: newX, y: newY, scale: newScale });
    } else {
      // Pan with trackpad or mouse wheel
      onViewportChange({
        x: viewport.x - e.deltaX,
        y: viewport.y - e.deltaY,
        scale: viewport.scale,
      });
    }
  }, [viewport, onViewportChange, zoomStep]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  useCanvasTouch(containerRef, viewport, onViewportChange);

  // Canvas pan / marquee box selection via mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;

    // Shift + Left Click on canvas -> Marquee box selection
    if (e.shiftKey && e.button === 0 && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;
      setIsSelectingBox(true);
      setBoxStart({ x: startX, y: startY });
      setBoxCurrent({ x: startX, y: startY });
      return;
    }

    // Normal Left click on canvas background, or middle click, or left click with Space pressed
    const isTargetCanvas = (e.target as HTMLElement).classList.contains('canvas-background');
    if (isTargetCanvas || e.button === 1 || isSpacePressedRef.current) {
      setIsDraggingCanvas(true);
      dragStartRef.current = { x: e.clientX - viewport.x, y: e.clientY - viewport.y };
      if (isTargetCanvas) {
        onSelectNode(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isSelectingBox && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setBoxCurrent({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      return;
    }

    if (!isDraggingCanvas) return;
    onViewportChange({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
      scale: viewport.scale,
    });
  };

  const handleMouseUp = () => {
    if (isSelectingBox) {
      setIsSelectingBox(false);
      const minX = Math.min(boxStart.x, boxCurrent.x);
      const maxX = Math.max(boxStart.x, boxCurrent.x);
      const minY = Math.min(boxStart.y, boxCurrent.y);
      const maxY = Math.max(boxStart.y, boxCurrent.y);

      // Trigger box selection only if box is larger than 6x6 px
      if (maxX - minX > 6 || maxY - minY > 6) {
        const stageMinX = (minX - viewport.x) / viewport.scale;
        const stageMaxX = (maxX - viewport.x) / viewport.scale;
        const stageMinY = (minY - viewport.y) / viewport.scale;
        const stageMaxY = (maxY - viewport.y) / viewport.scale;

        const hitNodes = nodes.filter((n) => {
          const nodeRight = n.x + n.width;
          const nodeBottom = n.y + n.height;
          return n.x <= stageMaxX && nodeRight >= stageMinX && n.y <= stageMaxY && nodeBottom >= stageMinY;
        });

        if (onSelectMultipleNodes) {
          onSelectMultipleNodes(hitNodes.map((n) => n.id));
        }
      }
      return;
    }

    setIsDraggingCanvas(false);
  };

  // Node Drag & Drop reparenting
  const handleNodeDragStart = (id: string, e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedNodeId(id);
    e.dataTransfer.setData('application/x-mindflow-node', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleNodeDragOver = (id: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
    } else if (draggedNodeId && draggedNodeId !== id) {
      e.dataTransfer.dropEffect = 'move';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleNodeDrop = (targetId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      if (files.length !== 1 || !files[0].type.startsWith('image/')) {
        window.alert('请一次拖入一张 PNG、JPEG 或 WebP 图片');
      } else if (onImportNodeImage) {
        void onImportNodeImage(targetId, files[0]).catch(error => {
          window.alert(`图片导入失败：${error?.message || '未知错误'}`);
        });
      }
    } else if (draggedNodeId && draggedNodeId !== targetId && e.dataTransfer.types.includes('application/x-mindflow-node')) {
      onMoveNode(draggedNodeId, targetId);
    }
    setDraggedNodeId(null);
  };

  // Effective set of selected node IDs
  const activeSelectedSet = new Set<string>();
  if (selectedId) activeSelectedSet.add(selectedId);
  for (const id of selectedIds) activeSelectedSet.add(id);

  const activeMicroNode =
    activeSelectedSet.size === 1 && !editingId && !connectingFromId
      ? nodes.find((n) => n.id === selectedId)
      : null;

  return {
    // props (defaults applied)
    nodes,
    connections,
    relationships,
    theme,
    selectedId,
    selectedIds,
    editingId,
    viewport,
    onViewportChange,
    onSelectNode,
    onSelectMultipleNodes,
    onStartEditNode,
    onCommitEditNode,
    onCancelEditNode,
    onToggleCollapse,
    onCycleTaskStatus,
    onOpenInternalLink,
    onMoveNode,
    onContextMenuNode,
    onContextMenuCanvas,
    searchMatchedIds,
    focusedTag,
    canvasBackground,
    zoomStep,
    onAddChildNode,
    onAddSiblingNode,
    onImportNodeImage,
    onDeleteSelectedNode,
    onQuickColorNode,
    onCreateRelationship,
    onDeleteRelationship,
    onEditRelationshipLabel,
    onBatchColor,
    onBatchDelete,
    // refs
    containerRef,
    nodeImageInputRef,
    imageTargetIdRef,
    dragStartRef,
    isSpacePressedRef,
    // state
    isDraggingCanvas,
    setIsDraggingCanvas,
    draggedNodeId,
    setDraggedNodeId,
    isSelectingBox,
    setIsSelectingBox,
    boxStart,
    setBoxStart,
    boxCurrent,
    setBoxCurrent,
    connectingFromId,
    setConnectingFromId,
    showQuickColors,
    setShowQuickColors,
    curves,
    // handlers
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleNodeDragStart,
    handleNodeDragOver,
    handleNodeDrop,
    // computed
    activeSelectedSet,
    activeMicroNode,
  };
};

export type CanvasCtx = ReturnType<typeof useCanvasInteractions>;
