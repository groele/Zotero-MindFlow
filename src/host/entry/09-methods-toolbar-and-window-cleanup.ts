    injectToolbarButton(window, windowElements, retryCount = 0, retryState = { cancelled: false, timers: new Set() }) {
      if (retryState.cancelled) return;
      if (!window || !window.document) return;
      const doc = window.document;

      // Only inject the main items toolbar button into the primary Zotero library window.
      // Sub-windows, dialogs (e.g. Plugin Market / 插件市场), preferences, and popups must be excluded.
      const winType = doc.documentElement?.getAttribute?.('windowtype');
      if (winType && winType !== 'navigator:browser') {
        const existingButton = doc.getElementById('mindflow-toolbar-button');
        if (existingButton) existingButton.remove();
        return;
      }

      const isLibraryWindow = Boolean(
        window.ZoteroPane ||
        (typeof Zotero !== 'undefined' && Zotero.getMainWindow && Zotero.getMainWindow() === window) ||
        doc.getElementById?.('zotero-pane') ||
        doc.getElementById?.('zotero-items-pane') ||
        doc.getElementById?.('zotero-items-tree')
      );
      if (!isLibraryWindow) {
        const existingButton = doc.getElementById('mindflow-toolbar-button');
        if (existingButton) existingButton.remove();
        return;
      }

      const existingButton = doc.getElementById('mindflow-toolbar-button');
      // Resolve the main toolbar row from Zotero controls, then insert before its
      // flexible spacer so MindFlow stays with the left-side action buttons.
      const toolbarLocator =
        doc.getElementById('zotero-tb-attachment') ||
        doc.getElementById('zotero-tb-note') ||
        doc.getElementById('zotero-tb-lookup') ||
        doc.getElementById('zotero-tb-add') ||
        doc.getElementById('zotero-tb-note-add');

      const toolbar =
        (toolbarLocator && toolbarLocator.parentNode) ||
        (existingButton && existingButton.parentNode) ||
        doc.getElementById('zotero-item-toolbar') ||
        doc.getElementById('zotero-items-toolbar') ||
        doc.getElementById('zotero-tb') ||
        doc.querySelector('#zotero-items-pane toolbar') ||
        doc.querySelector('.zotero-items-toolbar');

      if (!toolbar) {
        if (retryCount < 10) {
          const timer = window.setTimeout(() => {
            retryState.timers.delete(timer);
            if (!retryState.cancelled) this.injectToolbarButton(window, windowElements, retryCount + 1, retryState);
          }, 300);
          retryState.timers.add(timer);
        }
        return;
      }

      const toolbarChildren = Array.from(toolbar.children || []);
      const flexibleSpacerIndex = toolbarChildren.findIndex((child) => {
        const tag = String(child.localName || child.tagName || '').toLowerCase();
        return tag === 'toolbarspring' ||
          (tag === 'spacer' && Number(child.getAttribute('flex') || 0) > 0);
      });
      const leadingActionItems = flexibleSpacerIndex >= 0
        ? toolbarChildren.slice(0, flexibleSpacerIndex)
        : toolbarChildren;
      const isMindFlowButton = (button) =>
        button.id === 'mindflow-toolbar-button' ||
        button.getAttribute('data-mindflow') === 'true' ||
        (button.getAttribute('label') === 'MindFlow' &&
          String(button.getAttribute('image') || '').includes('/icons/')) ||
        String(button.getAttribute('image') || '').includes('/icons/icon.svg') ||
        String(button.getAttribute('image') || '').includes('/icons/mindflow.svg') ||
        String(button.getAttribute('image') || '').includes('/icons/mindflow-toolbar.svg') ||
        String(button.getAttribute('image') || '').includes('/icons/toolbar-mindflow.svg');
      const toolbarButtons = leadingActionItems.filter((child) =>
        String(child.localName || child.tagName || '').toLowerCase() === 'toolbarbutton' &&
        !isMindFlowButton(child) &&
        !child.hidden &&
        child.getAttribute('hidden') !== 'true' &&
        child.getAttribute('collapsed') !== 'true'
      );
      const anchor = toolbarButtons.reverse().find((child) => {
        try {
          const style = window.getComputedStyle(child);
          return style.display !== 'none' && style.visibility !== 'collapse';
        } catch (_error) {
          return true;
        }
      }) || (toolbarLocator && toolbarLocator.parentNode === toolbar ? toolbarLocator : null);

      const priorMindFlowButton = existingButton ||
        Array.from(doc.querySelectorAll('toolbarbutton')).find(isMindFlowButton) || null;
      const btn = priorMindFlowButton || (doc.createXULElement
        ? doc.createXULElement('toolbarbutton')
        : doc.createElement('toolbarbutton'));
      Array.from(doc.querySelectorAll('toolbarbutton')).forEach((button) => {
        if (button !== btn && isMindFlowButton(button)) button.remove();
      });

      btn.id = 'mindflow-toolbar-button';
      btn.setAttribute('data-mindflow', 'true');
      btn.removeAttribute('label');
      if ('label' in btn) {
        try { btn.label = ''; } catch (_) {}
      }
      btn.setAttribute('tooltiptext', T('打开 Zotero MindFlow 思维导图工作区', 'Open Zotero MindFlow Mind Map Workspace'));
      btn.setAttribute('aria-label', 'MindFlow');
      btn.setAttribute('image', `${CHROME_ROOT}icons/icon.svg`);
      btn.setAttribute('class', 'zotero-tb-button toolbarbutton-1 chromeclass-toolbar-additional');
      btn.setAttribute(
        'style',
        'cursor: pointer; margin: 0 3px; display: inline-flex; align-items: center; justify-content: center;'
      );

      // Clean up any internal text elements/nodes if present to ensure pure icon display
      try {
        const textElements = btn.querySelectorAll?.('.toolbarbutton-text, label, text');
        if (textElements) {
          textElements.forEach((el) => {
            el.textContent = '';
            el.style.display = 'none';
          });
        }
        Array.from(btn.childNodes || []).forEach((node) => {
          if (node.nodeType === 3) node.remove(); // Node.TEXT_NODE
        });
      } catch (_e) {}

      const trigger = (e) => {
        if (e) {
          e.preventDefault?.();
          e.stopPropagation?.();
        }
        this.triggerMindFlowOpen(window);
      };

      if (!btn.hasAttribute('data-mindflow-handler')) {
        btn.addEventListener('command', trigger);
        btn.addEventListener('click', trigger);
        btn.setAttribute('data-mindflow-handler', 'true');
      }

      if (anchor && anchor.parentNode === toolbar) {
        anchor.parentNode.insertBefore(btn, anchor.nextSibling);
      } else {
        const searchBox =
          doc.getElementById('zotero-tb-search-textbox') ||
          toolbar.querySelector('input') ||
          toolbar.querySelector('.zotero-search-box') ||
          toolbar.querySelector('#zotero-search-box');
        if (searchBox && searchBox.parentNode === toolbar) {
          toolbar.insertBefore(btn, searchBox);
        } else {
          toolbar.appendChild(btn);
        }
      }

      if (!windowElements.includes(btn)) windowElements.push(btn);
    },

    removeFromWindow(window) {
      if (!window) return;
      const hookState = this._tabHookStates?.get(window);
      if (hookState) {
        for (const [action, hook, previous] of hookState) {
          if (window.Zotero_Tabs?.tabHooks?.[action]?.mindflow === hook) {
            if (previous) window.Zotero_Tabs.tabHooks[action].mindflow = previous;
            else delete window.Zotero_Tabs.tabHooks[action].mindflow;
          }
        }
        this._tabHookStates.delete(window);
      }
      const elements = injectedElements.get(window);
      if (elements) {
        for (const el of elements) {
          try {
            el.remove();
          } catch (e) {
            // ignore
          }
        }
        injectedElements.delete(window);
      }
      this.removeLocalization(window.document);
      try { window._mindflowInjected = false; } catch (_) {}
    },

    installTabLifecycle(win) {
      const tabs = win?.Zotero_Tabs;
      if (!tabs?.tabHooks) return;
      if (!this._tabHookStates) this._tabHookStates = new WeakMap();
      if (this._tabHookStates.has(win)) return;
      const restore = async (tab, index, session = false) => {
        try {
          if (this._lifecycleActive === false || win.closed) return false;
          await this._closeSaveQueue;
          if (this._lifecycleActive === false || win.closed) return false;
          const data = tab.data || {};
          if (!data.docId) return false;
          const raw = await this.workspaceStorage('get', { key: `mindflow_doc_${data.docId}` });
          if (!raw) return false;
          if (this._lifecycleActive === false || win.closed) return false;
          const doc = JSON.parse(raw);
          this.openMindFlow({ mode: 'open_document', doc, workspaceDocumentId: doc.id, targetMode: 'tab',
            openedAttachmentKey: doc.metadata?.zoteroAttachmentKey,
            openedAttachmentLibraryID: doc.metadata?.zoteroAttachmentLibraryID,
            tabIndex: index, select: session ? tab.selected === true : true }, win);
          return true;
        } catch (error) { Zotero.logError?.('[MindFlow] Tab restoration stopped: ' + error); return false; }
      };
      const hooks = {
        undoClose: (tab, index) => restore(tab, index),
        restoreState: async (tab, index) => { await restore(tab, index, true); return { itemID: null }; },
      };
      const state = [];
      for (const [action, hook] of Object.entries(hooks)) {
        if (!tabs.tabHooks[action]) tabs.tabHooks[action] = {};
        state.push([action, hook, tabs.tabHooks[action].mindflow]);
        tabs.tabHooks[action].mindflow = hook;
      }
      this._tabHookStates.set(win, state);
      // ZoteroPane can begin restoring session.json before add-on startup.
      // Reconcile our saved tabs after registering hooks, without re-creating
      // tabs already restored by the native path.
      if (this.restoreSessionOnStartup && win === Zotero.getMainWindow?.() && !this._startupSessionScheduled) {
        this._startupSessionScheduled = true;
        const savedTabs = Zotero.Session?.state?.windows?.find(w=>w.type==='pane')?.tabs || [];
        win.setTimeout(() => {
          if (this._lifecycleActive === false || win.closed) return;
          this._startupRestoreQueue = (async () => {
            const occurrences = new Map(), restoredItemIDs = [];
            for (let i=0;i<savedTabs.length;i++) {
              if (this._lifecycleActive === false || win.closed) return;
              const saved = savedTabs[i];
              if (saved.type === 'mindflow') {
                if (saved.data?.docId && !tabs._tabs.some(t=>t.type==='mindflow' && t.data?.docId===saved.data.docId)) await restore(saved,i,true);
              } else if (['reader','note'].includes(saved.type) && saved.data?.itemID) {
                const identity = `${saved.type}:${saved.data.itemID}`;
                const occurrence = (occurrences.get(identity) || 0) + 1;
                occurrences.set(identity,occurrence);
                const present = tabs._tabs.filter(t=>t.type.startsWith(saved.type) && t.data?.itemID===saved.data.itemID).length;
                if (present < occurrence) {
                  const result = await tabs.tabHooks.restoreState[saved.type]?.(saved,i);
                  if (result?.itemID) restoredItemIDs.push(result.itemID);
                }
              }
            }
            if (restoredItemIDs.length) await Zotero.Items.loadDataTypes(await Zotero.Items.getAsync(restoredItemIDs));
          })().catch(error=>Zotero.logError?.('[MindFlow] Startup session reconciliation failed: '+error));
        },0);
      }
    },

    /**
     * Locate existing .mindflow attachment under an item or its parent
     */
    getExistingMindflowAttachment(item) {
      return this.getMindflowAttachments(item)[0] || null;
    },

    getMindflowAttachments(item) {
      try {
        if (!item) return [];
        let target = item;
        if (typeof target.isAttachment === 'function' && target.isAttachment()) {
          if (target.parentItemID) {
            target = Zotero.Items.get(target.parentItemID) || target;
          } else if (isMindFlowAttachment(target)) {
            return target.deleted ? [] : [target];
          }
        }
        if (target && typeof target.isNote === 'function' && target.isNote() && target.parentItemID) {
          target = Zotero.Items.get(target.parentItemID) || target;
        }
        if (target && typeof target.getAttachments === 'function') {
          const attIds = target.getAttachments();
          const result = [];
          for (const attId of attIds) {
            const att = Zotero.Items.get(attId);
            if (isMindFlowAttachment(att) && !att.deleted && Number(att.parentItemID) === Number(target.id) && Number(att.libraryID) === Number(target.libraryID)) result.push(att);
          }
          return result;
        }
      } catch (_) {}
      return [];
    },

