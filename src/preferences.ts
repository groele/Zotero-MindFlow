/**
 * Zotero MindFlow - Preferences Pane Controller
 *
 * Single Source of Truth for settings rendering, Fluent localization bindings,
 * and preference synchronizations across Zotero 10-12 host runtimes.
 * The schema, field catalogue, store and control builders live in sibling
 * modules; this file owns pane lifecycle and observer wiring only.
 *
 * Zotero 10 loads preference scripts in a pane sandbox. The generated
 * chrome/content/scripts/preferences.js must therefore publish init() on the
 * preferences window (see the assignment at the end of this file), because
 * inline fragment handlers resolve names on that window, not on sandbox
 * globals. The workspace and this pane share one AppSettings JSON preference;
 * legacy native preferences remain mirrored for host-side actions.
 */

import { ROOT, PREFIX, DEFAULTS, LEGACY, NATIVE_DEFAULTS, T } from './preferenceSchema';
import { FIELDS } from './preferenceFields';
import { prefGet, getPath, readSettings, writeSettings } from './preferenceStore';
import {
  element, status, appendNotice, updateDependencies, renderGroupFields,
} from './preferenceControls';

declare const Zotero: any;

const paneObservers = new WeakMap<Document, any>();

function refreshControls(doc: Document): void {
  const settings = readSettings();
  for (const fields of Object.values(FIELDS)) {
    for (const field of fields) {
      if (!field.path) continue;
      const input = doc.getElementById('mindflow-pref-' + field.path.replace(/\./g, '-')) as HTMLInputElement | HTMLSelectElement | null;
      if (!input) continue;
      const value = field.native ? prefGet(PREFIX + field.path, NATIVE_DEFAULTS[field.path]) : getPath(settings, field.path);
      if (field.type === 'check') (input as HTMLInputElement).checked = Boolean(value);
      else if (input !== doc.activeElement) input.value = String(value ?? '');
    }
  }
  updateDependencies(doc);
}

