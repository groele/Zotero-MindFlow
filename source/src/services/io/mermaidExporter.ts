import { MindMapNode } from '../../core/model/types';
import { ExportDownload, confirmTextOnlyExport, downloadBlob } from './exportHelpers';

/**
 * Sanitize text for Mermaid mindmap node labels
 */
export function sanitizeMermaidText(text: string): string {
  const singleLine = text.replace(/[\r\n]+/g, ' ').trim();
  const escaped = singleLine.replace(/\\/g, '\\\\').replace(/"/g, "'");
  return escaped || '未命名主题';
}

/**
 * Generate Mermaid mindmap source code
 */
export function generateMermaidMindmap(root: MindMapNode): string {
  const lines: string[] = ['mindmap'];
  lines.push(`  root(("${sanitizeMermaidText(root.text)}"))`);

  function walk(node: MindMapNode, depth: number) {
    for (const child of node.children) {
      const indent = '  '.repeat(depth);
      lines.push(`${indent}("${sanitizeMermaidText(child.text)}")`);
      if (child.children && child.children.length > 0) {
        walk(child, depth + 1);
      }
    }
  }

  walk(root, 2);
  return lines.join('\n') + '\n';
}

/**
 * Export to Mermaid Mindmap syntax (.mmd)
 */
export function exportToMermaid(root: MindMapNode, title: string, download?: ExportDownload): void {
  if (!confirmTextOnlyExport(root)) return;
  const mmdContent = generateMermaidMindmap(root);
  downloadBlob(new Blob([mmdContent], { type: 'text/vnd.mermaid;charset=utf-8;' }), `${title}.mmd`, download);
}
