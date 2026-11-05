/**
 * Zotero MindFlow - ItemPane Helper and Selection Resolvers
 *
 * Provides multi-window context resolution, literature target unwrapping,
 * and debounced state refreshing.
 */

export function scheduleItemPaneRefresh(host: any, state: any, delay = 120, getZotero?: () => any): void {
  if (!state || typeof state.refresh !== 'function' || state.refreshTimer) return;
  const Zotero = getZotero?.() || (globalThis as any).Zotero;
  const win = state.window
    || (typeof window !== 'undefined' ? window : null)
    || Zotero?.getActiveZoteroPane?.()?.window
    || (Zotero?.getMainWindows ? Zotero.getMainWindows()[0] : null)
    || Zotero?.getMainWindow?.();
  const setTimer = typeof win?.setTimeout === 'function' ? win.setTimeout.bind(win) : setTimeout;
  state.refreshTimer = setTimer(() => {
    state.refreshTimer = null;
    if (!host?._itemPaneStates?.has(state)) return;
    try { state.refresh(); } catch (_) {}
  }, delay);
}

export function cancelItemPaneRefresh(state: any, getZotero?: () => any): void {
  if (!state?.refreshTimer) return;
  const Zotero = getZotero?.() || (globalThis as any).Zotero;
  const win = state.window
    || (typeof window !== 'undefined' ? window : null)
    || Zotero?.getActiveZoteroPane?.()?.window
    || (Zotero?.getMainWindows ? Zotero.getMainWindows()[0] : null)
    || Zotero?.getMainWindow?.();
  try {
    (typeof win?.clearTimeout === 'function' ? win.clearTimeout.bind(win) : clearTimeout)(state.refreshTimer);
  } catch (_) {}
  state.refreshTimer = null;
}

export function resolveContextSelection(win: any, doc: any, getZotero?: () => any): any | null {
  const currentWin = win || doc?.defaultView;
  if (currentWin?.ZoteroPane?.getSelectedItems) {
    const sel = currentWin.ZoteroPane.getSelectedItems();
    if (sel?.[0]) return sel[0];
  }
  if (currentWin?.ZoteroReader?.itemID) {
    const Zotero = getZotero?.() || (globalThis as any).Zotero;
    const item = Zotero?.Items?.get?.(currentWin.ZoteroReader.itemID);
    if (item) return item;
  }
  const activePane = (getZotero?.() || (globalThis as any).Zotero)?.getActiveZoteroPane?.();
  if (activePane?.getSelectedItems) {
    const sel = activePane.getSelectedItems();
    if (sel?.[0]) return sel[0];
  }
  return null;
}

export function resolveLiteratureTarget(item: any, getZotero?: () => any): any | null {
  const Zotero = getZotero?.() || (globalThis as any).Zotero;
  if (!item) return null;
  if (typeof item.isRegularItem === 'function' && item.isRegularItem() && !item.deleted) return item;
  if (item.parentItemID) {
    const parent = Zotero?.Items?.get(item.parentItemID);
    if (parent && typeof parent.isRegularItem === 'function' && parent.isRegularItem() && !parent.deleted) {
      return parent;
    }
  }
  return null;
}
