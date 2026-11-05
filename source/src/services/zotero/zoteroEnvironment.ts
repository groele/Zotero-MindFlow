import { MindMapDocument, InboxItem } from '../../core/model/types';

declare global {
  interface Window {
    Zotero?: any;
    arguments?: any[];
  }
}

/**
 * Get the global Zotero object if running inside Zotero 10 / Gecko
 */
export function getZoteroInstance(): any | null {
  if (typeof window === 'undefined') return null;
  try { if (window.Zotero) return window.Zotero; } catch { /* continue */ }
  try { if (window.arguments?.[0]?.Zotero) return window.arguments[0].Zotero; } catch { /* continue */ }
  try { if (window.opener?.Zotero) return window.opener.Zotero; } catch { /* continue */ }
  try { if (window.parent && window.parent !== window && window.parent.Zotero) return window.parent.Zotero; }
  catch { /* cross-origin parent */ }
  return null;
}

/**
 * Check if the application is running inside Zotero desktop
 */
export function isZoteroEnvironment(): boolean {
  return getZoteroInstance() !== null || isZoteroWorkspace();
}

/** The packaged workspace has a Zotero chrome URL even when API injection is late. */
export function isZoteroWorkspace(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'chrome:' &&
    window.location.host === 'mindflow';
}

/**
 * Get the target host window for postMessage communication (iframe parent or standalone opener).
 */
export function getHostWindow(): Window | null {
  if (typeof window === 'undefined') return null;
  if (window.parent && window.parent !== window) return window.parent;
  if (window.opener && window.opener !== window) return window.opener;
  return null;
}

export async function zoteroWorkspaceStorage(
  action: 'get' | 'setMany' | 'remove' | 'getAll' | 'keys' | 'commitDocument' | 'deleteDocument' | 'mutateSnapshots' | 'mutateInbox',
  payload: { key?: string; items?: Record<string, string>; doc?: MindMapDocument; id?: string; expectedRevision?: number; force?: boolean; restoreDeleted?: boolean;
    docId?: string; snapshots?: unknown[]; removeSnapshotId?: string; limit?: number;
    additions?: InboxItem[]; removeId?: string; processedId?: string; isProcessed?: boolean; clearProcessed?: boolean } = {},
): Promise<any> {
  const zotero = getZoteroInstance();
  const direct = zotero?.MindFlow?.workspaceStorage;
  if (typeof direct === 'function') {
    return direct.call(zotero.MindFlow, action, payload);
  }
  const hostWindow = getHostWindow();
  if (!hostWindow) {
    throw new Error('Zotero 本地文件存储通道未连接；导图未保存');
  }
  const requestId = `mindflow-storage-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return new Promise((resolve, reject) => {
    const finish = (error?: string, result?: unknown) => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timeout);
      if (error) reject(new Error(error)); else resolve(result);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== hostWindow || event.data?.type !== 'MINDFLOW_STORAGE_RESULT' ||
          event.data.requestId !== requestId) return;
      finish(event.data.error, event.data.result);
    };
    const timeout = window.setTimeout(() => finish('Zotero 本地文件存储超时；导图未确认保存'), 20000);
    window.addEventListener('message', onMessage);
    try {
      hostWindow.postMessage({ type: 'MINDFLOW_STORAGE', requestId, action, payload }, '*');
    } catch (error) {
      finish(`无法请求 Zotero 保存导图：${error}`);
    }
  });
}

/**
 * Get a MindFlow extension preference from Zotero.Prefs
 */
export function getZoteroPref<T>(key: string, defaultValue: T): T {
  const zotero = getZoteroInstance();
  if (zotero && zotero.Prefs) {
    try {
      const val = zotero.Prefs.get(`extensions.mindflow.${key}`, true);
      return val !== undefined ? (val as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
}

/**
 * Set a MindFlow extension preference in Zotero.Prefs
 */
export function setZoteroPref(key: string, value: any): boolean {
  const zotero = getZoteroInstance();
  let saved = false;
  if (zotero && zotero.Prefs) {
    try {
      zotero.Prefs.set(`extensions.mindflow.${key}`, value, true);
      saved = true;
    } catch {
      saved = false;
    }
  }
  if (!saved) {
    try {
      if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: 'MINDFLOW_SET_PREF',
            key,
            value,
          },
          '*'
        );
        saved = true;
      }
    } catch {
      // ignore
    }
  }
  return saved;
}

/**
 * Request host window to switch between Native Tab and Standalone Window
 */
export function requestZoteroWindowMode(targetMode: 'tab' | 'window'): void {
  setZoteroPref('windowMode', targetMode);
  try {
    if (typeof window !== 'undefined') {
      const zotero = getZoteroInstance();
      if (zotero?.MindFlow?.openMindFlow) {
        zotero.MindFlow.openMindFlow({ targetMode });
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: 'MINDFLOW_SET_WINDOW_MODE',
            targetMode,
          },
          '*'
        );
      }
    }
  } catch (e) {
    console.warn('[MindFlow] Note on requestZoteroWindowMode:', e);
  }
}

/**
 * Open external URL in system browser
 */
export function openExternalUrl(url: string): void {
  if (!url) return;
  const Zotero = getZoteroInstance();
  if (Zotero && typeof Zotero.launchURL === 'function') {
    try {
      Zotero.launchURL(url);
      return;
    } catch {
      // ignore
    }
  }
  const hostWindow = getHostWindow();
  if (hostWindow) {
    try {
      hostWindow.postMessage({ type: 'MINDFLOW_LAUNCH_URL', url }, '*');
      return;
    } catch {
      // ignore
    }
  }
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Open Zotero Preferences / Settings Window
 */
export function openZoteroPreferences(target: 'mindflow' | 'llm-for-zotero' = 'mindflow'): boolean {
  const paneId = target === 'llm-for-zotero' ? 'zotero-llm@github.com.yilewang' : 'mindflow@groele.org';
  const Zotero = getZoteroInstance();
  if (Zotero) {
    try {
      if (typeof Zotero.openPreferences === 'function') {
        Zotero.openPreferences(paneId);
        return true;
      }
      const win =
        (typeof window !== 'undefined' && window.parent !== window ? window.parent : null) ||
        (Zotero.getMainWindows ? Zotero.getMainWindows()[0] : null) ||
        Zotero.getMainWindow?.();
      if (win && typeof win.openDialog === 'function') {
        win.openDialog(
          'chrome://zotero/content/preferences/preferences.xhtml',
          'preferences',
          'chrome,titlebar,toolbar,centerscreen,resizable=yes',
          { pane: paneId }
        );
        return true;
      }
      if (win && typeof win.goDoCommand === 'function') {
        win.goDoCommand('cmd_preferences');
        return true;
      }
    } catch (e) {
      console.warn('[MindFlow] openZoteroPreferences direct call note:', e);
    }
  }

  if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
    try {
      window.parent.postMessage({ type: 'MINDFLOW_OPEN_PREFERENCES', target }, '*');
      return true;
    } catch {
      // ignore
    }
  }
  return false;
}
