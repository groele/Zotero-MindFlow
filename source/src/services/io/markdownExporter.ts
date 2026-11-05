import { MindMapNode, TaskInfo } from '../../core/model/types';
import { generateId } from '../../core/model/treeOps';
import {
  ExportDownload,
  confirmTextOnlyExport,
  encodeMarkdownNote,
  decodeMarkdownNote,
  downloadBlob,
} from './exportHelpers';

/**
 * Export to Markdown with task checkboxes and metadata
 */
export function exportToMarkdown(root: MindMapNode, title: string, download?: ExportDownload): void {
  if (!confirmTextOnlyExport(root)) return;
  const lines: string[] = [`# ${root.text}\n`];
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
  const mdContent = lines.join('\n');
  downloadBlob(new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' }), `${title}.md`, download);
}

/**
 * Parse Markdown into MindMapNode tree (with task checkbox support)
 */
export function importFromMarkdown(mdContent: string): MindMapNode {
  const lines = mdContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    return { id: generateId(), text: '导入的思维导图', children: [] };
  }

  let rootText = '中心主题';
  let startIndex = 0;
  if (lines[0].startsWith('# ')) {
    rootText = lines[0].replace(/^#+\s*/, '').trim();
    startIndex = 1;
  }

  const root: MindMapNode = {
    id: generateId(),
    text: rootText,
    isExpanded: true,
    children: []
  };

  interface StackItem {
    node: MindMapNode;
    depth: number;
  }

  const stack: StackItem[] = [{ node: root, depth: -1 }];

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i];
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

    // Extract link: [🔗](url) or [text](url)
    const linkMatch = cleanText.match(/\[(?:🔗|link|url|.*?)\]\((https?:\/\/[^\s)]+|file:\/\/[^\s)]+|zotero:\/\/[^\s)]+|attachment:\/\/[^\s)]+)\)/i);
    if (linkMatch) {
      link = linkMatch[1];
      cleanText = cleanText.replace(linkMatch[0], '').trim();
    }

    // Extract tags: #tag1 #tag2
    const tags: string[] = [];
    const tagMatches = cleanText.matchAll(/#([^\s#]+)/g);
    for (const m of tagMatches) {
      tags.push(m[1]);
    }
    cleanText = cleanText.replace(/#[^\s#]+/g, '').trim();

    const node: MindMapNode = {
      id: generateId(),
      text: cleanText || '未命名分支',
      note,
      link,
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

  return root;
}
