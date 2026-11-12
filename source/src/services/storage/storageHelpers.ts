import { MindMapDocument } from '../../core/model/types';

export interface DocumentSummary {
  id: string;
  title: string;
  updatedAt: number;
  nodeCount?: number;
  zoteroItemKey?: string;
  zoteroItemTitle?: string;
  zoteroAttachmentKey?: string;
  zoteroAttachmentLibraryID?: number;
  corrupt?: boolean;
}

// Gecko can return Error objects from the host compartment. instanceof Error
// is false across that boundary, so read the message by shape instead.
export function storageErrorMessage(error: unknown): string {
  return error && typeof (error as any).message === 'string' ? (error as any).message : String(error);
}

export function isDocumentSummary(value: unknown): value is DocumentSummary {
  if (!value || typeof value !== 'object') return false;
  const summary = value as Partial<DocumentSummary>;
  return typeof summary.id === 'string' && typeof summary.title === 'string' && Number.isFinite(summary.updatedAt);
}

export function isStoredDocument(value: unknown): value is MindMapDocument {
  if (!value || typeof value !== 'object') return false;
  const doc = value as Partial<MindMapDocument>;
  return Boolean(
    typeof doc.id === 'string' && doc.id &&
    typeof doc.title === 'string' &&
    doc.root && typeof doc.root === 'object' &&
    typeof doc.root.id === 'string' &&
    typeof doc.root.text === 'string' &&
    Array.isArray(doc.root.children)
  );
}

export function revisionOf(doc: MindMapDocument | null): number {
  return doc && Number.isSafeInteger(doc.revision) && (doc.revision as number) >= 0 ? doc.revision as number : 0;
}

export function summaryForDoc(doc: MindMapDocument, updatedAt?: number): DocumentSummary {
  const realBound = !doc.metadata?.mindflowUnlinkedContainer;
  return {
    id: doc.id,
    title: doc.title,
    updatedAt: updatedAt ?? (Number.isFinite(doc.updatedAt) ? doc.updatedAt : 0),
    zoteroItemKey: realBound ? doc.metadata?.zoteroItemKey : undefined,
    zoteroItemTitle: realBound ? doc.metadata?.zoteroItemTitle : undefined,
    zoteroAttachmentKey: doc.metadata?.zoteroAttachmentKey,
    zoteroAttachmentLibraryID: doc.metadata?.zoteroAttachmentLibraryID,
  };
}
