import { AppSettings, DEFAULT_SETTINGS, WebDAVConfig } from '../../core/model/settingsTypes';
import { safeStorage } from './safeStorage';
import { getZoteroInstance } from '../zotero/zoteroBridge';

const SETTINGS_STORAGE_KEY = 'mindflow_app_settings';
export type SettingsPatch = Omit<Partial<AppSettings>, 'webdav'> & { webdav?: Partial<WebDAVConfig> };

const ZOTERO_PREF_PATHS: Record<string, string> = {
  zoteroWindowMode: 'windowMode',
  showWelcomeOnStartup: 'showWelcomeOnStartup',
  zoteroIncludeAbstract: 'includeAbstract',
  zoteroIncludeAnnotations: 'includeAnnotations',
  zoteroIncludeTags: 'includeTags',
  defaultLayout: 'defaultLayout',
  canvasBackground: 'canvasBackground',
  curveStyle: 'curveStyle',
  rainbowBranches: 'rainbowBranches',
  soundEffects: 'soundEffects',
  autoSnapshotEnabled: 'autoSnapshotEnabled',
  autoSnapshotIntervalMinutes: 'autoSnapshotIntervalMinutes',
  'webdav.enabled': 'webdavEnabled',
  'webdav.serverUrl': 'webdavServerUrl',
  'webdav.basePath': 'webdavBasePath',
  'webdav.username': 'webdavUsername',
  'webdav.password': 'webdavPassword',
  'webdav.autoSyncOnSave': 'webdavAutoSync',
  aiMaxPdfPages: 'aiMaxPdfPages',
};

function getPath(value: any, path: string): any {
  return path.split('.').reduce((current, part) => current?.[part], value);
}

function setPath(value: any, path: string, next: any): void {
  const parts = path.split('.');
  let target = value;
  for (const part of parts.slice(0, -1)) target = target[part];
  target[parts[parts.length - 1]] = next;
}

function legacyZoteroSettings(): Partial<AppSettings> {
  const zotero = getZoteroInstance();
  const migrated = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as AppSettings;
  if (!zotero?.Prefs) return migrated;
  for (const [path, pref] of Object.entries(ZOTERO_PREF_PATHS)) {
    const value = zotero.Prefs.get('extensions.mindflow.' + pref, true);
    if (value !== undefined && value !== null) setPath(migrated, path, value);
  }
  const theme = zotero.Prefs.get('extensions.mindflow.theme', true);
  if (typeof theme === 'string' && [
    'classic-blue', 'dark-nebula', 'macaron', 'forest-green', 'minimal-ink',
    'warm-amber', 'cyberpunk-neon', 'nordic-frost', 'academic-paper', 'lavender-dream',
  ].includes(theme)) migrated.defaultThemeId = theme;
  return migrated;
}

function mirrorZoteroPreferences(settings: AppSettings): void {
  const zotero = getZoteroInstance();
  if (!zotero?.Prefs) return;
  for (const [path, pref] of Object.entries(ZOTERO_PREF_PATHS)) {
    zotero.Prefs.set('extensions.mindflow.' + pref, getPath(settings, path), true);
  }
  zotero.Prefs.set('extensions.mindflow.theme', settings.defaultThemeId, true);
}

function deepMerge(target: any, source: any): any {
  if (!source) return target;
  const output = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      output[key] = deepMerge(target[key], source[key]);
    } else if (source[key] !== undefined) {
      output[key] = source[key];
    }
  }
  return output;
}

