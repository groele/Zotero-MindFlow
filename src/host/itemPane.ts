/**
 * Zotero MindFlow - ItemPane Module
 * Renders the MindFlow section in Zotero's ItemPane sidebar with read-only guards.
 */

import type { MindFlowConstants } from './constants.js';

export interface ItemPaneDeps {
  Zotero?: any;
  host?: any;
  constants?: typeof MindFlowConstants;
}

export function createItemPaneModule(deps: ItemPaneDeps = {}) {
  const getZotero = () => deps.Zotero || (globalThis as any).Zotero;
  const getHost = () => deps.host || (globalThis as any).Zotero?.MindFlow;
  const getConstants = () => deps.constants || (globalThis as any).MindFlowConstants;

    const T = (zh, en) => {
      const constants = getConstants();
      if (typeof constants.T === 'function') return constants.T(zh, en);
      return /^en/i.test(String(getZotero()?.locale || '')) ? en : zh;
    };

    function ensureItemPaneStyles(doc) {
      if (!doc || doc.getElementById('mindflow-itempane-styles')) return;
      try {
        const style = doc.createElementNS
          ? doc.createElementNS('http://www.w3.org/1999/xhtml', 'style')
          : doc.createElement('style');
        style.id = 'mindflow-itempane-styles';
        style.textContent = `
          item-pane-custom-section[data-pane*="mindflow-item-pane"],
          item-pane-custom-section[data-pane*="mindflow-item-pane"] > collapsible-section,
          item-pane-custom-section[data-pane*="mindflow-item-pane"] [data-type="body"] {
            min-width: 0;
            max-width: 100%;
            box-sizing: border-box;
          }

          /* Zotero ItemPane Sidenav Icon Rail */
          item-pane-sidenav .btn[data-pane*="mindflow-item-pane"] {
            width: 28px !important;
            height: 28px !important;
            min-width: 28px !important;
            padding: 4px !important;
            overflow: hidden !important;
            font-size: 0 !important;
            line-height: 0 !important;
            color: transparent !important;
            white-space: nowrap !important;
            background-image: url("chrome://mindflow/content/icons/mindflow.svg") !important;
            background-size: 20px 20px !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
          }

          item-pane-sidenav .btn[data-pane*="mindflow-item-pane"] .icon {
            display: none !important;
          }

          /* ItemPane Section Header Icon (Native & Custom fallbacks) */
          item-pane-custom-section[data-pane*="mindflow-item-pane"] collapsible-section > .head .title::before,
          item-pane-custom-section[data-pane*="mindflow-item-pane"] .title::before,
          item-pane-custom-section[data-pane*="mindflow-item-pane"] .icon,
          item-pane-custom-section[data-pane*="mindflow-item-pane"] button.header .icon,
          item-pane-custom-section[data-pane*="mindflow-item-pane"] collapsible-section .icon {
            content: "" !important;
            background-image: url("chrome://mindflow/content/icons/mindflow.svg") !important;
            background-size: 16px 16px !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
            display: inline-block !important;
            width: 16px !important;
            height: 16px !important;
            min-width: 16px !important;
            min-height: 16px !important;
            margin-inline-end: 6px !important;
            vertical-align: middle !important;
          }

          /* One scoped palette and spacing system for the native item pane. */
          .mf-pane-wrap {
            --mf-blue: light-dark(#315f94, #a8c9ef);
            --mf-green: light-dark(#316d58, #a0d3bb);
            --mf-amber: light-dark(#7a5d2c, #e3c58d);
            --mf-line: color-mix(in srgb, currentColor 12%, transparent);
            --mf-hover: color-mix(in srgb, currentColor 4%, transparent);
            --mf-muted: var(--fill-secondary, GrayText);
            display: flex; flex-direction: column; gap: 10px;
            contain: inline-size; container-type: inline-size;
            width: 100%; min-width: 0; max-width: 100%;
            padding: 6px 2px 12px; box-sizing: border-box;
            font: inherit; line-height: 1.5;
            color: var(--fill-primary, CanvasText); color-scheme: inherit;
          }
          .mf-pane-wrap * { box-sizing: border-box; }
          .mf-pane-wrap :is(button, select) { font: inherit; min-width: 0; max-width: 100%; }
          .mf-pane-wrap button { cursor: pointer; border-radius: 5px; }
          .mf-pane-wrap button:disabled { opacity: .55; cursor: default; }
          .mf-pane-wrap :is(button, select):focus-visible { outline: 2px solid var(--color-accent, Highlight); outline-offset: 2px; }
          .mf-pane-wrap .mf-action-status { font-size: 13px; line-height: 1.6; color: var(--mf-muted); }
          .mf-pane-wrap .mf-action-status:empty { display: none; }
          .mf-pane-wrap .mf-header-card { display: flex; flex-direction: column; gap: 4px; padding: 0 0 2px; }
          .mf-pane-wrap .mf-header-top { display: flex; align-items: center; justify-content: space-between; }
          .mf-pane-wrap .mf-status-badge { font-weight: 600; font-size: 14px; color: var(--fill-primary, CanvasText); }
          .mf-pane-wrap .mf-status-readonly { color: var(--mf-amber); font-weight: 600; }
          .mf-pane-wrap .mf-header-meta { color: var(--mf-muted); font-size: 12px; flex-shrink: 0; }
          .mf-pane-wrap .mf-target-title {
            display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;
            overflow: hidden; overflow-wrap: anywhere; line-height: 1.4; font-size: 12px; color: var(--mf-muted);
          }
          .mf-pane-wrap .mf-empty-state { display: flex; flex-direction: column; gap: 4px; }
          .mf-pane-wrap .mf-empty-title { font-weight: 600; font-size: 14px; color: var(--fill-primary, CanvasText); }
          .mf-pane-wrap .mf-section-title { font-weight: 600; font-size: 14px; color: var(--fill-primary, CanvasText); margin: 2px 0 0; }
          .mf-pane-wrap :is(.mf-hint-text, .mf-add-hint, .mf-map-card-meta) { color: var(--mf-muted); font-size: 12px; line-height: 1.5; }
          .mf-pane-wrap .mf-create-section { display: flex; flex-direction: column; gap: 8px; }
          .mf-pane-wrap .mf-template-box { display: flex; flex-direction: column; gap: 6px; }
          .mf-pane-wrap .mf-template-row { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--mf-muted); }
          .mf-pane-wrap .mf-template-label { flex-shrink: 0; }
          .mf-pane-wrap .mf-template-select {
            flex: 1 1 0; width: 0; min-height: 30px; padding: 4px 6px;
            border: 1px solid var(--mf-line); border-radius: 4px;
            color: var(--fill-primary, CanvasText); background: transparent; font-size: 13px;
          }
          .mf-pane-wrap :is(.mf-btn-primary, .mf-btn-template-create, .mf-tool-btn, .mf-card-btn) {
            --mf-tone: var(--mf-blue);
            display: inline-flex; align-items: center; justify-content: center;
            min-height: 32px; padding: 6px 10px; border-radius: 5px;
            border: 1px solid color-mix(in srgb, var(--mf-tone) 20%, transparent);
            background: color-mix(in srgb, var(--mf-tone) 9%, transparent);
            color: var(--mf-tone); text-align: center; white-space: normal;
            overflow-wrap: anywhere; text-decoration: none; font-weight: 500; font-size: 13px;
            transition: background .15s, border-color .15s;
          }
          .mf-pane-wrap :is(.mf-btn-primary, .mf-btn-template-create, .mf-tool-btn, .mf-card-btn):hover:not(:disabled) {
            background: color-mix(in srgb, var(--mf-tone) 16%, transparent);
            border-color: color-mix(in srgb, var(--mf-tone) 32%, transparent);
          }
          .mf-pane-wrap :is(.mf-btn-primary, .mf-btn-template-create, .mf-tool-btn, .mf-card-btn):active:not(:disabled) {
            background: color-mix(in srgb, var(--mf-tone) 22%, transparent);
          }
          .mf-pane-wrap .mf-btn-primary { width: 100%; min-height: 34px; font-size: 13px; font-weight: 500; }
          .mf-pane-wrap .mf-btn-template-create {
            --mf-tone: var(--mf-green);
            width: 100%; min-height: 34px; font-size: 13px; font-weight: 500;
          }
          .mf-pane-wrap .mf-divider { height: 1px; border: 0; background: var(--mf-line); margin: 2px 0; }
          .mf-pane-wrap .mindflow-pane-actions {
            display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 7px; padding-top: 4px;
          }
          .mf-pane-wrap .mindflow-pane-actions .mf-tool-btn {
            padding: 7px 9px; text-align: center; min-height: 32px; font-size: 13px;
          }
          .mf-pane-wrap .mindflow-pane-actions .mf-tool-btn[data-mindflow-action="workbench"],
          .mf-pane-wrap .mindflow-pane-actions .mf-tool-btn[data-mindflow-action="workspace"] {
            --mf-tone: var(--mf-blue);
          }
          .mf-pane-wrap .mindflow-pane-actions .mf-tool-btn[data-mindflow-action="ai"],
          .mf-pane-wrap .mindflow-pane-actions .mf-tool-btn[data-mindflow-action="pdf"] {
            --mf-tone: var(--mf-green);
          }
          .mf-pane-wrap .mindflow-pane-actions .mf-tool-btn[data-mindflow-action="import"],
          .mf-pane-wrap .mindflow-pane-actions .mf-tool-btn[data-mindflow-action="blank"] {
            --mf-tone: var(--mf-amber);
          }
          .mf-pane-wrap .mf-maps-section { display: flex; flex-direction: column; gap: 6px; }
          .mf-pane-wrap .mf-maps-header { display: flex; align-items: center; justify-content: space-between; }
          .mf-pane-wrap .mf-maps-title { font-weight: 600; font-size: 14px; }
          .mf-pane-wrap .mf-btn-refresh {
            background: transparent; color: var(--mf-muted); border: 0; border-radius: 4px;
            min-width: 24px; min-height: 24px; padding: 2px 5px; font-size: 14px;
          }
          .mf-pane-wrap .mf-btn-refresh:hover { background: var(--mf-hover); }
          .mf-pane-wrap .mf-maps-list { display: flex; flex-direction: column; max-height: 280px; overflow-y: auto; gap: 6px; }
          .mf-pane-wrap .mf-map-card {
            display: flex; flex-direction: column; gap: 6px; padding: 8px 10px;
            border: 1px solid var(--mf-line); border-radius: 5px;
            background: color-mix(in srgb, currentColor 2%, transparent);
          }
          .mf-pane-wrap .mf-map-card:hover { border-color: color-mix(in srgb, currentColor 24%, transparent); }
          .mf-pane-wrap .mf-map-card-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
          .mf-pane-wrap .mf-map-name { font-weight: 500; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .mf-pane-wrap .mf-map-card-meta { font-size: 12px; color: var(--mf-muted); }
          .mf-pane-wrap .mf-map-card-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 2px; }
          .mf-pane-wrap .mf-card-btn { min-height: 26px; padding: 3px 6px; font-size: 12px; }
          .mf-pane-wrap .mf-card-btn[data-l10n-id="mindflow-item-pane-card-open"] { --mf-tone: var(--mf-blue); }
          .mf-pane-wrap .mf-card-btn[data-l10n-id="mindflow-item-pane-card-export"] { --mf-tone: var(--mf-amber); }
          .mf-pane-wrap .mf-card-btn[data-l10n-id="mindflow-item-pane-card-locate"] { --mf-tone: var(--mf-green); }
          @container (max-width: 210px) {
            .mf-pane-wrap .mindflow-pane-actions { grid-template-columns: minmax(0, 1fr); }
            .mf-pane-wrap .mf-map-card-actions { grid-template-columns: minmax(0, 1fr); }
          }
        `;
        (doc.head || doc.documentElement)?.appendChild(style);
      } catch (e) {
        getZotero()?.logError?.('[MindFlow] Failed to inject itemPane styles: ' + e);
      }
    }

    function scheduleItemPaneRefresh(host, state, delay = 120) {
      if (!state || typeof state.refresh !== 'function' || state.refreshTimer) return;
      const win = state.window || getZotero()?.getMainWindow?.();
      const setTimer = typeof win?.setTimeout === 'function' ? win.setTimeout.bind(win) : setTimeout;
      state.refreshTimer = setTimer(() => {
        state.refreshTimer = null;
        if (!host?._itemPaneStates?.has(state)) return;
        try { state.refresh(); } catch (_) {}
      }, delay);
    }

    function cancelItemPaneRefresh(state) {
      if (!state?.refreshTimer) return;
      const win = state.window || getZotero()?.getMainWindow?.();
      try { (typeof win?.clearTimeout === 'function' ? win.clearTimeout.bind(win) : clearTimeout)(state.refreshTimer); } catch (_) {}
      state.refreshTimer = null;
    }

    function resolveLiteratureTarget(item) {
      const Zotero = getZotero();
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

    function registerItemPaneSection(targetHost) {
      const host = targetHost || getHost();
      const Zotero = getZotero();
      const constants = getConstants();
      const ADDON_ID = constants.ADDON_ID || 'mindflow@groele.org';
      const CHROME_ROOT = constants.CHROME_ROOT || 'chrome://mindflow/content/';

      if (typeof Zotero?.ItemPaneManager?.registerSection !== 'function') return;
      try {
        const sectionStates = new WeakMap();
        let renderItemPaneAsync = null;
        let lastPaneBody = null;
        let lastPaneTarget = null;
        let lastPaneActions = [];
        if (!host._itemPaneStates) host._itemPaneStates = new Set();
        const icon = `${CHROME_ROOT}icons/mindflow.svg`;

        if (!host._itemPaneNotifierID && Zotero.Notifier?.registerObserver) {
          try {
            host._itemPaneNotifierID = Zotero.Notifier.registerObserver({
              notify: (event, type, ids) => {
                if (type !== 'item' || !Array.isArray(ids) || !ids.length) return;
                if (!['add', 'modify', 'delete', 'trash', 'move', 'remove', 'refresh'].includes(event)) return;
                if (!host._itemPaneStates?.size) return;
                const idSet = new Set(ids.map(Number));
                for (const state of [...host._itemPaneStates]) {
                  const targetID = Number(state.targetID);
                  if (!targetID || typeof state.refresh !== 'function') continue;
                  let relevant = event === 'delete' || event === 'refresh' || idSet.has(targetID) || idSet.size > 200;
                  if (!relevant) {
                    for (const id of idSet) {
                      const it = Zotero.Items.get(id);
                      if (it && Number(it.parentItemID) === targetID) { relevant = true; break; }
                    }
                  }
                  if (relevant) scheduleItemPaneRefresh(host, state);
                }
              },
            }, ['item'], ADDON_ID);
          } catch (error) {
            Zotero.logError?.('[MindFlow] Item pane observer registration failed: ' + error);
          }
        }

        host.itemPaneSectionID = Zotero.ItemPaneManager.registerSection({
          paneID: 'mindflow-item-pane',
          pluginID: ADDON_ID,
          header: { l10nID: 'mindflow-item-pane-header', icon },
          sidenav: { l10nID: 'mindflow-item-pane-sidenav', icon },
          onInit: ({ doc, body, item, refresh }) => {
            const document = doc || body?.ownerDocument;
            const win = doc?.defaultView || document?.defaultView || null;
            if (document) {
              host.ensureLocalization?.(document);
              ensureItemPaneStyles(document);
            }
            const target = resolveLiteratureTarget(item);
            const state = {
              itemKey: target?.key || null,
              libraryID: target?.libraryID || null,
              targetID: target?.id || null,
              window: win,
              renderVersion: 0,
              saving: false,
              refresh,
            };
            host._itemPaneStates.add(state);
            sectionStates.set(body, state);
            const owner = body?.parentElement;
            if (owner && ('open' in owner || 'empty' in owner)) {
              owner.empty = false;
              owner.open = true;
              const raf = document?.defaultView?.requestAnimationFrame;
              if (typeof raf === 'function') {
                raf.call(document.defaultView, () => {
                  owner.empty = false;
                  owner.open = true;
                });
              }
            }
          },
          onDestroy: ({ body }) => {
            const state = sectionStates.get(body);
            if (state) {
              state.renderVersion++;
              cancelItemPaneRefresh(state);
              host._itemPaneStates.delete(state);
            }
            sectionStates.delete(body);
          },
          onItemChange: ({ doc, body, item, setEnabled }) => {
            const document = doc || body?.ownerDocument;
            const win = doc?.defaultView || document?.defaultView || Zotero.getMainWindow?.();
            const target = resolveLiteratureTarget(item) || resolveLiteratureTarget(
              win?.ZoteroPane?.getSelectedItems?.()?.[0]
            );
            const state = sectionStates.get(body);
            if (state) {
              if (win) state.window = win;
              state.itemKey = target?.key || null;
              state.libraryID = target?.libraryID || null;
              state.targetID = target?.id || null;
              state.renderVersion++;
            }
            lastPaneTarget = target;
            for (const action of lastPaneActions) {
              if (action.id === 'ai' || action.id === 'pdf') action.button.disabled = !target || (action.id === 'pdf' && !action.hasPDF);
            }
            if (!body && lastPaneBody && renderItemPaneAsync) {
              void renderItemPaneAsync({ doc, body: lastPaneBody, item: target || item, setSectionSummary: null });
            }
            setEnabled(true);
          },
          onRender: ({ doc, body, item, setSectionSummary }) => {
            if (!body) return;
            const document = doc || body.ownerDocument;
            const win = doc?.defaultView || document?.defaultView || Zotero.getMainWindow?.();
            if (document) {
              ensureItemPaneStyles(document);
            }
            const target = resolveLiteratureTarget(item) || resolveLiteratureTarget(
              win?.ZoteroPane?.getSelectedItems?.()?.[0]
            );
            lastPaneBody = body;
            lastPaneTarget = target;
            lastPaneActions = [];
            let state = sectionStates.get(body);
            if (!state) {
              state = { itemKey: target?.key || null, libraryID: target?.libraryID || null, targetID: target?.id || null, window: win, renderVersion: 0, saving: false };
              state.refresh = () => renderItemPaneAsync?.({ doc, body, item: lastPaneTarget || item, setSectionSummary });
              sectionStates.set(body, state);
              host._itemPaneStates.add(state);
            } else if (win) {
              state.window = win;
            }
            if (target && renderItemPaneAsync) {
              void renderItemPaneAsync({ doc, body, item, setSectionSummary });
              return;
            }
            const maps = target ? host.getMindflowAttachments(target) : [];
            const totalMaps = maps.length;
            setSectionSummary?.(totalMaps ? String(totalMaps) : host.paneText('展开后快速新建', 'Create quickly'));
            body.replaceChildren();
            if (state) state.paneSignature = null;

            const html = 'http://www.w3.org/1999/xhtml';
            const createEl = (tag, className = '', text = null) => {
              const el = document.createElementNS ? document.createElementNS(html, tag) : document.createElement(tag);
              if (className) el.className = className;
              if (text !== null && text !== undefined) el.textContent = text;
              return el;
            };

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
              } catch (error) {
                primaryBtn.disabled = false;
              }
            });
            fallback.appendChild(primaryBtn);
            body.appendChild(fallback);
          },
          onAsyncRender: renderItemPaneAsync = async ({ doc, body, item, setSectionSummary }) => {
            if (!body) return;
            const document = doc || body.ownerDocument;
            const win = doc?.defaultView || document?.defaultView || Zotero.getMainWindow?.();
            if (document) {
              ensureItemPaneStyles(document);
            }
            const target = resolveLiteratureTarget(item) || resolveLiteratureTarget(
              win?.ZoteroPane?.getSelectedItems?.()?.[0]
            );
            lastPaneBody = body;
            lastPaneTarget = target;
            lastPaneActions = [];
            if (!target) return;

            const state = sectionStates.get(body);
            if (state && win) state.window = win;
            const renderVersion = state ? ++state.renderVersion : 0;
            const html = 'http://www.w3.org/1999/xhtml';
            const createEl = (tag, className = '', text = null) => {
              const el = document.createElementNS
                ? document.createElementNS(html, tag)
                : document.createElement(tag);
              if (className) el.className = className;
              if (text !== null && text !== undefined) {
                el.textContent = text;
              }
              return el;
            };

            const maps = host.getMindflowAttachments(target);
            const totalMaps = maps.length;

            const signature = JSON.stringify([
              target.id, target.getField?.('title') || '', item?.id || null, host.paneText('zh', 'en'),
              maps.map(att => [att.id, att.dateModified || '', att.getField?.('title') || att.attachmentFilename || '']),
              (target.getAttachments?.() || []).length,
            ]);
            if (state && state.paneSignature === signature && body.children?.length > 0 && body.children[0]?.className === 'mf-pane-wrap') {
              lastPaneActions = state.paneActions || lastPaneActions;
              return;
            }
            if (state && renderVersion !== state.renderVersion) return;
            body.replaceChildren();
            if (state) state.paneSignature = null;

            setSectionSummary?.(totalMaps ? String(totalMaps) : host.paneText('展开后快速新建', 'Create quickly'));

            const wrapper = createEl('div', 'mf-pane-wrap');
            if (totalMaps > 0) wrapper.setAttribute('data-has-maps', 'true');
            const actionStatus = createEl('div', 'mf-action-status');
            actionStatus.setAttribute?.('role', 'status');
            wrapper.appendChild(actionStatus);

            // 1. Header Card with Status Badge
            const headerCard = createEl('div', 'mf-header-card');
            const headerTop = createEl('div', 'mf-header-top');

            const isEditable = Boolean(target && !target.deleted && (typeof target.isEditable !== 'function' || target.isEditable()));
            const statusBadge = createEl('span', `mf-status-badge ${!isEditable ? 'mf-status-readonly' : (totalMaps > 0 ? 'mf-status-active' : 'mf-status-empty')}`);
            if (!isEditable) {
              statusBadge.textContent = T('只读文献', 'Read-only');
              statusBadge.setAttribute('data-l10n-id', 'mindflow-item-pane-readonly-badge');
            } else {
              statusBadge.textContent = totalMaps > 0 ? `${T('已关联导图', 'Linked maps')} (${totalMaps})` : T('暂无导图', 'No maps yet');
              statusBadge.setAttribute('data-l10n-id', totalMaps > 0 ? 'mindflow-item-pane-linked-maps-title' : 'mindflow-item-pane-no-map');
            }
            headerTop.appendChild(statusBadge);

            const selectedPDF = item?.isPDFAttachment?.() || /\.pdf$/i.test(item?.attachmentFilename || '') ? item : null;
            const hasPDF = Boolean(selectedPDF || (target?.getAttachments?.().some(id => {
              const att = Zotero.Items.get(id);
              return att && !att.deleted && (att.isPDFAttachment?.() || att.attachmentContentType === 'application/pdf' || /\.pdf$/i.test(att.attachmentFilename || ''));
            })));

            const metaIndicator = createEl('span', 'mf-header-meta', hasPDF ? T('PDF 就绪', 'PDF ready') : T('无 PDF', 'No PDF'));
            metaIndicator.setAttribute('data-l10n-id', hasPDF ? 'mindflow-item-pane-pdf-ready' : 'mindflow-item-pane-pdf-missing');
            headerTop.appendChild(metaIndicator);
            headerCard.appendChild(headerTop);

            const paperTitle = target.getField?.('title') || host.paneText('未命名文献', 'Untitled item');
            const targetTitleEl = createEl('div', 'mf-target-title', paperTitle);
            targetTitleEl.title = paperTitle;
            headerCard.appendChild(targetTitleEl);
            wrapper.appendChild(headerCard);

            // 2. Primary Action Button
            const primaryBtn = createEl('button', 'mf-btn-primary');
            primaryBtn.type = 'button';
            if (!isEditable) {
              primaryBtn.disabled = true;
              primaryBtn.setAttribute('aria-disabled', 'true');
              primaryBtn.textContent = T('文献只读，无法新增导图', 'Read-only item, cannot add map');
              primaryBtn.title = T('当前文献为只读（或在回收站中）', 'This item is read-only or in Trash');
            } else {
              primaryBtn.removeAttribute('aria-disabled');
              primaryBtn.textContent = totalMaps > 0 ? T('＋ 按所选模板新增导图', '＋ Add map with template') : T('＋ 一键生成文献思维导图', '＋ Create map for this item');
              primaryBtn.setAttribute('data-l10n-id', totalMaps > 0 ? 'mindflow-item-pane-add-from-template' : 'mindflow-item-pane-generate-map');
            }
            primaryBtn.addEventListener('click', async (e) => {
              e.preventDefault(); e.stopPropagation();
              if (primaryBtn.disabled || !isEditable) return;
              primaryBtn.disabled = true;
              try {
                const currentTarget = lastPaneTarget || target;
                if (!currentTarget) return;
                await host.openMindFlow({ mode: 'create_from_selection', items: [currentTarget], template: templateSelect.value || 'imrad', forceNew: totalMaps > 0 }, win);
                state?.refresh?.();
              } catch (err) {
                Zotero.logError?.('[MindFlow] Sidebar primary action failed: ' + err);
              } finally {
                primaryBtn.disabled = false;
              }
            });
            wrapper.appendChild(primaryBtn);

            const primaryHint = createEl('div', 'mf-add-hint', !isEditable
              ? T('当前文献为只读（或在回收站中），导图仅保存在本地工作区，不会写入附件。', 'This item is read-only or in Trash. Maps are kept in local workspace and will not be saved as attachments.')
              : T('点击即可创建思维导图并关联当前文献 · 支持双向同步', 'Click to create a mind map linked to this item · syncs automatically'));
            if (!isEditable) {
              primaryHint.setAttribute('data-l10n-id', 'mindflow-item-pane-readonly-hint');
            } else {
              primaryHint.setAttribute('data-l10n-id', 'mindflow-item-pane-choose-template-hint');
            }
            wrapper.appendChild(primaryHint);

            // 3. Quick Create Map Section
            const createSection = createEl('div', 'mf-create-section');
            const sectionTitle = createEl('div', 'mf-section-title', T('快速新建导图', 'Quick create map'));
            sectionTitle.setAttribute('data-l10n-id', 'mindflow-item-pane-quick-create-title');
            createSection.appendChild(sectionTitle);

            const templateBox = createEl('div', 'mf-template-box');
            const templateRow = createEl('div', 'mf-template-row');
            const templateLabel = createEl('span', 'mf-template-label', T('导图模板', 'Template'));
            templateLabel.setAttribute('data-l10n-id', 'mindflow-item-pane-template-label');
            templateRow.appendChild(templateLabel);

            const templateSelect = createEl('select', 'mf-template-select');
            templateSelect.setAttribute('aria-label', T('导图模板', 'Map template'));
            templateSelect.setAttribute('data-l10n-id', 'mindflow-item-pane-template-select');
            const templates = [
              { id: 'imrad', name: T('经典论文框架 (IMRaD 结构)', 'Research paper (IMRaD)') },
              { id: 'review', name: T('文献对比与综述导图', 'Literature comparison and review') },
              { id: 'critical', name: T('批判性精读导图', 'Critical reading') },
              { id: 'outline', name: T('极简结构大纲', 'Minimal outline') },
              { id: 'blank', name: T('空白思维导图', 'Blank map') },
            ];
            for (const t of templates) {
              const opt = createEl('option', '', t.name);
              opt.value = t.id;
              templateSelect.appendChild(opt);
            }
            templateRow.appendChild(templateSelect);
            templateBox.appendChild(templateRow);

            const templateDesc = createEl('div', 'mf-hint-text', T('选择预设学术模板，一键生成结构化文献研读导图', 'Select an academic template to generate a structured map'));
            templateBox.appendChild(templateDesc);

            const templateCreateBtn = createEl('button', 'mf-btn-template-create', !isEditable ? T('文献只读，无法按模板生成', 'Read-only item, cannot generate') : T('按所选模板生成导图', 'Generate map from template'));
            templateCreateBtn.setAttribute('data-l10n-id', 'mindflow-item-pane-template-create');
            templateCreateBtn.type = 'button';
            if (!isEditable) {
              templateCreateBtn.disabled = true;
              templateCreateBtn.setAttribute('aria-disabled', 'true');
              templateCreateBtn.title = T('当前文献为只读（或在回收站中）', 'This item is read-only or in Trash');
            }
            templateCreateBtn.addEventListener('click', async (e) => {
              e.preventDefault(); e.stopPropagation();
              if (templateCreateBtn.disabled || !isEditable) return;
              templateCreateBtn.disabled = true;
              try {
                const currentTarget = lastPaneTarget || target;
                if (!currentTarget) return;
                await host.openMindFlow({ mode: 'create_from_selection', items: [currentTarget], template: templateSelect.value || 'imrad', forceNew: totalMaps > 0 }, win);
                state?.refresh?.();
              } catch (err) {
                Zotero.logError?.('[MindFlow] Template create failed: ' + err);
              } finally {
                templateCreateBtn.disabled = false;
              }
            });
            templateBox.appendChild(templateCreateBtn);
            createSection.appendChild(templateBox);
            wrapper.appendChild(createSection);

            // Divider before action grid
            wrapper.appendChild(createEl('div', 'mf-divider'));

            // 4. Action Buttons Grid
            const toolsGrid = createEl('div', 'mindflow-pane-actions');

            const toolWorkbench = createEl('button', 'mf-tool-btn', T('导图工作台', 'Workspace'));
            toolWorkbench.type = 'button';
            toolWorkbench.setAttribute('data-l10n-id', 'mindflow-item-pane-action-workbench');
            toolWorkbench.setAttribute('data-mindflow-action', 'workbench');
            toolWorkbench.title = T('进入 MindFlow 总工作台，查看和管理已有导图', 'Open the MindFlow workspace to browse and manage maps');
            toolWorkbench.addEventListener('click', async (e: any = {}) => {
              e.preventDefault?.(); e.stopPropagation?.();
              if (toolWorkbench.disabled) return;
              toolWorkbench.disabled = true;
              try {
                await host.openMindFlow({ mode: 'open', targetMode: 'tab' }, win);
              } catch (error) {
                Zotero.logError?.('[MindFlow] Open workbench failed: ' + error);
                actionStatus.textContent = host.paneText('操作失败，请重试。', 'The action failed. Please try again.');
              } finally {
                toolWorkbench.disabled = false;
              }
            });
            toolsGrid.appendChild(toolWorkbench);

            const toolSubwin = createEl('button', 'mf-tool-btn', T('伴读窗口', 'Companion'));
            toolSubwin.setAttribute('data-l10n-id', 'mindflow-item-pane-action-companion');
            toolSubwin.type = 'button';
            toolSubwin.setAttribute?.('data-mindflow-action', 'workspace');
            toolSubwin.title = T('打开轻量独立窗口，适合与 PDF 左右分屏伴读对照', 'Open a compact window to read side by side with the PDF');
            toolSubwin.addEventListener('click', (e: any = {}) => {
              e.preventDefault?.(); e.stopPropagation?.();
              try {
                if (totalMaps > 0 && maps[0]) {
                  host.openMindflowAttachment(maps[0], win);
                } else {
                  host.openMindFlow({ mode: 'open' }, win);
                }
              } catch (err) {
                Zotero.logError?.('[MindFlow] Open standalone window failed: ' + err);
              }
            });
            toolsGrid.appendChild(toolSubwin);

            const toolAi = createEl('button', 'mf-tool-btn', T('AI 论文精读', 'AI Reading'));
            toolAi.setAttribute('data-l10n-id', 'mindflow-item-pane-action-ai');
            toolAi.type = 'button';
            toolAi.disabled = false;
            toolAi.setAttribute?.('data-mindflow-action', 'ai');
            toolAi.title = T('为本文献启动 AI 智能精读与思维导图生成', 'Start AI reading and map generation for this item');
            toolAi.addEventListener('click', async (e: any = {}) => {
              e.preventDefault?.(); e.stopPropagation?.();
              if (toolAi.disabled) return;
              toolAi.disabled = true;
              try {
                const currentTarget = lastPaneTarget || target;
                if (!currentTarget) return;
                await host.openMindFlow({ mode: 'ai_analyze', items: [currentTarget] }, win);
              } catch (err) {
                Zotero.logError?.('[MindFlow] AI analyze action failed: ' + err);
                actionStatus.textContent = host.paneText('操作失败，请重试。', 'The action failed. Please try again.');
              } finally {
                toolAi.disabled = false;
              }
            });
            toolsGrid.appendChild(toolAi);
            lastPaneActions.push({ id: 'ai', button: toolAi, hasPDF: true });

            if (hasPDF) {
              const toolPdf = createEl('button', 'mf-tool-btn mf-tool-btn-pdf', T('打开 PDF', 'Open PDF'));
              toolPdf.setAttribute('data-l10n-id', 'mindflow-item-pane-action-pdf');
              toolPdf.type = 'button';
              toolPdf.disabled = false;
              toolPdf.setAttribute?.('data-mindflow-action', 'pdf');
              toolPdf.title = T('在 Zotero 内置阅读器中打开本文献的 PDF 全文', 'Open this item\'s PDF in the Zotero reader');
              toolPdf.addEventListener('click', async (e: any = {}) => {
                e.preventDefault?.(); e.stopPropagation?.();
                if (toolPdf.disabled) return;
                toolPdf.disabled = true;
                try {
                  if (!await host.openPDFForItem(selectedPDF || target, win)) throw new Error('PDF could not be opened');
                  actionStatus.textContent = '';
                  actionStatus.removeAttribute('data-l10n-id');
                } catch (error) {
                  Zotero.logError?.('[MindFlow] Sidebar PDF open failed: ' + error);
                  actionStatus.textContent = T('无法打开 PDF，请检查附件是否已下载。', 'Unable to open the PDF. Check that the attachment has been downloaded.');
                  actionStatus.setAttribute('data-l10n-id', 'mindflow-item-pane-pdf-open-failed');
                } finally { toolPdf.disabled = false; }
              });
              toolsGrid.appendChild(toolPdf);
              lastPaneActions.push({ id: 'pdf', button: toolPdf, hasPDF: true });
            }

            const toolImport = createEl('button', 'mf-tool-btn', T('导入导图', 'Import Map'));
            toolImport.setAttribute('data-l10n-id', 'mindflow-item-pane-action-import');
            toolImport.type = 'button';
            toolImport.disabled = false;
            toolImport.setAttribute?.('data-mindflow-action', 'import');
            toolImport.title = T('导入 MindFlow、JSON、Markdown 或 OPML 导图文件', 'Import a MindFlow, JSON, Markdown, or OPML map file');
            toolImport.addEventListener('click', async (e: any = {}) => {
              e.preventDefault?.(); e.stopPropagation?.();
              await host.openMindFlow({ mode: 'import_file' }, win);
            });
            toolsGrid.appendChild(toolImport);

            const toolBlank = createEl('button', 'mf-tool-btn', T('独立空白导图', 'Blank Map'));
            toolBlank.setAttribute('data-l10n-id', 'mindflow-item-pane-action-blank');
            toolBlank.type = 'button';
            toolBlank.disabled = false;
            toolBlank.setAttribute?.('data-mindflow-action', 'blank');
            toolBlank.title = T('新建不绑定本文献的独立空白思维导图', 'Create a blank map that is not linked to this item');
            toolBlank.addEventListener('click', async (e: any = {}) => {
              e.preventDefault?.(); e.stopPropagation?.();
              await host.openMindFlow({ mode: 'create_blank', forceNew: true }, win);
            });
            toolsGrid.appendChild(toolBlank);
            wrapper.appendChild(toolsGrid);

            // 5. Maps Section
            if (totalMaps > 0) {
              const mapsSection = createEl('div', 'mf-maps-section');
              const mapsHeader = createEl('div', 'mf-maps-header');
              mapsHeader.appendChild(createEl('span', 'mf-maps-title', `${T('关联导图', 'Linked maps')} (${totalMaps})`));

              const refreshBtn = createEl('button', 'mf-btn-refresh', '↻');
              refreshBtn.type = 'button';
              refreshBtn.title = T('刷新列表', 'Refresh list');
              refreshBtn.setAttribute('aria-label', refreshBtn.title);
              refreshBtn.addEventListener('click', (e: any) => {
                e.preventDefault(); e.stopPropagation();
                state?.refresh?.();
              });
              mapsHeader.appendChild(refreshBtn);
              mapsSection.appendChild(mapsHeader);

              const mapsList = createEl('div', 'mf-maps-list');
              if (maps[0]) {
                const firstTitle = String(maps[0].getField?.('title') || maps[0].attachmentFilename || T('思维导图', 'Mind map'))
                  .replace(/\s*\(MindFlow\s*导图源文件\)$/i, '')
                  .replace(/\.mindflow$/i, '').trim();
                mapsList.title = T(`打开导图：${firstTitle}`, `Open map: ${firstTitle}`);
                mapsList.addEventListener('click', (e: any = {}) => {
                  if (e.target?.closest?.('button')) return;
                  host.openMindflowAttachment(maps[0], win);
                });
              }
              for (const att of maps) {
                const rawTitle = att.getField?.('title') || att.attachmentFilename || T('思维导图', 'Mind map');
                const cleanTitle = String(rawTitle)
                  .replace(/\s*\(MindFlow\s*导图源文件\)$/i, '')
                  .replace(/\.mindflow$/i, '')
                  .trim() || String(rawTitle);

                const card = createEl('div', 'mf-map-card');
                card.title = T(`打开导图：${cleanTitle}`, `Open map: ${cleanTitle}`);
                card.addEventListener('click', (e) => {
                  if (e?.target?.closest?.('button')) return;
                  e?.preventDefault?.();
                  e?.stopPropagation?.();
                  host.openMindflowAttachment(att, win);
                });

                const cardTop = createEl('div', 'mf-map-card-top');
                const cardName = createEl('span', 'mf-map-name', cleanTitle);
                cardName.title = cleanTitle;
                cardTop.appendChild(cardName);
                card.appendChild(cardTop);

                if (att.dateModified) {
                  try {
                    const d = new Date(att.dateModified);
                    const metaTime = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                    card.appendChild(createEl('div', 'mf-map-card-meta', T(`修改于：${metaTime}`, `Modified ${metaTime}`)));
                  } catch (_) {}
                }

                const cardActions = createEl('div', 'mf-map-card-actions');

                const openBtn = createEl('button', 'mf-card-btn mf-card-btn-primary', T('打开', 'Open'));
                openBtn.setAttribute('data-l10n-id', 'mindflow-item-pane-card-open');
                openBtn.type = 'button';
                openBtn.title = T('在工作台中打开并编辑此思维导图', 'Open and edit this map in the workspace');
                openBtn.addEventListener('click', async (e) => {
                  e.preventDefault(); e.stopPropagation();
                  if (openBtn.disabled) return;
                  openBtn.disabled = true;
                  try {
                    await host.openMindflowAttachment(att, win);
                  } catch (err) {
                    Zotero.logError?.('[MindFlow] Open map attachment failed: ' + err);
                  } finally {
                    openBtn.disabled = false;
                  }
                });
                cardActions.appendChild(openBtn);

                // Outline Export Button with P0 Read-only Guard
                const exportBtn = createEl('button', 'mf-card-btn', T('导出大纲', 'Export Outline'));
                exportBtn.setAttribute('data-l10n-id', 'mindflow-item-pane-card-export');
                exportBtn.type = 'button';
                if (!isEditable) {
                  exportBtn.disabled = true;
                  exportBtn.setAttribute('aria-disabled', 'true');
                  exportBtn.title = T('当前文献处于只读库或回收站中，无法导出大纲笔记', 'Parent item is read-only or in Trash, cannot export outline note');
                  exportBtn.setAttribute('aria-label', exportBtn.title);
                } else {
                  exportBtn.title = T('将思维导图结构一键导出为 Zotero 文献子笔记', 'Export the map outline as a Zotero child note');
                  exportBtn.removeAttribute('aria-disabled');
                }
                exportBtn.addEventListener('click', async (e) => {
                  e.preventDefault(); e.stopPropagation();
                  if (exportBtn.disabled || !isEditable) return;
                  exportBtn.disabled = true;
                  try {
                    await host.exportAttachmentToNote(att, win);
                  } catch (err) {
                    Zotero.logError?.('[MindFlow] Export attachment to note failed: ' + err);
                  } finally {
                    exportBtn.disabled = !isEditable;
                    if (isEditable) exportBtn.removeAttribute('aria-disabled');
                  }
                });
                cardActions.appendChild(exportBtn);

                const locateBtn = createEl('button', 'mf-card-btn', T('定位附件', 'Locate Attachment'));
                locateBtn.setAttribute('data-l10n-id', 'mindflow-item-pane-card-locate');
                locateBtn.type = 'button';
                locateBtn.title = T('在文献库列表中定位并选中此思维导图附件', 'Select this map attachment in the item list');
                locateBtn.addEventListener('click', (e) => {
                  e.preventDefault(); e.stopPropagation();
                  try {
                    const mainWin = Zotero.getMainWindow?.();
                    mainWin?.ZoteroPane?.selectItem?.(att.id);
                  } catch (err) {
                    Zotero.logError?.('[MindFlow] Locate attachment failed: ' + err);
                  }
                });
                cardActions.appendChild(locateBtn);

                card.appendChild(cardActions);
                mapsList.appendChild(card);
              }
              mapsSection.appendChild(mapsList);
              wrapper.appendChild(mapsSection);
            }
            body.appendChild(wrapper);
            if (state) { state.paneSignature = signature; state.paneActions = lastPaneActions; }
          },
        });
      } catch (error) {
        Zotero?.logError?.('[MindFlow] Could not register ItemPane section: ' + error);
      }
    }

    return {
      ensureItemPaneStyles,
      scheduleItemPaneRefresh,
      cancelItemPaneRefresh,
      resolveLiteratureTarget,
      registerItemPaneSection,
    };
  }

export const MindFlowItemPane = {
  createItemPaneModule,
};
