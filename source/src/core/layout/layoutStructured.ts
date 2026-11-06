import { MindMapNode, LayoutNode, ConnectionCurve, ThemeColors } from '../model/types';
import { measureNode } from './layoutMetrics';
import { layoutSubtree } from './layoutHorizontal';

// 2. Logic Chart Layout (Right only)
export function computeLogicRightLayout(
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
    x: 40,
    y: 0,
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

  layoutSubtree(
    rootNode,
    root.children,
    'right',
    1,
    theme,
    outNodes,
    outConnections,
    0,
    branchColors,
    curveStyle
  );
}

// 3. Organization Structure Layout (Top-Down)
export function computeOrgDownLayout(
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
    y: 0,
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

  layoutOrgSubtree(rootNode, root.children, 1, theme, outNodes, outConnections, branchColors, curveStyle);
}

function calculateOrgSubtreeWidth(node: MindMapNode, level: number, reading = false): number {
  const selfWidth = measureNode(node, level, reading).width;
  if (!node.children || node.children.length === 0 || node.isExpanded === false) {
    return selfWidth;
  }
  const childGap = 24;
  let totalChildWidth = 0;
  for (let i = 0; i < node.children.length; i++) {
    totalChildWidth += calculateOrgSubtreeWidth(node.children[i], level + 1, reading);
    if (i < node.children.length - 1) totalChildWidth += childGap;
  }
  return Math.max(selfWidth, totalChildWidth);
}

function layoutOrgSubtree(
  parentNode: LayoutNode,
  children: MindMapNode[],
  level: number,
  theme: ThemeColors,
  outNodes: LayoutNode[],
  outConnections: ConnectionCurve[],
  branchColors: string[] = theme.branchColors,
  curveStyle: 'bezier' | 'straight' | 'rounded' = 'bezier'
) {
  const childGap = 24;
  const levelYGap = 54;

  const widths = children.map(c => calculateOrgSubtreeWidth(c, level, theme.id === 'paper-reading'));
  const totalWidth = widths.reduce((sum, w) => sum + w, 0) + (children.length - 1) * childGap;

  const parentCenterX = parentNode.x + parentNode.width / 2;
  let currentX = parentCenterX - totalWidth / 2;
  const childY = parentNode.y + parentNode.height + levelYGap;

  children.forEach((child, index) => {
    const subWidth = widths[index];
    const childDim = measureNode(child, level, theme.id === 'paper-reading');
    const branchColor = level === 1
      ? branchColors[index % branchColors.length]
      : parentNode.color;

    const childX = currentX + (subWidth - childDim.width) / 2;

    const layoutChild: LayoutNode = {
      id: child.id,
      node: child,
      x: childX,
      y: childY,
      width: childDim.width,
      height: childDim.height,
      level,
      side: 'down',
      color: child.color || branchColor,
      textColor: child.textColor || theme.nodeText,
      bgColor: theme.nodeBg,
      borderColor: child.color || branchColor,
      shape: child.shape || 'rounded',
      children: [],
      parent: parentNode
    };

    parentNode.children.push(layoutChild);
    outNodes.push(layoutChild);

    // Downward curve
    const x1 = parentNode.x + parentNode.width / 2;
    const y1 = parentNode.y + parentNode.height;
    const x2 = layoutChild.x + layoutChild.width / 2;
    const y2 = layoutChild.y;

    let path = '';
    if (curveStyle === 'straight') {
      path = `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    } else if (curveStyle === 'rounded') {
      const midY = (y1 + y2) / 2;
      path = `M ${x1.toFixed(1)} ${y1.toFixed(1)} V ${midY.toFixed(1)} H ${x2.toFixed(1)} V ${y2.toFixed(1)}`;
    } else {
      // bezier
      const midY = (y1 + y2) / 2;
      path = `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${x1.toFixed(1)} ${midY.toFixed(1)}, ${x2.toFixed(1)} ${midY.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }

    outConnections.push({
      id: `conn_${parentNode.id}_${layoutChild.id}`,
      fromId: parentNode.id,
      toId: layoutChild.id,
      path,
      color: child.color || branchColor,
      strokeWidth: Math.max(1.5, 3 - level * 0.4)
    });

    if (child.children && child.children.length > 0 && child.isExpanded !== false) {
      layoutOrgSubtree(layoutChild, child.children, level + 1, theme, outNodes, outConnections, branchColors, curveStyle);
    }

    currentX += subWidth + childGap;
  });
}
