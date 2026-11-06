import type {
  LayoutNode, ConnectionCurve, ViewportTransform, ThemeColors,
  RelationshipLink
} from '../../core/model/types';

export interface CanvasProps {
  nodes: LayoutNode[];
  connections: ConnectionCurve[];
  relationships?: RelationshipLink[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  theme: ThemeColors;
  selectedId: string | null;
  selectedIds?: string[];
  editingId: string | null;
  viewport: ViewportTransform;
  onViewportChange: (vp: ViewportTransform) => void;
  onSelectNode: (id: string | null, isMulti?: boolean) => void;
  onSelectMultipleNodes?: (ids: string[]) => void;
  onStartEditNode: (id: string) => void;
  onCommitEditNode: (id: string, text: string) => void;
  onCancelEditNode: () => void;
  onToggleCollapse: (id: string) => void;
  onCycleTaskStatus?: (id: string) => void;
  onOpenInternalLink?: (documentId: string, nodeId?: string) => void;
  onMoveNode: (sourceId: string, targetId: string) => void;
  onContextMenuNode?: (id: string, clientX: number, clientY: number) => void;
  onContextMenuCanvas?: (clientX: number, clientY: number) => void;
  searchMatchedIds?: string[];
  focusedTag?: string | null;
  canvasBackground?: 'dots' | 'grid' | 'blank';
  zoomStep?: number;
  // Micro-toolbar & Relationship actions
  onAddChildNode?: (parentId: string) => void;
  onAddSiblingNode?: () => void;
  onImportNodeImage?: (nodeId: string, file: File) => Promise<void>;
  onDeleteSelectedNode?: (id: string) => void;
  onQuickColorNode?: (id: string, color: string) => void;
  onCreateRelationship?: (fromId: string, toId: string) => void;
  onDeleteRelationship?: (id: string) => void;
  onEditRelationshipLabel?: (id: string, label: string) => void;
  // Multi-selection batch actions
  onBatchColor?: (color: string) => void;
  onBatchDelete?: () => void;
}
