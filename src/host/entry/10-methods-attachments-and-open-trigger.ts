    async ensureUnlinkedMapContainer() {
      if (this._unlinkedContainerPromise) return this._unlinkedContainerPromise;
      this._unlinkedContainerPromise = (async () => {
        const libraryID = Zotero.Libraries?.userLibraryID;
        if (!libraryID || Zotero.Libraries.get(libraryID)?.editable === false) {
          throw new Error('个人 Zotero 文献库不可写，无法创建 MindFlow 独立导图位置');
        }
        const collectionName = 'MindFlow｜独立导图';
        const containerTitle = 'MindFlow 独立导图';
        const marker = 'MindFlow standalone maps container: mindflow@groele.org';
        let collectionKey;
        try { collectionKey = Zotero.Prefs?.get('extensions.mindflow.unlinkedCollectionKey', true); }
        catch (_) {}
        let collection = collectionKey
          ? Zotero.Collections.getByLibraryAndKey?.(libraryID, collectionKey) : null;
        if (!collection || collection.deleted) {
          collection = Zotero.Collections.getByLibrary(libraryID)
            .find((entry) => !entry.deleted && entry.name === collectionName) || null;
        }
        if (!collection) {
          collection = new Zotero.Collection();
          collection.libraryID = libraryID;
          collection.name = collectionName;
          await collection.saveTx();
        }

        let savedKey;
        try { savedKey = Zotero.Prefs?.get('extensions.mindflow.unlinkedContainerItemKey', true); }
        catch (_) {}
        let container = savedKey ? Zotero.Items.getByLibraryAndKey?.(libraryID, savedKey) : null;
        if (!container?.isRegularItem?.() || container.deleted ||
            String(container.getField?.('extra') || '') !== marker) {
          container = null;
        }
        if (!container) {
          const entries = collection.getChildItems();
          container = entries.map((entry) => typeof entry === 'number' ? Zotero.Items.get(entry) : entry)
            .find((entry) => entry?.isRegularItem?.() && !entry.deleted &&
              String(entry.getField?.('extra') || '') === marker) || null;
        }
        if (!container) {
          container = new Zotero.Item('document');
          container.libraryID = libraryID;
          container.setField('title', containerTitle);
          container.setField('extra', marker);
          container.addToCollection(collection.id);
          await container.saveTx();
        } else if (!container.inCollection(collection.id)) {
          container.addToCollection(collection.id);
          await container.saveTx();
        }
        try {
          Zotero.Prefs?.set('extensions.mindflow.unlinkedCollectionKey', collection.key, true);
          Zotero.Prefs?.set('extensions.mindflow.unlinkedContainerItemKey', container.key, true);
        } catch (error) { Zotero.log?.('[MindFlow] Could not cache independent-map location: ' + error); }
        return container;
      })();
      try { return await this._unlinkedContainerPromise; }
      finally { this._unlinkedContainerPromise = null; }
    },

    /**
     * Read and load a .mindflow attachment file directly into MindFlow
     */
    async openMindflowAttachment(attItem, targetWindow = null) {
      try {
        if (!isMindFlowAttachment(attItem) || attItem.deleted) return false;
        const filePath = await attItem.getFilePathAsync?.();
        if (filePath && await IOUtils.exists(filePath)) {
          const content = await IOUtils.readUTF8(filePath);
          const docData = JSON.parse(content);
          if (!docData || typeof docData !== 'object' || !docData.root || typeof docData.root !== 'object') {
            throw new Error('附件不包含有效的 MindFlow 导图结构');
          }
          docData.metadata = { ...docData.metadata, zoteroAttachmentKey: attItem.key, zoteroAttachmentLibraryID: attItem.libraryID };
          if (attItem.parentItemID) {
            const p = Zotero.Items.get(attItem.parentItemID);
            if (!p?.isRegularItem?.() || p.deleted || p.libraryID !== attItem.libraryID) throw new Error('导图附件父条目无效');
            if (p) {
              docData.metadata = {
                ...docData.metadata,
                zoteroItemKey: itemSelectUri(p),
                zoteroUri: itemSelectUri(p),
                zoteroLibraryID: p.libraryID,
                zoteroItemTitle: (p.getField ? p.getField('title') : p.title) || docData.title,
                mindflowUnlinkedContainer: String(p.getField?.('extra') || '') === 'MindFlow standalone maps container: mindflow@groele.org',
                autoSyncToZotero: true,
              };
            }
          }
          // A physical attachment can have been isolated under a new local
          // workspace ID when its embedded ID collided with another source.
          // Resolve that canonical record before creating the tab so a close
          // and reopen keeps the same tab/workspace identity instead of
          // briefly advertising the stale embedded ID.
          try {
            const all = await this.workspaceStorage('getAll');
            const matches = Object.values(all || {}).map((raw) => {
              try { return JSON.parse(raw); } catch (_) { return null; }
            }).filter((candidate) => candidate?.id &&
              candidate.metadata?.zoteroAttachmentKey === attItem.key &&
              Number(candidate.metadata?.zoteroAttachmentLibraryID) === Number(attItem.libraryID));
            if (matches.length === 1 && matches[0].id !== docData.id) {
              docData.id = matches[0].id;
            }
          } catch (resolveError) {
            Zotero.log?.('[MindFlow] Attachment workspace identity lookup skipped: ' + resolveError);
          }
          this.openMindFlow(
            {
              mode: 'open_document',
              doc: docData,
              openedAttachmentKey: attItem.key,
              openedAttachmentLibraryID: attItem.libraryID,
            },
            targetWindow
          );
          return true;
        }
        showMindFlowNotice('MindFlow 导图文件未在本机', '请先在 Zotero 中下载该附件，再从文献右键菜单打开；插件不会另建一份导图。');
      } catch (err) {
        Zotero.logError?.('[MindFlow] Failed to load .mindflow attachment: ' + err);
        showMindFlowNotice('MindFlow 导图未能打开', '附件可能尚未下载或文件内容已损坏。请检查 Zotero 附件与错误日志。');
      }
      return false;
    },

    /**
     * Smart entry point:
     * - If reading a paper in Reader tab: open its mindmap (or create from this paper)
     * - If items selected in library pane: open existing mindmap (or create from selection)
     * - Otherwise: open MindFlow workspace
     */
    async triggerMindFlowOpen(window = null) {
      try {
        const win =
          window ||
          (typeof window !== 'undefined' ? window : null) ||
          (Zotero.getMainWindow ? Zotero.getMainWindow() : null);

        // 1. Check active tab
        const tabs = win?.Zotero_Tabs || (typeof Zotero_Tabs !== 'undefined' ? Zotero_Tabs : null);
        const currentTab = currentTabFor(tabs);

        // A. If already in a MindFlow tab, center the canvas and keep focus
        if (currentTab && currentTab.type === 'mindflow') {
          const iframe = tabContainer(tabs, currentTab, win)?.querySelector?.('iframe');
          if (iframe && iframe.contentWindow) {
            try {
              iframe.contentWindow.postMessage({ type: 'MINDFLOW_CENTER_CANVAS' }, '*');
            } catch (_) {}
          }
          if (win && win.focus) win.focus();
          return;
        }

        // B. Check if user is currently reading a paper in a Zotero Reader tab
        if (currentTab && currentTab.type === 'reader') {
          try {
            let itemID = null;
            if (Zotero.Reader && typeof Zotero.Reader.getByTabID === 'function') {
              const reader = Zotero.Reader.getByTabID(currentTab.id);
              if (reader && reader.itemID) {
                itemID = reader.itemID;
              }
            }
            if (!itemID && currentTab.data?.itemID) {
              itemID = currentTab.data.itemID;
            }

            if (itemID) {
              const item = Zotero.Items.get(itemID);
              let parentItem = item;
              if (item && typeof item.isAttachment === 'function' && item.isAttachment() && item.parentItemID) {
                parentItem = Zotero.Items.get(item.parentItemID) || item;
              }
              if (parentItem?.isRegularItem?.()) {
                const existingMaps = this.getMindflowAttachments(parentItem);
                if (existingMaps.length > 1) {
                  showMindFlowNotice('找到多份 MindFlow 导图', '请在该文献的右键菜单中选择要打开的导图。');
                  return;
                }
                if (existingMaps.length === 1) {
                  await this.openMindflowAttachment(existingMaps[0], win);
                  return;
                }
                this.openMindFlow({ mode: 'create_from_selection', items: [parentItem] }, win);
                return;
              }
            }
          } catch (readerErr) {
            Zotero.log?.('[MindFlow] Note on reader tab detection: ' + readerErr);
          }
        }

        // C. Check if items are selected in the library pane
        const pane =
          win?.ZoteroPane ||
          (Zotero.getActiveZoteroPane ? Zotero.getActiveZoteroPane() : null) ||
          (Zotero.getMainWindow ? Zotero.getMainWindow().ZoteroPane : null);
        const rawSelection = pane && typeof pane.getSelectedItems === 'function' ? pane.getSelectedItems() : [];
        if (rawSelection.length === 1 && isMindFlowAttachment(rawSelection[0])) {
          await this.openMindflowAttachment(rawSelection[0], win);
          return;
        }
        const selectedItems = regularLiteratureItems(rawSelection);

        if (Array.isArray(selectedItems) && selectedItems.length > 0) {
          if (selectedItems.length === 1) {
            const existingMaps = this.getMindflowAttachments(selectedItems[0]);
            if (existingMaps.length > 1) {
              showMindFlowNotice('找到多份 MindFlow 导图', '请在该文献的右键菜单中选择要打开的导图。');
              return;
            }
            if (existingMaps.length === 1) {
              await this.openMindflowAttachment(existingMaps[0], win);
              return;
            }
          }
          this.openMindFlow({ mode: 'create_from_selection', items: selectedItems }, win);
          return;
        }

        // D. Fallback: No literature item selected; open a clean blank MindFlow mindmap
        this.openMindFlow({ mode: 'create_blank', forceNew: true }, win);
      } catch (err) {
        Zotero.logError?.('[MindFlow] triggerMindFlowOpen error: ' + err);
        showMindFlowNotice('MindFlow 打开失败', '无法确认目标条目，已停止打开。请检查错误日志。');
      }
    },

