import { MindMapNode, TaskInfo } from '../../core/model/types';
import { generateId } from '../../core/model/treeOps';
import {
  ExportDownload,
  confirmTextOnlyExport,
  escapeXml,
  unescapeXml,
  downloadBlob,
} from './exportHelpers';

function renderOutline(node: MindMapNode, indent: string): string {
  const textAttr = `text="${escapeXml(node.text)}"`;
  const noteAttr = node.note ? ` _note="${escapeXml(node.note)}"` : '';
  const linkAttr = node.link ? ` url="${escapeXml(node.link)}"` : '';
  const statusAttr = node.task ? ` _status="${node.task.status}"` : '';

  if (!node.children || node.children.length === 0) {
    return `${indent}<outline ${textAttr}${noteAttr}${linkAttr}${statusAttr} />\n`;
  }

  let res = `${indent}<outline ${textAttr}${noteAttr}${linkAttr}${statusAttr}>\n`;
  for (const child of node.children) {
    res += renderOutline(child, indent + '  ');
  }
  res += `${indent}</outline>\n`;
  return res;
}

export function exportToOPML(root: MindMapNode, title: string, download?: ExportDownload): void {
  if (!confirmTextOnlyExport(root)) return;
  const opmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${escapeXml(title)}</title>
  </head>
  <body>
${renderOutline(root, '    ')}  </body>
</opml>`;

  downloadBlob(new Blob([opmlContent], { type: 'text/xml;charset=utf-8' }), `${title}.opml`, download);
}

export function parseOPMLString(xmlContent: string): MindMapNode {
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      const parseError = xmlDoc.getElementsByTagName('parsererror');
      if (parseError.length) throw new Error('OPML XML 格式无效');
      if (parseError.length === 0) {
        const body = xmlDoc.getElementsByTagName('body')[0];
        if (body) {
          const directOutlines = Array.from(body.children).filter(el => el.tagName.toLowerCase() === 'outline');
          if (directOutlines.length > 0) {
            function parseElement(el: Element): MindMapNode {
              const text = el.getAttribute('text') || el.getAttribute('title') || '未命名节点';
              const note = el.getAttribute('_note') || el.getAttribute('note') || undefined;
              const link = el.getAttribute('url') || el.getAttribute('xmlUrl') || undefined;
              const statusAttr = el.getAttribute('_status') || el.getAttribute('status');
              let task: TaskInfo | undefined;
              if (statusAttr === 'done' || statusAttr === 'completed') {
                task = { status: 'done' };
              } else if (statusAttr === 'doing') {
                task = { status: 'doing' };
              } else if (statusAttr === 'todo' || statusAttr === 'incomplete') {
                task = { status: 'todo' };
              }

              const childElements = Array.from(el.children).filter(c => c.tagName.toLowerCase() === 'outline');
              return {
                id: generateId(),
                text,
                note,
                link,
                task,
                isExpanded: true,
                children: childElements.map(parseElement),
              };
            }

            if (directOutlines.length === 1) {
              return parseElement(directOutlines[0]);
            } else {
              const titleEl = xmlDoc.getElementsByTagName('title')[0];
              const rootText = titleEl ? (titleEl.textContent || '思维导图') : '思维导图';
              return {
                id: generateId(),
                text: rootText,
                isExpanded: true,
                children: directOutlines.map(parseElement),
              };
            }
          }
        }
      }
      throw new Error('OPML 缺少有效的 body 或 outline 内容');
    } catch (error) {
      throw new Error(`OPML 导入失败：${(error as Error).message}`);
    }
  }

  // Pure regex parser fallback for Node.js / unit test environments
  const tagRegex = /<\/?outline(\s+[^>]*)?\/?>/gi;
  const roots: MindMapNode[] = [];
  const stack: MindMapNode[] = [];
  if (!/<opml\b/i.test(xmlContent) || !/<body\b/i.test(xmlContent) || !/<\/body\s*>/i.test(xmlContent) || !/<\/opml\s*>/i.test(xmlContent)) {
    throw new Error('OPML 缺少有效的文档结构');
  }

  let match;
  while ((match = tagRegex.exec(xmlContent)) !== null) {
    const fullTag = match[0];
    const isClosing = fullTag.startsWith('</');
    const isSelfClosing = fullTag.endsWith('/>');

    if (isClosing) {
      if (!stack.length) throw new Error('OPML outline 闭合标签不匹配');
      stack.pop();
      continue;
    }

    const attrsStr = match[1] || '';
    const getAttr = (name: string): string | undefined => {
      const r = new RegExp(`${name}=["']([^"']*)["']`, 'i');
      const m = attrsStr.match(r);
      return m ? unescapeXml(m[1]) : undefined;
    };

    const text = getAttr('text') || getAttr('title') || '未命名节点';
    const note = getAttr('_note') || getAttr('note');
    const link = getAttr('url') || getAttr('xmlUrl');
    const statusAttr = getAttr('_status') || getAttr('status');
    let task: TaskInfo | undefined;
    if (statusAttr === 'done' || statusAttr === 'completed') {
      task = { status: 'done' };
    } else if (statusAttr === 'doing') {
      task = { status: 'doing' };
    } else if (statusAttr === 'todo' || statusAttr === 'incomplete') {
      task = { status: 'todo' };
    }

    const newNode: MindMapNode = {
      id: generateId(),
      text,
      note,
      link,
      task,
      isExpanded: true,
      children: [],
    };

    if (stack.length === 0) {
      roots.push(newNode);
    } else {
      const parent = stack[stack.length - 1];
      parent.children.push(newNode);
    }

    if (!isSelfClosing) {
      stack.push(newNode);
    }
  }

  if (stack.length || !roots.length) throw new Error('OPML outline 未闭合或内容为空');
  if (roots.length === 1) {
    return roots[0];
  }

  const titleMatch = xmlContent.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? unescapeXml(titleMatch[1].trim()) : '思维导图';

  return {
    id: generateId(),
    text: title || '思维导图',
    isExpanded: true,
    children: roots,
  };
}

export function importFromOPML(xmlContent: string): MindMapNode {
  return parseOPMLString(xmlContent);
}
