/**
 * Zotero MindFlow - ItemPane fallback view (no host helpers available).
 */
import { makeElementFactory } from './itemPaneDom.js';

export function renderItemPaneFallback(opts: {
  document: any;
  body: any;
  target: any;
  totalMaps: number;
  maps: any[];
  state: any;
  host: any;
  win: any;
  Zotero: any;
}): void {
  const { document, body, target, totalMaps, maps, state, host, win } = opts;
  const createEl = makeElementFactory(document);
  state?.renderAbort?.abort?.();
  const Controller = win?.AbortController || globalThis.AbortController;
  const renderCtrl = Controller ? new Controller() : null;
  if (state) state.renderAbort = renderCtrl;
  const listenerOpts = renderCtrl?.signal ? { signal: renderCtrl.signal } : undefined;
  body.replaceChildren();
  if (state) {
    state.paneSignature = null;
    state.paneActions = [];
  }

  const fallback = createEl('div', 'mf-pane-wrap mf-pane-fallback');
  const primaryBtn = createEl('button', 'mf-btn-primary', target
    ? (totalMaps > 0 ? host.paneText('打开思维导图工作台', 'Open map workspace') : host.paneText('一键生成文献思维导图', 'Create a map for this item'))
    : host.paneText('新建空白思维导图', 'New blank map'));
  primaryBtn.type = 'button';
  primaryBtn.disabled = Boolean(state?.saving);
  primaryBtn.addEventListener('click', async () => {
    if (primaryBtn.disabled) return;
    primaryBtn.disabled = true;
    try {
      if (target && totalMaps > 0 && maps[0]) {
        await host.openMindflowAttachment(maps[0], win);
      } else if (target) {
        await host.openMindFlow({ mode: 'create_from_selection', items: [target], forceNew: false }, win);
      } else {
        await host.openMindFlow({ mode: 'create_blank', forceNew: true }, win);
      }
      await state?.refresh?.();
    } finally {
      primaryBtn.disabled = false;
    }
  }, listenerOpts);
  fallback.appendChild(primaryBtn);
  body.appendChild(fallback);
}