export function init(win: Window): void {
  try {
    const doc = win.document;
    const settings = readSettings();

    for (const [group, fields] of Object.entries(FIELDS)) {
      const container = doc.getElementById('mindflow-pref-' + group);
      if (!container) continue;
      container.replaceChildren();
      renderGroupFields(doc, container, fields, settings);

      if (group === 'literature') {
        appendNotice(doc, container, T(
          '提示：导图源文件 (.mindflow) 自动作为附件归档在对应文献条目下；跨设备同步遵从 Zotero 文件同步策略。',
          'Tip: MindFlow map files (.mindflow) are automatically archived as attachments under items. Multi-device sync follows Zotero file synchronization rules.'
        ), 'mindflow-pref-notice-literature');
      }
      if (group === 'ai') {
        const notice = element(doc, 'div', 'mindflow-notice');
        const p1 = element(doc, 'p', '', '');
        p1.style.margin = '0 0 6px';
        const strong1 = element(doc, 'strong', '', T('MindFlow AI 智能分析', 'MindFlow AI Analysis'));
        const code = element(doc, 'code', '', 'llm-for-zotero');
        p1.appendChild(strong1);
        p1.appendChild(doc.createTextNode(T(' 深度集成 ', ' is integrated with ')));
        p1.appendChild(code);
        p1.appendChild(doc.createTextNode(T(
          ' 插件。模型选择、API 密钥配置及网络连通性由其统一管理，MindFlow 负责文献结构化解析与思维导图编排。',
          ' add-on. Models, API keys, and network connectivity are managed centrally there, while MindFlow orchestrates structured paper extraction and mind maps.'
        )));
        notice.appendChild(p1);

        const p2 = element(doc, 'p', '', '');
        p2.style.margin = '0';
        const strong2 = element(doc, 'strong', '', T('隐私安全：', 'Privacy & Security: '));
        p2.appendChild(strong2);
        p2.appendChild(doc.createTextNode(T(
          '仅在您主动点击「AI 生成导图」并确认范围后，才将选中内容提交至大模型；生成的内容保留证据引用链，供您审阅修改后归档。',
          'Paper content is only sent to the model when you explicitly click "Generate AI Map" and confirm the scope; generated maps preserve source evidence citations for review.'
        )));
        notice.appendChild(p2);
        container.appendChild(notice);

        const button = element(doc, 'button', 'mindflow-btn-open-llm', T('打开 llm-for-zotero 设置', 'Open llm-for-zotero Preferences'));
        button.type = 'button';
        button.setAttribute('data-l10n-id', 'mindflow-pref-btn-open-llm');
        button.addEventListener('click', () => {
          const pane = 'zotero-llm@github.com.yilewang';
          try {
            if (typeof Zotero.openPreferences === 'function') {
              Zotero.openPreferences(pane);
              return;
            }
            const currentWin = win || Zotero.getMainWindow?.();
            if (currentWin && typeof (currentWin as any).openDialog === 'function') {
              (currentWin as any).openDialog(
                'chrome://zotero/content/preferences/preferences.xhtml',
                'preferences',
                'chrome,titlebar,toolbar,centerscreen,resizable=yes',
                { pane }
              );
              return;
            }
            status(doc, T('无法打开 Zotero 设置窗口。', 'Could not open Zotero Preferences dialog.'), true);
          } catch (error: any) {
            status(doc, String(error?.message || error), true);
          }
        });
        container.appendChild(button);
      }
      if (group === 'backup') {
        appendNotice(doc, container, T(
          '提示：额外保存文件夹不代替文献条目下的 .mindflow 附件。历史快照与完整版本回溯可在导图工作台顶栏的「历史」面板中直接浏览与一键恢复。',
          'Tip: The extra backup folder does not replace attachments. History snapshots and rollbacks can be viewed and restored in the workspace "History" panel.'
        ), 'mindflow-pref-notice-backup');
      }
      if (group === 'webdav') {
        appendNotice(doc, container, T(
          '提示：WebDAV 作为独立于 Zotero 原生同步的工作区级二次容灾备份。连接测试、手动上传和版本恢复请在工作台操作。',
          'Tip: WebDAV serves as an independent secondary disaster recovery backup. Connection tests and manual uploads can be performed in the workspace.'
        ), 'mindflow-pref-notice-webdav');
      }
    }

    updateDependencies(doc);

    const openButton = doc.getElementById('mindflow-btn-open-workspace');
    if (openButton) {
      openButton.onclick = () => Zotero.MindFlow?.openMindFlow?.({ mode: 'open' });
    }

    const resetButton = doc.getElementById('mindflow-btn-reset-defaults');
    if (resetButton) {
      resetButton.onclick = () => {
        if (!win.confirm(T('恢复 MindFlow 默认偏好设置？已保存的思维导图、文献附件和历史快照不会被删除。', 'Restore MindFlow default preferences? Saved mind maps, literature items, and snapshots will not be deleted.'))) return;
        try {
          const fresh = JSON.parse(JSON.stringify(DEFAULTS));
          writeSettings(fresh, 'workbenchDockPosition');
          for (const [path, pref] of Object.entries(LEGACY)) {
            Zotero.Prefs.set(PREFIX + pref, getPath(fresh, path), true);
          }
          Zotero.Prefs.set(PREFIX + 'theme', fresh.defaultThemeId, true);
          for (const [key, value] of Object.entries(NATIVE_DEFAULTS)) {
            Zotero.Prefs.set(PREFIX + key, value, true);
          }
          init(win);
          status(doc, T('MindFlow 偏好设置已恢复默认值。', 'MindFlow preferences restored to defaults.'));
        } catch (error: any) {
          status(doc, T('重置失败：', 'Reset failed: ') + error, true);
        }
      };
    }

    if (!paneObservers.has(doc) && Zotero.Prefs?.registerObserver) {
      const observer = Zotero.Prefs.registerObserver(ROOT, () => refreshControls(doc), true);
      paneObservers.set(doc, observer);
      win.addEventListener('unload', () => {
        Zotero.Prefs.unregisterObserver?.(observer);
        paneObservers.delete(doc);
      }, { once: true });
    }

    status(doc, T('更改会立即保存；已打开的导图工作台在重新获得焦点后更新。', 'Changes are saved immediately; active workspaces update on focus.'));
  } catch (error: any) {
    Zotero.logError?.('[MindFlow] Preference pane error: ' + error);
    status(win.document, T('设置面板加载失败：', 'Failed to load preferences pane: ') + error, true);
  }
}

// Zotero 10 loads preference scripts in a pane sandbox. Inline fragment
// handlers (onload="MindFlow_Preferences.init(window)") resolve names on the
// preferences window, NOT on sandbox globals. Never fall back to globalThis:
// that would silently leave the pane uninitialised when window is unavailable.
(window as any).MindFlow_Preferences = { init };
