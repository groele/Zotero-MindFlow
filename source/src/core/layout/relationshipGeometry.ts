import type { LayoutNode, RelationshipLink } from '../model/types';

type Point = { x: number; y: number };
export type LayoutBounds = { minX: number; maxX: number; minY: number; maxY: number };
export interface RelationshipCurve {
  link: RelationshipLink;
  start: Point;
  control: Point;
  end: Point;
  path: string;
  labelX: number;
  labelY: number;
  labelWidth: number;
}

function edgePoint(node: LayoutNode, toward: Point): Point {
  const center = { x: node.x + node.width / 2, y: node.y + node.height / 2 };
  const dx = toward.x - center.x, dy = toward.y - center.y;
  const ratio = 1 / Math.max(Math.abs(dx) / (node.width / 2), Math.abs(dy) / (node.height / 2), 1);
  return { x: center.x + dx * ratio, y: center.y + dy * ratio };
}

/** Visible endpoints only; one geometry calculation for canvas and all exports. */
export function relationshipCurves(nodes: LayoutNode[], links: RelationshipLink[]): RelationshipCurve[] {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const curves: RelationshipCurve[] = [];
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const node of nodes) {
    left = Math.min(left, node.x); right = Math.max(right, node.x + node.width);
    top = Math.min(top, node.y); bottom = Math.max(bottom, node.y + node.height);
  }
  for (const link of links) {
    const from = byId.get(link.fromId), to = byId.get(link.toId);
    if (!from || !to || from === to) continue;
    const a = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
    const b = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
    const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 1;
    const curvature = Math.min(Math.max(dist * 0.2, 30), 80);
    const control = { x: (a.x + b.x) / 2 - dy / dist * curvature, y: (a.y + b.y) / 2 + dx / dist * curvature };
    const labelWidth = Array.from(link.label || '关联').length * 12 + 20;
    let start: Point, end: Point;
    if (Math.max(from.x, to.x) < Math.min(from.x + from.width, to.x + to.width)) {
      // Same column: route outside the cards, with room for the label.
      const toRight = a.x + b.x >= 0;
      start = { x: toRight ? from.x + from.width : from.x, y: a.y };
      end = { x: toRight ? to.x + to.width : to.x, y: b.y };
      const labelX = (toRight ? right + labelWidth / 2 + 24 : left - labelWidth / 2 - 24);
      control.x = 2 * labelX - (start.x + end.x) / 2;
      control.y = (a.y + b.y) / 2;
    } else if (Math.max(from.y, to.y) < Math.min(from.y + from.height, to.y + to.height)) {
      // Same row: use the free space above/below instead of crossing cards.
      const below = a.y + b.y >= 0;
      start = { x: a.x, y: below ? from.y + from.height : from.y };
      end = { x: b.x, y: below ? to.y + to.height : to.y };
      control.x = (a.x + b.x) / 2;
      control.y = 2 * (below ? bottom + 40 : top - 40) - (start.y + end.y) / 2;
    } else {
      start = edgePoint(from, control); end = edgePoint(to, control);
    }
    curves.push({ link, start, control, end,
      path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
      labelX: 0.25 * start.x + 0.5 * control.x + 0.25 * end.x,
      labelY: 0.25 * start.y + 0.5 * control.y + 0.25 * end.y,
      labelWidth,
    });
  }
  return curves;
}

export function relationshipBounds(bounds: LayoutBounds, curves: RelationshipCurve[]): LayoutBounds {
  const result = { ...bounds };
  for (const curve of curves) {
    for (const axis of ['x', 'y'] as const) {
      const denominator = curve.start[axis] - 2 * curve.control[axis] + curve.end[axis];
      const t = denominator ? (curve.start[axis] - curve.control[axis]) / denominator : 0;
      if (t > 0 && t < 1) {
        const point = (1-t)**2*curve.start[axis] + 2*(1-t)*t*curve.control[axis] + t*t*curve.end[axis];
        if (axis === 'x') { result.minX = Math.min(result.minX, point - 12); result.maxX = Math.max(result.maxX, point + 12); }
        else { result.minY = Math.min(result.minY, point - 12); result.maxY = Math.max(result.maxY, point + 12); }
      }
    }
    result.minX = Math.min(result.minX, curve.labelX - curve.labelWidth / 2);
    result.maxX = Math.max(result.maxX, curve.labelX + curve.labelWidth / 2);
    result.minY = Math.min(result.minY, curve.labelY - 16);
    result.maxY = Math.max(result.maxY, curve.labelY + 16);
  }
  return result;
}
