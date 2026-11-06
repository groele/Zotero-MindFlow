/**
 * Zotero MindFlow - settings-pane DOM controls and dependency wiring.
 */
import { HTML, PREFIX, NATIVE_DEFAULTS, T } from './preferenceSchema';
import type { PreferenceField } from './preferenceSchema';
import { prefGet, getPath, setPath, readSettings, writeSettings } from './preferenceStore';

declare const Zotero: any;
declare const Cc: any;
declare const Ci: any;

export function element<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = doc.createElementNS(HTML, tag) as HTMLElementTagNameMap[K];
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const SUBORDINATE_PATHS = new Set([
  'webdav.serverUrl',
  'webdav.basePath',
  'webdav.username',
  'webdav.password',
  'webdav.autoSyncOnSave',
  'autoSnapshotIntervalMinutes',
  'maxSnapshotsPerDoc',
]);

export function status(doc: Document, message: string, error = false): void {
  const node = doc.getElementById('mindflow-pref-status');
  if (node) {
    node.textContent = message;
    node.classList.toggle('mindflow-pref-error', error);
  }
}

export function appendNotice(doc: Document, container: HTMLElement, text: string, l10nId?: string): void {
  const el = element(doc, 'div', 'mindflow-notice', text);
  if (l10nId) el.setAttribute('data-l10n-id', l10nId);
  container.appendChild(el);
}

export function updateDependencies(doc: Document | null): void {
  if (!doc) return;
  const settings = readSettings();

  // 1. WebDAV dependencies
  const webdavEnabled = Boolean(settings.webdav?.enabled);
  const webdavDeps = [
    'webdav.serverUrl',
    'webdav.basePath',
    'webdav.username',
    'webdav.password',
    'webdav.autoSyncOnSave',
  ];
  for (const depPath of webdavDeps) {
    const input = doc.getElementById('mindflow-pref-' + depPath.replace(/\./g, '-')) as HTMLInputElement | HTMLSelectElement | null;
    if (input) {
      input.disabled = !webdavEnabled;
      input.setAttribute('aria-disabled', String(!webdavEnabled));
      const row = input.closest('.mindflow-form-row') || input.closest('.mindflow-check-option');
      if (row) {
        row.classList.toggle('is-disabled', !webdavEnabled);
        row.classList.add('subordinate-row');
        row.classList.add('indented-pref');
      }
    }
  }

  // 2. Snapshot dependencies
  const snapshotEnabled = Boolean(settings.autoSnapshotEnabled);
  const snapshotDeps = [
    'autoSnapshotIntervalMinutes',
    'maxSnapshotsPerDoc',
  ];
  for (const depPath of snapshotDeps) {
    const input = doc.getElementById('mindflow-pref-' + depPath.replace(/\./g, '-')) as HTMLInputElement | HTMLSelectElement | null;
    if (input) {
      input.disabled = !snapshotEnabled;
      input.setAttribute('aria-disabled', String(!snapshotEnabled));
      const row = input.closest('.mindflow-form-row') || input.closest('.mindflow-check-option');
      if (row) {
        row.classList.toggle('is-disabled', !snapshotEnabled);
        row.classList.add('subordinate-row');
        row.classList.add('indented-pref');
      }
    }
  }
}

function attachInputListener(doc: Document, input: HTMLInputElement | HTMLSelectElement, field: PreferenceField): void {
  const { path, type, native } = field;
  if (!path) return;
  input.addEventListener('change', () => {
    const next = type === 'check'
      ? (input as HTMLInputElement).checked
      : type === 'number-select'
      ? Number(input.value)
      : input.value.trim();
    try {
      if (native) {
        Zotero.Prefs.set(PREFIX + path, next, true);
        if (prefGet(PREFIX + path, null) !== next) throw new Error(T('Zotero 未保存此设置', 'Zotero could not save this preference'));
      } else {
        const latest = readSettings();
        if (path === 'webdav.autoSyncOnSave' && next) {
          if (!latest.webdav.enabled) throw new Error(T('请先启用 WebDAV 备份', 'Please enable WebDAV backup first'));
          const server = new URL(/^https?:\/\//i.test(latest.webdav.serverUrl)
            ? latest.webdav.serverUrl : 'https://' + latest.webdav.serverUrl);
          if (server.protocol !== 'https:' || server.username || server.password || server.search || server.hash) {
            throw new Error(T('WebDAV 服务器需使用 HTTPS，且地址中不能包含账号、查询或片段', 'WebDAV server must use HTTPS and cannot contain credentials, query, or fragment'));
          }
        }
        setPath(latest, path, next);
        writeSettings(latest, path);
      }
      status(doc, T('已保存。已打开的导图工作台在重新获得焦点后更新。', 'Saved. Open workspaces will refresh upon focus.'));
      updateDependencies(doc);
    } catch (error: any) {
      const previous = native ? prefGet(PREFIX + path, NATIVE_DEFAULTS[path]) : getPath(readSettings(), path);
      if (type === 'check') (input as HTMLInputElement).checked = Boolean(previous);
      else input.value = String(previous ?? '');
      status(doc, T('保存失败：', 'Save failed: ') + error, true);
    }
  });
}

