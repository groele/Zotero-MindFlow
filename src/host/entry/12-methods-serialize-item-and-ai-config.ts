    serializeZoteroItem(item, options = {}) {
      try {
        if (item == null) return null;
        let target = (typeof item === 'number' || typeof item === 'string') ? Zotero.Items?.get?.(Number(item)) : item;
        if (!target) return null;
        const isChildItem =
          (typeof target.isAttachment === 'function' && target.isAttachment()) ||
          (typeof target.isNote === 'function' && target.isNote());
        if (isChildItem && target.parentItemID) {
          const p = Zotero.Items.get(target.parentItemID);
          if (p) target = p;
        }
        // Only bibliographic regular items may seed literature maps. In
        // particular, a standalone note must not be serialized as a paper.
        if (typeof target.isRegularItem !== 'function' || !target.isRegularItem()) return null;

        const title = noteHtmlToText((typeof target.getField === 'function' ? target.getField('title') : target.title) || '无标题文献');
        const date = typeof target.getField === 'function' ? target.getField('date') : target.date;
        let year = '';
        if (date) {
          const match = String(date).match(/\b(19|20)\d{2}\b/);
          year = match ? match[0] : String(date).slice(0, 4);
        }

        let authors = [];
        try {
          if (typeof target.getCreators === 'function') {
            authors = target.getCreators().map((c) => c.lastName || c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim()).filter(Boolean);
          } else if (Array.isArray(target.creators)) {
            authors = target.creators.map((c) => c.lastName || c.name || '').filter(Boolean);
          }
        } catch (_) {}

        const publication = typeof target.getField === 'function' ? (target.getField('publicationTitle') || target.getField('proceedingsTitle') || target.getField('publisher')) : '';
        let doi = typeof target.getField === 'function' ? target.getField('DOI') : target.doi;
        if (!doi && typeof target.getField === 'function') {
          const extra = target.getField('extra');
          if (extra) {
            const extraDoi = normalizeDOI(extra);
            if (extraDoi) doi = extraDoi;
          }
        }
        const url = typeof target.getField === 'function' ? target.getField('url') : target.url;
        const abstract = typeof target.getField === 'function' ? target.getField('abstractNote') : target.abstractNote;

        let tags = [];
        try {
          if (typeof target.getTags === 'function') {
            tags = target.getTags().map((t) => t.tag || String(t)).filter(Boolean);
          } else if (Array.isArray(target.tags)) {
            tags = target.tags.map((t) => t.tag || String(t)).filter(Boolean);
          }
        } catch (_) {}

        const notes = [];
        const annotations = [];
        let noteReadErrors = 0;
        let annotationReadErrors = 0;
        if (options?.includeChildren !== false) {
        try {
          if (typeof target.getNotes === 'function') {
            const noteIds = target.getNotes();
            if (Array.isArray(noteIds)) {
              for (const nId of noteIds) {
                try {
                  const n = Zotero.Items.get(nId);
                  if (n) {
                    const t = noteHtmlToText(n.getNote ? n.getNote() : '');
                    if (t && !t.includes('MindFlow 导图大纲')) {
                      notes.push({ text: t, uri: itemSelectUri(n) });
                    }
                  }
                } catch (_) { noteReadErrors += 1; }
              }
            }
          }
        } catch (_) { noteReadErrors += 1; }

        try {
          if (typeof target.getAttachments === 'function') {
            const attIds = target.getAttachments();
            if (Array.isArray(attIds)) {
              for (const attId of attIds) {
                try {
                  const att = Zotero.Items.get(attId);
                  if (att?.isPDFAttachment?.() && typeof att.getAnnotations === 'function') {
                    const annos = att.getAnnotations();
                    for (const a of annos) {
                      try {
                        if (a.annotationText || a.annotationComment) {
                          annotations.push({
                            text: a.annotationText || '',
                            comment: a.annotationComment,
                            pageLabel: a.annotationPageLabel,
                            color: a.annotationColor,
                            uri: annotationLink(att, a),
                          });
                        }
                      } catch (_) { annotationReadErrors += 1; }
                    }
                  }
                } catch (_) { annotationReadErrors += 1; }
              }
            }
          }
        } catch (_) { annotationReadErrors += 1; }
        }

        return {
          key: target.key || String(target.id),
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
          isEditable: typeof target.isEditable === 'function' ? target.isEditable() : (target.deleted ? false : true),
          sourceReadWarnings: { noteReadErrors, annotationReadErrors },
          zoteroUri: itemSelectUri(target),
        };
      } catch (e) {
        Zotero.logError?.('[MindFlow] serializeZoteroItem error: ' + e);
        return null;
      }
    },

    getAIConfiguration(entryId) {
      return publicLLMConfig(readLLMModel(entryId));
    },

    getAIModels() {
      const addon = getLLMAddon();
      let groups;
      try { groups = JSON.parse(String(Zotero.Prefs.get(LLM_PREF_PREFIX + 'modelProviderGroups', true) || '[]')); }
      catch (_) { throw new Error('llm-for-zotero 模型配置无法读取，请重新保存模型。'); }
      if (!Array.isArray(groups)) throw new Error('llm-for-zotero 模型配置格式无效。');
      const rows = groups.flatMap((group) => (Array.isArray(group?.models) ? group.models : []))
        .filter((entry) => typeof entry?.model === 'string' && entry.model.trim());
      if (!rows.length) rows.push({ id: 'legacy-primary', model: String(Zotero.Prefs.get(LLM_PREF_PREFIX + 'model', true) || '') });
      return rows.map((entry) => {
        try {
          const config = this.getAIConfiguration(entry.id);
          const capabilities = addon.api.agent.getCapabilities?.({ mode: 'agent',
            model: config.model, apiBase: config.apiBase, authMode: config.authMode,
            providerProtocol: config.providerProtocol, advanced: config.advanced });
          return { ...config, available: true, ...reasoningChoices(config, capabilities) };
        } catch (error) {
          return { entryId: entry.id, model: entry.model, available: false,
            message: String(error?.message || error), reasoningSupported: false };
        }
      });
    },

    openLLMPreferences() {
      if (typeof Zotero.openPreferences !== 'function') throw new Error('无法打开 Zotero 设置。');
      Zotero.openPreferences('zotero-llm@github.com.yilewang');
    },

