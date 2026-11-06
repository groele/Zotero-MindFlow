import { MindMapNode, TaskStatus } from './types';

export function nextTaskStatus(status: TaskStatus): TaskStatus {
  return status === 'todo' ? 'doing' : status === 'doing' ? 'done' : 'todo';
}

// Generate unique short ID
export function generateId(): string {
  return 'node_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}

// Deep clone a node tree, regenerating IDs if requested
export function cloneTree(node: MindMapNode, regenerateIds = false): MindMapNode {
  return {
    ...node,
    id: regenerateIds ? generateId() : node.id,
    tags: node.tags ? [...node.tags] : undefined,
    icons: node.icons ? [...node.icons] : undefined,
    internalLink: node.internalLink ? { ...node.internalLink } : undefined,
    image: node.image ? { ...node.image } : undefined,
    task: node.task ? { ...node.task } : undefined,
    children: node.children ? node.children.map(child => cloneTree(child, regenerateIds)) : []
  };
}

// Find a node by ID in tree
export function findNode(root: MindMapNode, id: string): MindMapNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

// Find parent and index of a node
export function findParent(root: MindMapNode, id: string): { parent: MindMapNode; index: number } | null {
  if (root.id === id) return null;
  for (let i = 0; i < root.children.length; i++) {
    if (root.children[i].id === id) {
      return { parent: root, index: i };
    }
    const found = findParent(root.children[i], id);
    if (found) return found;
  }
  return null;
}
