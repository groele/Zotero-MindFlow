import { MindMapNode, LayoutNode, ConnectionCurve, ThemeColors, NodeShape } from '../model/types';
import { isSafeNodeImage } from '../model/nodeImage';
import { measureNode } from './layoutMetrics';

// Subtree hierarchy height calculator
function calculateSubtreeHeight(node: MindMapNode, level: number, reading = false): number {
  const selfHeight = measureNode(node, level, reading).height;
  if (!node.children || node.children.length === 0 || node.isExpanded === false) {
    return selfHeight;
  }
  const childGap = reading ? 12 : 16;
  let totalChildrenHeight = 0;
  for (let i = 0; i < node.children.length; i++) {
    totalChildrenHeight += calculateSubtreeHeight(node.children[i], level + 1, reading);
    if (i < node.children.length - 1) totalChildrenHeight += childGap;
  }
  return Math.max(selfHeight, totalChildrenHeight);
}

// Recursively place horizontal subtree
export function layoutSubtree(
  parentNode: LayoutNode,
  children: MindMapNode[],
  side: 'left' | 'right',
  level: number,
  theme: ThemeColors,
  outNodes: LayoutNode[],
  outConnections: ConnectionCurve[],
  branchColorOffset = 0,
  branchColors: string[] = theme.branchColors,
  curveStyle: 'bezier' | 'straight' | 'rounded' = 'bezier'
) {
  const reading = theme.id === 'paper-reading';
  const childGap = reading ? 12 : 16;
  const levelXGap = reading ? (level === 1 ? 88 : 48) : 64;

  // Compute heights of each child subtree
  const heights = children.map(c => calculateSubtreeHeight(c, level, reading));
  const totalHeight = heights.reduce((sum, h) => sum + h, 0) + (children.length - 1) * childGap;

  const parentCenterY = parentNode.y + parentNode.height / 2;
  let currentY = parentCenterY - totalHeight / 2;

  children.forEach((child, index) => {
    const subHeight = heights[index];
    const childDim = measureNode(child, level, theme.id === 'paper-reading');

    // Color: level 1 gets new color; subsequent levels inherit parent color
    const branchColor = level === 1
      ? branchColors[(branchColorOffset + index) % branchColors.length]
      : parentNode.color;

    let childX = 0;
    if (side === 'right') {
      childX = parentNode.x + parentNode.width + levelXGap;
    } else {
      childX = parentNode.x - levelXGap - childDim.width;
    }

    const childY = currentY + (subHeight - childDim.height) / 2;

    const childShape: NodeShape = child.shape || (isSafeNodeImage(child.image) || level === 1 ? 'rounded' : 'underline');

    const layoutChild: LayoutNode = {
      id: child.id,
      node: child,
      x: childX,
      y: childY,
      width: childDim.width,
      height: childDim.height,
      level,
      side,
      color: child.color || branchColor,
      textColor: child.textColor || theme.nodeText,
      bgColor: theme.nodeBg,
      borderColor: child.color || branchColor,
      shape: childShape,
      children: [],
      parent: parentNode
    };

    parentNode.children.push(layoutChild);
    outNodes.push(layoutChild);

    // Build connection line
    const curve = createHorizontalCurve(parentNode, layoutChild, side, child.color || branchColor, curveStyle);
    outConnections.push(curve);

    // Recurse for deeper children
    if (child.children && child.children.length > 0 && child.isExpanded !== false) {
      layoutSubtree(
        layoutChild,
        child.children,
        side,
        level + 1,
        theme,
        outNodes,
        outConnections,
        branchColorOffset,
        branchColors,
        curveStyle
      );
    }

    currentY += subHeight + childGap;
  });
}

function createHorizontalCurve(
  from: LayoutNode,
  to: LayoutNode,
  side: 'left' | 'right',
  color: string,
  curveStyle: 'bezier' | 'straight' | 'rounded' = 'bezier'
): ConnectionCurve {
  let x1 = 0, y1 = 0, x2 = 0, y2 = 0;

  if (side === 'right') {
    x1 = from.x + from.width;
    y1 = from.y + from.height / 2;
    x2 = to.x;
    y2 = to.y + to.height / 2;
  } else {
    x1 = from.x;
    y1 = from.y + from.height / 2;
    x2 = to.x + to.width;
    y2 = to.y + to.height / 2;
  }

  let path = '';
  if (curveStyle === 'straight') {
    path = `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  } else if (curveStyle === 'rounded') {
    const midX = (x1 + x2) / 2;
    const radius = Math.min(5, Math.abs(y2 - y1) / 2);
    const signY = Math.sign(y2 - y1), signX = Math.sign(x2 - x1);
    path = `M ${x1.toFixed(1)} ${y1.toFixed(1)} H ${midX.toFixed(1)} V ${(y2 - signY * radius).toFixed(1)} Q ${midX.toFixed(1)} ${y2.toFixed(1)} ${(midX + signX * radius).toFixed(1)} ${y2.toFixed(1)} H ${x2.toFixed(1)}`;
  } else {
    // bezier
    const dx = x2 - x1;
    const cp1x = x1 + dx * 0.45;
    const cp1y = y1;
    const cp2x = x1 + dx * 0.55;
    const cp2y = y2;
    path = `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }

  return {
    id: `conn_${from.id}_${to.id}`,
    fromId: from.id,
    toId: to.id,
    path,
    color,
    strokeWidth: Math.max(1.5, 3.2 - to.level * 0.5)
  };
}
