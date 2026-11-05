/**
 * Zotero MindFlow - literature item extraction primitives.
 * Field mapping and child-item harvesting split out of zoteroItemData
 * so that both modules stay within the section 5.9 size ceiling.
 */
import { getZoteroInstance } from './zoteroEnvironment';
import type { ZoteroItemData } from './zoteroItemData';

export function noteHtmlToText(html: string): string {
  try {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    parsed.querySelectorAll('br').forEach((node) => node.replaceWith('\n'));
    parsed.querySelectorAll('p, div, li').forEach((node) => node.append('\n'));
    return (parsed.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  } catch {
    return html.replace(/<[^>]+>/g, ' ').trim();
  }
}

export function annotationLink(attachment: any, annotation: any, Zotero: any): string | undefined {
  if (!annotation?.key || !attachment?.key) return undefined;
  const groupID = Zotero?.Libraries?.get?.(attachment.libraryID)?.groupID;
  const base = groupID
    ? `zotero://open-pdf/groups/${groupID}/items/${attachment.key}`
    : `zotero://open-pdf/library/items/${attachment.key}`;
  let page: number | undefined;
  try {
    const index = JSON.parse(annotation.annotationPosition || '{}').pageIndex;
    if (Number.isSafeInteger(index) && index >= 0) page = index + 1;
  } catch { /* annotation link still works without a page */ }
  return `${base}?${page ? `page=${page}&` : ''}annotation=${encodeURIComponent(annotation.key)}`;
}

export function extractDoi(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null;
  let clean = input
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .trim()
    .toLowerCase();
  const urlMatch = clean.match(/https?:\/\/(?:dx\.)?doi\.org\/[^\s]+/i)?.[0];
  if (urlMatch) {
    clean = urlMatch.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').split(/[?#]/, 1)[0];
  }
  try {
    clean = decodeURIComponent(clean).toLowerCase();
  } catch {
    // ignore
  }
  clean = clean.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '');
  clean = clean.replace(/^doi:\s*/i, '');
  const match = clean.match(/10\.\d{4,9}\/[^\s"'`\\]+/);
  if (!match) return null;
  let result = match[0].replace(/[.,;:，。；：、]+$/, '');
  for (const [open, close] of [['(', ')'], ['[', ']'], ['{', '}'], ['<', '>']]) {
    while (result.endsWith(close) && result.split(close).length > result.split(open).length) {
      result = result.slice(0, -1);
    }
  }
  return /^10\.\d{4,9}\/.+/.test(result) ? result : null;
}


export function extractZoteroItemData(item: any): ZoteroItemData | null {
  try {
    if (!item) return null;
    if (item.key && item.title && Array.isArray(item.authors) && item.zoteroUri) {
      return item as ZoteroItemData;
    }

    const Zotero = getZoteroInstance();
    let target = item;
    const isChildItem = target && (
      (typeof target.isAttachment === 'function' && target.isAttachment()) ||
      (typeof target.isNote === 'function' && target.isNote())
    );
    if (isChildItem && target.parentItemID) {
      const parent = Zotero?.Items?.get?.(target.parentItemID);
      if (parent) target = parent;
    }

    if (typeof target.isRegularItem !== 'function' || !target.isRegularItem()) {
      return null;
    }

    const title = (typeof target.getField === 'function' ? target.getField('title') : target.title) || '无标题文献';
    const date = typeof target.getField === 'function' ? target.getField('date') : target.date;
    let year = '';
    if (date) {
      const match = String(date).match(/\b(19|20)\d{2}\b/);
      year = match ? match[0] : String(date).slice(0, 4);
    }

    let authors: string[] = [];
    try {
      if (typeof target.getCreators === 'function') {
        const creators = target.getCreators();
        authors = creators.map((c: any) => c.lastName || c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim()).filter(Boolean);
      } else if (Array.isArray(target.creators)) {
        authors = target.creators.map((c: any) => c.lastName || c.name || '').filter(Boolean);
      }
    } catch {
      // fallback
    }

    const publication = typeof target.getField === 'function' ? (target.getField('publicationTitle') || target.getField('proceedingsTitle') || target.getField('publisher')) : '';
    let doi = typeof target.getField === 'function' ? target.getField('DOI') : target.doi;
    if (!doi && typeof target.getField === 'function') {
      const extra = target.getField('extra');
      if (extra) {
        const extraDoi = extractDoi(extra);
        if (extraDoi) doi = extraDoi;
      }
    }
    const url = typeof target.getField === 'function' ? target.getField('url') : target.url;
    const abstract = typeof target.getField === 'function' ? target.getField('abstractNote') : target.abstractNote;

    let tags: string[] = [];
    try {
      if (typeof target.getTags === 'function') {
        tags = target.getTags().map((t: any) => t.tag || String(t)).filter(Boolean);
      } else if (Array.isArray(target.tags)) {
        tags = target.tags.map((t: any) => t.tag || String(t)).filter(Boolean);
      }
    } catch {
      // fallback
    }

    const notes: Array<{ text: string; uri?: string }> = [];
    const annotations: Array<{ text: string; comment?: string; pageLabel?: string; color?: string; uri?: string }> = [];

    try {
      if (typeof target.getNotes === 'function') {
        const noteIds = target.getNotes();
        if (Zotero && Array.isArray(noteIds)) {
          for (const noteId of noteIds) {
            const noteItem = Zotero.Items.get(noteId);
            if (noteItem) {
              const noteText = noteHtmlToText(noteItem.getNote() || '');
              if (noteText && !noteText.includes('MindFlow 导图大纲')) {
                const groupID = Zotero.Libraries?.get?.(noteItem.libraryID)?.groupID;
                notes.push({
                  text: noteText,
                  uri: groupID
                    ? `zotero://select/groups/${groupID}/items/${noteItem.key}`
                    : `zotero://select/library/items/${noteItem.key}`,
                });
              }
            }
          }
        }
      }

      if (typeof target.getAttachments === 'function') {
        const attIds = target.getAttachments();
        if (Zotero && Array.isArray(attIds)) {
          for (const attId of attIds) {
            const att = Zotero.Items.get(attId);
            if (att && att.isPDFAttachment && att.isPDFAttachment()) {
              if (typeof att.getAnnotations === 'function') {
                const annos = att.getAnnotations();
                for (const anno of annos) {
                  const text = anno.annotationText;
                  const comment = anno.annotationComment;
                  const pageLabel = anno.annotationPageLabel;
                  const color = anno.annotationColor;
                  if (text || comment) {
                    annotations.push({ text: text || '', comment, pageLabel, color, uri: annotationLink(att, anno, Zotero) });
                  }
                }
              }
            }
          }
        }
      }
    } catch {
      // Ignore reading child notes
    }

    const key = target.key || String(target.id || Math.random());
    const groupID = Zotero?.Libraries?.get?.(target.libraryID)?.groupID;
    const zoteroUri = groupID
      ? `zotero://select/groups/${groupID}/items/${target.key || target.id}`
      : `zotero://select/library/items/${target.key || target.id}`;

    return {
      key,
      id: target.id,
      libraryID: target.libraryID,
      title,
      itemType: target.itemType || 'journalArticle',
      authors,
      year,
      publication,
      doi,
      url,
      abstract,
      tags,
      notes,
      annotations,
      zoteroUri,
    };
  } catch (error) {
    console.error('Failed to extract Zotero item:', error);
    return null;
  }
}
