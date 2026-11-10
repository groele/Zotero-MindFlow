    ensureItemPaneStyles(doc) {
      if (!doc || doc.getElementById('mindflow-itempane-styles')) return;
      try {
        const style = doc.createElementNS
          ? doc.createElementNS('http://www.w3.org/1999/xhtml', 'style')
          : doc.createElement('style');
        style.id = 'mindflow-itempane-styles';
        style.textContent = `
          item-pane-custom-section[data-pane*="mindflow-item-pane"],
          item-pane-custom-section[data-pane*="mindflow-item-pane"] > collapsible-section,
          item-pane-custom-section[data-pane*="mindflow-item-pane"] [data-type="body"] {
            min-width: 0;
            max-width: 100%;
            box-sizing: border-box;
          }

          /* Zotero ItemPane Sidenav Icon Rail */
          item-pane-sidenav .btn[data-pane*="mindflow-item-pane"] {
            width: 28px !important;
            height: 28px !important;
            min-width: 28px !important;
            padding: 4px !important;
            overflow: hidden !important;
            font-size: 0 !important;
            line-height: 0 !important;
            color: transparent !important;
            white-space: nowrap !important;
            background-image: url("chrome://mindflow/content/icons/mindflow.svg") !important;
            background-size: 20px 20px !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
          }

          item-pane-sidenav .btn[data-pane*="mindflow-item-pane"] .icon {
            display: none !important;
          }

          /* ItemPane Section Header Icon (Native & Custom fallbacks) */
          item-pane-custom-section[data-pane*="mindflow-item-pane"] collapsible-section > .head .title::before,
          item-pane-custom-section[data-pane*="mindflow-item-pane"] .title::before,
          item-pane-custom-section[data-pane*="mindflow-item-pane"] .icon,
          item-pane-custom-section[data-pane*="mindflow-item-pane"] button.header .icon,
          item-pane-custom-section[data-pane*="mindflow-item-pane"] collapsible-section .icon {
            content: "" !important;
            background-image: url("chrome://mindflow/content/icons/mindflow.svg") !important;
            background-size: 16px 16px !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
            display: inline-block !important;
            width: 16px !important;
            height: 16px !important;
            min-width: 16px !important;
            min-height: 16px !important;
            margin-inline-end: 6px !important;
            vertical-align: middle !important;
          }

          /* One scoped palette and spacing system for the native item pane. */
          .mf-pane-wrap {
            --mf-blue: light-dark(#315f94, #a8c9ef);
            --mf-green: light-dark(#316d58, #a0d3bb);
            --mf-amber: light-dark(#7a5d2c, #e3c58d);
            --mf-line: color-mix(in srgb, currentColor 12%, transparent);
            --mf-hover: color-mix(in srgb, currentColor 4%, transparent);
            --mf-muted: var(--fill-secondary, GrayText);
            display: flex; flex-direction: column; gap: 10px;
            contain: inline-size; container-type: inline-size;
            width: 100%; min-width: 0; max-width: 100%;
            padding: 6px 2px 12px; box-sizing: border-box;
            font: inherit; line-height: 1.5;
            color: var(--fill-primary, CanvasText); color-scheme: inherit;
          }
          .mf-pane-wrap * { box-sizing: border-box; }
          .mf-pane-wrap :is(button, select) { font: inherit; min-width: 0; max-width: 100%; }
          .mf-pane-wrap button { cursor: pointer; border-radius: 5px; }
          .mf-pane-wrap button:disabled { opacity: .55; cursor: default; }
          .mf-pane-wrap :is(button, select):focus-visible { outline: 2px solid var(--color-accent, Highlight); outline-offset: 2px; }
          .mf-pane-wrap .mf-action-status { font-size: 13px; line-height: 1.6; color: var(--mf-muted); }
          .mf-pane-wrap .mf-action-status:empty { display: none; }
          .mf-pane-wrap .mf-header-card { display: flex; flex-direction: column; gap: 4px; padding: 0 0 2px; }
          .mf-pane-wrap .mf-header-top { display: flex; align-items: center; justify-content: space-between; }
          .mf-pane-wrap .mf-status-badge { font-weight: 600; font-size: 14px; color: var(--fill-primary, CanvasText); }
          .mf-pane-wrap .mf-status-readonly { color: var(--mf-amber); font-weight: 600; }
          .mf-pane-wrap .mf-header-meta { color: var(--mf-muted); font-size: 12px; flex-shrink: 0; }
          .mf-pane-wrap .mf-target-title {
            display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;
            overflow: hidden; overflow-wrap: anywhere; line-height: 1.4; font-size: 12px; color: var(--mf-muted);
          }
          .mf-pane-wrap .mf-empty-state { display: flex; flex-direction: column; gap: 4px; }
          .mf-pane-wrap .mf-empty-title { font-weight: 600; font-size: 14px; color: var(--fill-primary, CanvasText); }
          .mf-pane-wrap .mf-section-title { font-weight: 600; font-size: 14px; color: var(--fill-primary, CanvasText); margin: 2px 0 0; }
          .mf-pane-wrap :is(.mf-hint-text, .mf-add-hint, .mf-map-card-meta) { color: var(--mf-muted); font-size: 12px; line-height: 1.5; }
          .mf-pane-wrap .mf-create-section { display: flex; flex-direction: column; gap: 8px; }
          .mf-pane-wrap .mf-template-box { display: flex; flex-direction: column; gap: 6px; }
          .mf-pane-wrap .mf-template-row { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--mf-muted); }
          .mf-pane-wrap .mf-template-label { flex-shrink: 0; }
          .mf-pane-wrap .mf-template-select {
            flex: 1 1 0; width: 0; min-height: 30px; padding: 4px 6px;
            border: 1px solid var(--mf-line); border-radius: 4px;
            color: var(--fill-primary, CanvasText); background: transparent; font-size: 13px;
          }
          .mf-pane-wrap :is(.mf-btn-primary, .mf-btn-template-create, .mf-tool-btn, .mf-card-btn) {
            --mf-tone: var(--mf-blue);
            display: inline-flex; align-items: center; justify-content: center;
            min-height: 32px; padding: 6px 10px; border-radius: 5px;
            border: 1px solid color-mix(in srgb, var(--mf-tone) 20%, transparent);
            background: color-mix(in srgb, var(--mf-tone) 9%, transparent);
            color: var(--mf-tone); text-align: center; white-space: normal;
            overflow-wrap: anywhere; text-decoration: none; font-weight: 500; font-size: 13px;
            transition: background .15s, border-color .15s;
          }
          .mf-pane-wrap :is(.mf-btn-primary, .mf-btn-template-create, .mf-tool-btn, .mf-card-btn):hover:not(:disabled) {
            background: color-mix(in srgb, var(--mf-tone) 16%, transparent);
            border-color: color-mix(in srgb, var(--mf-tone) 32%, transparent);
          }
          .mf-pane-wrap :is(.mf-btn-primary, .mf-btn-template-create, .mf-tool-btn, .mf-card-btn):active:not(:disabled) {
            background: color-mix(in srgb, var(--mf-tone) 22%, transparent);
          }
          .mf-pane-wrap .mf-btn-primary { width: 100%; min-height: 34px; font-size: 13px; font-weight: 500; }
          .mf-pane-wrap .mf-btn-template-create {
            --mf-tone: var(--mf-green);
            width: 100%; min-height: 34px; font-size: 13px; font-weight: 500;
          }
          .mf-pane-wrap .mf-divider { height: 1px; border: 0; background: var(--mf-line); margin: 2px 0; }
          .mf-pane-wrap .mindflow-pane-actions {
            display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 7px; padding-top: 4px;
          }
          .mf-pane-wrap .mindflow-pane-actions .mf-tool-btn {
            padding: 7px 9px; text-align: center; min-height: 32px; font-size: 13px;
          }
          .mf-pane-wrap .mindflow-pane-actions .mf-tool-btn[data-mindflow-action="workbench"],
          .mf-pane-wrap .mindflow-pane-actions .mf-tool-btn[data-mindflow-action="workspace"] {
            --mf-tone: var(--mf-blue);
          }
          .mf-pane-wrap .mindflow-pane-actions .mf-tool-btn[data-mindflow-action="ai"],
          .mf-pane-wrap .mindflow-pane-actions .mf-tool-btn[data-mindflow-action="pdf"] {
            --mf-tone: var(--mf-green);
          }
          .mf-pane-wrap .mindflow-pane-actions .mf-tool-btn[data-mindflow-action="import"],
          .mf-pane-wrap .mindflow-pane-actions .mf-tool-btn[data-mindflow-action="blank"] {
            --mf-tone: var(--mf-amber);
          }
          .mf-pane-wrap .mf-maps-section { display: flex; flex-direction: column; gap: 6px; }
          .mf-pane-wrap .mf-maps-header { display: flex; align-items: center; justify-content: space-between; }
          .mf-pane-wrap .mf-maps-title { font-weight: 600; font-size: 14px; }
          .mf-pane-wrap .mf-btn-refresh {
            background: transparent; color: var(--mf-muted); border: 0; border-radius: 4px;
            min-width: 24px; min-height: 24px; padding: 2px 5px; font-size: 14px;
          }
          .mf-pane-wrap .mf-btn-refresh:hover { background: var(--mf-hover); }
          .mf-pane-wrap .mf-maps-list { display: flex; flex-direction: column; max-height: 280px; overflow-y: auto; gap: 6px; }
          .mf-pane-wrap .mf-map-card {
            display: flex; flex-direction: column; gap: 6px; padding: 8px 10px;
            border: 1px solid var(--mf-line); border-radius: 5px;
            background: color-mix(in srgb, currentColor 2%, transparent);
          }
          .mf-pane-wrap .mf-map-card:hover { border-color: color-mix(in srgb, currentColor 24%, transparent); }
          .mf-pane-wrap .mf-map-card-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
          .mf-pane-wrap .mf-map-name { font-weight: 500; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .mf-pane-wrap .mf-map-card-meta { font-size: 12px; color: var(--mf-muted); }
          .mf-pane-wrap .mf-map-card-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 2px; }
          .mf-pane-wrap .mf-card-btn { min-height: 26px; padding: 3px 6px; font-size: 12px; }
          .mf-pane-wrap .mf-card-btn[data-l10n-id="mindflow-item-pane-card-open"] { --mf-tone: var(--mf-blue); }
          .mf-pane-wrap .mf-card-btn[data-l10n-id="mindflow-item-pane-card-export"] { --mf-tone: var(--mf-amber); }
          .mf-pane-wrap .mf-card-btn[data-l10n-id="mindflow-item-pane-card-locate"] { --mf-tone: var(--mf-green); }
          @container (max-width: 210px) {
            .mf-pane-wrap .mindflow-pane-actions { grid-template-columns: minmax(0, 1fr); }
            .mf-pane-wrap .mf-map-card-actions { grid-template-columns: minmax(0, 1fr); }
          }
        `;
        (doc.head || doc.documentElement)?.appendChild(style);
      } catch (e) {
        Zotero.logError?.('[MindFlow] Failed to inject itemPane styles: ' + e);
      }
    },

    init() {
      this._lifecycleActive = true;
      this._quitObserver = { observe: () => this.captureAllWorkspaces() };
      Services.obs.addObserver(this._quitObserver, 'quit-application-granted');
      this._shutdownSave = async () => {
        if (!this._lifecycleActive) return;
        this.captureAllWorkspaces();
        await this.drainPendingWrites();
      };
      Zotero.addShutdownListener?.(this._shutdownSave);
      try {
        const { AsyncShutdown } = ChromeUtils.importESModule('resource://gre/modules/AsyncShutdown.sys.mjs');
        this._shutdownBarrier = AsyncShutdown.profileBeforeChange;
        this._shutdownBarrier.addBlocker('MindFlow: saving workspace documents', this._shutdownSave);
      } catch (error) { Zotero.logError?.('[MindFlow] Shutdown barrier registration failed: ' + error); }
      this.initWindowListener();
      // Inject into any existing windows
      const windows = Services.wm.getEnumerator('navigator:browser');
      while (windows.hasMoreElements()) {
        const win = windows.getNext();
        this.addToWindow(win);
      }

      // Register Zotero 10 Preference Pane
      if (Zotero.PreferencePanes && typeof Zotero.PreferencePanes.register === 'function') {
        try {
          const prefSrc = this.rootURI
            ? `${this.rootURI}chrome/content/preferences.xhtml`
            : `${CHROME_ROOT}preferences.xhtml`;
          const prefScript = this.rootURI
            ? `${this.rootURI}chrome/content/scripts/preferences.js`
            : `${CHROME_ROOT}scripts/preferences.js`;
          const prefCss = this.rootURI
            ? `${this.rootURI}chrome/content/assets/preferences.css`
            : `${CHROME_ROOT}assets/preferences.css`;
          const prefIcon = this.rootURI
            ? `${this.rootURI}chrome/content/icons/mindflow.svg`
            : `${CHROME_ROOT}icons/mindflow.svg`;

          const registration = Zotero.PreferencePanes.register({
            pluginID: ADDON_ID,
            src: prefSrc,
            label: 'Zotero MindFlow',
            image: prefIcon,
            scripts: [prefScript],
            stylesheets: [prefCss],
          });
          this._preferenceRegistration = Promise.resolve(registration).then(id => {
            this._preferencePaneID = id;
            if (this._lifecycleActive === false && id) this.unregisterPreferencePane();
          }).catch(error => Zotero.logError?.('[MindFlow] Preference registration failed: ' + error));
        } catch (prefErr) {
          Zotero.log?.('[MindFlow] PreferencePanes registration note: ' + prefErr);
        }
      }

      // Use Zotero's item-pane extension API so the maps belonging to the
      // selected paper are visible alongside its native notes and attachments.
      this.registerItemPaneSection();

      Zotero.log('[MindFlow] Initialized successfully in Zotero');
    },

    resolveLiteratureTarget(item) {
      if (!item) return null;
      if (typeof item.isRegularItem === 'function' && item.isRegularItem() && !item.deleted) return item;
      if (item.parentItemID) {
        const parent = Zotero.Items.get(item.parentItemID);
        if (parent && typeof parent.isRegularItem === 'function' && parent.isRegularItem() && !parent.deleted) {
          return parent;
        }
      }
      return null;
    },

    paneText(zh, en) {
      return T(zh, en);
    },

    scheduleItemPaneRefresh(state, delay = 120) {
      if (!state || typeof state.refresh !== 'function' || state.refreshTimer) return;
      const win = state.window || (typeof window !== 'undefined' ? window : null) || Zotero.getActiveZoteroPane?.()?.window || Zotero.getMainWindow?.();
      const setTimer = typeof win?.setTimeout === 'function' ? win.setTimeout.bind(win) : setTimeout;
      state.refreshTimer = setTimer(() => {
        state.refreshTimer = null;
        if (!this._itemPaneStates?.has(state)) return;
        try { state.refresh(); } catch (_) {}
      }, delay);
    },

    cancelItemPaneRefresh(state) {
      if (!state?.refreshTimer) return;
      const win = state.window || (typeof window !== 'undefined' ? window : null) || Zotero.getActiveZoteroPane?.()?.window || Zotero.getMainWindow?.();
      try { (typeof win?.clearTimeout === 'function' ? win.clearTimeout.bind(win) : clearTimeout)(state.refreshTimer); } catch (_) {}
      state.refreshTimer = null;
    },

    resolveContextSelection(win, doc) {
      const currentWin = win || doc?.defaultView;
      if (currentWin?.ZoteroPane?.getSelectedItems) {
        const sel = currentWin.ZoteroPane.getSelectedItems();
        if (sel?.[0]) return sel[0];
      }
      if (currentWin?.ZoteroReader?.itemID) {
        const item = Zotero.Items?.get?.(currentWin.ZoteroReader.itemID);
        if (item) return item;
      }
      const activePane = Zotero.getActiveZoteroPane?.();
      if (activePane?.getSelectedItems) {
        const sel = activePane.getSelectedItems();
        if (sel?.[0]) return sel[0];
      }
      return null;
    },

    isPaneTargetEditable(target) {
      return Boolean(target && !target.deleted && (typeof target.isEditable !== 'function' || target.isEditable()));
    },

    isPanePdfAttachment(att) {
      return Boolean(att && !att.deleted && (att.isPDFAttachment?.() || att.attachmentContentType === 'application/pdf' || /\.pdf$/i.test(att.attachmentFilename || '')));
    },

    hasPaneTargetPDF(target, selectedItem) {
      if (!target) return false;
      if (selectedItem && Number(selectedItem.parentItemID) === Number(target.id) && this.isPanePdfAttachment(selectedItem)) return true;
      return Boolean(target?.getAttachments?.().some((id) => this.isPanePdfAttachment(Zotero.Items.get(id))));
    },

    createPaneTemplateSection(createEl, isEditable, T) {
      const createSection = createEl('div', 'mf-create-section');
      const sectionTitle = createEl('div', 'mf-section-title', T('快速新建导图', 'Quick create map'));
      sectionTitle.setAttribute('data-l10n-id', 'mindflow-item-pane-quick-create-title');
      createSection.appendChild(sectionTitle);
      const templateBox = createEl('div', 'mf-template-box');
      const templateRow = createEl('div', 'mf-template-row');
      const templateLabel = createEl('span', 'mf-template-label', T('导图模板', 'Template'));
      templateLabel.setAttribute('data-l10n-id', 'mindflow-item-pane-template-label');
      templateRow.appendChild(templateLabel);
      const templateSelect = createEl('select', 'mf-template-select');
      templateSelect.setAttribute('aria-label', T('导图模板', 'Map template'));
      templateSelect.setAttribute('data-l10n-id', 'mindflow-item-pane-template-select');
      for (const t of [
        { id: 'imrad', name: T('经典论文框架 (IMRaD 结构)', 'Research paper (IMRaD)') },
        { id: 'review', name: T('文献对比与综述导图', 'Literature comparison and review') },
        { id: 'critical', name: T('批判性精读导图', 'Critical reading') },
        { id: 'outline', name: T('极简结构大纲', 'Minimal outline') },
        { id: 'blank', name: T('空白思维导图', 'Blank map') },
      ]) {
        const opt = createEl('option', '', t.name);
        opt.value = t.id;
        templateSelect.appendChild(opt);
      }
      templateRow.appendChild(templateSelect);
      templateBox.appendChild(templateRow);
      templateBox.appendChild(createEl('div', 'mf-hint-text', T('选择预设学术模板，一键生成结构化文献研读导图', 'Select an academic template to generate a structured map')));
      const templateCreateBtn = createEl('button', 'mf-btn-template-create', !isEditable ? T('文献只读，无法按模板生成', 'Read-only item, cannot generate') : T('按所选模板生成导图', 'Generate map from template'));
      templateCreateBtn.setAttribute('data-l10n-id', 'mindflow-item-pane-template-create');
      templateCreateBtn.type = 'button';
      if (!isEditable) {
        templateCreateBtn.disabled = true;
        templateCreateBtn.setAttribute('aria-disabled', 'true');
        templateCreateBtn.title = T('当前文献为只读（或在回收站中）', 'This item is read-only or in Trash');
      }
      templateBox.appendChild(templateCreateBtn);
      createSection.appendChild(templateBox);
      return { createSection, templateSelect, templateCreateBtn };
    },

