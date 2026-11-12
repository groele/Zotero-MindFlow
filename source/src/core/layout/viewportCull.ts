import type { ConnectionCurve, LayoutNode, ViewportTransform } from '../model/types';

export interface WorldViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function computeWorldViewport(
  viewport: ViewportTransform,
  containerWidth: number,
  containerHeight: number,
  overscanPx = 400
): WorldViewportBounds | null {
  if (!Number.isFinite(containerWidth) || !Number.isFinite(containerHeight) ||
      containerWidth <= 0 || containerHeight <= 0 ||
      !Number.isFinite(viewport.scale) || viewport.scale <= 0) {
    return null;
  }
  const pad = overscanPx / viewport.scale;
  return {
    minX: -viewport.x / viewport.scale - pad,
    maxX: (containerWidth - viewport.x) / viewport.scale + pad,
    minY: -viewport.y / viewport.scale - pad,
    maxY: (containerHeight - viewport.y) / viewport.scale + pad,
  };
}

function rectsIntersect(
  ax1: number, ay1: number, ax2: number, ay2: number,
  b: WorldViewportBounds
): boolean {
  return ax2 >= b.minX && ax1 <= b.maxX && ay2 >= b.minY && ay1 <= b.maxY;
}

export function cullViewportNodes(
  nodes: LayoutNode[],
  worldBounds: WorldViewportBounds | null,
  options: { threshold?: number; pinnedIds?: Set<string> } = {}
): LayoutNode[] {
  const threshold = options.threshold ?? 120;
  if (!worldBounds || nodes.length <= threshold) return nodes;
  const pinned = options.pinnedIds;
  return nodes.filter((n) =>
    Boolean(pinned?.has(n.id)) ||
    rectsIntersect(n.x, n.y, n.x + n.width, n.y + n.height, worldBounds)
  );
}

export function cullViewportConnections(
  connections: ConnectionCurve[],
  nodes: LayoutNode[],
  worldBounds: WorldViewportBounds | null,
  threshold = 120
): ConnectionCurve[] {
  if (!worldBounds || nodes.length <= threshold) return connections;
  const byId = new Map<string, LayoutNode>();
  for (const n of nodes) byId.set(n.id, n);
  return connections.filter((conn) => {
    const from = byId.get(conn.fromId);
    const to = byId.get(conn.toId);
    if (!from || !to) return false;
    return rectsIntersect(
      Math.min(from.x, to.x),
      Math.min(from.y, to.y),
      Math.max(from.x + from.width, to.x + to.width),
      Math.max(from.y + from.height, to.y + to.height),
      worldBounds
    );
  });
}
