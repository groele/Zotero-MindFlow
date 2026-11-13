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
  mfBridge?.setInjectedElements?.(injectedElements);
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
    workspaceOwner(source) { return mfBridge.workspaceOwner(this, source); },
    updateWorkspaceContext(source, data) { return mfBridge.updateWorkspaceContext(this, source, data); },
    ownsWorkspaceWindow(source) { return mfBridge.ownsWorkspaceWindow(this, source); },
    connectWorkspace(source) { return mfBridge.connectWorkspace(this, source); },
    updateStandaloneContext(source, data) { return mfBridge.updateStandaloneContext(this, source, data); },

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

