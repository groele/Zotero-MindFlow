    openMindFlow(options = {}, targetWindow = null) {
      if (this._lifecycleActive === false) return;
      try {
        const win =
          targetWindow ||
          (typeof window !== 'undefined' ? window : null) ||
          (Zotero.getMainWindow ? Zotero.getMainWindow() : null);

        // Check user preference for window mode: 'tab' (default) vs. 'window'
        let preferredWindowMode = 'tab';
        try {
          if (Zotero.Prefs) {
            preferredWindowMode = Zotero.Prefs.get('extensions.mindflow.windowMode', true) || 'tab';
          }
        } catch (e) {
          preferredWindowMode = 'tab';
        }

        const effectiveMode = options.targetMode || preferredWindowMode;

        if (effectiveMode === 'window') {
          this.openStandaloneWindow(options, win);
          return;
        }

        const tabs =
          win?.Zotero_Tabs ||
          (typeof Zotero_Tabs !== 'undefined' ? Zotero_Tabs : null) ||
          (Zotero.getMainWindow && Zotero.getMainWindow().Zotero_Tabs);

        if (tabs && typeof tabs.add === 'function') {
          this.installTabLifecycle(win);
          const serializedItems = Array.isArray(options.items)
            ? options.items.map((i) => this.serializeZoteroItem(i)).filter(Boolean)
            : [];

          const targetItemId = openTargetIdentity(options, serializedItems);
          const parentItemUri = options.doc?.metadata?.zoteroUri ||
            (serializedItems.length === 1 ? serializedItems[0].zoteroUri : null);
          // A workspace acquires the identity of its active document after
          // loading. Navigation still targets that editor, even when
          // its target is no longer the initial generic "workspace" key.
          const workspaceTab = ['open', 'import_file'].includes(options.mode) && !serializedItems.length && !options.forceNew
            ? tabs._tabs?.find(tab => tab.type === 'mindflow' && tab.id === tabs.selectedID)
              || tabs._tabs?.find(tab => tab.type === 'mindflow' && ['open', 'import_file'].includes(tab.data?.mode))
              || (options.mode === 'open' ? tabs._tabs?.find(tab => tab.type === 'mindflow') : null)
            : null;
          const existingTab = workspaceTab || tabs._tabs?.find((tab) => tab.type === 'mindflow' &&
            tab.data?.targetItemId === targetItemId);
          if (existingTab && !options.forceNew) {
            const iframe = tabContainer(tabs, existingTab, win)?.querySelector?.('iframe');
            if (iframe?.contentWindow) {
              tabs.select(existingTab.id);
              win?.focus?.();
              if (options.mode === 'ai_analyze' || options.mode === 'import_file') {
                const request = openActionMessage(options, serializedItems);
                if (iframe._mindflowReady) iframe.contentWindow.postMessage(request, '*');
                else iframe._mindflowPending = request;
              }
              // This exact target is already loaded. Keep live edits instead
              // of re-importing the on-disk attachment or recreating its map.
              return;
            }
            throw new Error('目标 MindFlow 标签页的内容容器不可用');
          }

          // 2. Open as a new dedicated Tab in Zotero
          const tabTitle = options.collectionName
            ? `MindFlow - ${options.collectionName}`
            : (options.mode === 'open_document' && options.doc?.title
                ? `MindFlow - ${(options.doc.title || '').slice(0, 25)}`
                : (serializedItems.length === 1 && serializedItems[0]?.title
                    ? `MindFlow - ${serializedItems[0].title.slice(0, 25)}`
                    : (serializedItems.length > 1
                        ? `MindFlow - 专题 (${serializedItems.length} 篇)`
                        : 'MindFlow 思维导图')));

          const tabData = {
            icon: 'mindflow',
            ...options,
            targetItemId,
            items: serializedItems,
            parentItemUri,
            openedAttachmentKey: options.openedAttachmentKey || null,
            docId: options.doc?.id || null,
          };

          let workspaceFrame = null;
          const tabResult = tabs.add({
            type: 'mindflow',
            title: tabTitle,
            select: options.select !== false,
            index: Number.isInteger(options.tabIndex) ? options.tabIndex : undefined,
            data: tabData,
            onClose: () => {
              this.captureWorkspaceOnClose(workspaceFrame?.contentWindow);
              Zotero.log?.('[MindFlow] Workspace tab closed: ' + tabTitle);
            },
          });

          try {
            const tabId = tabResult?.id;
            if (tabId) {
              const applyTabIcon = () => {
                const tabEl = win.document?.querySelector?.(`.tab[data-id="${tabId}"]`);
                if (tabEl) {
                  tabEl.setAttribute('data-type', 'mindflow');
                  const iconEl = tabEl.querySelector?.('.tab-icon');
                  if (iconEl) {
                    iconEl.style.setProperty('background-image', `url("${CHROME_ROOT}icons/icon.svg")`, 'important');
                    iconEl.style.setProperty('background-repeat', 'no-repeat', 'important');
                    iconEl.style.setProperty('background-position', 'center', 'important');
                    iconEl.style.setProperty('background-size', 'contain', 'important');
                  }
                }
              };
              applyTabIcon();
              win.setTimeout?.(applyTabIcon, 50);
              win.setTimeout?.(applyTabIcon, 300);
            }
          } catch (_) {}

          const container =
            (tabResult && tabResult.container) ||
            (tabResult && tabs.getTabContent && tabs.getTabContent(tabResult.id || tabResult)) ||
            (tabResult && tabs.getTabContainer && tabs.getTabContainer(tabResult.id || tabResult)) ||
            (tabs.getTab && tabs.getTab(tabResult?.id)?.container);

          if (container) {
            const doc = container.ownerDocument || win.document;
            const tabId = tabResult?.id || `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const iframe = doc.createElement('iframe');
            workspaceFrame = iframe;
            iframe.id = `mindflow-iframe-${tabId}`;
            iframe.className = 'mindflow-workspace-iframe';
            iframe.setAttribute('src', this.workspaceURL);
            iframe.setAttribute(
              'style',
              'width: 100%; height: 100%; border: none; flex: 1; display: block;'
            );
            iframe.setAttribute('flex', '1');
            iframe._mindflowReady = false;
            iframe._mindflowTabId = tabResult?.id;
            iframe._mindflowInitialAction = { ...options, items: serializedItems };
            iframe._mindflowPending = null;

            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.overflow = 'hidden';

            iframe.addEventListener('load', () => {
              try {
                if (iframe.contentWindow) {
                  iframe.contentWindow.Zotero = Zotero;
                  iframe._mindflowReady = false;
                  iframe.contentWindow.postMessage({ type: 'MINDFLOW_ZOTERO_CONNECTED' }, '*');
                }
              } catch (e) {
                Zotero.log?.('[MindFlow] Note on tab iframe load: ' + e);
              }
            });

            container.appendChild(iframe);
          }

          if (win && win.focus) {
            win.focus();
          }
          return;
        }
      } catch (tabErr) {
        Zotero.log?.('[MindFlow] Tab opening note, falling back to window: ' + tabErr);
      }

      // Fallback: If Zotero_Tabs is not accessible, use standalone window
      this.openStandaloneWindow(options, targetWindow);
    },

    openStandaloneWindow(options = {}, targetWindow = null) {
      if (this._lifecycleActive === false) return;
      try {
        const ww = Services.ww;
        // dialog=no,all,resizable=yes,minimizable=yes ensures standard OS window controls (minimize, maximize/restore, close) on Windows
        const features =
          'chrome,dialog=no,all,centerscreen,resizable=yes,minimizable=yes,close=yes,titlebar=yes,width=1440,height=920';
        const url = this.workspaceURL;

        const serializedItems = Array.isArray(options.items)
          ? options.items.map((i) => this.serializeZoteroItem(i)).filter(Boolean)
          : [];

        const targetId = openTargetIdentity(options, serializedItems);
        if (!this._standaloneWindows) this._standaloneWindows = new Map();
        const workspaceWindow = ['open', 'import_file'].includes(options.mode) && !serializedItems.length && !options.forceNew
          ? [...this._standaloneWindows.values()].find(win => !win.closed &&
            ['open', 'import_file'].includes((win.wrappedJSObject || win)._mindflowInitialAction?.mode))
            || (options.mode === 'open' ? [...this._standaloneWindows.values()].find(win => !win.closed) : null)
          : null;
        const existing = workspaceWindow || this._standaloneWindows.get(targetId);
        if (existing && !existing.closed && !options.forceNew) {
          existing.focus?.();
          if (options.mode === 'ai_analyze' || options.mode === 'import_file') existing.postMessage(openActionMessage(options, serializedItems), '*');
          return;
        }
        const windowName = 'mindflow-window-' + Zotero.Utilities.randomString();

        const params = {
          ...options,
          Zotero,
          mode: options.mode || 'open',
          doc: options.doc || null,
          openedAttachmentKey: options.openedAttachmentKey || null,
          items: serializedItems,
          collection: options.collection || null,
          collectionName: options.collectionName || null,
          windowMode: 'window',
        };

        const win = ww.openWindow(null, url, windowName, features, params);
        if (win) {
          const appWindow = win.wrappedJSObject || win;
          appWindow.Zotero = Zotero;
          appWindow._mindflowInitialAction = params;
          this._standaloneWindows.set(targetId, win);
          win.addEventListener('beforeunload', () => { this.captureWorkspaceOnClose(win); });
          win.addEventListener('unload', (event) => {
            // openWindow first navigates away from about:blank. That unload
            // must not unregister the workspace which is still starting.
            if (event.target?.documentURI !== url) return;
            for (const [key, registered] of this._standaloneWindows || []) {
              if (registered === win) this._standaloneWindows.delete(key);
            }
          });
          try {
            win.addEventListener('load', () => {
              if (win.document) {
                win.document.title = 'MindFlow 思维导图与学术研读工作区';
              }
            }, { once: true });
          } catch (_) {}
          if (win.focus) {
            win.focus();
          }
        }
      } catch (err) {
        Zotero.logError?.('[MindFlow] Failed to open standalone window: ' + err);
      }
    },

    /**
     * Serialize a live Zotero.Item or attachment into a structured, JSON-safe item descriptor
     */
