    addToWindow(window) {
      if (!window || !window.document) return;
      const doc = window.document;

      const winType = doc.documentElement?.getAttribute?.('windowtype');
      if (winType && winType !== 'navigator:browser') return;

      this.installTabLifecycle(window);

      // Clean up any legacy tools menu items
      try {
        doc.getElementById('mindflow-tools-menu')?.remove();
        doc.getElementById('mindflow-tools-blank-menu')?.remove();
      } catch (_) {}

      // Prevent duplicate injection
      if (doc.getElementById('mindflow-collectionmenu-create') || window._mindflowInjected) return;
      window._mindflowInjected = true;

      const windowElements = [];
      this.ensureLocalization(doc);

      // 2. Add to Collection Context Menu (分类列表右键菜单)
      const collectionMenu = doc.getElementById('zotero-collectionmenu');
      if (collectionMenu) {
        // §5.3: Zotero 11 removed the singular collection-selection compat
        // shim. Resolve through the plural API only, and never probe for the
        // deprecated method: its presence does not imply that it is callable.
        const getActiveCollection = () => {
          const pane = window.ZoteroPane || Zotero?.getActiveZoteroPane?.();
          const selected = pane?.getSelectedCollections?.();
          return Array.isArray(selected) && selected.length ? selected[0] || null : null;
        };

        const colItem = doc.createXULElement
          ? doc.createXULElement('menuitem')
          : doc.createElement('menuitem');
        colItem.id = 'mindflow-collectionmenu-create';
        colItem.setAttribute('data-l10n-id', 'mindflow-collection-menu-create');
        colItem.setAttribute('image', `${CHROME_ROOT}icons/mindflow.svg`);
        colItem.setAttribute('class', 'menuitem-iconic');

        const setCollectionLabel = (collection) => {
          if (collection) {
            colItem.setAttribute('data-l10n-id', 'mindflow-collection-menu-create-with-name');
            colItem.setAttribute('data-l10n-args', JSON.stringify({ name: collection.name }));
          } else {
            colItem.removeAttribute('data-l10n-args');
            colItem.setAttribute('data-l10n-id', 'mindflow-collection-menu-create');
          }
        };

        const updateCollectionMenuState = () => {
          try {
            const collection = getActiveCollection();
            colItem.disabled = !collection;
            setCollectionLabel(collection);
          } catch (error) {
            colItem.disabled = true;
            setCollectionLabel(null);
            Zotero?.logError?.('[MindFlow] Failed to resolve the selected collection: ' + error);
          }
        };

        collectionMenu.addEventListener('popupshowing', updateCollectionMenuState);
        windowElements.push({
          remove: () => collectionMenu.removeEventListener('popupshowing', updateCollectionMenuState),
        });

        colItem.addEventListener('command', () => {
          const collection = getActiveCollection();
          if (collection) {
            this.openMindFlow(
              {
                mode: 'create_from_collection',
                collectionName: collection.name,
                collectionKey: collection.key,
                collectionLibraryID: collection.libraryID,
                items: resolveCollectionItems(collection),
              },
              window
            );
          }
        });
        collectionMenu.appendChild(colItem);
        windowElements.push(colItem);
      }

      // 4. Inject Tab icon styling for native Zotero Tab Bar
      try {
        if (!doc.getElementById('mindflow-tab-style')) {
          const style = doc.createElement('style');
          style.id = 'mindflow-tab-style';
          style.textContent = `
            .icon-css.icon-mindflow,
            .tab .tab-icon.icon-mindflow,
            .tab[data-type="mindflow"] .tab-icon,
            tab[type="mindflow"] .tab-icon,
            .tab[type="mindflow"] .tab-icon {
              background-image: url("${CHROME_ROOT}icons/icon.svg") !important;
              background-repeat: no-repeat !important;
              background-position: center !important;
              background-size: contain !important;
              list-style-image: url("${CHROME_ROOT}icons/icon.svg") !important;
              width: 16px !important;
              height: 16px !important;
            }
            #mindflow-toolbar-button .toolbarbutton-icon {
              list-style-image: url("${CHROME_ROOT}icons/icon.svg") !important;
              width: 20px !important;
              height: 20px !important;
              max-width: 20px !important;
              max-height: 20px !important;
            }
            #mindflow-toolbar-button .toolbarbutton-text {
              display: none !important;
              visibility: collapse !important;
              width: 0 !important;
              height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
              opacity: 0 !important;
              pointer-events: none !important;
            }
            #mindflow-toolbar-button {
              min-width: 0 !important;
            }
          `;
          (doc.head || doc.documentElement).appendChild(style);
          windowElements.push(style);
        }
      } catch (e) {
        // ignore
      }

      // 5. Global Keyboard Shortcut (Ctrl+Alt+M or Cmd+Alt+M)
      const handleGlobalKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'm' || e.key === 'M')) {
          e.preventDefault?.();
          e.stopPropagation?.();
          this.triggerMindFlowOpen(window);
        }
      };
      window.addEventListener('keydown', handleGlobalKeyDown, true);
      windowElements.push({
        remove: () => window.removeEventListener('keydown', handleGlobalKeyDown, true),
      });

      // 6. Host-level listener for MindFlow iframe commands (locate item, open PDF, sync tab title)
      const handleHostMessage = (event) => {
        try {
          if (!event.data || typeof event.data !== 'object') return;
          const data = event.data;
          if (typeof data.type !== 'string' || !data.type.startsWith('MINDFLOW_')) return;
          const source = event.source;
          if (!source) return;
          // Only frames or windows created by this plugin can issue privileged host commands.
          const ownerFrame = Array.from(doc.querySelectorAll?.('.mindflow-workspace-iframe') || [])
            .find((frame) => sameWindow(frame.contentWindow, source));
          const isOwner = Boolean(ownerFrame) || this.ownsWorkspaceWindow(source);
          if (!isOwner) return;
          const responseOrigin = event.origin && event.origin !== 'null' ? event.origin : '*';

          if (data.type === 'MINDFLOW_READY') {
            try {
              source.postMessage({ type: 'MINDFLOW_ZOTERO_CONNECTED' }, responseOrigin);
            } catch (_) {}
            return;
          }

          if (data.type === 'MINDFLOW_HOST_ACK') {
            const frames = doc.querySelectorAll?.('.mindflow-workspace-iframe, iframe[id^="mindflow-iframe-"], iframe[id="mindflow-tab-iframe"]');
            if (frames) {
              for (const f of frames) {
                if (sameWindow(f.contentWindow, source)) {
                  f._mindflowReady = true;
                  if (f._mindflowPending) {
                    try {
                      source.postMessage(f._mindflowPending, responseOrigin);
                      f._mindflowPending = null;
                    } catch (error) { Zotero.logError?.('[MindFlow] Open delivery failed: ' + error); }
                  }
                  break;
                }
              }
            }
            return;
          }

          if (data.type === 'MINDFLOW_GET_SELECTION' && typeof data.requestId === 'string' &&
              data.requestId.length < 100) {
            let result = { available: false, selectedCount: 0, items: [] };
            try {
              const pane = window.ZoteroPane || Zotero.getActiveZoteroPane?.();
              if (pane && typeof pane.getSelectedItems === 'function') {
                const selected = pane.getSelectedItems() || [];
                result = {
                  available: true,
                  selectedCount: selected.length,
                  items: regularLiteratureItems(selected)
                    .map((item) => ({
                      key: item.key,
                      libraryID: item.libraryID,
                      title: item.getField?.('title') || item.title || '无标题文献',
                      authors: [], tags: [], zoteroUri: itemSelectUri(item),
                    })),
                };
              }
            } catch (error) {
              Zotero.log?.('[MindFlow] Could not read Zotero selection: ' + error);
            }
            try {
              source.postMessage({
                type: 'MINDFLOW_GET_SELECTION_RESULT', requestId: data.requestId, result,
              }, responseOrigin);
            } catch (_) {}
            return;
          }

          if (data.type === 'MINDFLOW_STORAGE' && typeof data.requestId === 'string' &&
              data.requestId.length < 100) {
            const reply = (result, error) => {
              try { source.postMessage({
                type: 'MINDFLOW_STORAGE_RESULT', requestId: data.requestId, result, error,
              }, responseOrigin); } catch (_) {}
            };
            this.workspaceStorage(data.action, data.payload)
              .then((result) => reply(result, null))
              .catch((error) => reply(null, error?.message || String(error)));
            return;
          }

          // A. Locate and highlight item in Library
          if (data.type === 'MINDFLOW_LOCATE_ITEM' && (data.key || data.doi || data.text || data.note)) {
            const reply = (success) => {
              if (data.requestId && typeof data.requestId === 'string') {
                try {
                  source.postMessage({
                    type: 'MINDFLOW_LOCATE_ITEM_RESULT',
                    requestId: data.requestId,
                    success: !!success,
                  }, responseOrigin);
                } catch (_) {}
              }
            };

            (async () => {
              let item = data.key ? resolveItemReference(data.key, data.libraryID) : null;
              if (!item) {
                const doi = data.doi || normalizeDOI(data.key) || normalizeDOI(data.text) || normalizeDOI(data.note);
                if (doi) {
                  item = await searchItemByDoi(doi, data.libraryID);
                }
              }
              if (item) {
                const tabs = window.Zotero_Tabs || Zotero.getMainWindow?.()?.Zotero_Tabs;
                if (tabs && Array.isArray(tabs._tabs)) {
                  const libTab = tabs._tabs.find((t) => t && (t.type === 'library' || t.id === 'zotero-pane')) || tabs._tabs[0];
                  if (libTab) {
                    if (typeof tabs.select === 'function') tabs.select(libTab.id);
                    else if (typeof tabs.selectTab === 'function') tabs.selectTab(libTab.id);
                  }
                }
                const pane = window.ZoteroPane || Zotero.getActiveZoteroPane?.() || Zotero.getMainWindow?.()?.ZoteroPane;
                if (pane) {
                  try {
                    await pane.selectItem(item.id, true);
                  } catch (_) {
                    await pane.selectItem(item.id);
                  }
                }
                const mainWin = Zotero.getMainWindow?.() || window;
                try { mainWin?.focus?.(); } catch (_) {}
                reply(true);
                return;
              }
              reply(false);
            })().catch((err) => {
              Zotero.log?.('[MindFlow] MINDFLOW_LOCATE_ITEM error: ' + err);
              reply(false);
            });
            return;
          }

          // B. Open PDF Reader in Zotero
          if (data.type === 'MINDFLOW_OPEN_PDF' && (data.key || data.doi || data.text || data.note)) {
            const reply = (success) => {
              if (data.requestId && typeof data.requestId === 'string') {
                try {
                  source.postMessage({
                    type: 'MINDFLOW_OPEN_PDF_RESULT',
                    requestId: data.requestId,
                    success: !!success,
                  }, responseOrigin);
                } catch (_) {}
              }
            };

            const rawRef = String(data.key || '').trim();
            let directOpened = false;
            if (rawRef.startsWith('zotero://open-pdf/')) {
              try {
                if (typeof Zotero.launchURL === 'function') {
                  Zotero.launchURL(rawRef);
                  directOpened = true;
                }
              } catch (_) {}
            }
            if (directOpened) {
              reply(true);
              return;
            }

            (async () => {
              let item = data.key ? resolveItemReference(data.key, data.libraryID) : null;
              if (!item) {
                const doi = data.doi || normalizeDOI(data.key) || normalizeDOI(data.text) || normalizeDOI(data.note);
                if (doi) {
                  item = await searchItemByDoi(doi, data.libraryID);
                }
              }
              if (item) {
                const opened = await openPDFForItem(item);
                reply(opened);
                return;
              }
              reply(false);
            })().catch((err) => {
              Zotero.log?.('[MindFlow] MINDFLOW_OPEN_PDF error: ' + err);
              reply(false);
            });
            return;
          }

          // C. Launch external URL in default browser
          if (data.type === 'MINDFLOW_LAUNCH_URL' && typeof data.url === 'string') {
            try {
              if (/^(https?|zotero):\/\//i.test(data.url)) {
