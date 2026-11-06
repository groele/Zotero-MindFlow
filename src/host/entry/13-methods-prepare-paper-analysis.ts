    async preparePaperAnalysis(reference, options = {}) {
      if (this._lifecycleActive === false) throw new Error(AI_CANCELLED);
      const readingMode = options.readingMode || 'abstract';
      if (!AI_READING_MODES.includes(readingMode)) throw new Error('论文读取范围无效，请重新选择。');
      let cancelled = false;
      let rejectPreparation;
      const cancellation = new Promise((_, reject) => { rejectPreparation = reject; });
      // Cancellation can arrive before the first asynchronous preparation step.
      void cancellation.catch(() => {});
      const cancel = () => { cancelled = true; rejectPreparation(new Error(AI_CANCELLED)); };
      if (!this._aiCancellers) this._aiCancellers = new Set();
      this._aiCancellers.add(cancel);
      const ensureActive = () => { if (cancelled || this._lifecycleActive === false) throw new Error(AI_CANCELLED); };
      const wait = operation => Promise.race([Promise.resolve().then(() => { ensureActive(); return operation(); }), cancellation]);
      try {
      options.registerCancel?.(cancel);
      if (options.signal) {
        if (options.signal.aborted) cancel();
        else options.signal.addEventListener('abort', cancel, { once: true });
      }
      ensureActive();
      const item = resolveItemReference(reference);
      if (!item?.isRegularItem?.()) throw new Error('请选择一篇常规 Zotero 文献。');
      const models = this.getAIModels();
      const lastUsed = Zotero.Prefs.get(LLM_PREF_PREFIX + 'lastUsedModelEntryId', true);
      const config = models.find((entry) => entry.entryId === lastUsed && entry.available) || models.find((entry) => entry.available);
      if (!config) throw new Error(models[0]?.message || '请先在 llm-for-zotero 中配置可用模型。');

      const itemData = this.serializeZoteroItem(item);
      if (!itemData) throw new Error('无法读取所选文献。');
      const paperHasAbstract = Boolean(String(itemData.abstract || '').trim());
      const selection = options.abstractSelection;
      let selectedAbstract = '';
      let selectionOrigin = 'none';
      let selectedPDFURI = '';
      let selectedPDFFilename = '';
      if (selection) {
        const previous = this._aiPrepared?.get(selection.preparedId);
        if (readingMode !== 'abstract' || !previous || previous.reference !== reference ||
            Date.now() - previous.createdAt > AI_PREPARED_TTL) throw new Error('摘要选择已过期或文献已改变，请重新读取资料。');
        selectedAbstract = String(selection.text || '').trim();
        if (selectedAbstract.length < 50 || selectedAbstract.length > 12000) throw new Error('请选择或粘贴 50～12000 字符的摘要正文。');
        const normalized = value => String(value || '').replace(/\s+/g, '').toLowerCase();
        const previousPDFText = previous.abstractExcerpt ||
          (['pdf', 'pdf-selected'].includes(previous.abstractSource) ? previous.abstract : '');
        selectionOrigin = previousPDFText && normalized(previousPDFText).includes(normalized(selectedAbstract))
          ? 'pdf-selected' : normalized(itemData.abstract).includes(normalized(selectedAbstract)) ? 'zotero' : 'manual';
        if (selectionOrigin === 'pdf-selected') { selectedPDFURI = previous.pdfURI || ''; selectedPDFFilename = previous.pdfAttachmentTitle || ''; }
      }
      let rawAbstract = ['abstract', 'key-sections', 'full'].includes(readingMode) ? String(itemData.abstract || '').trim() : '';
      if (selectedAbstract) rawAbstract = selectedAbstract;
      let abstract = rawAbstract.slice(0, 12000);
      let abstractSource = selectedAbstract ? selectionOrigin : abstract ? 'zotero' : 'none';
      let abstractExcerpt = '';
      const trimmedNotes = (itemData.notes || []).slice(0, 12)
        .filter((entry) => String(entry.text || entry).length > 2500).length;
      const trimmedHighlights = (itemData.annotations || []).slice(0, 80)
        .filter((entry) => String(entry.text || '').length > 600).length;
      const trimmedComments = (itemData.annotations || []).slice(0, 80)
        .filter((entry) => String(entry.comment || '').length > 300).length;
      const notes = (itemData.notes || []).slice(0, 12).map((entry, index) => ({
        id: `N${index + 1}`, text: String(entry.text || entry).slice(0, 2500), uri: entry.uri || '',
      }));
      const annotations = (itemData.annotations || []).slice(0, 80).map((entry, index) => ({
        id: `A${index + 1}`,
        commentId: `C${index + 1}`,
        text: String(entry.text || '').slice(0, 600),
        comment: String(entry.comment || '').slice(0, 300),
        page: String(entry.pageLabel || '').slice(0, 30), uri: entry.uri || '',
      }));

      let pdfText = '';
      let pdfState = '无可用 PDF 文字';
      let pdfTruncated = false;
      let pdfURI = selectedPDFURI;
      let pdfAttachmentTitle = selectedPDFFilename;
      let sectionStatus = { found: [], missing: [] };
      const requestedPages = Number(Zotero.Prefs.get('extensions.mindflow.aiMaxPdfPages', true));
      const maxPages = [50, 120, 200].includes(requestedPages) ? requestedPages : 120;
      let preferredAttachment = null;
      try { preferredAttachment = await wait(() => item.getBestAttachment?.()); } catch (_) { ensureActive(); }
      ensureActive();
      const attachmentIDs = [...new Set([preferredAttachment?.id, ...(item.getAttachments?.() || [])].filter(Boolean))];
      const pdfAttachmentCount = attachmentIDs.filter((id) => Zotero.Items.get(id)?.isPDFAttachment?.()).length;
      for (const attachmentID of attachmentIDs) {
        ensureActive();
        const attachment = Zotero.Items.get(attachmentID);
        if (!attachment?.isPDFAttachment?.()) continue;
        try {
          const path = await wait(() => attachment.getFilePathAsync?.());
          ensureActive();
          const fileExists = path ? await wait(() => IOUtils.exists(path)) : false;
          ensureActive();
          if (!fileExists) { pdfState = 'PDF 附件尚未下载到本机'; continue; }
          if (!Zotero.PDFWorker?.getFullText) { pdfState = '当前 Zotero 不支持 PDF 文字提取'; break; }
            // A verified Zotero abstract or an explicitly confirmed selection
            // is already the requested abstract scope; do not read the PDF in
            // the background just because an attachment exists.
            if (readingMode === 'abstract' && (paperHasAbstract || selectedAbstract)) continue;
            const pageLimit = readingMode === 'abstract' ? Math.min(5, maxPages) : maxPages;
          // Scope switches reuse the same local PDF extraction. File changes,
          // page limits and a short TTL invalidate the cache; selected sections
          // are still extracted separately and never widened to the full paper.
          let stat = null;
          try { stat = IOUtils.stat ? await wait(() => IOUtils.stat(path)) : null; } catch (_) { ensureActive(); /* Extract normally without a cache. */ }
          ensureActive();
          const cacheKey = stat ? `${attachment.libraryID}:${attachment.key}:${path}:${pageLimit}:${stat.size}:${stat.lastModified}` : '';
          if (!this._aiPdfTextCache) this._aiPdfTextCache = new Map();
          const cached = cacheKey && this._aiPdfTextCache.get(cacheKey);
          const extracted = cached && Date.now() - cached.createdAt < 5 * 60 * 1000
            ? cached.extracted : await wait(() => Zotero.PDFWorker.getFullText(attachment.id, pageLimit));
          ensureActive();
          if (cacheKey && (!cached || Date.now() - cached.createdAt >= 5 * 60 * 1000)) {
            while (this._aiPdfTextCache.size >= 3) this._aiPdfTextCache.delete(this._aiPdfTextCache.keys().next().value);
            this._aiPdfTextCache.set(cacheKey, { createdAt: Date.now(), extracted });
          }
          ensureActive();
          const raw = typeof extracted === 'string' ? extracted : String(extracted?.text || extracted?.content || '');
          if (!raw.trim()) { pdfState = 'PDF 未提取到文字（可能是扫描件）'; continue; }
          const pageLimited = Number(extracted?.totalPages) > Number(extracted?.extractedPages);
          const lengthLimited = raw.length > 144000;
          pdfTruncated = pageLimited || lengthLimited;
          if (readingMode === 'abstract') {
            // Local-only recovery text.
            if (!abstractExcerpt) {
              abstractExcerpt = raw.slice(0, 24000);
              pdfAttachmentTitle = String(attachment.attachmentFilename || attachment.key);
              const groupID = Zotero.Libraries?.get?.(attachment.libraryID)?.groupID;
              pdfURI = groupID ? `zotero://open-pdf/groups/${groupID}/items/${attachment.key}`
                : `zotero://open-pdf/library/items/${attachment.key}`;
            }
            const selected = extractPaperSections(raw, 'abstract');
            if (selected.text) {
              sectionStatus = { found: selected.found, missing: selected.missing };
              if (!abstract) {
                rawAbstract = selected.text.replace(/^\[所选部分：abstract\]\n/, '');
                abstract = rawAbstract.slice(0, 12000);
                abstractSource = 'pdf';
              }
              pdfText = '';
              pdfState = '已从 PDF 提取摘要；未发送摘要之外的正文';
            } else {
              // Do not silently reinterpret an unlabelled front page as an
              // abstract. Keep it available only as a local preview for an
              // explicit user selection; it is not an analysis source.
              sectionStatus = { found: [], missing: ['abstract'] };
              pdfText = '';
              pdfState = 'PDF 未识别出明确摘要；请手动确认摘要范围';
            }
            pdfTruncated = false;
          } else if (readingMode === 'introduction') {
            const extractedSections = extractPaperSections(raw, 'introduction');
            if (extractedSections.text) {
              sectionStatus = { found: extractedSections.found, missing: extractedSections.missing };
              pdfText = extractedSections.text.slice(0, 48000);
              pdfState = '已从 PDF 提取引言章节';
            } else {
              sectionStatus = { found: [], missing: ['introduction'] };
              pdfText = '';
              pdfState = 'PDF 未识别出明确引言；未回退发送前部正文';
            }
            pdfTruncated = pageLimited || raw.length > pdfText.length;
          } else if (readingMode === 'conclusion') {
            const extractedSections = extractPaperSections(raw, 'conclusion');
            if (extractedSections.text) {
              sectionStatus = { found: extractedSections.found, missing: extractedSections.missing };
              pdfText = extractedSections.text.slice(0, 48000);
              pdfState = '已从 PDF 提取结论章节';
            } else {
              sectionStatus = { found: [], missing: ['conclusion'] };
              pdfText = '';
              pdfState = 'PDF 未识别出明确结论；未回退发送尾部正文';
            }
            pdfTruncated = pageLimited || raw.length > pdfText.length;
          } else if (readingMode === 'key-sections') {
            const extractedSections = extractPaperSections(raw, 'key-sections');
            let combinedText = extractedSections.text;
            if (!combinedText) {
              sectionStatus = { found: [], missing: ['introduction', 'conclusion'] };
              combinedText = '';
              pdfState = 'PDF 未识别出完整关键章节；未回退发送首尾正文';
            } else {
              sectionStatus = { found: extractedSections.found, missing: extractedSections.missing };
              pdfState = '已从 PDF 提取关键章节';
            }
            pdfText = combinedText.slice(0, 48000);
            if (!abstract) {
              const selected = extractPaperSections(raw, 'abstract');
              if (selected.text) {
                rawAbstract = selected.text.replace(/^\[所选部分：abstract\]\n/, '');
                abstract = rawAbstract.slice(0, 12000);
                abstractSource = 'pdf';
              } else if (raw.length >= 100) {
                abstract = raw.slice(0, 4000);
                abstractSource = 'pdf';
              }
            }
            pdfTruncated = pageLimited || raw.length > pdfText.length;
          } else {
            pdfText = lengthLimited ? sampleAcrossText(raw, 144000) : raw;
            sectionStatus = { found: ['full'], missing: [] };
            pdfTruncated = pageLimited || lengthLimited;
          }
          if (readingMode === 'full') {
            pdfState = `PDF 已读取 ${extracted?.extractedPages || `最多 ${maxPages}`} 页${extracted?.totalPages ? ` / 共 ${extracted.totalPages} 页` : ''}${lengthLimited ? '；已跨区间采样' : ''}`;
          }
          const groupID = Zotero.Libraries?.get?.(attachment.libraryID)?.groupID;
          pdfURI = groupID
            ? `zotero://open-pdf/groups/${groupID}/items/${attachment.key}`
            : `zotero://open-pdf/library/items/${attachment.key}`;
          pdfAttachmentTitle = String(attachment.attachmentFilename || attachment.key);
          break;
        } catch (error) {
          ensureActive();
          pdfState = 'PDF 文字提取失败；已使用其他可用资料';
        }
      }
      if (readingMode === 'abstract') {
        if (abstractSource === 'zotero') pdfState = pdfText ? '已读取条目摘要与 PDF 前页；提示词聚焦提炼核心主旨' : '未读取 PDF（使用条目摘要）';
        else if (abstractSource === 'pdf') pdfState = pdfText ? '已读取 PDF 前页；提示词聚焦提炼摘要与核心主旨' : '已从 PDF 提取摘要；正文未纳入';
        else if (abstractSource === 'pdf-selected') pdfState = '已使用你从 PDF 选取的摘要；正文未纳入';
        else if (abstractSource === 'manual') pdfState = '已使用你补充的摘要；原文来源需核对';
        else {
          if (!pdfAttachmentCount) pdfState = '无 PDF 附件，且条目摘要为空';
          sectionStatus = { found: [], missing: ['abstract'] };
        }
        if (abstract || pdfText) sectionStatus = { found: ['abstract'], missing: [] };
      }
      else if (readingMode !== 'full') {
        if (!sectionStatus.found.length && !sectionStatus.missing.length) {
          sectionStatus.missing = readingMode === 'key-sections' ? ['introduction', 'conclusion'] : [readingMode];
        }
        if (!pdfText) {
          pdfState += `；仅纳入已识别的所选部分${sectionStatus.missing.length ? '，部分未识别；未回退全文' : ''}`;
        }
      }
      ensureActive();
      if (readingMode === 'full' && !abstract && !pdfText && !notes.length && !annotations.length) {
        throw new Error('这篇文献没有可分析的摘要、PDF 文字、笔记或批注。请先下载可读 PDF 或补充摘要。');
      }
      const preparedId = `mindflow-prepared-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (!this._aiPrepared) this._aiPrepared = new Map();
      for (const [key, value] of this._aiPrepared) {
        if (Date.now() - value.createdAt > AI_PREPARED_TTL) this._aiPrepared.delete(key);
      }
      while (this._aiPrepared.size >= 3) this._aiPrepared.delete(this._aiPrepared.keys().next().value);
      ensureActive();
      this._aiPrepared.set(preparedId, { createdAt: Date.now(), reference, itemData, item,
        abstract, abstractSource, abstractExcerpt, notes, annotations, pdfText, pdfState, pdfTruncated, pdfURI, config, models, maxPages, readingMode, sectionStatus,
        sourceWarnings: { abstractTruncated: rawAbstract.length > abstract.length,
          trimmedNotes, trimmedHighlights, trimmedComments,
          noteReadErrors: itemData.sourceReadWarnings?.noteReadErrors || 0,
          annotationReadErrors: itemData.sourceReadWarnings?.annotationReadErrors || 0,
          omittedNotes: Math.max(0, (itemData.notes || []).length - notes.length),
          omittedAnnotations: Math.max(0, (itemData.annotations || []).length - annotations.length) } });
      const scope = { pdfState, pdfTruncated, readingMode, sectionStatus, hasAbstract: Boolean(abstract),
        paperHasAbstract, pdfAttachmentCount, abstractSource,
        abstractTruncated: rawAbstract.length > abstract.length,
        trimmedNotes, trimmedHighlights, trimmedComments,
        noteReadErrors: itemData.sourceReadWarnings?.noteReadErrors || 0,
        annotationReadErrors: itemData.sourceReadWarnings?.annotationReadErrors || 0,
        pdfAttachmentTitle,
        noteCount: notes.length, annotationCount: annotations.length,
        highlightCount: annotations.filter((entry) => entry.text).length,
        commentCount: annotations.filter((entry) => entry.comment).length,
        omittedNotes: Math.max(0, (itemData.notes || []).length - notes.length),
        omittedAnnotations: Math.max(0, (itemData.annotations || []).length - annotations.length),
        pdfCharacters: pdfText.length, maxPages };
      const library = Zotero.Libraries?.get?.(item.libraryID);
      const archiveState = library?.editable === false ? '文献库只读，草稿无法归档'
        : library?.filesEditable === false ? '文献库禁止写入附件，草稿无法归档'
        : '可尝试归档到该文献';
      return { preparedId, title: itemData.title, zoteroUri: itemData.zoteroUri, readingMode, abstractText: abstract, abstractExcerpt,
        model: config.model, endpointHost: config.host, localModel: config.local,
        models: models.map(modelPreview), defaultModelEntryId: config.entryId,
        archiveState,
        sourceCharacters: { abstract: abstract.length, pdf: pdfText.length,
          notes: notes.reduce((sum, entry) => sum + entry.text.length, 0),
          highlights: annotations.reduce((sum, entry) => sum + entry.text.length, 0),
          comments: annotations.reduce((sum, entry) => sum + entry.comment.length, 0) },
        sourceScope: scope, quickCalls: 1,
        deepCalls: readingMode === 'full' && pdfText.length > 24000 ? pdfSegmentsForAI(pdfText, 24000).length + 1 : 1,
        estimatedCharacters: abstract.length + pdfText.length +
          notes.map((entry) => entry.text).join('').length +
          annotations.map((entry) => entry.text + entry.comment).join('').length };
      } finally {
        options.signal?.removeEventListener('abort', cancel);
        this._aiCancellers.delete(cancel);
      }
    },

