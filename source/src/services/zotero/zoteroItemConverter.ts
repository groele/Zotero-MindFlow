import { MindMapNode } from '../../core/model/types';
import { generateId } from '../../core/model/treeOps';
import { ZoteroItemData } from './zoteroItemData';
import { getZoteroPref } from './zoteroEnvironment';

export interface ConvertZoteroOptions {
  includeAbstract?: boolean;
  includeAnnotations?: boolean;
  includeTags?: boolean;
}

/**
 * Convert a ZoteroItemData into a structured MindMapNode branch
 */
export function convertZoteroItemToNode(
  item: ZoteroItemData,
  options?: ConvertZoteroOptions
): MindMapNode {
  const includeAbstract = options?.includeAbstract ?? getZoteroPref('includeAbstract', true);
  const includeAnnotations = options?.includeAnnotations ?? getZoteroPref('includeAnnotations', true);

  const authorSnippet = item.authors.length > 0
    ? (item.authors.length > 2 ? `${item.authors[0]} 等` : item.authors.join(' & '))
    : '';
  const yearSnippet = item.year ? `(${item.year})` : '';
  const headerParts = [yearSnippet, item.title, authorSnippet].filter(Boolean).join(' ');

  const children: MindMapNode[] = [];

  // 1. Publication & Metadata
  if (item.publication || item.doi) {
    const metaChildren: MindMapNode[] = [];
    if (item.publication) {
      metaChildren.push({
        id: generateId(),
        text: `期刊/来源: ${item.publication}`,
        children: [],
      });
    }
    if (item.doi) {
      metaChildren.push({
        id: generateId(),
        text: `DOI: ${item.doi}`,
        link: `https://doi.org/${item.doi}`,
        children: [],
      });
    }
    children.push({
      id: generateId(),
      text: '📚 出版信息',
      isExpanded: true,
      children: metaChildren,
    });
  }

  // 2. Abstract
  if (includeAbstract && item.abstract) {
    children.push({
      id: generateId(),
      text: '💡 核心摘要',
      note: item.abstract,
      isExpanded: false,
      children: [],
    });
  }

  // 3. Annotations & Highlights
  if (includeAnnotations && item.annotations && item.annotations.length > 0) {
    const annoChildren: MindMapNode[] = item.annotations.map((anno) => ({
      id: generateId(),
      text: (anno.pageLabel ? `[P.${anno.pageLabel}] ` : '') + ((anno.text || anno.comment || '批注').slice(0, 160)),
      note: [anno.text, anno.comment ? `批注说明: ${anno.comment}` : ''].filter(Boolean).join('\n\n'),
      link: anno.uri,
      color: anno.color,
      children: [],
    }));
    children.push({
      id: generateId(),
      text: `✏️ 阅读批注 (${item.annotations.length})`,
      isExpanded: false,
      children: annoChildren,
    });
  }

  // 4. Notes
  if (includeAnnotations && item.notes && item.notes.length > 0) {
    const noteChildren: MindMapNode[] = item.notes.map((entry) => {
      const text = typeof entry === 'string' ? entry : entry.text;
      return {
        id: generateId(),
        text: text.length > 80 ? `${text.slice(0, 80)}...` : text,
        note: text,
        link: typeof entry === 'string' ? undefined : entry.uri,
        children: [],
      };
    });
    children.push({
      id: generateId(),
      text: `📝 关联笔记 (${item.notes.length})`,
      isExpanded: true,
      children: noteChildren,
    });
  }

  return {
    id: generateId(),
    text: headerParts || item.title,
    note: [
      `标题: ${item.title}`,
      item.authors.length ? `作者: ${item.authors.join(', ')}` : null,
      item.publication ? `刊物: ${item.publication}` : null,
      item.year ? `年代: ${item.year}` : null,
      item.doi ? `DOI: ${item.doi}` : null,
      includeAbstract && item.abstract ? `\n摘要:\n${item.abstract}` : null,
      item.tags && item.tags.length ? `\n标签: ${item.tags.join(', ')}` : null,
    ].filter(Boolean).join('\n'),
    link: item.zoteroUri,
    color: '#0284c7',
    isExpanded: true,
    children,
  };
}
