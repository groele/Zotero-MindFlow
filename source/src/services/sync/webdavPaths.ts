/**
 * WebDAV addressing primitives: URL/permission validation, backup filenames,
 * Basic auth encoding and remote timestamp parsing. Kept separate from
 * WebDAVService so the network client stays focused on request orchestration.
 */
import type { WebDAVConfig } from '../../core/model/settingsTypes';

export const LATEST_BACKUP = 'mindflow-workspace-backup.json';
export const VERSIONED_BACKUP = /^mindflow-workspace-\d{8}T\d{6}Z-[a-f0-9]{8}\.json$/;

/** Validate URL and ensure secure origin. */
export function parseSecureServerUrl(serverUrl: string): URL {
  const input = (serverUrl || '').trim();
  const normalized = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const url = new URL(normalized);
  if (url.protocol !== 'https:') {
    throw new Error('WebDAV 仅允许 HTTPS 连接，避免账户密码通过明文 HTTP 传输。');
  }
  if (url.username || url.password) {
    throw new Error('请将 WebDAV 用户名和密码填写在账户字段中，不要放进服务器地址。');
  }
  if (url.search || url.hash) throw new Error('服务器地址请填写到路径为止，不要包含查询参数或片段。');
  return url;
}

/** Normalize base server URL and remote relative path into an absolute URI. */
export function buildUrl(serverUrl: string, path: string): string {
  const base = parseSecureServerUrl(serverUrl);
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  const cleanPath = (path || '').trim().replace(/^\/+/, '');
  if (cleanPath.includes('\\') || cleanPath.includes('?') || cleanPath.includes('#') ||
      /^[a-z][a-z0-9+.-]*:/i.test(cleanPath) || cleanPath.split('/').some(segment => {
        let decoded: string;
        try { decoded = decodeURIComponent(segment); } catch { return true; }
        return decoded === '..' || decoded.includes('/') || decoded.includes('\\');
      })) {
    throw new Error('WebDAV 目标路径必须位于配置的服务器内。');
  }
  const target = new URL(cleanPath, base);
  if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname)) {
    throw new Error('WebDAV 目标路径必须位于配置的服务器内。');
  }
  return target.toString();
}

/** Encode Basic Auth credentials safely for UTF-8 characters. */
export function getAuthHeader(config: WebDAVConfig): string {
  const raw = `${config.username}:${config.password}`;
  try {
    return 'Basic ' + btoa(unescape(encodeURIComponent(raw)));
  } catch {
    return 'Basic ' + btoa(raw);
  }
}

export function backupPath(config: WebDAVConfig, fileName: string): string {
  return (config.basePath || '/').replace(/\/+$/, '') + '/' + fileName;
}

/** Parse the UTC timestamp embedded in a versioned backup filename. */
export function parseBackupTimestamp(fileName: string): number {
  const start = 'mindflow-workspace-'.length;
  const stamp = fileName.slice(start, start + 16);
  const iso = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)}Z`;
  return Date.parse(iso);
}
