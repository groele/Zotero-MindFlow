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

    return null;
  };

  const resolveCollectionItems = (collection) => {
    const raw = typeof collection?.getChildItems === 'function' ? collection.getChildItems() : [];
    const resolved = [];
    const seen = new Set();
    for (const entry of Array.isArray(raw) ? raw : []) {
      const obj = typeof entry === 'number' || typeof entry === 'string' ? Zotero.Items?.get?.(Number(entry)) : entry;
      if (!obj || obj.deleted) continue;
      const reg = (typeof obj.isRegularItem === 'function' && obj.isRegularItem()) ? obj : (obj.parentItemID ? Zotero.Items?.get?.(obj.parentItemID) : null);
      if (!reg || reg.deleted || typeof reg.isRegularItem !== 'function' || !reg.isRegularItem()) continue;
      const regId = reg.id ?? reg.key;
      if (regId && seen.has(regId)) continue;
      if (regId) seen.add(regId);
      resolved.push(reg);
    }
    const MAX = 100;
    if (resolved.length > MAX) {
      showMindFlowNotice?.(T(`分类文献较多（${resolved.length} 篇），已截取前 ${MAX} 篇生成导图`, `Collection has ${resolved.length} items; capped to ${MAX}`), true);
      return resolved.slice(0, MAX);
    }
    return resolved;
  };
  const tabContainer = mfBridge.tabContainer;
  const currentTabFor = (tabs) => tabs?._tabs?.find((tab) => tab.id === tabs.selectedID) || tabs?.selectedTab;
  const itemIdentity = (item) => `${item.libraryID}:${item.key}`;
  const openTargetIdentity = mfBridge.openTargetIdentity;
  const openActionMessage = mfBridge.openActionMessage;

