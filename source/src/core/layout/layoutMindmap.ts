import { MindMapNode, LayoutNode, ConnectionCurve, ThemeColors } from '../model/types';
import { measureNode } from './layoutMetrics';
import { layoutSubtree } from './layoutHorizontal';

// 1. Standard Balanced Mind Map Layout (Left and Right)
export function computeMindmapLayout(
  root: MindMapNode,
  theme: ThemeColors,
  outNodes: LayoutNode[],
  outConnections: ConnectionCurve[],
  branchColors: string[] = theme.branchColors,
  curveStyle: 'bezier' | 'straight' | 'rounded' = 'bezier'
) {
  const rootDim = measureNode(root, 0, theme.id === 'paper-reading');
  const rootNode: LayoutNode = {
    id: root.id,
    node: root,
    x: -rootDim.width / 2,
    y: -rootDim.height / 2,
    width: rootDim.width,
    height: rootDim.height,
    level: 0,
    color: branchColors[0] || theme.branchColors[0],
    textColor: theme.rootText,
    bgColor: theme.rootBg,
    borderColor: theme.rootBg,
    shape: root.shape || 'rounded',
    children: []
  };
  outNodes.push(rootNode);

  if (!root.children || root.children.length === 0 || root.isExpanded === false) {
    return;
  }

  // Distribute children between right side and left side
  const rightChildren: MindMapNode[] = [];
  const leftChildren: MindMapNode[] = [];

  root.children.forEach((child, idx) => {
    if (idx % 2 === 0) {
      rightChildren.push(child);
    } else {
      leftChildren.push(child);
    }
  });

  // Layout right side
  if (rightChildren.length > 0) {
    layoutSubtree(
      rootNode,
      rightChildren,
      'right',
      1,
      theme,
      outNodes,
      outConnections,
      0, // color index start
      branchColors,
      curveStyle
    );
  }

  // Layout left side
  if (leftChildren.length > 0) {
    layoutSubtree(
      rootNode,
      leftChildren,
      'left',
      1,
      theme,
      outNodes,
      outConnections,
      rightChildren.length, // offset color index
      branchColors,
      curveStyle
    );
  }
}
