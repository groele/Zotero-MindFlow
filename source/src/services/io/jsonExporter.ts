import { MindMapDocument, MindMapNode } from '../../core/model/types';
import { generateId } from '../../core/model/treeOps';
import { ExportDownload, downloadBlob } from './exportHelpers';

/**
 * Export as formatted JSON (supports both MindMapDocument and bare MindMapNode)
 */
export function exportToJSON(
  data: MindMapDocument | MindMapNode,
  fallbackTitle = 'mindmap',
  download?: ExportDownload
): void {
  let doc: MindMapDocument;
  if ('root' in data && 'themeId' in data) {
    doc = data as MindMapDocument;
  } else {
    doc = {
      id: generateId(),
      title: fallbackTitle,
      root: data as MindMapNode,
      themeId: 'classic-light',
      layoutType: 'mindmap',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
  const jsonStr = JSON.stringify(doc, null, 2);
  downloadBlob(new Blob([jsonStr], { type: 'application/json' }), `${doc.title}.mindflow.json`, download);
}
