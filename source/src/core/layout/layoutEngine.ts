import { MindMapNode, LayoutNode, ConnectionCurve, LayoutType, ThemeColors } from '../model/types';
import { isSafeNodeImage } from '../model/nodeImage';
import { wrapReadingText } from './layoutMetrics';
import { computeMindmapLayout } from './layoutMindmap';
import { computeLogicRightLayout, computeOrgDownLayout } from './layoutStructured';

export { measureNode, wrapReadingText } from './layoutMetrics';

interface LayoutResult {
  nodes: LayoutNode[];
  connections: ConnectionCurve[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface LayoutOptions {
  rainbowBranches?: boolean;
  curveStyle?: 'bezier' | 'straight' | 'rounded';
}

export const RAINBOW_BRANCH_COLORS = [
  '#3b82f6', // 经典蓝
  '#10b981', // 翡翠绿
  '#f59e0b', // 暖琥珀
  '#ec4899', // 霓虹粉
  '#8b5cf6', // 优雅紫
  '#06b6d4', // 清透青
  '#f97316', // 活力橙
  '#14b8a6', // 松柏青
  '#e11d48', // 胭脂红
  '#6366f1', // 靛青蓝
];

export function computeLayout(
  root: MindMapNode,
  layoutType: LayoutType,
  theme: ThemeColors,
  options?: LayoutOptions
): LayoutResult {
  const nodes: LayoutNode[] = [];
  const connections: ConnectionCurve[] = [];
  const reading = theme.id === 'paper-reading';
  const curveStyle = reading ? 'rounded' : options?.curveStyle || 'bezier';
  const branchColors = !reading && options?.rainbowBranches ? RAINBOW_BRANCH_COLORS : theme.branchColors;

  switch (layoutType) {
    case 'mindmap':
      computeMindmapLayout(root, theme, nodes, connections, branchColors, curveStyle);
      break;
    case 'logic-right':
      computeLogicRightLayout(root, theme, nodes, connections, branchColors, curveStyle);
      break;
    case 'org-down':
      computeOrgDownLayout(root, theme, nodes, connections, branchColors, curveStyle);
      break;
  }

  for (const n of nodes) {
    let extras = (n.node.icons?.length || 0) * 22 + (n.node.tags?.length || 0) * 36;
    if (n.node.note) extras += 20;
    if (n.node.link) extras += 20;
    if (n.node.internalLink) extras += 20;
    if (n.node.task) extras += 26;
    if (!isSafeNodeImage(n.node.image)) {
      const padding = reading ? 28 : n.level === 0 ? 48 : n.level === 1 ? 36 : 28;
      const lines = wrapReadingText(n.node.text || ' ', Math.max(30, n.width - padding - extras));
      if (reading || lines.length > 1) n.textLines = lines;
    }
    n.readingStyle = reading;
    if (reading) {
      n.bgColor = n.level === 0 ? theme.rootBg : n.level === 1 ? '#e2efea' : 'transparent';
      n.borderColor = n.level === 1 ? '#c7ded6' : 'transparent';
    }
  }
  if (reading) {
    connections.forEach(connection => { connection.strokeWidth = 1; });
  }
  // Calculate overall bounds
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.x + n.width > maxX) maxX = n.x + n.width;
    if (n.y < minY) minY = n.y;
    if (n.y + n.height > maxY) maxY = n.y + n.height;
  }

  if (nodes.length === 0) {
    minX = -100; maxX = 100; minY = -50; maxY = 50;
  }

  return {
    nodes,
    connections,
    bounds: { minX, maxX, minY, maxY }
  };
}
