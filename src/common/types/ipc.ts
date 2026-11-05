/**
 * Zotero MindFlow - Common IPC Protocol Definitions
 * Defines message payloads and event types exchanged between Zotero host and React workspace.
 */

import type { MindMapDocument } from './mindmap.js';

export type MindFlowMessageType =
  | 'MINDFLOW_READY'
  | 'MINDFLOW_ZOTERO_CONNECTED'
  | 'MINDFLOW_HOST_ACK'
  | 'MINDFLOW_OPEN_ACTION'
  | 'MINDFLOW_GET_SELECTION'
  | 'MINDFLOW_GET_SELECTION_RESULT'
  | 'MINDFLOW_STORAGE'
  | 'MINDFLOW_STORAGE_RESULT'
  | 'MINDFLOW_LOCATE_ITEM'
  | 'MINDFLOW_LOCATE_ITEM_RESULT'
  | 'MINDFLOW_OPEN_PDF'
  | 'MINDFLOW_OPEN_PDF_RESULT'
  | 'MINDFLOW_LAUNCH_URL'
  | 'MINDFLOW_SET_TAB_TITLE'
  | 'MINDFLOW_DOCUMENT_CONTEXT'
  | 'MINDFLOW_SET_PREF'
  | 'MINDFLOW_SET_WINDOW_MODE'
  | 'MINDFLOW_OPEN_PREFERENCES'
  | 'MINDFLOW_SAVE_ATTACHMENT'
  | 'MINDFLOW_SAVE_ATTACHMENT_RESULT'
  | 'MINDFLOW_PREPARE_PAPER'
  | 'MINDFLOW_PREPARE_PAPER_RESULT'
  | 'MINDFLOW_CANCEL_PAPER'
  | 'MINDFLOW_ANALYZE_PAPER'
  | 'MINDFLOW_ANALYZE_PAPER_RESULT'
  | 'MINDFLOW_ANALYZE_PAPER_PROGRESS';

export interface BaseIPCMessage {
  type: MindFlowMessageType;
  requestId?: string;
}

export interface LocateItemMessage extends BaseIPCMessage {
  type: 'MINDFLOW_LOCATE_ITEM';
  key?: string;
  doi?: string;
  text?: string;
  note?: string;
}

export interface LocateItemResultMessage extends BaseIPCMessage {
  type: 'MINDFLOW_LOCATE_ITEM_RESULT';
  success: boolean;
  key?: string;
  doi?: string;
  error?: string;
}

export interface OpenPdfMessage extends BaseIPCMessage {
  type: 'MINDFLOW_OPEN_PDF';
  key?: string;
  doi?: string;
  text?: string;
  note?: string;
  pageIndex?: number;
}

export interface OpenPdfResultMessage extends BaseIPCMessage {
  type: 'MINDFLOW_OPEN_PDF_RESULT';
  success: boolean;
  key?: string;
  error?: string;
}

export interface SaveAttachmentMessage extends BaseIPCMessage {
  type: 'MINDFLOW_SAVE_ATTACHMENT';
  doc: MindMapDocument;
  parentItemUri?: string;
  attachmentKey?: string;
  attachmentLibraryID?: number;
}

export interface StorageRequestMessage extends BaseIPCMessage {
  type: 'MINDFLOW_STORAGE';
  action: 'get' | 'set' | 'remove' | 'commitDocument' | 'mutateInbox' | 'listDocs';
  payload?: any;
}

export interface DocumentContextMessage extends BaseIPCMessage {
  type: 'MINDFLOW_DOCUMENT_CONTEXT';
  documentId: string;
  title: string;
  parentItemUri?: string;
  attachmentKey?: string;
  attachmentLibraryID?: number;
  unlinkedContainer?: boolean;
  aiDraft?: boolean;
}
