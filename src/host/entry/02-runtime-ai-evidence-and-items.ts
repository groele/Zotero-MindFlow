  const extractJsonFromLlmOutput = (text) => {
    if (!text || typeof text !== 'string') return null;
    const trimmed = text.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (_) {}

    const blockMatches = Array.from(trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi));
    for (const match of blockMatches) {
      if (match[1]) {
        try {
          const parsed = JSON.parse(match[1].trim());
          if (parsed && typeof parsed === 'object') return parsed;
        } catch (_) {}
      }
    }

    const first = trimmed.indexOf('{');
    const last = trimmed.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      try {
        const parsed = JSON.parse(trimmed.slice(first, last + 1));
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (_) {}
    }
    return null;
  };

  const normalizeEvidence = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const sampleAcrossText = (value, limit) => {
    if (value.length <= limit) return value;
    const slices = 8;
    const width = Math.floor(limit / slices);
    return Array.from({ length: slices }, (_, index) => {
      const start = Math.floor((value.length - width) * index / (slices - 1));
      return value.slice(start, start + width);
    }).join(`\n${AI_OMISSION_MARKER}\n`);
  };
  const samplePreparedPDF = (value, limit) => {
    const passages = value.split(AI_OMISSION_MARKER).map((piece) => piece.trim()).filter(Boolean);
    if (passages.length <= 1) return sampleAcrossText(value, limit);
    const perPassage = Math.floor(limit / passages.length);
    return passages.map((piece) => sampleAcrossText(piece, perPassage))
      .join(`\n${AI_OMISSION_MARKER}\n`);
  };
  const splitTextForAI = (value, maxLength) => {
    const chunks = [];
    for (let start = 0; start < value.length;) {
      let end = Math.min(start + maxLength, value.length);
      if (end < value.length) {
        const paragraph = value.lastIndexOf('\n\n', end);
        const line = value.lastIndexOf('\n', end);
        const boundary = paragraph > start + maxLength * 0.65 ? paragraph + 2
          : line > start + maxLength * 0.8 ? line + 1 : end;
        end = boundary;
      }
      chunks.push(value.slice(start, end));
      start = end;
    }
    return chunks;
  };
  // An omission marker separates unrelated stretches of a sampled PDF. Never
  // let one evidence quote span that gap, even when both stretches are sent in
  // the same request.
  const pdfSegmentsForAI = (value, maxLength) => value.split(AI_OMISSION_MARKER)
    .flatMap((passage) => splitTextForAI(passage.trim(), maxLength))
    .filter((text) => text.trim())
    .map((text, index) => ({ id: `P${index + 1}`, text }));
  // Round-robin across PDF segments before taking additional facts from each.
  // The story template keeps a larger evidence bank; legacy density is preserved.
  const normalizeAIClaimEntry = entry => typeof entry === 'string' ? {
    text: entry, detail: '模型返回了未带结构化引文的文字；保留内容供阅读，但必须人工核对原文。',
    basis: 'inference', source: 'none', quote: '',
  } : entry;
  const compactSegmentDrafts = (drafts, limit = 5) => Object.fromEntries(AI_SECTION_KEYS.map((key) => {
    const selected = [];
    const seen = new Set();
    const maxLength = Math.max(0, ...drafts.map(draft => draft[key]?.length || 0));
    for (let rank = 0; rank < maxLength && selected.length < limit; rank += 1) {
      for (const draft of drafts) {
        const entry = draft[key]?.[rank];
        if (!entry || selected.length >= limit) continue;
        const identity = `${entry.sourceId}:${normalizeEvidence(entry.text)}`;
        if (seen.has(identity)) continue;
        seen.add(identity); selected.push(entry);
      }
    }
    return [key, selected.map(entry => ({
      text: entry.text.slice(0, 600), detail: entry.detail.slice(0, 1000),
      topic: entry.topic, subtopic: entry.subtopic,
      basis: entry.basis, source: entry.source, sourceId: entry.sourceId,
      quote: entry.quote.slice(0, 240),
    }))];
  }));

  const itemSelectUri = (item) => {
    const key = item.key || item.id;
    const groupID = Zotero.Libraries?.get?.(item.libraryID)?.groupID;
    return groupID
      ? `zotero://select/groups/${groupID}/items/${key}`
      : `zotero://select/library/items/${key}`;
  };
  const noteHtmlToText = (html) => {
    try {
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      parsed.querySelectorAll('br').forEach((node) => node.replaceWith('\n'));
      parsed.querySelectorAll('p, div, li').forEach((node) => node.append('\n'));
      return (parsed.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
    } catch (_) {
      return String(html).replace(/<[^>]+>/g, ' ').trim();
    }
  };
  const annotationLink = (attachment, annotation) => {
    if (!annotation?.key || !attachment?.key) return null;
    const groupID = Zotero.Libraries?.get?.(attachment.libraryID)?.groupID;
    const base = groupID
      ? `zotero://open-pdf/groups/${groupID}/items/${attachment.key}`
      : `zotero://open-pdf/library/items/${attachment.key}`;
    let page = null;
    try {
      const index = JSON.parse(annotation.annotationPosition || '{}').pageIndex;
      if (Number.isSafeInteger(index) && index >= 0) page = index + 1;
    } catch (_) {}
    return `${base}?${page ? `page=${page}&` : ''}annotation=${encodeURIComponent(annotation.key)}`;
  };
  const regularLiteratureItems = (items) => {
    const result = [];
    const seen = new Set();
    for (const item of Array.isArray(items) ? items : []) {
      const parent = item?.parentItemID ? Zotero.Items.get(item.parentItemID) : item;
      if (!parent?.isRegularItem?.() || parent.deleted || seen.has(parent.id)) continue;
      seen.add(parent.id);
      result.push(parent);
    }
    return result;
  };
  const showMindFlowNotice = (headline, description) => {
    try {
      const progress = new Zotero.ProgressWindow({ closeOnClick: true });
      progress.changeHeadline(headline);
      progress.addDescription(description);
      progress.show();
      progress.startCloseTimer(6000);
    } catch (error) {
      Zotero.log?.(`[MindFlow] ${headline}: ${description} (${error})`);
    }
  };
  // A Zotero item key is unique only within its library. Explicit scopes
  // must never fall through to a different library or to a numeric item ID.
  const resolveItemReference = (reference, libraryID) => {
    if (reference == null) return null;
    const raw = String(reference).trim();
    const uri = raw.match(/^zotero:\/\/(?:select|open-pdf)\/(library|groups\/(\d+))\/items\/([A-Za-z0-9]{8})(?:[?#].*)?$/);
    if (raw.includes('://') && !uri) return null;
    let scope = libraryID == null ? null : Number(libraryID);
    if (scope !== null && (!Number.isSafeInteger(scope) || scope <= 0)) return null;
    if (uri) {
      const uriLibrary = uri[1] === 'library' ? Zotero.Libraries?.userLibraryID
        : Zotero.Groups?.getLibraryIDFromGroupID?.(Number(uri[2]));
      if (!uriLibrary || (scope !== null && scope !== uriLibrary)) return null;
      scope = uriLibrary;
    }
    const key = uri?.[3] || raw;
    if (typeof reference === 'number') {
      const direct = Zotero.Items?.get?.(reference);
      return direct && !direct.deleted && (scope === null || direct.libraryID === scope) ? direct : null;
    }
    if (!/^[A-Za-z0-9]{8}$/.test(key)) return null;
    const scopes = scope !== null ? [scope] :
      (Zotero.Libraries?.getAll?.() || []).map((lib) => lib.libraryID);
    if (!scopes.length && Zotero.Libraries?.userLibraryID) scopes.push(Zotero.Libraries.userLibraryID);
    const found = scopes.map((id) => Zotero.Items?.getByLibraryAndKey?.(id, key))
      .filter((item) => item && !item.deleted);
    return found.length === 1 ? found[0] : null;
  };

  const normalizeDOI = (value) => {
    if (!value || typeof value !== 'string') return '';
    let clean = value
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
    } catch (_) {}
    clean = clean.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '');
    clean = clean.replace(/^doi:\s*/i, '');
    const match = clean.match(/10\.\d{4,9}\/[^\s"'`\\]+/);
    if (!match) return '';
    let result = match[0].replace(/[.,;:，。；：、]+$/, '');
    for (const [open, close] of [['(', ')'], ['[', ']'], ['{', '}'], ['<', '>']]) {
      while (result.endsWith(close) && result.split(close).length > result.split(open).length) {
        result = result.slice(0, -1);
      }
    }
    return /^10\.\d{4,9}\/.+/.test(result) ? result : '';
  };

  const searchItemByDoi = async (doiInput, libraryID = null) => {
    const doi = normalizeDOI(doiInput);
    if (!doi) return null;

    let scope = libraryID == null ? null : Number(libraryID);
    if (scope !== null && (!Number.isSafeInteger(scope) || scope <= 0)) scope = null;

    const scopes = scope !== null ? [scope] :
      (Zotero.Libraries?.getAll?.() || []).map((lib) => lib.libraryID);
    if (!scopes.length && Zotero.Libraries?.userLibraryID) {
      scopes.push(Zotero.Libraries.userLibraryID);
    }
    if (!scopes.length) {
      scopes.push(1);
    }

    if (typeof Zotero.Search === 'function') {
      for (const libID of scopes) {
        try {
          const s = new Zotero.Search();
          s.libraryID = libID;
          s.addCondition('DOI', 'is', doi);
          let ids = await s.search();
          if ((!Array.isArray(ids) || ids.length === 0) && typeof Zotero.Search === 'function') {
            const s2 = new Zotero.Search();
            s2.libraryID = libID;
            s2.addCondition('DOI', 'contains', doi);
            ids = await s2.search();
          }
          if ((!Array.isArray(ids) || ids.length === 0) && typeof Zotero.Search === 'function') {
            const s3 = new Zotero.Search();
            s3.libraryID = libID;
            s3.addCondition('extra', 'contains', doi);
            ids = await s3.search();
          }
          if (Array.isArray(ids) && ids.length > 0) {
            for (const id of ids) {
              const item = Zotero.Items?.get?.(id);
              if (item && !item.deleted) {
                const doiVal = (typeof item.getField === 'function' ? item.getField('DOI') : item.doi) || '';
                const extraVal = (typeof item.getField === 'function' ? item.getField('extra') : item.extra) || '';
                const itemDoi = normalizeDOI(doiVal);
                const extraDoi = normalizeDOI(extraVal);
                if (itemDoi === doi || extraDoi === doi || (extraVal && extraVal.toLowerCase().includes(doi))) {
                  if (typeof item.isRegularItem === 'function' && !item.isRegularItem() && item.parentItemID) {
                    const parent = Zotero.Items?.get?.(item.parentItemID);
                    if (parent && !parent.deleted) return parent;
                  }
                  return item;
                }
              }
            }
          }
        } catch (e) {
          Zotero.log?.('[MindFlow] DOI search failed for library ' + libID + ': ' + e);
        }
      }
    }

    try {
      for (const libID of scopes) {
        const cached = Zotero.Items?.getAll?.(libID) || [];
        for (const item of cached) {
          if (!item || item.deleted) continue;
          const doiVal = (typeof item.getField === 'function' ? item.getField('DOI') : item.doi) || '';
          const extraVal = (typeof item.getField === 'function' ? item.getField('extra') : item.extra) || '';
          const itemDoi = normalizeDOI(doiVal);
          const extraDoi = normalizeDOI(extraVal);
          if (itemDoi === doi || extraDoi === doi || (extraVal && extraVal.toLowerCase().includes(doi))) {
            if (typeof item.isRegularItem === 'function' && !item.isRegularItem() && item.parentItemID) {
              const parent = Zotero.Items?.get?.(item.parentItemID);
              if (parent && !parent.deleted) return parent;
            }
            return item;
          }
        }
      }
    } catch (_) {}

    return null;
  };
  const tabContainer = (tabs, tab, win) => tab?.container ||
    tabs?.getTabContent?.(tab?.id) || tabs?.getTabContainer?.(tab?.id) ||
    win?.document?.getElementById?.(tab?.id);
  const currentTabFor = (tabs) => tabs?._tabs?.find((tab) => tab.id === tabs.selectedID) || tabs?.selectedTab;
  const itemIdentity = (item) => `${item.libraryID}:${item.key}`;
  const openTargetIdentity = (options, items) => {
    if (options.forceNew) return `new:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    if (options.mode === 'open_document') {
      const metadata = options.doc?.metadata || {};
      const key = options.openedAttachmentKey || metadata.zoteroAttachmentKey;
      const library = options.openedAttachmentLibraryID || metadata.zoteroAttachmentLibraryID;
      if (key && library) return `attachment:${library}:${key}`;
      return `document:${metadata.zoteroUri || metadata.zoteroItemKey || 'unlinked'}:${options.doc?.id}`;
    }
    if (options.mode === 'create_from_collection') {
      return `collection:${options.collectionLibraryID}:${options.collectionKey}`;
    }
    if (items.length) return `${options.mode === 'ai_analyze' ? 'ai' : 'items'}:${items.map(itemIdentity).sort().join('|')}`;
    if (options.mode === 'create_blank' || options.mode === 'create_from_selection' || options.mode === 'create_from_items' || options.mode === 'ai_analyze') return `blank:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    return 'workspace';
  };
  const openActionMessage = (options, items) => ({
    type: 'MINDFLOW_OPEN_ACTION', action: { ...options, items },
    requestId: `open-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  });

