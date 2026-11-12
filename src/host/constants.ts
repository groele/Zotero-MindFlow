/**
 * Zotero MindFlow - Host Constants & Validation Module
 */

export const ADDON_ID = 'mindflow@groele.org';
export const CHROME_ROOT = 'chrome://mindflow/content/';
export const PREF_PREFIX = 'extensions.mindflow.';
export const LLM_PREF_PREFIX = 'extensions.zotero.llmforzotero.';

export const ALLOWED_PREF_MESSAGES: Record<string, (val: any) => boolean> = {
  windowMode: (value: any) => value === 'tab' || value === 'window',
  includeAbstract: (value: any) => typeof value === 'boolean',
  includeAnnotations: (value: any) => typeof value === 'boolean',
  includeTags: (value: any) => typeof value === 'boolean',
  aiMaxPdfPages: (value: any) => typeof value === 'number' || typeof value === 'string',
};

export const AI_SECTION_KEYS = [
  'background', 'gap', 'question', 'system', 'conditions',
  'method', 'mechanism', 'findings', 'significance', 'limitations', 'next',
];
export const AI_PREPARED_TTL = 15 * 60 * 1000;
export const AI_CANCELLED = 'AI 分析已取消；未创建或归档导图。';
export const AI_OMISSION_MARKER = '[原文区间采样，区间之间有省略]';
export const AI_READING_MODES = ['abstract', 'introduction', 'conclusion', 'key-sections', 'full'];

export const STORAGE_KEYS = {
  INBOX: 'mindflow_inbox_items',
  DOCS_INDEX: 'mindflow_docs_index',
  DOC_PREFIX: 'mindflow_doc_',
  SNAPSHOTS_PREFIX: 'mindflow_snapshots_',
  DELETED_PREFIX: 'mindflow_deleted_doc_',
};

export const T = (zh: string, en: string): string => {
  const loc = typeof (globalThis as any).Zotero !== 'undefined' ? (globalThis as any).Zotero.locale : '';
  return /^en/i.test(String(loc || '')) ? en : zh;
};

export const escapeHtml = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const isCalendarDate = (value: unknown): boolean => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const isMindFlowAttachment = (item: any): boolean => {
  if (!item || typeof item.isAttachment !== 'function' || !item.isAttachment()) return false;
  const filename = String(item.attachmentFilename || '');
  const title = String((item.getField ? item.getField('title') : item.title) || '');
  return filename ? /\.mindflow$/i.test(filename) : /\.mindflow(?:\s|$)/i.test(title);
};

export const sameWindow = (a: any, b: any): boolean => {
  if (!a || !b) return false;
  try { return (a.wrappedJSObject || a) === (b.wrappedJSObject || b); }
  catch (_) { return a === b; }
};

