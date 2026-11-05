/**
 * Zotero MindFlow - Storage Module
 * Manages workspace persistence, atomic I/O, revisions, snapshots and backups.
 */

import type { MindFlowConstants } from './constants.js';

export function createStorageModule(deps: any = {}) {
  const getZotero = () => deps.Zotero || (globalThis as any).Zotero;
  const getPathUtils = () => deps.PathUtils || (globalThis as any).PathUtils;
  const getIOUtils = () => deps.IOUtils || (globalThis as any).IOUtils;
  const getConstants = () => deps.constants || (globalThis as any).MindFlowConstants || {};

  let _workspaceWriteQueue: Promise<any> | null = null;
  let _workspaceRecoveredKeys: Set<string> | null = null;

  const checkedKey = (key: string): string => {
    if (typeof key !== 'string' || !/^mindflow_[a-zA-Z0-9_-]{1,160}$/.test(key)) {
      throw new Error('无效的 MindFlow 存储键');
    }
    return key;
  };

  const getWorkspaceDir = (): string => {
    const Zotero = getZotero();
    const PathUtils = getPathUtils();
    const root = Zotero?.DataDirectory?.dir;
    if (!root) throw new Error('无法确定 Zotero 数据目录；拒绝仅在内存中保存导图');
    return PathUtils.join(root, 'mindflow', 'workspace');
  };

  const fileFor = (key: string): string => {
    const PathUtils = getPathUtils();
    return PathUtils.join(getWorkspaceDir(), `${checkedKey(key)}.json`);
  };

  const readFile = async (key: string): Promise<string | null> => {
    const Zotero = getZotero();
    const IOUtils = getIOUtils();
    const constants = getConstants();
    const validateHostDoc = constants.validateHostDocument;

    if (key.startsWith('mindflow_doc_')) {
      const markerKey = `mindflow_deleted_doc_${key.slice('mindflow_doc_'.length)}`;
      if (await IOUtils.exists(fileFor(markerKey)) || Zotero.Prefs?.get?.(`mindflow.${markerKey}`, true)) return null;
    }
    const path = fileFor(key);
    if (await IOUtils.exists(path)) {
      try {
        const content = await IOUtils.readUTF8(path);
        if (key.startsWith('mindflow_doc_')) {
          const parsed = JSON.parse(content);
          if (key !== `mindflow_doc_${parsed?.id}` || !parsed?.root?.id) throw new Error('导图文件名与内容身份不一致');
          validateHostDoc(parsed);
        }
        return content;
      } catch (error: any) {
        const backup = `${path}.bak`;
        if (await IOUtils.exists(backup)) {
          const backupContent = await IOUtils.readUTF8(backup);
          if (key.startsWith('mindflow_doc_')) {
            const parsed = JSON.parse(backupContent);
            if (key !== `mindflow_doc_${parsed?.id}` || !parsed?.root?.id) throw new Error(`导图主文件和备份身份不一致：${key}`);
            validateHostDoc(parsed);
          }
          if (!_workspaceRecoveredKeys) _workspaceRecoveredKeys = new Set();
          _workspaceRecoveredKeys.add(key);
          return backupContent;
        }
        throw new Error(`导图本地文件不可读取：${key}；${error?.message || error}`);
      }
    }
    try {
      const legacy = Zotero.Prefs?.get?.(`mindflow.${key}`, true);
      if (typeof legacy === 'string' && key.startsWith('mindflow_doc_') &&
          key !== `mindflow_doc_${JSON.parse(legacy)?.id}`) throw new Error('旧版导图存储键与内容 ID 不一致');
      return typeof legacy === 'string' ? legacy : null;
    } catch (error) {
      throw new Error(`旧版导图读取失败：${key}；${error}`);
    }
  };

  async function workspaceStorage(action: string, payload: any = {}): Promise<any> {
    payload = JSON.parse(JSON.stringify(payload));
    const Zotero = getZotero();
    const PathUtils = getPathUtils();
    const IOUtils = getIOUtils();
    const constants = getConstants();
    const validateHostDoc = constants.validateHostDocument;
    const directory = getWorkspaceDir();

    if (action === 'get') return readFile(checkedKey(payload.key));

    if (action === 'mutateInbox') {
      const key = 'mindflow_inbox_items';
      const patch = JSON.parse(JSON.stringify(payload));
      const validate = (items: any[]) => {
        if (!Array.isArray(items)) throw new Error('收集箱数据不是列表');
        const ids = new Set<string>();
        for (const item of items) {
          if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id) ||
              typeof item.text !== 'string' || !Number.isFinite(item.createdAt) ||
              typeof item.isProcessed !== 'boolean') throw new Error('收集箱数据条目无效');
          ids.add(item.id);
        }
      };

      const operation = async () => {
        const raw = await readFile(key);
        const current = raw ? JSON.parse(raw) : [];
        validate(current);
        const map = new Map(current.map((item: any) => [item.id, item]));
        if (Array.isArray(patch.additions)) {
          validate(patch.additions);
          for (const item of patch.additions) map.set(item.id, item);
        }
        if (Array.isArray(patch.updates)) {
          validate(patch.updates);
          for (const item of patch.updates) if (map.has(item.id)) map.set(item.id, { ...(map.get(item.id) as object), ...item });
        }
        if (Array.isArray(patch.removals)) {
          for (const id of patch.removals) if (typeof id === 'string') map.delete(id);
        }
        const updated = [...map.values()].sort((a: any, b: any) => a.createdAt - b.createdAt);
        validate(updated);
        await IOUtils.makeDirectory(directory, { ignoreExisting: true });
        const filePath = fileFor(key);
        const tempPath = `${filePath}.tmp`;
        const value = JSON.stringify(updated);
        await IOUtils.writeUTF8(tempPath, value);
        await IOUtils.move(tempPath, filePath);
        if (await IOUtils.readUTF8(filePath) !== value) throw new Error('收集箱写入校验失败');
        return updated;
      };

      const run = _workspaceWriteQueue ? _workspaceWriteQueue.then(operation, operation) : operation();
      _workspaceWriteQueue = run.catch(() => {});
      return run;
    }

    if (action === 'commitDocument') {
      const doc = JSON.parse(JSON.stringify(payload.doc));
      validateHostDoc(doc);
      const key = `mindflow_doc_${doc.id}`;
      const filePath = fileFor(key);
      const backupPath = `${filePath}.bak`;
      const tempPath = `${filePath}.tmp`;
      const expectedRevision = payload.expectedRevision;
      const force = Boolean(payload.force);

      const operation = async () => {
        const rawCurrent = await readFile(key);
        let currentRev = 0;
        if (rawCurrent) {
          const currentDoc = JSON.parse(rawCurrent);
          currentRev = Number.isSafeInteger(currentDoc?.revision) ? currentDoc.revision : 0;
        }
        if (!force && expectedRevision !== undefined && expectedRevision !== currentRev) {
          throw new Error(`CONFLICT: revision mismatch (expected ${expectedRevision}, found ${currentRev})`);
        }
        const nextRev = (Number.isSafeInteger(expectedRevision) ? expectedRevision : currentRev) + 1;
        doc.revision = nextRev;
        doc.updatedAt = Date.now();
        validateHostDoc(doc);
        const value = JSON.stringify(doc);

        await IOUtils.makeDirectory(directory, { ignoreExisting: true });
        if (await IOUtils.exists(filePath)) {
          await IOUtils.copy(filePath, backupPath);
        }
        await IOUtils.writeUTF8(tempPath, value);
        await IOUtils.move(tempPath, filePath);
        if (await IOUtils.readUTF8(filePath) !== value) {
          if (await IOUtils.exists(backupPath)) await IOUtils.copy(backupPath, filePath);
          throw new Error('导图原子写入校验失败，已尝试恢复备份');
        }
        return doc;
      };

      const run = _workspaceWriteQueue ? _workspaceWriteQueue.then(operation, operation) : operation();
      _workspaceWriteQueue = run.catch(() => {});
      return run;
    }

    if (action === 'set') {
      const key = checkedKey(payload.key);
      const value = String(payload.value ?? '');
      const filePath = fileFor(key);
      const tempPath = `${filePath}.tmp`;
      const operation = async () => {
        await IOUtils.makeDirectory(directory, { ignoreExisting: true });
        await IOUtils.writeUTF8(tempPath, value);
        await IOUtils.move(tempPath, filePath);
        return true;
      };
      const run = _workspaceWriteQueue ? _workspaceWriteQueue.then(operation, operation) : operation();
      _workspaceWriteQueue = run.catch(() => {});
      return run;
    }

    if (action === 'remove') {
      const key = checkedKey(payload.key);
      const filePath = fileFor(key);
      const operation = async () => {
        if (await IOUtils.exists(filePath)) await IOUtils.remove(filePath);
        return true;
      };
      const run = _workspaceWriteQueue ? _workspaceWriteQueue.then(operation, operation) : operation();
      _workspaceWriteQueue = run.catch(() => {});
      return run;
    }

    if (action === 'keys' || action === 'all') {
      const keys = new Set<string>();
      if (await IOUtils.exists(directory)) {
        try {
          const children = await IOUtils.getChildren(directory);
          for (const p of children) {
            const name = PathUtils.filename(p);
            if (name.endsWith('.json') && !name.endsWith('.tmp.json')) {
              const k = name.slice(0, -5);
              if (/^mindflow_[a-zA-Z0-9_-]{1,160}$/.test(k)) keys.add(k);
            }
          }
        } catch (_) {}
      }
      if (action === 'keys') return [...keys];
      const result: Record<string, string> = {};
      for (const k of keys) {
        try {
          const val = await readFile(k);
          if (val !== null) result[k] = val;
        } catch (error) {
          Zotero?.logError?.('[MindFlow] Unreadable workspace record: ' + k + '; ' + error);
        }
      }
      return result;
    }

    throw new Error('不支持的 MindFlow 存储操作');
  }

  return {
    workspaceStorage,
    get pendingWrites() { return _workspaceWriteQueue; },
    checkedKey,
    fileFor,
    readFile,
    getWorkspaceDir,
  };
}

export const MindFlowStorage = {
  createStorageModule,
};
