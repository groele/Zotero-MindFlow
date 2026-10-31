/** Only navigable web/mail/zotero/doi links are rendered as external links. */
export function safeExternalUrl(input: string | undefined): string | null {
  if (!input) return null;
  try {
    const trimmed = input.trim();
    if (trimmed.startsWith('zotero://')) return trimmed;
    if (trimmed.startsWith('doi:')) {
      const doi = trimmed.slice(4).trim();
      return doi ? `https://doi.org/${doi}` : null;
    }
    if (/^10\.\d{4,9}\/\S+$/.test(trimmed)) {
      return `https://doi.org/${trimmed}`;
    }
    const url = new URL(trimmed);
    return ['https:', 'http:', 'mailto:', 'zotero:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

