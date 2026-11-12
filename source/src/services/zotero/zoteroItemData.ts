import { getZoteroInstance } from './zoteroEnvironment';
import { extractDoi, extractZoteroItemData } from './zoteroItemExtractor';
export {
  noteHtmlToText,
  annotationLink,
  extractDoi,
  extractZoteroItemData,
} from './zoteroItemExtractor';

export interface ZoteroItemData {
  key: string;
  id?: number | string;
  libraryID?: number;
  title: string;
  itemType?: string;
  authors: string[];
  year?: string;
  publication?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  tags: string[];
  notes?: Array<string | { text: string; uri?: string }>;
  annotations?: Array<{ text: string; comment?: string; pageLabel?: string; color?: string; uri?: string }>;
  zoteroUri: string;
}

export interface ZoteroSelectionSnapshot {
  available: boolean;
  selectedCount: number;
  items: ZoteroItemData[];
}

export function resolveZoteroItem(reference: string | number, Zotero: any, libraryID?: number): any | null {
  if (reference == null) return null;
  const raw = String(reference).trim();
  const uri = raw.match(/^zotero:\/\/(?:select|open-pdf)\/(library|groups\/(\d+))\/items\/([A-Za-z0-9]{8})(?:[?#].*)?$/);
  if (raw.includes('://') && !uri) return null;
  let scope = libraryID == null ? null : Number(libraryID);
  if (scope !== null && (!Number.isSafeInteger(scope) || scope <= 0)) return null;
  if (uri) {
    const uriLibrary = uri[1] === 'library' ? Zotero.Libraries?.userLibraryID
      : Zotero.Groups?.getLibraryIDFromGroupID?.(Number(uri[2]));
    if (!uriLibrary || (scope !== null && scope !== uriLibrary)) return null;
    scope = uriLibrary;
  }
  const key = uri?.[3] || raw;
  if (typeof reference === 'number') {
    const direct = Zotero.Items?.get?.(reference);
    return direct && !direct.deleted && (scope === null || direct.libraryID === scope) ? direct : null;
  }
  if (!/^[A-Za-z0-9]{8}$/.test(key)) return null;
  const scopes = scope !== null ? [scope] :
    (Zotero.Libraries?.getAll?.() || []).map((lib: any) => lib.libraryID);
  if (!scopes.length && Zotero.Libraries?.userLibraryID) scopes.push(Zotero.Libraries.userLibraryID);
  const found = scopes.map((id: number) => Zotero.Items?.getByLibraryAndKey?.(id, key))
    .filter((item: any) => item && !item.deleted);
  return found.length === 1 ? found[0] : null;
}

export async function searchItemByDoi(doiInput: string, Zotero: any, libraryID?: number): Promise<any | null> {
  const doi = extractDoi(doiInput);
  if (!doi || !Zotero) return null;

  let scope = libraryID == null ? null : Number(libraryID);
  if (scope !== null && (!Number.isSafeInteger(scope) || scope <= 0)) scope = null;

  const scopes = scope !== null ? [scope] :
    (Zotero.Libraries?.getAll?.() || []).map((lib: any) => lib.libraryID);
  if (!scopes.length && Zotero.Libraries?.userLibraryID) scopes.push(Zotero.Libraries.userLibraryID);
  if (!scopes.length) scopes.push(1);

  if (typeof Zotero.Search === 'function') {
    for (const libID of scopes) {
      try {
        const s = new Zotero.Search();
        s.libraryID = libID;
        s.addCondition('DOI', 'is', doi);
        let ids = await s.search();
        if ((!Array.isArray(ids) || ids.length === 0) && typeof Zotero.Search === 'function') {
          const s2 = new Zotero.Search();
          s2.libraryID = libID;
          s2.addCondition('DOI', 'contains', doi);
          ids = await s2.search();
        }
        if ((!Array.isArray(ids) || ids.length === 0) && typeof Zotero.Search === 'function') {
          const s3 = new Zotero.Search();
          s3.libraryID = libID;
          s3.addCondition('extra', 'contains', doi);
          ids = await s3.search();
        }
        if (Array.isArray(ids) && ids.length > 0) {
          for (const id of ids) {
            const item = Zotero.Items?.get?.(id);
            if (item && !item.deleted) {
              const doiVal = (typeof item.getField === 'function' ? item.getField('DOI') : item.doi) || '';
              const extraVal = (typeof item.getField === 'function' ? item.getField('extra') : item.extra) || '';
              const itemDoi = extractDoi(doiVal);
              const extraDoi = extractDoi(extraVal);
              if (itemDoi === doi || extraDoi === doi || (extraVal && extraVal.toLowerCase().includes(doi))) {
                if (typeof item.isRegularItem === 'function' && !item.isRegularItem() && item.parentItemID) {
                  const parent = Zotero.Items?.get?.(item.parentItemID);
                  if (parent && !parent.deleted) return parent;
                }
                return item;
              }
            }
          }
        }
      } catch (e) {
        console.warn('[MindFlow] searchItemByDoi failed for library', libID, e);
      }
    }
  }

  return null;
}


export function getSelectedZoteroItems(): ZoteroItemData[] {
  const Zotero = getZoteroInstance();
  if (!Zotero) return [];

  try {
    const mainWin = (Zotero.getMainWindows ? Zotero.getMainWindows()[0] : null) || Zotero.getMainWindow?.();
    const pane =
      (typeof window !== 'undefined' && (window.parent as any)?.ZoteroPane) ||
      (typeof window !== 'undefined' && (window.opener as any)?.ZoteroPane) ||
      (typeof window !== 'undefined' && (window as any).ZoteroPane) ||
      (Zotero.getActiveZoteroPane && Zotero.getActiveZoteroPane()) || mainWin?.ZoteroPane;

    if (!pane) return [];

    const items = pane.getSelectedItems ? pane.getSelectedItems() : [];
    const results: ZoteroItemData[] = [];
    for (const item of items) {
      let target = item;
      if (target && typeof target.isAttachment === 'function' && target.isAttachment() && target.parentItemID) {
        const parent = Zotero.Items?.get?.(target.parentItemID);
        if (parent) target = parent;
      }
      const data = extractZoteroItemData(target);
      if (data && !results.some((r) => r.key === data.key && r.libraryID === data.libraryID)) {
        results.push(data);
      }
    }
    return results;
  } catch (error) {
    console.error('Failed to get selected Zotero items:', error);
    return [];
  }
}

export async function getZoteroSelectionSnapshot(): Promise<ZoteroSelectionSnapshot> {
  if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
    const requestId = `mindflow-selection-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve) => {
      const finish = (snapshot: ZoteroSelectionSnapshot) => {
        window.removeEventListener('message', onMessage);
        window.clearTimeout(timeout);
        resolve(snapshot);
      };
      const onMessage = (event: MessageEvent) => {
        if (event.source !== window.parent || event.data?.type !== 'MINDFLOW_GET_SELECTION_RESULT' ||
            event.data.requestId !== requestId) return;
        const result = event.data.result;
        finish({
          available: result?.available === true,
          selectedCount: Number.isSafeInteger(result?.selectedCount) ? result.selectedCount : 0,
          items: Array.isArray(result?.items)
            ? result.items.map(extractZoteroItemData).filter((item: ZoteroItemData | null): item is ZoteroItemData => !!item)
            : [],
        });
      };
      const timeout = window.setTimeout(() => finish({ available: false, selectedCount: 0, items: [] }), 3000);
      window.addEventListener('message', onMessage);
      try {
        window.parent.postMessage({ type: 'MINDFLOW_GET_SELECTION', requestId }, '*');
      } catch {
        finish({ available: false, selectedCount: 0, items: [] });
      }
    });
  }

  const Zotero = getZoteroInstance();
  const pane = Zotero?.getActiveZoteroPane?.() || (Zotero?.getMainWindows ? Zotero.getMainWindows()[0] : null)?.ZoteroPane || Zotero?.getMainWindow?.()?.ZoteroPane ||
    (typeof window !== 'undefined' ? (window as any).ZoteroPane : null);
  if (!pane || typeof pane.getSelectedItems !== 'function') {
    return { available: false, selectedCount: 0, items: [] };
  }
  try {
    const selected = pane.getSelectedItems() || [];
    return { available: true, selectedCount: selected.length, items: getSelectedZoteroItems() };
  } catch {
    return { available: false, selectedCount: 0, items: [] };
  }
}

export function getSampleAcademicItems(): ZoteroItemData[] {
  return [
    {
      key: 'item1',
      title: 'Attention Is All You Need: The Transformer Architecture',
      authors: ['Vaswani', 'Shazeer', 'Parmar', 'Uszkoreit', 'Jones', 'Gomez', 'Kaiser', 'Polosukhin'],
      year: '2017',
      publication: 'Advances in Neural Information Processing Systems (NeurIPS)',
      doi: '10.48550/arXiv.1706.03762',
      url: 'https://arxiv.org/abs/1706.03762',
      abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose the Transformer, a model architecture eschewing recurrence and entirely relying on an attention mechanism to draw global dependencies.',
      tags: ['Transformer', 'Deep Learning', 'Attention Mechanism', 'NLP'],
      annotations: [
        { text: 'Multi-Head Attention allows the model to jointly attend to information from different representation subspaces.', pageLabel: '4', color: '#ffea79' },
        { text: 'Positional Encoding is injected to provide information about relative or absolute position.', pageLabel: '6', color: '#ff6666' }
      ],
      notes: ['核心突破：抛弃 RNN/CNN 循环结构，实现全注意力机制并行训练。'],
      zoteroUri: 'zotero://select/items/0_SAMPLE1',
    },
    {
      key: 'item2',
      title: 'Deep Residual Learning for Image Recognition (ResNet)',
      authors: ['He', 'Zhang', 'Ren', 'Sun'],
      year: '2016',
      publication: 'IEEE Conference on Computer Vision and Pattern Recognition (CVPR)',
      doi: '10.1109/CVPR.2016.90',
      url: 'https://arxiv.org/abs/1512.03385',
      abstract: 'Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously.',
      tags: ['Computer Vision', 'ResNet', 'Residual Connection'],
      annotations: [
        { text: 'We explicitly let these layers fit a residual mapping: F(x) := H(x) - x.', pageLabel: '2', color: '#5fb236' }
      ],
      notes: ['残差跳连机制解决了深度神经网络中的退化问题（Degradation Problem）。'],
      zoteroUri: 'zotero://select/items/0_SAMPLE2',
    }
  ];
}
