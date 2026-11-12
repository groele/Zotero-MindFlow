import { InternalNodeLink, MindMapNode, RelationshipLink, TaskInfo } from '../../core/model/types';
import { generateId } from '../../core/model/treeOps';
import {
  ExportDownload,
  confirmTextOnlyExport,
  encodeMarkdownNote,
  decodeMarkdownNote,
  downloadBlob,
} from './exportHelpers';

interface MarkdownNodeMeta {
  id?: string;
  internalLink?: InternalNodeLink;
  tags?: string[];
}

function formatNodeMetaComment(node: MindMapNode, relNodeIds: Set<string>): string {
  const meta: MarkdownNodeMeta = {};
  if (relNodeIds.has(node.id)) meta.id = node.id;
  if (node.internalLink && typeof node.internalLink.documentId === 'string') meta.internalLink = node.internalLink;
  if (node.text.includes('#')) meta.tags = node.tags ? [...node.tags] : [];
  if (!meta.id && !meta.internalLink && meta.tags === undefined) return '';
  return ` <!-- mf-node: ${encodeMarkdownNote(JSON.stringify(meta))} -->`;
}

/**
 * Export to Markdown with task checkboxes and metadata
 */
export function exportToMarkdown(
  root: MindMapNode,
  title: string,
  download?: ExportDownload,
  options?: { relationships?: RelationshipLink[] }
): void {
  if (!confirmTextOnlyExport(root)) return;
  const relationships = Array.isArray(options?.relationships) ? options!.relationships : [];
  const relNodeIds = new Set<string>();
  for (const rel of relationships) {
    if (rel?.fromId) relNodeIds.add(rel.fromId);
    if (rel?.toId) relNodeIds.add(rel.toId);
  }
  const rootMeta = formatNodeMetaComment(root, relNodeIds);
  const rootTags = root.tags?.length ? ` ${root.tags.map(t => `#${t}`).join(' ')}` : '';
  const lines: string[] = [`# ${root.text}${rootTags}${rootMeta}\n`];
  if (root.note) lines.push(`<!-- 备注: ${encodeMarkdownNote(root.note)} -->\n`);

  function walk(node: MindMapNode, depth: number) {
    for (const child of node.children) {
      const indent = '  '.repeat(depth);
      let taskPrefix = '';
      if (child.task) {
        taskPrefix = child.task.status === 'done' ? '[x] ' : '[ ] ';
      }
      let line = `${indent}- ${taskPrefix}${child.text}`;
      if (child.link) {
        line += ` [🔗](${child.link})`;
      }
      if (child.tags && child.tags.length > 0) {
        line += ` ${child.tags.map(t => `#${t}`).join(' ')}`;
      }
      line += formatNodeMetaComment(child, relNodeIds);
      if (child.note) {
        line += ` <!-- 备注: ${encodeMarkdownNote(child.note)} -->`;
      }
      lines.push(line);
      if (child.children && child.children.length > 0) {
        walk(child, depth + 1);
      }
    }
  }

  walk(root, 0);
  if (relationships.length > 0) {
    lines.push(`<!-- mf-rels: ${encodeMarkdownNote(JSON.stringify(relationships))} -->`);
  }
  const mdContent = lines.join('\n');
  downloadBlob(new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' }), `${title}.md`, download);
}

function parseNodeMetaAndTags(raw: string): {
  cleanText: string;
  meta: MarkdownNodeMeta | null;
  tags: string[];
} {
  let cleanText = raw;
  let meta: MarkdownNodeMeta | null = null;
  const metaMatch = cleanText.match(/<!--\s*mf-node:\s*(.*?)\s*-->/);
  if (metaMatch) {
    cleanText = cleanText.replace(metaMatch[0], '').trim();
    try {
      const parsed = JSON.parse(decodeMarkdownNote(metaMatch[1]));
      if (parsed && typeof parsed === 'object') meta = parsed;
    } catch { /* ignore malformed metadata comment */ }
  }
  if (meta && Array.isArray(meta.tags)) {
    const exportedSuffix = meta.tags.map(t => `#${t}`).join(' ');
    if (exportedSuffix && cleanText.endsWith(exportedSuffix)) {
      cleanText = cleanText.slice(0, cleanText.length - exportedSuffix.length).trim();
    }
    return { cleanText, meta, tags: meta.tags.filter(t => typeof t === 'string' && t.length > 0) };
  }
  const tags: string[] = [];
  const trailingTags = cleanText.match(/(?:^|\s)((?:#(?![0-9]+(?:\s|$))[^\s#]+)(?:\s+#(?![0-9]+(?:\s|$))[^\s#]+)*)$/);
  if (trailingTags) {
    for (const m of trailingTags[1].matchAll(/#([^\s#]+)/g)) tags.push(m[1]);
    cleanText = cleanText.slice(0, cleanText.length - trailingTags[0].length).trim();
  }
  return { cleanText, meta, tags };
}

/**
 * Parse Markdown into MindMapNode tree and optional cross-branch relationships
 */
export function importMarkdownDocument(mdContent: string): { root: MindMapNode; relationships?: RelationshipLink[] } {
  const lines = mdContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    return { root: { id: generateId(), text: '导入的思维导图', children: [] } };
  }

  let rootText = '中心主题';
  let rootMeta: MarkdownNodeMeta | null = null;
  let rootTags: string[] = [];
  let startIndex = 0;
  if (lines[0].startsWith('# ')) {
    const parsedRoot = parseNodeMetaAndTags(lines[0].replace(/^#+\s*/, '').trim());
    rootText = parsedRoot.cleanText || '中心主题';
    rootMeta = parsedRoot.meta;
    rootTags = parsedRoot.tags;
    startIndex = 1;
  }

  const idMap = new Map<string, string>();
  const rootId = generateId();
  if (rootMeta?.id) idMap.set(rootMeta.id, rootId);
  const root: MindMapNode = {
    id: rootId,
    text: rootText,
    ...(rootMeta?.internalLink ? { internalLink: rootMeta.internalLink } : {}),
    ...(rootTags.length > 0 ? { tags: rootTags } : {}),
    isExpanded: true,
    children: []
  };

  interface StackItem {
    node: MindMapNode;
    depth: number;
  }

  const stack: StackItem[] = [{ node: root, depth: -1 }];
  let rawRelationships: RelationshipLink[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i];
    const relMatch = rawLine.trim().match(/^<!--\s*mf-rels:\s*(.*?)\s*-->$/);
    if (relMatch) {
      try {
        const parsed = JSON.parse(decodeMarkdownNote(relMatch[1]));
        if (Array.isArray(parsed)) rawRelationships = parsed;
      } catch { /* ignore */ }
      continue;
    }
    const standaloneNote = rawLine.trim().match(/^<!-- 备注: (.*?) -->$/) || rawLine.trim().match(/^<!--\s*备注:\s*(.*?)\s*-->$/);
    if (standaloneNote) {
      stack[stack.length - 1].node.note = decodeMarkdownNote(standaloneNote[1]);
      continue;
    }
    const leadingSpaces = rawLine.match(/^\s*/)?.[0].length || 0;
    const depth = Math.floor(leadingSpaces / 2);

    let cleanText = rawLine.trim().replace(/^[-*+]\s*/, '').replace(/^#+\s*/, '');
    let note: string | undefined;
    let link: string | undefined;
    let task: TaskInfo | undefined;

    // Checkbox support: [x] or [ ]
    if (/^\[x\]\s+/i.test(cleanText)) {
      task = { status: 'done' };
      cleanText = cleanText.replace(/^\[x\]\s+/i, '');
    } else if (/^\[ \]\s+/.test(cleanText)) {
      task = { status: 'todo' };
      cleanText = cleanText.replace(/^\[ \]\s+/, '');
    }

    // Extract inline note: <!-- 备注: ... -->
    const noteMatch = cleanText.match(/<!-- 备注: (.*?) -->/) || cleanText.match(/<!--\s*备注:\s*(.*?)\s*-->/);
    if (noteMatch) {
      note = decodeMarkdownNote(noteMatch[1]);
      cleanText = cleanText.replace(noteMatch[0], '').trim();
    }

    // Extract metadata & trailing tags before link or clean text
    const { cleanText: textWithoutMetaAndTags, meta, tags } = parseNodeMetaAndTags(cleanText);
    cleanText = textWithoutMetaAndTags;

    // Extract link: [🔗](url) or [text](url)
    const linkMatch = cleanText.match(/\[(?:🔗|link|url|.*?)\]\((https?:\/\/[^\s)]+|file:\/\/[^\s)]+|zotero:\/\/[^\s)]+|attachment:\/\/[^\s)]+|mailto:[^\s)]+|doi:\s*10\.\d{4,9}\/[^\s)]+|10\.\d{4,9}\/[^\s)]+)\)/i);
    if (linkMatch) {
      link = linkMatch[1];
      cleanText = cleanText.replace(linkMatch[0], '').trim();
    }

    const nodeId = generateId();
    if (meta?.id) idMap.set(meta.id, nodeId);
    const node: MindMapNode = {
      id: nodeId,
      text: cleanText || '未命名分支',
      note,
      link,
      internalLink: meta?.internalLink,
      tags: tags.length > 0 ? tags : undefined,
      task,
      isExpanded: true,
      children: []
    };

    // Pop stack until we find the parent with depth < current depth
    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].node;
    parent.children.push(node);
    stack.push({ node, depth });
  }

  const relationships = rawRelationships
    .filter((rel) => rel && typeof rel.fromId === 'string' && typeof rel.toId === 'string' && idMap.has(rel.fromId) && idMap.has(rel.toId))
    .map((rel) => ({
      ...rel,
      id: generateId(),
      fromId: idMap.get(rel.fromId)!,
      toId: idMap.get(rel.toId)!,
    }));

  return relationships.length > 0 ? { root, relationships } : { root };
}

export function importFromMarkdown(mdContent: string): MindMapNode {
  return importMarkdownDocument(mdContent).root;
}