export function sanitizeSettings(settings: Partial<AppSettings>): AppSettings {
  const merged = deepMerge(DEFAULT_SETTINGS, settings);

  // Validate layout & visual enums
  if (!['mindmap', 'logic-right', 'org-down'].includes(merged.defaultLayout)) {
    merged.defaultLayout = 'mindmap';
  }
  if (!['dots', 'grid', 'blank'].includes(merged.canvasBackground)) {
    merged.canvasBackground = 'dots';
  }
  if (!['bezier', 'straight', 'rounded'].includes(merged.curveStyle)) {
    merged.curveStyle = 'bezier';
  }
  if (!['top', 'bottom'].includes(merged.toolbarPosition)) {
    merged.toolbarPosition = 'top';
  }
  if (!['left', 'right'].includes(merged.workbenchDockPosition)) {
    merged.workbenchDockPosition = 'left';
  }
  if (!['tab', 'window'].includes(merged.zoteroWindowMode)) {
    merged.zoteroWindowMode = 'tab';
  }
  if (![1, 2, 3].includes(merged.defaultTaskPriority)) {
    merged.defaultTaskPriority = 2;
  }

  // Validate and clamp numbers
  if (!Number.isFinite(merged.zoomStep) || merged.zoomStep < 0.05 || merged.zoomStep > 0.5) {
    merged.zoomStep = 0.15;
  }
  if (!Number.isSafeInteger(merged.maxSnapshotsPerDoc) || merged.maxSnapshotsPerDoc < 10 || merged.maxSnapshotsPerDoc > 50) {
    merged.maxSnapshotsPerDoc = 20;
  }
  if (!Number.isFinite(merged.autoSnapshotIntervalMinutes) || merged.autoSnapshotIntervalMinutes < 1 || merged.autoSnapshotIntervalMinutes > 120) {
    merged.autoSnapshotIntervalMinutes = 10;
  }
  if (!Number.isFinite(merged.aiMaxPdfPages) || merged.aiMaxPdfPages < 10) {
    merged.aiMaxPdfPages = 120;
  }

  // Toolbar placement enums
  for (const key of ['toolbarTemplatesPlacement', 'toolbarPresentationPlacement', 'toolbarExportPlacement'] as const) {
    if (!['toolbar', 'more', 'hidden'].includes(merged[key])) merged[key] = 'more';
  }

  // Ensure boolean types
  for (const boolKey of [
    'rainbowBranches', 'soundEffects', 'autoExpandOnAddChild', 'autoSnapshotEnabled',
    'zoteroIncludeAbstract', 'zoteroIncludeAnnotations', 'zoteroIncludeTags', 'showWelcomeOnStartup'
  ] as const) {
    if (typeof merged[boolKey] !== 'boolean') {
      merged[boolKey] = Boolean(DEFAULT_SETTINGS[boolKey]);
    }
  }

  return merged;
}

export class SettingsService {
  private static cachedSettings: AppSettings | null = null;

  /**
   * Load settings from storage, merged with defaults
   */
  public static async getSettings(): Promise<AppSettings> {
    return this.readSettings();
  }

  private static readSettings(): AppSettings {
    if (this.cachedSettings && !getZoteroInstance()) {
      return structuredClone(this.cachedSettings);
    }

    let loadedSettings: Partial<AppSettings> | null = null;
    const raw = safeStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      try {
        loadedSettings = JSON.parse(raw);
      } catch {
        loadedSettings = null;
      }
    }

    const merged = sanitizeSettings(
      loadedSettings || (getZoteroInstance() ? legacyZoteroSettings() : {})
    );
    this.cachedSettings = merged;
    return structuredClone(merged);
  }

  /**
   * Update and persist partial settings
   */
  public static async updateSettings(partial: SettingsPatch): Promise<AppSettings> {
    // Zotero preferences are synchronous and shared across frames. Keep the
    // read/merge/write in one uninterrupted turn, so another setting edit
    // cannot commit between reading the old settings and writing this patch.
    const current = this.readSettings();
    const updated = sanitizeSettings(deepMerge(current, partial));

    safeStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    this.cachedSettings = updated;
    mirrorZoteroPreferences(updated);

    // Also synchronize workbenchDockPosition to safeStorage key for compatibility
    if (partial.workbenchDockPosition) {
      safeStorage.setItem('mindflow_dock_pos', partial.workbenchDockPosition);
    }

    return structuredClone(updated);
  }

  /**
   * Reset settings to default values
   */
  public static async resetSettings(): Promise<AppSettings> {
    safeStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    this.cachedSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as AppSettings;
    mirrorZoteroPreferences(DEFAULT_SETTINGS);
    safeStorage.setItem('mindflow_dock_pos', DEFAULT_SETTINGS.workbenchDockPosition);
    return structuredClone(DEFAULT_SETTINGS);
  }
}