export const validateHostDocument = (doc: any): void => {
  if (!doc || !/^[a-zA-Z0-9_-]{1,148}$/.test(doc.id) || typeof doc.title !== 'string' ||
      typeof doc.themeId !== 'string' ||
      !Number.isFinite(doc.createdAt) || !Number.isFinite(doc.updatedAt) ||
      (doc.revision !== undefined && (!Number.isSafeInteger(doc.revision) || doc.revision < 0)) ||
      (doc.metadata !== undefined && (!doc.metadata || typeof doc.metadata !== 'object' || Array.isArray(doc.metadata))) ||
      !['mindmap', 'logic-right', 'org-down'].includes(doc.layoutType) ||
      !doc.root || typeof doc.root !== 'object' || Array.isArray(doc.root)) throw new Error('导图身份或结构无效');
  const ids = new Set<string>();
  const stack: [any, number][] = [[doc.root, 0]];
  while (stack.length) {
    const [node, depth] = stack.pop()!;
    if (!node || typeof node.id !== 'string' || !node.id || typeof node.text !== 'string' ||
        !Array.isArray(node.children) || depth > 256 || ids.size >= 25000 || ids.has(node.id) ||
        (node.note !== undefined && typeof node.note !== 'string') ||
        (node.link !== undefined && typeof node.link !== 'string') ||
        (node.isExpanded !== undefined && typeof node.isExpanded !== 'boolean') ||
        (node.type !== undefined && !['topic', 'text', 'task', 'link', 'image', 'note'].includes(node.type)) ||
        (node.shape !== undefined && !['rounded', 'pill', 'rectangle', 'underline'].includes(node.shape)) ||
        (node.color !== undefined && typeof node.color !== 'string') ||
        (node.textColor !== undefined && typeof node.textColor !== 'string') ||
        (node.tags !== undefined && (!Array.isArray(node.tags) || !node.tags.every((tag: any) => typeof tag === 'string'))) ||
        (node.icons !== undefined && (!Array.isArray(node.icons) || !node.icons.every((icon: any) => typeof icon === 'string')))) {
      throw new Error('导图节点无效、重复或超出安全上限');
    }
    if (node.internalLink !== undefined && (!node.internalLink || typeof node.internalLink !== 'object' ||
        Array.isArray(node.internalLink) || typeof node.internalLink.documentId !== 'string' || !node.internalLink.documentId ||
        (node.internalLink.nodeId !== undefined && typeof node.internalLink.nodeId !== 'string'))) {
      throw new Error('导图跨导图链接无效');
    }
    if (node.image !== undefined) {
      const image = node.image;
      if (!image || typeof image !== 'object' || typeof image.dataUrl !== 'string' || image.dataUrl.length > 300000 ||
          !/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(image.dataUrl) ||
          !Number.isFinite(image.width) || image.width < 80 || image.width > 480 ||
          !Number.isFinite(image.aspectRatio) || image.aspectRatio <= 0 || image.aspectRatio > 100) {
        throw new Error('导图节点图片格式或尺寸无效');
      }
    }
    if (node.task !== undefined) {
      const task = node.task;
      if (!task || typeof task !== 'object' || Array.isArray(task) ||
          !['todo', 'doing', 'done'].includes(String(task.status)) ||
          (task.priority !== undefined && ![1, 2, 3].includes(task.priority)) ||
          (task.dueDate !== undefined && !isCalendarDate(task.dueDate)) ||
          (task.progress !== undefined && (typeof task.progress !== 'number' || !Number.isFinite(task.progress) || task.progress < 0 || task.progress > 100))) {
        throw new Error('导图节点任务属性无效');
      }
    }
    ids.add(node.id);
    for (const child of node.children) stack.push([child, depth + 1]);
  }
  if (doc.relationships !== undefined) {
    if (!Array.isArray(doc.relationships)) throw new Error('导图关系线数据无效');
    const relationshipIds = new Set<string>();
    for (const relation of doc.relationships) {
      if (!relation || typeof relation !== 'object' || Array.isArray(relation) ||
          typeof relation.id !== 'string' || !relation.id || relationshipIds.has(relation.id) ||
          typeof relation.fromId !== 'string' || typeof relation.toId !== 'string' ||
          (relation.label !== undefined && typeof relation.label !== 'string') ||
          (relation.color !== undefined && typeof relation.color !== 'string') ||
          (relation.style !== undefined && !['dashed', 'solid'].includes(relation.style)) ||
          !ids.has(relation.fromId) || !ids.has(relation.toId)) throw new Error('导图关系线属性无效、目标不存在或 ID 重复');
      relationshipIds.add(relation.id);
    }
  }
};

export const validateHostInbox = (items: any[]) => {
  if (!Array.isArray(items)) throw new Error('收集箱数据不是列表');
  const ids = new Set<string>();
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !item.id || typeof item.text !== 'string' ||
        !Number.isFinite(item.createdAt) || typeof item.isProcessed !== 'boolean' ||
        ['title', 'url', 'favIconUrl'].some(field => item[field] !== undefined && typeof item[field] !== 'string')) {
      throw new Error('收集箱包含格式无效的记录');
    }
    if (ids.has(item.id)) throw new Error('收集箱包含重复的记录 ID');
    ids.add(item.id);
  }
  return items;
};

export const validateHostSnapshots = (snapshots: any[], docId: string) => {
  if (!Array.isArray(snapshots)) throw new Error('快照存储数据损坏');
  const ids = new Set<string>();
  for (const snapshot of snapshots) {
    if (!snapshot || typeof snapshot.id !== 'string' || !snapshot.id ||
        snapshot.docId !== docId || typeof snapshot.title !== 'string' ||
        typeof snapshot.data !== 'string' || !Number.isFinite(snapshot.timestamp) || snapshot.timestamp < 0 ||
        (snapshot.nodeCount !== undefined && (!Number.isSafeInteger(snapshot.nodeCount) || snapshot.nodeCount < 1))) {
      throw new Error('快照身份或属性无效');
    }
    if (ids.has(snapshot.id)) throw new Error('快照包含重复的 ID');
    ids.add(snapshot.id);
    const doc = JSON.parse(snapshot.data);
    validateHostDocument(doc);
    if (doc.id !== docId) throw new Error('快照身份与所属导图不一致');
  }
  return snapshots;
};

