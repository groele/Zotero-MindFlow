  const openPDFForItem = async (item, hostWindow = null) => {
    if (!item) return false;
    const win = hostWindow || Zotero.getMainWindow?.();
    let target = item;
    const isPdf = (att) => {
      if (!att || att.deleted || !att.isAttachment?.()) return false;
      try {
        if (typeof att.isPDFAttachment === 'function' && att.isPDFAttachment()) return true;
      } catch (_) {}
      if (att.attachmentContentType === 'application/pdf') return true;
      if (/\.pdf$/i.test(att.attachmentFilename || '')) return true;
      if (/\.pdf$/i.test(att.getField ? (att.getField('title') || '') : (att.title || ''))) return true;
      return false;
    };

    let pdfAtt = null;
    if (isPdf(target)) {
      pdfAtt = target;
    } else {
      try {
        if (typeof target.getBestAttachment === 'function') {
          Zotero.debug?.('[MindFlow] Resolving PDF for item ' + target.id);
          const best = await target.getBestAttachment();
          if (isPdf(best)) pdfAtt = best;
        }
      } catch (_) {}

      if (!pdfAtt && typeof target.getAttachments === 'function') {
        const attIds = target.getAttachments();
        if (Array.isArray(attIds)) {
          for (const attId of attIds) {
            try {
              const att = Zotero.Items.get(attId);
              if (isPdf(att)) {
                pdfAtt = att;
                break;
              }
            } catch (_) {}
          }
        }
      }
    }

    if (!pdfAtt) {
      showMindFlowNotice('未检测到 PDF 附件', '所选文献尚未关联可读取的 PDF 附件，已在文献库中定位该条目。');
      const tabs = win?.Zotero_Tabs;
      if (tabs && Array.isArray(tabs._tabs)) {
        const libTab = tabs._tabs.find((t) => t && (t.type === 'library' || t.id === 'zotero-pane'));
        if (libTab) tabs.select(libTab.id);
      }
      const pane = win?.ZoteroPane || Zotero.getActiveZoteroPane?.();
      if (pane && (target.id || item.id)) {
        pane.selectItem(target.id || item.id);
      }
      return false;
    }

    const readerService = Zotero.Reader || win?.Zotero?.Reader;
    let opened = false;

    if (readerService && typeof readerService.open === 'function') {
      try {
        Zotero.debug?.('[MindFlow] Opening PDF attachment ' + pdfAtt.id);
        await readerService.open(pdfAtt.id);
        opened = true;
      } catch (err) {
        Zotero.logError?.('[MindFlow] Reader open failed: ' + err);
      }
    }

    if (!opened) {
      const pane = win?.ZoteroPane || Zotero.getActiveZoteroPane?.();
      if (pane && typeof pane.viewAttachment === 'function') {
        try {
          await pane.viewAttachment(pdfAtt.id);
          opened = true;
        } catch (err) { Zotero.logError?.('[MindFlow] Attachment open failed: ' + err); }
      }
    }

    return opened;
  };

  // Track injected DOM nodes for clean shutdown
  const injectedElements = new Map();
  const pendingWindowLoads = new Map();
  let windowListener = null;

  const workspaceLifecycle = _globalScope.MindFlowWorkspaceLifecycle.createWorkspaceLifecycle({ Zotero, storage: mfStorage, injectedElements });

  Zotero.MindFlow = {
    ...workspaceLifecycle,
    Modules: {
      constants: mfConstants,
      storage: mfStorage,
      itemPane: mfItemPane,
      noteSync: mfNoteSync,
      bridge: mfBridge,
    },
    async saveExportFile(source, payload) {
      if (!this.ownsWorkspaceWindow(source)) throw new Error('导出来源未连接到当前工作台');
      const bytes = payload?.bytes;
      if (!bytes || !Number.isSafeInteger(bytes.byteLength) || bytes.byteLength === 0 || bytes.byteLength > 32 * 1024 * 1024) {
        throw new Error('导出文件为空或超过 32 MiB，请改用 SVG 或 JSON。');
      }
      const rawName = String(payload.filename || '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
      const extension = rawName.match(/\.(png|svg|json|md|opml|html)$/i)?.[1];
      if (!extension) throw new Error('不支持的导出文件格式');
      const filename = rawName.slice(0, -extension.length - 1).slice(0, 150) + '.' + extension;
      const contents = new Uint8Array(bytes);
      const { FilePicker } = ChromeUtils.importESModule('chrome://zotero/content/modules/filePicker.mjs');
      const picker = new FilePicker(); // mindflow-export-picker
      const owner = source.top?.browsingContext ? source.top : Zotero.getMainWindow();
      picker.init(owner, '保存导出文件', picker.modeSave);
      picker.defaultString = filename;
      picker.defaultExtension = extension;
      picker.appendFilter(`${extension.toUpperCase()} 文件`, `*.${extension}`);
      const result = await picker.show();
      if (result === picker.returnCancel) return { cancelled: true };
      if (result !== picker.returnOK && result !== picker.returnReplace) throw new Error('保存对话框未返回有效结果');
      await IOUtils.write(picker.file, contents, { tmpPath: picker.file + '.mindflow-tmp' });
      const actual = await IOUtils.read(picker.file);
      if (actual.length !== contents.length || actual.some((value, index) => value !== contents[index])) throw new Error('导出文件写入后校验失败');
      return { cancelled: false, path: picker.file };
    },
    workspaceURL: `${CHROME_ROOT}index.html?v=${encodeURIComponent(typeof version !== 'undefined' ? version : 'development')}`,
    rootURI: typeof rootURI !== 'undefined' ? rootURI : '',
    addonId: ADDON_ID,
    restoreSessionOnStartup: typeof restoreSessionOnStartup !== 'undefined' && restoreSessionOnStartup,
    localizedDocs: new Set(),
    resolveItemReference,
    openTargetIdentity,
    workspaceOwner(source) {
      const windows = [...injectedElements.keys()];
      const main = Zotero.getMainWindow?.();
      if (main && !windows.includes(main)) windows.push(main);
      for (const win of windows) for (const tab of win.Zotero_Tabs?._tabs || []) {
        if (tab.type !== 'mindflow') continue;
        const frame = tabContainer(win.Zotero_Tabs, tab, win)?.querySelector?.('iframe');
        if (sameWindow(frame?.contentWindow, source)) return { win, tab, frame };
      }
      return null;
    },
    updateWorkspaceContext(source, data) {
      const owner = this.workspaceOwner(source);
      if (!owner || typeof data.documentId !== 'string' || typeof data.title !== 'string') return false;
      const { win, tab } = owner;
      const switched = Boolean(tab.data?.docId && tab.data.docId !== data.documentId);
      const prevTarget = String(tab.data?.targetItemId || '');
      let nextTarget;
      if (data.attachmentKey && data.attachmentLibraryID) {
        nextTarget = `attachment:${data.attachmentLibraryID}:${data.attachmentKey}`;
      } else if (data.parentItemUri && !data.unlinkedContainer && !data.aiDraft) {
        const parent = resolveItemReference(data.parentItemUri);
        nextTarget = parent ? `items:${itemIdentity(parent)}` : `document:${data.documentId}`;
      } else {
        const aiParent = data.aiDraft && data.parentItemUri ? resolveItemReference(data.parentItemUri) : null;
        if (data.aiDraft && aiParent) {
          nextTarget = `ai:${itemIdentity(aiParent)}`;
        } else if (data.unlinkedContainer && !switched && prevTarget.startsWith('collection:')) {
          nextTarget = prevTarget;
        } else {
          nextTarget = `document:${data.documentId}`;
        }
      }
      const targetChanged = Boolean(prevTarget && prevTarget !== nextTarget);
      tab.data = {
        ...tab.data,
        docId: data.documentId,
        doc: null,
        parentItemUri: data.parentItemUri || null,
        openedAttachmentKey: data.attachmentKey || null,
        openedAttachmentLibraryID: data.attachmentLibraryID || null,
        targetItemId: nextTarget,
        ...(switched || targetChanged ? {
          items: [],
          collectionName: undefined,
          collectionKey: undefined,
          collectionLibraryID: undefined,
          mode: ['open', 'import_file'].includes(tab.data?.mode) ? tab.data.mode : 'open_document',
        } : {}),
      };
      win.Zotero_Tabs.rename?.(tab.id, `MindFlow - ${data.title.trim().slice(0,140)}`);
      return true;
    },
    ownsWorkspaceWindow(source) {
      return Boolean(this.workspaceOwner(source) || [...this._standaloneWindows?.values() || []]
        .some(win => !win.closed && sameWindow(win, source)));
    },
    connectWorkspace(source) {
      const owner = this.workspaceOwner(source);
      if (!owner) return false;
      owner.frame._mindflowReady = true;
      if (owner.frame._mindflowPending) {
        source.postMessage(owner.frame._mindflowPending, '*');
        owner.frame._mindflowPending = null;
      }
      return true;
    },
    updateStandaloneContext(source, data) {
      if (!this._standaloneWindows || typeof data.documentId !== 'string') return;
      const entry = [...this._standaloneWindows].find(([, win]) => sameWindow(win, source));
      if (!entry) return;
      const switched = Boolean(source._mindflowDocumentId && source._mindflowDocumentId !== data.documentId);
      const prevTarget = String(entry[0]);
      let target = prevTarget;
      if (data.attachmentKey && data.attachmentLibraryID) {
        target = `attachment:${data.attachmentLibraryID}:${data.attachmentKey}`;
      } else if (data.parentItemUri && !data.unlinkedContainer && !data.aiDraft) {
        const parent = resolveItemReference(data.parentItemUri);
        target = parent ? `items:${itemIdentity(parent)}` : `document:${data.documentId}`;
      } else {
        const aiParent = data.aiDraft && data.parentItemUri ? resolveItemReference(data.parentItemUri) : null;
        if (data.aiDraft && aiParent) {
          target = `ai:${itemIdentity(aiParent)}`;
        } else if (data.unlinkedContainer && !switched && prevTarget.startsWith('collection:')) {
          target = prevTarget;
        } else {
          target = `document:${data.documentId}`;
        }
      }
      source._mindflowDocumentId = data.documentId;
      if (target !== entry[0]) {
        this._standaloneWindows.delete(entry[0]);
        this._standaloneWindows.set(target, entry[1]);
      }
    },

    // Durable, per-key workspace files live in Zotero's data directory. Old
    // preference values remain readable and migrate on the next normal save.
    async workspaceStorage(action, payload = {}) {
      return mfStorage.workspaceStorage(action, payload);
    },

    ensureLocalization(doc) {
      if (!doc || this.localizedDocs.has(doc)) return;
      const existing = doc.querySelector('link[rel="localization"][href="mindflow.ftl"]');
      if (existing) return;
      try {
        doc.defaultView?.MozXULElement?.insertFTLIfNeeded('mindflow.ftl');
        if (doc.querySelector('link[rel="localization"][href="mindflow.ftl"]')) {
          this.localizedDocs.add(doc);
        }
      } catch (error) {
        Zotero.logError?.('[MindFlow] Could not load item-pane translations: ' + error);
      }
    },

    removeLocalization(doc) {
      doc?.getElementById('mindflow-item-pane-styles')?.remove();
      doc?.getElementById('mindflow-itempane-styles')?.remove();
      if (!this.localizedDocs.has(doc)) return;
      try {
        doc.querySelector('link[rel="localization"][href="mindflow.ftl"]')?.remove();
      } catch (_) {}
      this.localizedDocs.delete(doc);
    },

