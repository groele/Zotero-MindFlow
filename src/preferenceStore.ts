/**
 * Zotero MindFlow - preference persistence and legacy key bridging.
 */
import { ROOT, PREFIX, DEFAULTS, LEGACY } from './preferenceSchema';

declare const Zotero: any;

export function prefGet(key: string, fallback: any): any {
  const value = Zotero.Prefs.get(key, true);
  return value === undefined || value === null ? fallback : value;
}

export function getPath(object: any, path: string): any {
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), object);
}

export function setPath(object: any, path: string, value: any): void {
  const parts = path.split('.');
  const last = parts.pop()!;
  const target = parts.reduce((acc, part) => {
    if (!acc[part] || typeof acc[part] !== 'object') acc[part] = {};
    return acc[part];
  }, object);
  target[last] = value;
}

export function readSettings(): Record<string, any> {
  const raw = prefGet(ROOT, '');
  if (!raw) return JSON.parse(JSON.stringify(DEFAULTS));
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed, webdav: { ...DEFAULTS.webdav, ...(parsed.webdav || {}) }, toolbarButtons: { ...DEFAULTS.toolbarButtons, ...(parsed.toolbarButtons || {}) } };
  } catch (_) {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
}

export function writeSettings(settings: any, changedPath?: string): void {
  Zotero.Prefs.set(ROOT, JSON.stringify(settings), true);
  if (changedPath && LEGACY[changedPath]) {
    const legacyKey = PREFIX + LEGACY[changedPath];
    const val = getPath(settings, changedPath);
    if (val !== undefined) Zotero.Prefs.set(legacyKey, val, true);
  }
  if (changedPath === 'defaultThemeId') {
    Zotero.Prefs.set(PREFIX + 'theme', settings.defaultThemeId, true);
  }
}