export const toDocSummary = (doc: any) => {
  const unlinked = Boolean(doc?.metadata?.mindflowUnlinkedContainer);
  return {
    id: doc.id,
    title: doc.title,
    updatedAt: Number.isFinite(doc.updatedAt) ? doc.updatedAt : 0,
    zoteroItemKey: unlinked ? undefined : doc?.metadata?.zoteroItemKey,
    zoteroItemTitle: unlinked ? undefined : doc?.metadata?.zoteroItemTitle,
    zoteroAttachmentKey: doc?.metadata?.zoteroAttachmentKey,
    zoteroAttachmentLibraryID: doc?.metadata?.zoteroAttachmentLibraryID,
  };
};

export const fileStamp = async (IOUtils: any, path: string): Promise<string | null> => {
  if (typeof IOUtils?.stat !== 'function') return null;
  try {
    const s = await IOUtils.stat(path);
    return s ? `${s.size}:${s.lastModified}` : null;
  } catch (_) { return null; }
};

export const listWorkspaceDocs = async ({ keys, directory, Zotero, PathUtils, IOUtils, fileFor, readFile, cache, state }: any) => {
  const cachePath = PathUtils.join(directory, 'mindflow-doc-index.cache.json');
  const hasStat = typeof IOUtils?.stat === 'function';
  if (!state.indexLoaded && hasStat) {
    state.indexLoaded = true;
    try {
      if (await IOUtils.exists(cachePath)) {
        for (const [id, entry] of JSON.parse(await IOUtils.readUTF8(cachePath))) {
          if (id && entry?.stamp && entry?.summary) cache.set(id, entry);
        }
      }
    } catch (_) {}
  }
  const summaries: any[] = [];
  let dirty = false;
  for (const key of keys) {
    if (!key.startsWith('mindflow_doc_')) continue;
    const id = key.slice('mindflow_doc_'.length);
    if (keys.has(`mindflow_deleted_doc_${id}`) || Zotero?.Prefs?.get?.(`mindflow.mindflow_deleted_doc_${id}`, true)) continue;
    try {
      const stamp = await fileStamp(IOUtils, fileFor(key));
      const cached = stamp ? cache.get(id) : null;
      if (cached && cached.stamp === stamp) { summaries.push(cached.summary); continue; }
      const raw = await readFile(key);
      if (!raw) continue;
      const summary = toDocSummary(JSON.parse(raw));
      if (stamp) { cache.set(id, { stamp, summary }); dirty = true; }
      summaries.push(summary);
    } catch (_) {
      summaries.push({ id, title: `数据损坏（${id}）`, updatedAt: 0, corrupt: true });
    }
  }
  if (dirty && hasStat) {
    try {
      await IOUtils.makeDirectory(directory, { createAncestors: true, ignoreExisting: true });
      await IOUtils.writeUTF8(cachePath, JSON.stringify([...cache.entries()]), { tmpPath: `${cachePath}.tmp`, flush: true });
    } catch (_) {}
  }
  return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
};

export const MindFlowConstants = {
  ADDON_ID,
  CHROME_ROOT,
  PREF_PREFIX,
  LLM_PREF_PREFIX,
  ALLOWED_PREF_MESSAGES,
  AI_SECTION_KEYS,
  AI_PREPARED_TTL,
  AI_CANCELLED,
  AI_OMISSION_MARKER,
  AI_READING_MODES,
  STORAGE_KEYS,
  T,
  escapeHtml,
  isCalendarDate,
  isMindFlowAttachment,
  sameWindow,
  validateHostDocument,
  validateHostInbox,
  validateHostSnapshots,
  toDocSummary,
  fileStamp,
  listWorkspaceDocs,
};

(function (global: any) {
  global.MindFlowConstants = MindFlowConstants;
})(typeof globalThis !== 'undefined' ? globalThis : this);
