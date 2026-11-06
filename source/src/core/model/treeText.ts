import { MindMapNode } from './types';
import { cloneTree, findNode } from './treeCore';

// Replace text in a specific node
export function replaceNodeText(
  root: MindMapNode,
  targetId: string,
  fromText: string,
  toText: string
): MindMapNode {
  if (!fromText) return root;
  const newRoot = cloneTree(root);
  const target = findNode(newRoot, targetId);
  if (target) {
    target.text = replaceLiteral(target.text, fromText, toText).text;
    if (target.note) target.note = replaceLiteral(target.note, fromText, toText).text;
  }
  return newRoot;
}

// Replace text across the entire mind map tree
export function replaceAllNodeText(
  root: MindMapNode,
  fromText: string,
  toText: string
): { newRoot: MindMapNode; count: number } {
  if (!fromText) return { newRoot: root, count: 0 };
  const newRoot = cloneTree(root);
  let count = 0;

  function walk(node: MindMapNode) {
    const text = replaceLiteral(node.text, fromText, toText);
    count += text.count;
    node.text = text.text;
    if (node.note) {
      const note = replaceLiteral(node.note, fromText, toText);
      count += note.count;
      node.note = note.text;
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  walk(newRoot);
  return { newRoot, count };
}

export function replaceLiteral(text: string, query: string, replacement: string): { text: string; count: number } {
  if (!query) return { text, count: 0 };
  const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  let count = 0;
  return { text: text.replace(pattern, () => { count++; return replacement; }), count };
}

// Reveal a search/link target while preserving the target's own fold state.
export function expandAncestors(root: MindMapNode, id: string): MindMapNode {
  if (root.id === id) return root;
  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i];
    if (!findNode(child, id)) continue;
    const expanded = expandAncestors(child, id);
    if (root.isExpanded !== false && expanded === child) return root;
    const children = [...root.children]; children[i] = expanded;
    return { ...root, isExpanded: true, children };
  }
  return root;
}
