/**
 * Zotero MindFlow - ItemPane CSS Style Declarations and Injection
 */

export function ensureItemPaneStyles(doc: any, getZotero?: () => any): void {
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
    getZotero?.()?.logError?.('[MindFlow] Failed to inject itemPane styles: ' + e);
  }
}
