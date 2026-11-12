import { MindMapDocument } from '../../core/model/types';
import { createDefaultDocument } from '../../core/model/sampleData';
import { isZoteroWorkspace, zoteroWorkspaceStorage } from '../zotero/zoteroBridge';

const STORAGE_KEYS = {
  DOC_PREFIX: 'mindflow_doc_',
  DELETED_PREFIX: 'mindflow_deleted_doc_',
  DOC_INDEX: 'mindflow_docs_index',
  ACTIVE_DOC_ID: 'mindflow_active_doc_id',
};

import { safeStorage } from './safeStorage';
import { documentSource } from '../zotero/documentIdentity';
import { validateMindMapDocument } from './documentValidation';

import { storageErrorMessage, summaryForDoc, revisionOf, isDocumentSummary, isStoredDocument, type DocumentSummary } from './storageHelpers';
export type { DocumentSummary };

// Storage wrapper for Zotero 10 workspace files and dev fallback
async function getItem(key: string): Promise<string | null> {
  if (isZoteroWorkspace()) return await zoteroWorkspaceStorage('get', { key }) as string | null;
  return Promise.resolve(safeStorage.getItem(key));
}

async function setItem(key: string, value: string): Promise<void> {
  return setItems({ [key]: value });
}

async function setItems(items: Record<string, unknown>): Promise<void> {
  if (isZoteroWorkspace()) {
    const strings = Object.fromEntries(Object.entries(items).map(([key, value]) =>
      [key, typeof value === 'string' ? value : JSON.stringify(value)]));
    try {
      await zoteroWorkspaceStorage('setMany', { items: strings });
    } catch (error) {
      const message = storageErrorMessage(error);
      if (message.startsWith('MINDFLOW_REVISION_CONFLICT:')) {
        throw new DocumentConflictError(message.slice('MINDFLOW_REVISION_CONFLICT:'.length).trim());
      }
      throw error;
    }
    return;
  }
  for (const [key, value] of Object.entries(items)) {
    safeStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
}

async function removeItem(key: string): Promise<void> {
  if (isZoteroWorkspace()) {
    await zoteroWorkspaceStorage('remove', { key });
    return;
  }
  safeStorage.removeItem(key);
}

async function getAllItems(): Promise<Record<string, unknown>> {
  if (isZoteroWorkspace()) return await zoteroWorkspaceStorage('getAll') as Record<string, unknown>;
  return safeStorage.getAll();
}

export class StorageService {
  private static knownRevisions = new Map<string, number>();
  private static writeQueue: Promise<unknown> = Promise.resolve();

  public static async getActiveDocument(): Promise<MindMapDocument> {
    const activeId = await getItem(STORAGE_KEYS.ACTIVE_DOC_ID);
    if (activeId) {
      if (activeId === 'doc_welcome_default') {
        await this.deleteDocument('doc_welcome_default');
      } else {
        const doc = await this.getDocument(activeId);
        if (doc && doc.id !== 'doc_welcome_default') return doc;
      }
    }

    // If no active doc or not found, try to get the first valid one in index
    const index = await this.getDocumentList();
    const validItems = index.filter((item) => item.id !== 'doc_welcome_default');
    if (validItems.length > 0) {
      const firstDoc = await this.getDocument(validItems[0].id);
      if (firstDoc) {
        await this.setActiveDocumentId(firstDoc.id);
        return firstDoc;
      }
    }

    // Otherwise create default clean blank document
    const defaultDoc = createDefaultDocument();
    const saved = await this.saveDocument(defaultDoc);
    await this.setActiveDocumentId(saved.id);
    return saved;
  }

  public static async setActiveDocumentId(id: string): Promise<void> {
    await setItem(STORAGE_KEYS.ACTIVE_DOC_ID, id);
  }

  public static async getDocument(id: string, options: { trackRevision?: boolean } = {}): Promise<MindMapDocument | null> {
    if (await getItem(STORAGE_KEYS.DELETED_PREFIX + id)) return null;
    const raw = await getItem(STORAGE_KEYS.DOC_PREFIX + id);
    if (!raw) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`导图 JSON 数据损坏：${id}`);
    }
    if (!isStoredDocument(parsed) || parsed.id !== id) throw new Error('导图文件名与内容 ID 不一致；已停止打开');
    validateMindMapDocument(parsed, '本地导图');
    if (options.trackRevision !== false) this.knownRevisions.set(id, revisionOf(parsed));
    return parsed;
  }

  public static async resolveWorkspaceOpen(documentId: string, payload: unknown): Promise<MindMapDocument> {
    const incoming = validateMindMapDocument(payload, '恢复工作区');
    if (incoming.id !== documentId) throw new Error('恢复目标与文档 ID 不一致；已停止打开');
    const canonical = await this.getDocument(documentId);
    if (!canonical) throw new Error('恢复目标不存在或已删除；已停止打开');
    return canonical;
  }

  public static async getDocumentBySource(incoming: MindMapDocument): Promise<MindMapDocument | null> {
    const source = documentSource(incoming);
    if (!source) return null;
    const { zoteroAttachmentKey: attKey, zoteroAttachmentLibraryID: attLib } = incoming.metadata || {};
    const matches: MindMapDocument[] = [];
    for (const summary of await this.getDocumentList()) {
      const summarySourceMatch = summary.zoteroAttachmentKey === attKey && Number(summary.zoteroAttachmentLibraryID) === Number(attLib);
      const legacySummary = summary.zoteroAttachmentKey === undefined && !isZoteroWorkspace() && !summary.corrupt;
      if (!summarySourceMatch && !legacySummary) continue;
      let candidate;
      try { candidate = await this.getDocument(summary.id, { trackRevision: false }); }
      catch (error) { console.warn('[MindFlow] Source lookup skipped unreadable document:', summary.id, error); continue; }
      if (candidate && documentSource(candidate) === source) matches.push(candidate);
    }
    if (matches.length > 1) throw new Error('同一 Zotero 附件关联了多份本地导图；请在工作区核对后解除多余关联');
    return matches[0] || null;
  }

  public static async saveDocument(doc: MindMapDocument, options: { force?: boolean } = {}): Promise<MindMapDocument> {
    const expectedRevision = this.knownRevisions.get(doc.id) ?? revisionOf(doc);
    const saved = await this.saveDocumentDirect(doc, expectedRevision, options.force === true);
    this.knownRevisions.set(doc.id, revisionOf(saved));
    return saved;
  }

  /** Called by the extension service worker; the queue serializes all document writes. */
  public static saveDocumentDirect(
    doc: MindMapDocument,
    expectedRevision: number,
    forceOrOptions: boolean | 'restore-deleted' | { force?: boolean | 'restore-deleted'; preserveUpdatedAt?: boolean } = false
  ): Promise<MindMapDocument> {
    const opts = typeof forceOrOptions === 'object' && forceOrOptions !== null
      ? forceOrOptions
      : { force: forceOrOptions, preserveUpdatedAt: false };
    const operation = this.writeQueue.then(() =>
      this.writeDocumentNow(doc, expectedRevision, opts.force ?? false, opts.preserveUpdatedAt === true)
    );
    this.writeQueue = operation.catch(() => undefined);
    return operation;
  }

  private static async writeDocumentNow(
    doc: MindMapDocument,
    expectedRevision: number,
    force: boolean | 'restore-deleted',
    preserveUpdatedAt = false
  ): Promise<MindMapDocument> {
    validateMindMapDocument(doc, '待保存导图');
    if (isZoteroWorkspace()) {
      try {
        const saved = await zoteroWorkspaceStorage('commitDocument', {
          doc, expectedRevision, force: force === true, restoreDeleted: force === 'restore-deleted', preserveUpdatedAt,
        }) as MindMapDocument;
        this.knownRevisions.set(doc.id, revisionOf(saved));
        return saved;
      } catch (error) {
        const message = storageErrorMessage(error);
        if (message.startsWith('MINDFLOW_REVISION_CONFLICT:')) throw new DocumentConflictError(message.slice('MINDFLOW_REVISION_CONFLICT:'.length));
        throw error;
      }
    }
    const current = await this.getDocument(doc.id, { trackRevision: false });
    const currentRevision = revisionOf(current);
    if (!current && force === false && await getItem(STORAGE_KEYS.DELETED_PREFIX + doc.id)) {
      throw new DocumentConflictError('此导图已在其他窗口删除；请保留为新导图或从备份恢复');
    }
    if (force !== true && currentRevision !== expectedRevision) {
      throw new DocumentConflictError(`导图已被其他窗口修改（当前版本 ${currentRevision}，本窗口版本 ${expectedRevision}）`);
    }
    const updatedAt = preserveUpdatedAt && Number.isFinite(doc.updatedAt) ? doc.updatedAt : Date.now();
    const savedDoc = { ...doc, revision: currentRevision + 1, updatedAt };
    const index = await this.getDocumentList();
    const existingIdx = index.findIndex(item => item.id === savedDoc.id);
    const summary = summaryForDoc(savedDoc, savedDoc.updatedAt);

    if (existingIdx >= 0) {
      index[existingIdx] = summary;
    } else {
      index.unshift(summary);
    }

    // A single atomic storage write prevents the document and its index entry
    // from diverging when quota or I/O errors occur between separate writes.
    await setItems({
      [STORAGE_KEYS.DOC_PREFIX + savedDoc.id]: JSON.stringify(savedDoc),
      [STORAGE_KEYS.DOC_INDEX]: JSON.stringify(index),
    });
    if (force) await removeItem(STORAGE_KEYS.DELETED_PREFIX + savedDoc.id);
    this.knownRevisions.set(doc.id, savedDoc.revision);
    return savedDoc;
  }

  public static async getDocumentList(): Promise<DocumentSummary[]> {
    if (isZoteroWorkspace()) {
      const summaries = await zoteroWorkspaceStorage('listDocs');
      return Array.isArray(summaries) ? summaries : [];
    }
    const raw = await getItem(STORAGE_KEYS.DOC_INDEX);
    if (raw) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
      if (Array.isArray(parsed)) {
        const seenIds = new Set<string>();
        const valid = parsed.filter((item): item is DocumentSummary => {
          if (!isDocumentSummary(item) || !/^[a-zA-Z0-9_-]{1,148}$/.test(item.id) || seenIds.has(item.id)) return false;
          seenIds.add(item.id);
          return true;
        });
        if (valid.length > 0) {
          // Check for missing keys without parsing map contents. Keep corrupted
          // records discoverable instead of silently dropping their index rows.
          // A deletion marker is authoritative even if physical cleanup or index
          // maintenance was interrupted after the tombstone had been written.
          const visible = await Promise.all(valid.map(async (summary) => (
            await getItem(STORAGE_KEYS.DELETED_PREFIX + summary.id) ? null : summary
          )));
          const existing = (await Promise.all(visible.map(async (summary) => (
            summary && await getItem(STORAGE_KEYS.DOC_PREFIX + summary.id) !== null ? summary : null
          )))).filter((summary): summary is DocumentSummary => summary !== null);
          if (existing.length === parsed.length && existing.length === valid.length &&
              existing.every((item, i) => item.id === valid[i].id)) return existing;
          await setItem(STORAGE_KEYS.DOC_INDEX, JSON.stringify(existing));
          return existing;
        }
      }
    }

    const allItems = await getAllItems();
    const rebuilt: DocumentSummary[] = [];
    for (const [key, value] of Object.entries(allItems)) {
      if (!key.startsWith(STORAGE_KEYS.DOC_PREFIX) || typeof value !== 'string') continue;
      const id = key.slice(STORAGE_KEYS.DOC_PREFIX.length);
      if (!/^[a-zA-Z0-9_-]{1,148}$/.test(id) || await getItem(STORAGE_KEYS.DELETED_PREFIX + id)) continue;
      try {
        const parsed: unknown = JSON.parse(value);
        if (!isStoredDocument(parsed) || parsed.id !== id) throw new Error('导图文件名与内容 ID 不一致');
        rebuilt.push(summaryForDoc(parsed));
      } catch {
        // Keep damaged records visible so users can see why they will not open.
        rebuilt.push({ id, title: `数据损坏（${id}）`, updatedAt: 0 });
      }
    }
    rebuilt.sort((a, b) => b.updatedAt - a.updatedAt);
    await setItem(STORAGE_KEYS.DOC_INDEX, JSON.stringify(rebuilt));
    return rebuilt;
  }

  public static async deleteDocument(id: string): Promise<void> {
    const current = await this.getDocument(id, { trackRevision: false });
    if (!current) return;
    const expectedRevision = revisionOf(current);
    await this.deleteDocumentDirect(id, expectedRevision);
    this.knownRevisions.delete(id);
  }

  public static deleteDocumentDirect(id: string, expectedRevision: number): Promise<void> {
    const operation = this.writeQueue.then(async () => {
      if (isZoteroWorkspace()) {
        try {
          await zoteroWorkspaceStorage('deleteDocument', { id, expectedRevision });
          if (await getItem(STORAGE_KEYS.ACTIVE_DOC_ID) === id) {
            await removeItem(STORAGE_KEYS.ACTIVE_DOC_ID);
          }
        }
        catch (error) {
          const message = storageErrorMessage(error);
          if (message.startsWith('MINDFLOW_REVISION_CONFLICT:')) throw new DocumentConflictError(message.slice('MINDFLOW_REVISION_CONFLICT:'.length));
          throw error;
        }
        this.knownRevisions.delete(id);
        return;
      }
      const current = await this.getDocument(id, { trackRevision: false });
      if (!current || revisionOf(current) !== expectedRevision) throw new DocumentConflictError('导图已被其他窗口修改或删除，请刷新列表后重试');
      const index = (await this.getDocumentList()).filter(item => item.id !== id);
      await setItem(STORAGE_KEYS.DELETED_PREFIX + id, String(Date.now()));
      await removeItem(STORAGE_KEYS.DOC_PREFIX + id);
      await setItem(STORAGE_KEYS.DOC_INDEX, JSON.stringify(index));
      if (await getItem(STORAGE_KEYS.ACTIVE_DOC_ID) === id) {
        await removeItem(STORAGE_KEYS.ACTIVE_DOC_ID);
      }
    });
    this.writeQueue = operation.catch(() => undefined);
    return operation;
  }
}

export class DocumentConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentConflictError';
  }
}