function renderField(doc: Document, container: HTMLElement, field: PreferenceField, settings: Record<string, any>): void {
  const { path, title, type, options, native, desc, inGrid } = field;
  if (!path) return;
  const l10nKey = 'mindflow-pref-' + path.replace(/\./g, '-');
  const inputId = 'mindflow-pref-' + path.replace(/\./g, '-');
  const value = native ? prefGet(PREFIX + path, NATIVE_DEFAULTS[path]) : getPath(settings, path);

  if (inGrid) {
    const label = element(doc, 'label', 'mindflow-check-row');
    const input = element(doc, 'input', 'mindflow-control') as HTMLInputElement;
    input.type = 'checkbox';
    input.id = inputId;
    input.dataset.setting = path;
    input.checked = Boolean(value);
    const span = element(doc, 'span', 'mindflow-check-label', title);
    span.setAttribute('data-l10n-id', l10nKey);
    label.appendChild(input);
    label.appendChild(span);
    container.appendChild(label);
    attachInputListener(doc, input, field);
    return;
  }

  if (type === 'check') {
    const optionWrap = element(doc, 'div', 'mindflow-check-option');
    if (SUBORDINATE_PATHS.has(path)) {
      optionWrap.classList.add('subordinate-row');
      optionWrap.classList.add('indented-pref');
    }
    const label = element(doc, 'label', 'mindflow-check-row');
    const input = element(doc, 'input', 'mindflow-control') as HTMLInputElement;
    input.type = 'checkbox';
    input.id = inputId;
    input.dataset.setting = path;
    input.checked = Boolean(value);
    const span = element(doc, 'span', 'mindflow-check-label', title);
    span.setAttribute('data-l10n-id', l10nKey);
    label.appendChild(input);
    label.appendChild(span);
    optionWrap.appendChild(label);
    if (desc) {
      const descEl = element(doc, 'div', 'mindflow-check-desc', desc);
      descEl.setAttribute('data-l10n-id', l10nKey + '-desc');
      optionWrap.appendChild(descEl);
    }
    container.appendChild(optionWrap);
    attachInputListener(doc, input, field);
    return;
  }

  const row = element(doc, 'div', 'mindflow-form-row');
  if (SUBORDINATE_PATHS.has(path)) {
    row.classList.add('subordinate-row');
    row.classList.add('indented-pref');
  }
  const labelWrap = element(doc, 'div', 'mindflow-form-label-wrap');
  const label = element(doc, 'label', 'mindflow-form-label', title);
  label.htmlFor = inputId;
  label.setAttribute('data-l10n-id', l10nKey);
  labelWrap.appendChild(label);
  if (desc) {
    const descEl = element(doc, 'span', 'mindflow-form-desc', desc);
    descEl.setAttribute('data-l10n-id', l10nKey + '-desc');
    labelWrap.appendChild(descEl);
  }
  row.appendChild(labelWrap);

  const isSelect = type === 'select' || type === 'number-select';
  const input = element(doc, isSelect ? 'select' : 'input', 'mindflow-control') as HTMLInputElement | HTMLSelectElement;
  input.id = inputId;
  input.dataset.setting = path;
  if (!isSelect && type) (input as HTMLInputElement).type = type;

  if (options) {
    for (const [val, name] of options) {
      const option = element(doc, 'option', '', name);
      (option as HTMLOptionElement).value = val;
      input.appendChild(option);
    }
  }
  input.value = String(value ?? '');

  if (type === 'password') {
    const group = element(doc, 'div', 'mindflow-control-group');
    group.appendChild(input);
    const eyeBtn = element(doc, 'button', 'mindflow-icon-btn', '👁');
    eyeBtn.type = 'button';
    eyeBtn.title = T('显示 / 隐藏密钥', 'Show / Hide token');
    eyeBtn.setAttribute('data-l10n-id', 'mindflow-pref-btn-toggle-token');
    eyeBtn.addEventListener('click', () => {
      (input as HTMLInputElement).type = (input as HTMLInputElement).type === 'password' ? 'text' : 'password';
    });
    group.appendChild(eyeBtn);
    row.appendChild(group);
  } else if (path === 'customSavePath') {
    const group = element(doc, 'div', 'mindflow-control-group');
    group.appendChild(input);
    const folderBtn = element(doc, 'button', 'mindflow-btn-secondary', T('选择文件夹', 'Choose Folder'));
    folderBtn.type = 'button';
    folderBtn.setAttribute('data-l10n-id', 'mindflow-pref-btn-choose-folder');
    folderBtn.addEventListener('click', () => {
      try {
        const picker = Cc['@mozilla.org/filepicker;1']
          .createInstance(Ci.nsIFilePicker);
        picker.init(doc.defaultView, T('选择 MindFlow 额外保存文件夹', 'Select MindFlow Mirror Backup Folder'), Ci.nsIFilePicker.modeGetFolder);
        picker.open((result: number) => {
          if (result !== Ci.nsIFilePicker.returnOK || !picker.file?.path) return;
          input.value = picker.file.path;
          input.dispatchEvent(new (doc.defaultView as any).Event('change', { bubbles: true }));
        });
      } catch (error: any) {
        status(doc, T('选择文件夹失败：', 'Folder selection failed: ') + error, true);
      }
    });
    group.appendChild(folderBtn);
    row.appendChild(group);
  } else {
    row.appendChild(input);
  }

  container.appendChild(row);
  attachInputListener(doc, input, field);
}

export function renderGroupFields(doc: Document, container: HTMLElement, fields: PreferenceField[], settings: Record<string, any>): void {
  let gridContainer: HTMLElement | null = null;
  for (const field of fields) {
    if (field.subhead) {
      gridContainer = null;
      const subheadEl = element(doc, 'h3', 'mindflow-subhead', field.subhead);
      subheadEl.setAttribute('data-l10n-id', 'mindflow-pref-subhead-toolbar-buttons');
      container.appendChild(subheadEl);
      continue;
    }
    if (field.inGrid) {
      if (!gridContainer) {
        gridContainer = element(doc, 'div', 'mindflow-choice-grid');
        container.appendChild(gridContainer);
      }
      renderField(doc, gridContainer, field, settings);
    } else {
      gridContainer = null;
      renderField(doc, container, field, settings);
    }
  }
}

