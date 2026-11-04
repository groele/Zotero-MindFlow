/**
 * Zotero MindFlow - Constants & Shared Utilities Module
 * Defines core identifiers, schema validation, preferences keys and UI strings.
 */

(function (global) {
  const ADDON_ID = 'mindflow@groele.org';
  const CHROME_ROOT = 'chrome://mindflow/content/';
  const PREF_PREFIX = 'extensions.mindflow.';
  const LLM_PREF_PREFIX = 'extensions.zotero.llmforzotero.';

  const ALLOWED_PREF_MESSAGES = {
    windowMode: (value) => value === 'tab' || value === 'window',
    includeAbstract: (value) => typeof value === 'boolean',
    includeAnnotations: (value) => typeof value === 'boolean',
    includeTags: (value) => typeof value === 'boolean',
    aiMaxPdfPages: (value) => typeof value === 'number' || typeof value === 'string',
  };

  const AI_SECTION_KEYS = [
    'background', 'gap', 'question', 'system', 'conditions',
    'method', 'mechanism', 'findings', 'significance', 'limitations', 'next',
  ];
  const AI_PREPARED_TTL = 15 * 60 * 1000;
  const AI_CANCELLED = 'AI 分析已取消；未创建或归档导图。';
  const AI_OMISSION_MARKER = '[原文区间采样，区间之间有省略]';
  const AI_READING_MODES = ['abstract', 'introduction', 'conclusion', 'key-sections', 'full'];

  const STORAGE_KEYS = {
    INBOX: 'mindflow_inbox_items',
    DOCS_INDEX: 'mindflow_docs_index',
    DOC_PREFIX: 'mindflow_doc_',
    SNAPSHOTS_PREFIX: 'mindflow_snapshots_',
    DELETED_PREFIX: 'mindflow_deleted_doc_',
  };

  const T = (zh, en) => /^en/i.test(String(global.Zotero?.locale || '')) ? en : zh;

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const isCalendarDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };

  const isMindFlowAttachment = (item) => {
    if (!item || typeof item.isAttachment !== 'function' || !item.isAttachment()) return false;
    const filename = String(item.attachmentFilename || '');
    const title = String((item.getField ? item.getField('title') : item.title) || '');
    return filename ? /\.mindflow$/i.test(filename) : /\.mindflow(?:\s|$)/i.test(title);
  };

  const sameWindow = (a, b) => {
    if (!a || !b) return false;
    try { return (a.wrappedJSObject || a) === (b.wrappedJSObject || b); }
    catch (_) { return a === b; }
  };

  const validateHostDocument = (doc) => {
    if (!doc || !/^[a-zA-Z0-9_-]{1,148}$/.test(doc.id) || typeof doc.title !== 'string' ||
        typeof doc.themeId !== 'string' ||
        !Number.isFinite(doc.createdAt) || !Number.isFinite(doc.updatedAt) ||
        (doc.revision !== undefined && (!Number.isSafeInteger(doc.revision) || doc.revision < 0)) ||
        (doc.metadata !== undefined && (!doc.metadata || typeof doc.metadata !== 'object' || Array.isArray(doc.metadata))) ||
        !['mindmap', 'logic-right', 'org-down'].includes(doc.layoutType) ||
        !doc.root || typeof doc.root !== 'object' || Array.isArray(doc.root)) throw new Error('导图身份或结构无效');
    const ids = new Set(), stack = [[doc.root, 0]];
    while (stack.length) {
      const [node, depth] = stack.pop();
      if (!node || typeof node.id !== 'string' || !node.id || typeof node.text !== 'string' ||
          !Array.isArray(node.children) || depth > 256 || ids.size >= 25000 || ids.has(node.id) ||
          (node.note !== undefined && typeof node.note !== 'string') ||
          (node.link !== undefined && typeof node.link !== 'string') ||
          (node.isExpanded !== undefined && typeof node.isExpanded !== 'boolean') ||
          (node.type !== undefined && !['topic', 'text', 'task', 'link', 'image', 'note'].includes(node.type)) ||
          (node.shape !== undefined && !['rounded', 'pill', 'rectangle', 'underline'].includes(node.shape)) ||
          (node.color !== undefined && typeof node.color !== 'string') ||
          (node.textColor !== undefined && typeof node.textColor !== 'string') ||
          (node.tags !== undefined && (!Array.isArray(node.tags) || !node.tags.every(tag => typeof tag === 'string'))) ||
          (node.icons !== undefined && (!Array.isArray(node.icons) || !node.icons.every(icon => typeof icon === 'string')))) {
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
      const relationshipIds = new Set();
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


  const MindFlowConstants = {
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
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MindFlowConstants;
  }
  global.MindFlowConstants = MindFlowConstants;
})(typeof globalThis !== 'undefined' ? globalThis : this);
