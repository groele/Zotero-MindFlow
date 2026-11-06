import { safeExternalUrl } from '../../core/model/links';
import { isSafeNodeImage } from '../../core/model/nodeImage';
import { extractDoi } from '../../services/zotero/zoteroBridge';
import type { MindMapNode, LayoutNode } from '../../core/model/types';

/** Pure derived values for a node card, extracted from the render component. */
export const resolveNodeCardDerived = (node: MindMapNode) => {
  const rawDoi = extractDoi(node.link) || extractDoi(node.text) || extractDoi(node.note);
  const externalUrl = safeExternalUrl(node.link) || (rawDoi ? `https://doi.org/${rawDoi}` : null);
  return {
    externalUrl,
    isDoi: Boolean(rawDoi),
    nodeImage: isSafeNodeImage(node.image) ? node.image : null,
  };
};

/** Loose context object shared by the NodeCard render sub-components. */
export interface NodeCardCtx {
  [key: string]: any;
  node: MindMapNode;
  layoutNode: LayoutNode;
}
