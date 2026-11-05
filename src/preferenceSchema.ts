/**
 * Zotero MindFlow - preference schema, defaults and locale helpers.
 * Pure data: no DOM access and no host side effects.
 */

declare const Zotero: any;

export interface PreferenceField {
  path?: string;
  title?: string;
  desc?: string;
  type?: 'check' | 'select' | 'number-select' | 'text' | 'url' | 'password';
  options?: Array<[string, string]>;
  native?: boolean;
  inGrid?: boolean;
  subhead?: string;
}

export interface MindFlowPreferencesModule {
  init(win: Window): void;
}

export const ROOT = 'mindflow.mindflow_app_settings';
export const PREFIX = 'extensions.mindflow.';
export const HTML = 'http://www.w3.org/1999/xhtml';

function getLocale(): string {
  return String(Zotero?.locale || (globalThis as any).navigator?.language || '').toLowerCase();
}

function isZh(): boolean {
  return getLocale().startsWith('zh');
}

export function T(zh: string, en: string): string {
  return isZh() ? zh : en;
}

export const DEFAULTS: Record<string, any> = {
  toolbarTemplatesPlacement: 'more',
  toolbarPresentationPlacement: 'more',
  toolbarExportPlacement: 'more',
  toolbarPosition: 'top',
  workbenchDockPosition: 'left',
  toolbarButtons: {
    history: true, insert: true, layout: true, theme: true, outline: true,
    inbox: true, templates: true, zen: true, export: true, zoom: true,
  },
  canvasBackground: 'dots',
  zoomStep: 0.15,
  rainbowBranches: true,
  curveStyle: 'bezier',
  soundEffects: true,
  defaultThemeId: 'classic-blue',
  defaultLayout: 'mindmap',
  defaultTaskPriority: 2,
  autoExpandOnAddChild: true,
  autoSnapshotEnabled: true,
  autoSnapshotIntervalMinutes: 10,
  maxSnapshotsPerDoc: 20,
  webdav: {
    enabled: false, serverUrl: '', basePath: '/MindFlow/',
    username: '', password: '', autoSyncOnSave: false,
  },
  zoteroWindowMode: 'tab',
  zoteroIncludeAbstract: true,
  zoteroIncludeAnnotations: true,
  zoteroIncludeTags: true,
  showWelcomeOnStartup: true,
};

export const LEGACY: Record<string, string> = {
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
};

export const NATIVE_DEFAULTS: Record<string, any> = {
  autoArchiveToItem: true,
  autoOpenAfterExport: true,
  customSavePath: '',
  aiMaxPdfPages: 120,
};

export const THEMES: Array<[string, string]> = [
  ['classic-blue', T('经典商务蓝', 'Classic Blue')],
  ['dark-nebula', T('极夜星云', 'Dark Nebula')],
  ['macaron', T('马卡龙缤纷', 'Macaron')],
  ['forest-green', T('松柏青绿', 'Forest Green')],
  ['minimal-ink', T('极简水墨', 'Minimal Ink')],
  ['warm-amber', T('暖阳琥珀', 'Warm Amber')],
  ['cyberpunk-neon', T('赛博霓虹', 'Cyberpunk Neon')],
  ['nordic-frost', T('北欧冷灰', 'Nordic Frost')],
  ['academic-paper', T('学术报刊', 'Academic Paper')],
  ['lavender-dream', T('薰衣草梦境', 'Lavender Dream')],
];
