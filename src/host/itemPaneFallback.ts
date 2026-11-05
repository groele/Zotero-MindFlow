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
  const { document, body, target, totalMaps, maps, state, host, win, Zotero } = opts;
  const createEl = makeElementFactory(document);

  const fallback = createEl('div', 'mf-pane-wrap mf-pane-fallback');
  const primaryBtn = createEl('button', 'mf-btn-primary', target
    ? (totalMaps > 0 ? host.paneText('打开思维导图工作台', 'Open map workspace') : host.paneText('一键生成文献思维导图', 'Create a map for this item'))
    : host.paneText('新建空白思维导图', 'New blank map'));
  primaryBtn.type = 'button';
  primaryBtn.disabled = Boolean(state?.saving);
  primaryBtn.addEventListener('click', async () => {
    if (primaryBtn.disabled) return;
    const currentTarget = state?.targetID ? Zotero.Items.get(state.targetID) : null;
    primaryBtn.disabled = true;
    try {
      if (totalMaps > 0 && maps[0]) {
        await host.openMindflowAttachment(maps[0], win);
      } else if (currentTarget) {
        await host.openMindFlow({ mode: 'create_from_selection', items: [currentTarget], forceNew: false }, win);
      } else {
        await host.openMindFlow({ mode: 'create_blank', forceNew: true }, win);
      }
      await state?.refresh?.();
    } catch (_) {
      primaryBtn.disabled = false;
    }
  });
  fallback.appendChild(primaryBtn);
  body.appendChild(fallback);
}
