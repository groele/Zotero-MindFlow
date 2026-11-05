import { getZoteroInstance, getHostWindow, openExternalUrl } from './zoteroEnvironment';
import { extractDoi, resolveZoteroItem, searchItemByDoi } from './zoteroItemData';

/**
 * Locate and highlight an item in the Zotero library pane.
 */
export async function locateItemInZotero(
  itemKeyOrUri: string | number,
  fallbackText?: string,
  options?: { libraryID?: number; noteText?: string }
): Promise<boolean> {
  const Zotero = getZoteroInstance();
  const raw = String(itemKeyOrUri ?? '').trim();
  const doi = extractDoi(raw) || extractDoi(fallbackText) || extractDoi(options?.noteText);

  if (Zotero) {
    try {
      let item = resolveZoteroItem(itemKeyOrUri, Zotero, options?.libraryID);
      if (!item && doi) {
        item = await searchItemByDoi(doi, Zotero, options?.libraryID);
      }

      if (item) {
        const win = (typeof window !== 'undefined' && window.parent !== window ? window.parent : null) ||
          (Zotero.getMainWindows ? Zotero.getMainWindows()[0] : null) ||
          Zotero.getMainWindow?.() || window;
        const tabs = win?.Zotero_Tabs || (Zotero.getMainWindows ? Zotero.getMainWindows()[0] : null)?.Zotero_Tabs || Zotero.getMainWindow?.()?.Zotero_Tabs;
        if (tabs && Array.isArray(tabs._tabs)) {
          const libTab = tabs._tabs.find((t: any) => t && (t.type === 'library' || t.id === 'zotero-pane')) || tabs._tabs[0];
          if (libTab) {
            if (typeof tabs.select === 'function') tabs.select(libTab.id);
            else if (typeof tabs.selectTab === 'function') tabs.selectTab(libTab.id);
          }
        }
        const pane = win?.ZoteroPane || Zotero.getActiveZoteroPane?.() || Zotero.getMainWindow?.()?.ZoteroPane;
        if (pane) {
          try {
            await pane.selectItem(item.id, true);
          } catch {
            await pane.selectItem(item.id);
          }
          const mainWin = (Zotero.getMainWindows ? Zotero.getMainWindows()[0] : null) || Zotero.getMainWindow?.() || (win !== window ? win : null);
          try { mainWin?.focus?.(); } catch (_) {}
          return true;
        }
      }
    } catch (e) {
      console.warn('[MindFlow] locateItemInZotero direct call:', e);
    }
  }

  const hostWindow = getHostWindow();
  if (hostWindow) {
    const requestId = `mindflow-locate-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve) => {
      let settled = false;
      const finish = (result: boolean) => {
        if (settled) return;
        settled = true;
        window.removeEventListener('message', onMessage);
        window.clearTimeout(timeout);
        resolve(result);
      };
      const onMessage = (event: MessageEvent) => {
        if (event.source !== hostWindow || event.data?.type !== 'MINDFLOW_LOCATE_ITEM_RESULT' ||
            event.data.requestId !== requestId) return;
        finish(event.data.success === true);
      };
      const timeout = window.setTimeout(() => finish(false), 3000);
      window.addEventListener('message', onMessage);
      try {
        hostWindow.postMessage({
          type: 'MINDFLOW_LOCATE_ITEM',
          requestId,
          key: itemKeyOrUri,
          doi,
          text: fallbackText,
          note: options?.noteText,
          libraryID: options?.libraryID,
        }, '*');
      } catch {
        finish(false);
      }
    });
  }

  return false;
}

/**
 * Open the PDF reader for a given Zotero item
 */
export async function openItemPdfInZotero(itemKeyOrUri: string | number, fallbackText?: string, noteText?: string): Promise<boolean> {
  const Zotero = getZoteroInstance();
  let directOpened = false;

  if (Zotero) {
    try {
      const raw = String(itemKeyOrUri || '').trim();
      if (raw.startsWith('zotero://open-pdf/')) {
        try {
          if (typeof Zotero.launchURL === 'function') {
            Zotero.launchURL(raw);
            return true;
          }
        } catch (_) {}
      }

      let item = resolveZoteroItem(itemKeyOrUri, Zotero);
      if (!item) {
        const doi = extractDoi(raw) || extractDoi(fallbackText) || extractDoi(noteText);
        if (doi) {
          item = await searchItemByDoi(doi, Zotero);
        }
      }

      if (item) {
        const isPdf = (att: any) => {
          if (!att) return false;
          try {
            if (typeof att.isPDFAttachment === 'function' && att.isPDFAttachment()) return true;
          } catch (_) {}
          if (att.attachmentContentType === 'application/pdf') return true;
          if (/\.pdf$/i.test(att.attachmentFilename || '')) return true;
          if (/\.pdf$/i.test(att.getField ? att.getField('title') : att.title)) return true;
          return false;
        };

        const openReader = (pdfAtt: any): boolean => {
          if (!pdfAtt) return false;
          let opened = false;
          const mainWin = (Zotero.getMainWindows ? Zotero.getMainWindows()[0] : null) || Zotero.getMainWindow?.();
          const readerService = Zotero.Reader || mainWin?.Zotero?.Reader;

          if (readerService && typeof readerService.open === 'function') {
            try {
              const res = readerService.open(pdfAtt.id);
              if (res && typeof res.catch === 'function') {
                res.catch(() => {
                  try { readerService.open({ itemID: pdfAtt.id }); } catch (_) {}
                });
              }
              opened = true;
            } catch (_) {
              try {
                readerService.open({ itemID: pdfAtt.id });
                opened = true;
              } catch (_) {}
            }
          }

          if (!opened && typeof Zotero.launchURL === 'function') {
            try {
              const groupID = Zotero.Libraries?.get?.(pdfAtt.libraryID)?.groupID;
              const pdfUri = groupID
                ? `zotero://open-pdf/groups/${groupID}/items/${pdfAtt.key}`
                : `zotero://open-pdf/library/items/${pdfAtt.key}`;
              Zotero.launchURL(pdfUri);
              opened = true;
            } catch (_) {}
          }
          return opened;
        };

        if (isPdf(item)) {
          directOpened = openReader(item);
        } else {
          try {
            if (typeof item.getBestAttachment === 'function') {
              const best = item.getBestAttachment();
              if (best && typeof best.then === 'function') {
                best.then((resolved: any) => {
                  if (isPdf(resolved)) openReader(resolved);
                });
                directOpened = true;
              } else if (isPdf(best)) {
                directOpened = openReader(best);
              }
            }
          } catch (_) {}

          if (!directOpened && typeof item.getAttachments === 'function') {
            const attIds = item.getAttachments();
            if (Array.isArray(attIds)) {
              for (const attId of attIds) {
                try {
                  const att = Zotero.Items.get(attId);
                  if (isPdf(att)) {
                    directOpened = openReader(att);
                    break;
                  }
                } catch (_) {}
              }
            }
          }
        }

        if (directOpened) return true;
      }
    } catch (e) {
      console.warn('[MindFlow] openItemPdfInZotero direct call:', e);
    }
  }

  const hostWindow = getHostWindow();
  if (hostWindow) {
    const requestId = `mindflow-pdf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve) => {
      let settled = false;
      const finish = (result: boolean) => {
        if (settled) return;
        settled = true;
        window.removeEventListener('message', onMessage);
        window.clearTimeout(timeout);
        resolve(result);
      };
      const onMessage = (event: MessageEvent) => {
        if (event.source !== hostWindow || event.data?.type !== 'MINDFLOW_OPEN_PDF_RESULT' ||
            event.data.requestId !== requestId) return;
        finish(event.data.success === true);
      };
      const timeout = window.setTimeout(() => finish(false), 4000);
      window.addEventListener('message', onMessage);
      try {
        const doi = extractDoi(String(itemKeyOrUri)) || extractDoi(fallbackText) || extractDoi(noteText);
        hostWindow.postMessage({
          type: 'MINDFLOW_OPEN_PDF',
          requestId,
          key: itemKeyOrUri,
          doi,
          text: fallbackText,
          note: noteText,
        }, '*');
      } catch {
        finish(false);
      }
    });
  }

  return locateItemInZotero(itemKeyOrUri, fallbackText, { noteText });
}

/**
 * Open / Navigate to a Zotero URI or DOI
 */
export async function openZoteroUri(uri: string, fallbackText?: string, options?: { noteText?: string; libraryID?: number }): Promise<boolean> {
  if (uri.startsWith('zotero://open-pdf/')) {
    if (await openItemPdfInZotero(uri, fallbackText, options?.noteText)) return true;
  }
  if (uri.startsWith('zotero://select/') && uri.includes('/items/')) {
    if (await locateItemInZotero(uri, fallbackText, options)) return true;
  }
  const doi = extractDoi(uri) || extractDoi(fallbackText) || extractDoi(options?.noteText);
  if (doi) {
    if (await locateItemInZotero(uri, fallbackText, options)) return true;
  }

  openExternalUrl(uri);
  return false;
}
