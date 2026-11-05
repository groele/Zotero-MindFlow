/**
 * Zotero MindFlow - backup envelope validation and snapshot schemas.
 * Kept separate from BackupService so the persistence layer stays reviewable.
 */
import type { MindMapDocument, InboxItem } from '../../core/model/types';
import { APP_VERSION } from '../../core/version';
import { validateInboxItems } from './inboxService';
import { validateMindMapDocument } from './documentValidation';
import { validateResearchPresetConfig, type ResearchPreset } from '../zotero/researchPresets';

export interface DocSnapshot {
  id: string;
  docId: string;
  title: string;
  timestamp: number;
  nodeCount: number;
  data: string; // JSON stringified document
}

export interface WorkspaceBackupData {
  version: string;
  schemaVersion?: number;
  exportedAt: number;
  documents: MindMapDocument[];
  inboxItems: InboxItem[];
  snapshots: DocSnapshot[];
  researchPresets?: ResearchPreset[];
}

export interface StorageQuotaInfo {
  usedBytes: number;
  maxBytes: number;
  percent: number;
}

export interface WorkspaceRestorePreview {
  documents: number;
  replacing: string[];
  adding: string[];
  inboxItems: number;
  snapshots: number;
  researchPresets?: number;
}

export const SNAPSHOT_STORAGE_KEY = 'mindflow_snapshots_';
export const DEFAULT_MAX_SNAPSHOTS_PER_DOC = 20;
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;



export function countNodes(root: any): number {
  if (!root) return 0;
  let count = 0;
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    count += 1;
    if (Array.isArray(node.children)) {
      for (const child of node.children) stack.push(child);
    }
  }
  return count;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}


export function validateWorkspaceData(value: unknown): WorkspaceBackupData {
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > MAX_BACKUP_BYTES) {
    throw new Error('备份文件超过 20 MB 安全恢复上限；请减少历史快照或分批导出导图 JSON');
  }
  if (!isRecord(value) || !Array.isArray(value.documents)) {
    throw new Error('无效的 MindFlow 备份文件结构');
  }

  // Version and timestamp verification (P2-01)
  if (value.version !== undefined) {
    if (typeof value.version !== 'string' || !value.version.trim()) {
      throw new Error('备份文件缺少有效的版本标识');
    }
    const backupMajor = parseInt(value.version.replace(/^v/i, '').split('.')[0], 10);
    const currentMajor = parseInt(APP_VERSION.replace(/^v/i, '').split('.')[0], 10);
    if (Number.isFinite(backupMajor) && Number.isFinite(currentMajor) && backupMajor > currentMajor) {
      throw new Error(`备份来自更高版本的 MindFlow (v${value.version})，当前版本 (v${APP_VERSION}) 无法保证兼容，请先升级插件后再恢复`);
    }
  }
  if (value.schemaVersion !== undefined) {
    if (!Number.isSafeInteger(value.schemaVersion) || (value.schemaVersion as number) < 1) {
      throw new Error('备份文件缺少有效的架构版本标识');
    }
    if ((value.schemaVersion as number) > 2) {
      throw new Error(`备份架构版本 (v${value.schemaVersion}) 高于当前支持的最大架构版本 (v2)，请先升级插件后再恢复`);
    }
  }
  if (value.exportedAt !== undefined && (!Number.isFinite(value.exportedAt) || (value.exportedAt as number) <= 0)) {
    throw new Error('备份文件缺少有效的导出时间戳');
  }

  const documentIds = new Set<string>();
  for (let i = 0; i < value.documents.length; i += 1) {
    const doc = validateMindMapDocument(value.documents[i], `第 ${i + 1} 篇导图`);
    if (documentIds.has(doc.id)) throw new Error(`备份中存在重复的导图 ID：${doc.id}`);
    documentIds.add(doc.id);
  }

  if (value.inboxItems !== undefined) {
    validateInboxItems(value.inboxItems);
  }

  if (value.snapshots !== undefined) {
    const snapshots = validateSnapshots(value.snapshots);
    for (const snapshot of snapshots) {
      if (!documentIds.has(snapshot.docId)) throw new Error('备份中包含脱离所属导图的版本快照');
    }
  }

  if (value.researchPresets !== undefined) {
    if (!Array.isArray(value.researchPresets)) {
      throw new Error('备份中的研读预设数据不是列表');
    }
    const presetIds = new Set<string>();
    for (const preset of value.researchPresets) {
      if (!isRecord(preset) || typeof preset.id !== 'string' || !/^preset_[\w-]{1,100}$/.test(preset.id) ||
          presetIds.has(preset.id) || typeof preset.name !== 'string' || !preset.name.trim() || preset.name.length > 60) {
        throw new Error('备份包含格式无效的研读预设');
      }
      presetIds.add(preset.id);
      validateResearchPresetConfig(preset);
    }
  }

  return value as unknown as WorkspaceBackupData;
}

/** Validate envelopes and payloads before rendering or mutating snapshot storage. */
export function validateSnapshots(value: unknown, docId?: string): DocSnapshot[] {
  if (!Array.isArray(value)) throw new Error('版本快照数据不是列表');
  const ids = new Set<string>();
  for (const snapshot of value) {
    if (!isRecord(snapshot) || typeof snapshot.id !== 'string' || !snapshot.id ||
        typeof snapshot.docId !== 'string' || !snapshot.docId ||
        (docId !== undefined && snapshot.docId !== docId) ||
        typeof snapshot.title !== 'string' || typeof snapshot.data !== 'string' ||
        !Number.isFinite(snapshot.timestamp) || (snapshot.timestamp as number) < 0 ||
        (snapshot.nodeCount !== undefined && (!Number.isSafeInteger(snapshot.nodeCount) || (snapshot.nodeCount as number) < 1))) {
      throw new Error('版本快照身份或属性无效');
    }
    if (ids.has(snapshot.id)) throw new Error('版本快照包含重复的 ID');
    ids.add(snapshot.id);
    const doc = validateMindMapDocument(JSON.parse(snapshot.data), '版本快照');
    if (doc.id !== snapshot.docId) throw new Error('版本快照所属导图与内部文档 ID 不一致');
  }
  return value as DocSnapshot[];
}
