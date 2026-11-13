/**
 * Zotero MindFlow - ItemPane Module Controller
 *
 * Scoped ItemPane section for Zotero's right-hand sidebar.
 * Coordinates style injection, multi-window selection tracking,
 * and academic reading workflow actions.
 */

import type { MindFlowConstants } from './constants.js';
import { ensureItemPaneStyles } from './itemPaneStyles.js';
import {
  scheduleItemPaneRefresh,
  cancelItemPaneRefresh,
  resolveContextSelection,
  resolveLiteratureTarget,
  syncPaneActionStates,
} from './itemPaneHelpers.js';
import {
  renderItemPaneFallback,
  renderItemPaneContent,
} from './itemPaneView.js';

export interface ItemPaneDeps {
  Zotero?: any;
  host?: any;
  constants?: typeof MindFlowConstants;
}

export function createItemPaneModule(deps: ItemPaneDeps = {}) {
  const getZotero = () => deps.Zotero || (globalThis as any).Zotero;
  const getHost = () => deps.host || (globalThis as any).Zotero?.MindFlow;
  const getConstants = () => deps.constants || (globalThis as any).MindFlowConstants;

  const T = (zh: string, en: string) => {
    const constants = getConstants();
    if (typeof constants?.T === 'function') return constants.T(zh, en);
    return /^en/i.test(String(getZotero()?.locale || '')) ? en : zh;
  };

  function registerItemPaneSection(targetHost?: any) {
    const host = targetHost || getHost();
    const Zotero = getZotero();
    const constants = getConstants();
    const ADDON_ID = constants?.ADDON_ID || 'mindflow@groele.org';
    const CHROME_ROOT = constants?.CHROME_ROOT || 'chrome://mindflow/content/';

    if (typeof Zotero?.ItemPaneManager?.registerSection !== 'function') return;
    try {
      const sectionStates = new WeakMap();
      let renderItemPaneAsync: any = null;
      let lastPaneBody: any = null;
      const lastPaneTargetRef = { current: null as any };
      const lastPaneItemRef = { current: null as any };
      const lastPaneActions: any[] = [];
      const disablePaneActions = (target: any, selectedItem: any) => {
        syncPaneActionStates(lastPaneActions, target, selectedItem, getZotero);
      };
      if (!host._itemPaneStates) host._itemPaneStates = new Set();
      const icon = `${CHROME_ROOT}icons/mindflow.svg`;

      if (!host._itemPaneNotifierID && Zotero.Notifier?.registerObserver) {
        try {
          host._itemPaneNotifierID = Zotero.Notifier.registerObserver({
            notify: (event: any, type: string, ids: any[]) => {
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
                if (relevant) scheduleItemPaneRefresh(host, state, 120, getZotero);
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
        onInit: ({ doc, body, item, refresh }: any) => {
          const document = doc || body?.ownerDocument;
          const win = doc?.defaultView || document?.defaultView || null;
          if (document) {
            host.ensureLocalization?.(document);
            ensureItemPaneStyles(document, getZotero);
          }
          const target = resolveLiteratureTarget(item, getZotero);
          const state: any = {
            itemKey: target?.key || null,
            libraryID: target?.libraryID || null,
            targetID: target?.id || null,
            window: win,
            renderVersion: 0,
            renderAbort: null,
            rafID: null,
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
              state.rafID = raf.call(document.defaultView, () => {
                state.rafID = null;
                if (!host._itemPaneStates.has(state) || host._lifecycleActive === false) return;
                owner.empty = false;
                owner.open = true;
              });
            }
          }
        },
        onDestroy: ({ body }: any) => {
          const state = sectionStates.get(body);
          if (state) {
            state.renderVersion++;
            state.renderAbort?.abort?.();
            state.renderAbort = null;
            if (state.rafID != null) try { state.window?.cancelAnimationFrame?.(state.rafID); } catch (_) {}
            state.rafID = null;
            cancelItemPaneRefresh(state, getZotero);
            host._itemPaneStates.delete(state);
          }
          sectionStates.delete(body);
        },
        onItemChange: ({ doc, body, item, setEnabled }: any) => {
          const document = doc || body?.ownerDocument;
          const win = doc?.defaultView || document?.defaultView || null;
          const target = resolveLiteratureTarget(item, getZotero) || (item === null ? null : resolveLiteratureTarget(
            resolveContextSelection(win, document, getZotero), getZotero
          ));
          const state = sectionStates.get(body);
          if (state) {
            if (win) state.window = win;
            state.itemKey = target?.key || null;
            state.libraryID = target?.libraryID || null;
            state.targetID = target?.id || null;
            state.renderVersion++;
          }
          lastPaneTargetRef.current = target;
          lastPaneItemRef.current = target ? item : null;
          disablePaneActions(target, item);
          if (!body && lastPaneBody && target && renderItemPaneAsync) {
            void renderItemPaneAsync({ doc, body: lastPaneBody, item, setSectionSummary: null });
          }
          setEnabled(true);
        },
        onRender: ({ doc, body, item, setSectionSummary }: any) => {
          if (!body) return;
          const document = doc || body.ownerDocument;
          const win = doc?.defaultView || document?.defaultView || null;
          if (document) {
            ensureItemPaneStyles(document, getZotero);
          }
          const target = resolveLiteratureTarget(item, getZotero) || (item === null ? null : resolveLiteratureTarget(
            resolveContextSelection(win, document, getZotero), getZotero
          ));
          lastPaneBody = body;
          lastPaneTargetRef.current = target;
          lastPaneItemRef.current = target ? item : null;
          let state = sectionStates.get(body);
          if (!state) {
            state = { itemKey: target?.key || null, libraryID: target?.libraryID || null, targetID: target?.id || null, window: win, renderVersion: 0, saving: false };
            state.refresh = () => renderItemPaneAsync?.({
              doc, body,
              item: lastPaneTargetRef.current ? (lastPaneItemRef.current || lastPaneTargetRef.current) : null,
              setSectionSummary,
            });
            sectionStates.set(body, state);
            host._itemPaneStates.add(state);
          } else {
            if (win) state.window = win;
            state.itemKey = target?.key || null;
            state.libraryID = target?.libraryID || null;
            state.targetID = target?.id || null;
          }
          if (target && renderItemPaneAsync) {
            void renderItemPaneAsync({ doc, body, item, setSectionSummary });
            return;
          }
          lastPaneActions.length = 0;
          const maps = target ? host.getMindflowAttachments(target) : [];
          renderItemPaneFallback({
            document,
            body,
            target,
            totalMaps: maps.length,
            maps,
            state,
            host,
            win,
            Zotero,
          });
        },
        onAsyncRender: renderItemPaneAsync = async ({ doc, body, item, setSectionSummary }: any) => {
          if (!body) return;
          const document = doc || body.ownerDocument;
          const win = doc?.defaultView || document?.defaultView || null;
          if (document) {
            ensureItemPaneStyles(document, getZotero);
          }
          const target = resolveLiteratureTarget(item, getZotero) || (item === null ? null : resolveLiteratureTarget(
            resolveContextSelection(win, document, getZotero), getZotero
          ));
          lastPaneBody = body;
          lastPaneTargetRef.current = target;
          lastPaneItemRef.current = target ? item : null;
          if (!target) {
            disablePaneActions(null, null);
            return;
          }

          const state = sectionStates.get(body);
          if (state) {
            if (win) state.window = win;
            state.itemKey = target.key || null;
            state.libraryID = target.libraryID || null;
            state.targetID = target.id || null;
          }
          const renderVersion = state ? ++state.renderVersion : 0;

          await renderItemPaneContent({
            document,
            body,
            target,
            item,
            state,
            host,
            win,
            Zotero,
            T,
            setSectionSummary,
            lastPaneTargetRef,
            lastPaneItemRef,
            lastPaneActions,
          });
        },
      });
    } catch (error) {
      Zotero?.logError?.('[MindFlow] Could not register ItemPane section: ' + error);
    }
  }

  return {
    ensureItemPaneStyles: (doc: any) => ensureItemPaneStyles(doc, getZotero),
    scheduleItemPaneRefresh: (targetHost: any, state: any, delay?: number) => scheduleItemPaneRefresh(targetHost, state, delay, getZotero),
    cancelItemPaneRefresh: (state: any) => cancelItemPaneRefresh(state, getZotero),
    resolveLiteratureTarget: (item: any) => resolveLiteratureTarget(item, getZotero),
    registerItemPaneSection,
  };
}

export const MindFlowItemPane = {
  createItemPaneModule,
};

// Global for loadSubScript backwards compatibility
(function (global: any) {
  global.MindFlowItemPane = MindFlowItemPane;
})(typeof globalThis !== 'undefined' ? globalThis : this);
