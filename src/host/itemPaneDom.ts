/**
 * Zotero MindFlow - shared XHTML element factory for ItemPane views.
 */
const XHTML_NS = 'http://www.w3.org/1999/xhtml';

export function makeElementFactory(document: any) {
  return (tag: string, className = '', text: string | null = null) => {
    const el = document.createElementNS
      ? document.createElementNS(XHTML_NS, tag)
      : document.createElement(tag);
    if (className) el.className = className;
    if (text !== null && text !== undefined) el.textContent = text;
    return el;
  };
}
