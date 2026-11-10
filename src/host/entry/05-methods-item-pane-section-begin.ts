    registerItemPaneSection() {
      if (typeof Zotero.ItemPaneManager?.registerSection !== 'function') return;
      try {
        const sectionStates = new WeakMap();
        let renderItemPaneAsync = null;
        let lastPaneBody = null;
        let lastPaneTarget = null;
        let lastPaneItem = null;
        let lastPaneActions = [];
        const disablePaneActions = (target, selectedItem) => {
          const editable = this.isPaneTargetEditable(target);
          const hasPDF = target ? this.hasPaneTargetPDF(target, selectedItem) : false;
          for (const action of lastPaneActions) {
            if (action.id === 'ai') action.button.disabled = !target;
            else if (action.id === 'pdf') action.button.disabled = !target || !hasPDF;
            else if (action.id === 'create' || action.id === 'template' || action.id === 'export') {
              action.button.disabled = !target || !editable;
              if (!target || !editable) action.button.setAttribute?.('aria-disabled', 'true');
              else action.button.removeAttribute?.('aria-disabled');
            }
          }
        };
        if (!this._itemPaneStates) this._itemPaneStates = new Set();
        const icon = `${CHROME_ROOT}icons/mindflow.svg`;

        if (!this._itemPaneNotifierID && Zotero.Notifier?.registerObserver) {
          try {
            this._itemPaneNotifierID = Zotero.Notifier.registerObserver({
              notify: (event, type, ids) => {
                if (type !== 'item' || !Array.isArray(ids) || !ids.length) return;
                if (!['add', 'modify', 'delete', 'trash', 'move', 'remove', 'refresh'].includes(event)) return;
                if (!this._itemPaneStates?.size) return;
                const idSet = new Set(ids.map(Number));
                for (const state of [...this._itemPaneStates]) {
                  const targetID = Number(state.targetID);
                  // Panes without a literature target render nothing, so there is nothing to refresh.
                  if (!targetID || typeof state.refresh !== 'function') continue;
                  let relevant = event === 'delete' || event === 'refresh' || idSet.has(targetID) || idSet.size > 200;
                  if (!relevant) {
                    for (const id of idSet) {
                      const it = Zotero.Items.get(id);
                      if (it && Number(it.parentItemID) === targetID) { relevant = true; break; }
                    }
                  }
                  if (relevant) this.scheduleItemPaneRefresh(state);
                }
              },
            }, ['item'], ADDON_ID);
          } catch (error) {
            Zotero.logError?.('[MindFlow] Item pane observer registration failed: ' + error);
          }
        }

        this.itemPaneSectionID = Zotero.ItemPaneManager.registerSection({
          paneID: 'mindflow-item-pane',
          pluginID: ADDON_ID,
          header: { l10nID: 'mindflow-item-pane-header', icon },
          sidenav: { l10nID: 'mindflow-item-pane-sidenav', icon },
          onInit: ({ doc, body, item, refresh }) => {
            const document = doc || body?.ownerDocument;
            const win = doc?.defaultView || document?.defaultView || null;
            if (document) {
              this.ensureLocalization(document);
              this.ensureItemPaneStyles(document);
            }
            const target = this.resolveLiteratureTarget(item);
            const state = {
              itemKey: target?.key || null,
              libraryID: target?.libraryID || null,
              targetID: target?.id || null,
              window: win,
              renderVersion: 0,
              saving: false,
              refresh,
            };
            this._itemPaneStates.add(state);
            sectionStates.set(body, state);
            state.disposeVisibility = _globalScope.MindFlowItemPaneVisibility.connect(document, body,
              () => this._lifecycleActive !== false && this._itemPaneStates.has(state));
            const owner = body?.closest?.('collapsible-section') || body?.parentElement;
            if (owner?.removeAttribute) {
              owner.removeAttribute('empty');
              const raf = document?.defaultView?.requestAnimationFrame;
              if (typeof raf === 'function') {
                raf.call(document.defaultView, () => {
                  if (!this._itemPaneStates.has(state) || this._lifecycleActive === false) return;
                  owner.removeAttribute('empty');
                });
              }
            }
          },
          onDestroy: ({ body }) => {
            const state = sectionStates.get(body);
            if (state) {
              state.renderVersion++;
              state.disposeVisibility?.();
              this.cancelItemPaneRefresh(state);
              this._itemPaneStates.delete(state);
            }
            sectionStates.delete(body);
          },
          onItemChange: ({ doc, body, item, setEnabled }) => {
            const document = doc || body?.ownerDocument;
            const win = doc?.defaultView || document?.defaultView || null;
            const target = this.resolveLiteratureTarget(item) || (item === null ? null : this.resolveLiteratureTarget(
              this.resolveContextSelection(win, document)
            ));
            const state = sectionStates.get(body);
            if (state) {
              if (win) state.window = win;
              state.itemKey = target?.key || null;
              state.libraryID = target?.libraryID || null;
              state.targetID = target?.id || null;
              state.renderVersion++;
            }
            lastPaneTarget = target;
            lastPaneItem = target ? item : null;
            disablePaneActions(target, item);
            if (!body && lastPaneBody && target && renderItemPaneAsync) {
              void renderItemPaneAsync({ doc, body: lastPaneBody, item, setSectionSummary: null });
            }
            // Keep the section available without a literature item so users
            // can create an explicitly standalone blank map.
            setEnabled(true);
          },
          onRender: ({ doc, body, item, setSectionSummary }) => {
            if (!body) return;
            const document = doc || body.ownerDocument;
            const win = doc?.defaultView || document?.defaultView || null;
            if (document) {
              this.ensureItemPaneStyles(document);
            }
            const target = this.resolveLiteratureTarget(item) || (item === null ? null : this.resolveLiteratureTarget(
              this.resolveContextSelection(win, document)
            ));
            lastPaneBody = body;
            lastPaneTarget = target;
            lastPaneItem = target ? item : null;
            let state = sectionStates.get(body);
            if (!state) {
              state = { itemKey: target?.key || null, libraryID: target?.libraryID || null, targetID: target?.id || null, window: win, renderVersion: 0, saving: false };
              state.refresh = () => renderItemPaneAsync?.({
                doc, body,
                item: lastPaneTarget ? (lastPaneItem || lastPaneTarget) : null,
                setSectionSummary,
              });
              sectionStates.set(body, state);
              this._itemPaneStates.add(state);
            } else {
              if (win) state.window = win;
              state.itemKey = target?.key || null;
              state.libraryID = target?.libraryID || null;
              state.targetID = target?.id || null;
            }
            if (target && renderItemPaneAsync) {
              void renderItemPaneAsync({ doc, body, item, setSectionSummary });
              return;
            }
            lastPaneActions = [];
            const maps = target ? this.getMindflowAttachments(target) : [];
            const totalMaps = maps.length;
            setSectionSummary?.(totalMaps ? String(totalMaps) : this.paneText('展开后快速新建', 'Create quickly'));
            body.replaceChildren();
            if (state) {
              state.paneSignature = null;
              state.paneActions = [];
            }

            const html = 'http://www.w3.org/1999/xhtml';
            const createEl = (tag, className = '', text = null) => {
              const el = document.createElementNS ? document.createElementNS(html, tag) : document.createElement(tag);
              if (className) el.className = className;
              if (text !== null && text !== undefined) el.textContent = text;
              return el;
            };

            const fallback = createEl('div', 'mf-pane-wrap mf-pane-fallback');
            const primaryBtn = createEl('button', 'mf-btn-primary', target
              ? (totalMaps > 0 ? this.paneText('打开思维导图工作台', 'Open map workspace') : this.paneText('一键生成文献思维导图', 'Create a map for this item'))
              : this.paneText('新建空白思维导图', 'New blank map'));
            primaryBtn.type = 'button';
            primaryBtn.disabled = Boolean(state?.saving);
            primaryBtn.addEventListener('click', async () => {
              if (primaryBtn.disabled) return;
              primaryBtn.disabled = true;
              try {
                if (target && totalMaps > 0 && maps[0]) {
                  await this.openMindflowAttachment(maps[0], win);
                } else if (target) {
                  await this.openMindFlow({ mode: 'create_from_selection', items: [target], forceNew: false }, win);
                } else {
                  await this.openMindFlow({ mode: 'create_blank', forceNew: true }, win);
                }
                await state?.refresh?.();
              } finally {
                primaryBtn.disabled = false;
              }
            });
            fallback.appendChild(primaryBtn);
            body.appendChild(fallback);
          },
          onAsyncRender: renderItemPaneAsync = async ({ doc, body, item, setSectionSummary }) => {
            if (!body) return;
            const document = doc || body.ownerDocument;
            const win = doc?.defaultView || document?.defaultView || null;
            if (document) {
              this.ensureItemPaneStyles(document);
            }
            const target = this.resolveLiteratureTarget(item) || (item === null ? null : this.resolveLiteratureTarget(
              this.resolveContextSelection(win, document)
            ));
            lastPaneBody = body;
            lastPaneTarget = target;
            lastPaneItem = target ? item : null;
            if (!target) {
              disablePaneActions(null, null);
              return;
            }

            const state = sectionStates.get(body);
            if (state) {
              if (win) state.window = win;
              state.itemKey = target.key || null;
              state.libraryID = target.libraryID || null;
              state.targetID = target.id || null;
            }
            const renderVersion = state ? ++state.renderVersion : 0;
            const html = 'http://www.w3.org/1999/xhtml';
            const createEl = (tag, className = '', text = null) => {
              const el = document.createElementNS
                ? document.createElementNS(html, tag)
                : document.createElement(tag);
              if (className) el.className = className;
              if (text !== null && text !== undefined) {
                el.textContent = text;
              }
              return el;
            };

            const maps = this.getMindflowAttachments(target);
            const totalMaps = maps.length;
            const isEditable = this.isPaneTargetEditable(target);
            const hasPDF = this.hasPaneTargetPDF(target, item);

            const signature = JSON.stringify([
              target.id, target.getField?.('title') || '', item?.id || null, isEditable, hasPDF, this.paneText('zh', 'en'),
              maps.map(att => [att.id, att.dateModified || '', att.getField?.('title') || att.attachmentFilename || '']),
              (target.getAttachments?.() || []).length,
            ]);
            if (state && state.paneSignature === signature && body.children?.length > 0 && body.children[0]?.className === 'mf-pane-wrap') {
              lastPaneActions = Array.isArray(state.paneActions) ? state.paneActions : lastPaneActions;
              disablePaneActions(target, item);
              return;
            }
            if (state && renderVersion !== state.renderVersion) return;
            lastPaneActions = [];
            body.replaceChildren();
            if (state) {
              state.paneSignature = null;
              state.paneActions = [];
            }

            setSectionSummary?.(totalMaps ? String(totalMaps) : this.paneText('展开后快速新建', 'Create quickly'));

            const wrapper = createEl('div', 'mf-pane-wrap');
            const T = (zh, en) => this.paneText(zh, en);
            if (totalMaps > 0) wrapper.setAttribute('data-has-maps', 'true');
            const actionStatus = createEl('div', 'mf-action-status');
            actionStatus.setAttribute?.('role', 'status');
            wrapper.appendChild(actionStatus);

            // 1. Header Card with Status Badge (Matching TaskFlow top status)
            const headerCard = createEl('div', 'mf-header-card');
            const headerTop = createEl('div', 'mf-header-top');

            const statusBadge = createEl('span', `mf-status-badge ${!isEditable ? 'mf-status-readonly' : (totalMaps > 0 ? 'mf-status-active' : 'mf-status-empty')}`);
            if (!isEditable) {
              statusBadge.textContent = T('只读文献', 'Read-only');
              statusBadge.setAttribute('data-l10n-id', 'mindflow-item-pane-readonly-badge');
            } else {
              statusBadge.textContent = totalMaps > 0 ? `${T('已关联导图', 'Linked maps')} (${totalMaps})` : T('暂无导图', 'No maps yet');
              statusBadge.setAttribute('data-l10n-id', totalMaps > 0 ? 'mindflow-item-pane-linked-maps-title' : 'mindflow-item-pane-no-map');
            }
            headerTop.appendChild(statusBadge);

            const metaIndicator = createEl('span', 'mf-header-meta', hasPDF ? T('PDF 就绪', 'PDF ready') : T('无 PDF', 'No PDF'));
            metaIndicator.setAttribute('data-l10n-id', hasPDF ? 'mindflow-item-pane-pdf-ready' : 'mindflow-item-pane-pdf-missing');
            headerTop.appendChild(metaIndicator);
            headerCard.appendChild(headerTop);

            const paperTitle = target.getField?.('title') || this.paneText('未命名文献', 'Untitled item');
            const targetTitleEl = createEl('div', 'mf-target-title', paperTitle);
            targetTitleEl.title = paperTitle;
            headerCard.appendChild(targetTitleEl);
            wrapper.appendChild(headerCard);

            // 2. Primary Action Button (Matching TaskFlow top capsule "+ 添加到论文研读")
            const primaryBtn = createEl('button', 'mf-btn-primary');
            primaryBtn.type = 'button';
            if (!isEditable) {
              primaryBtn.disabled = true;
              primaryBtn.setAttribute('aria-disabled', 'true');
              primaryBtn.textContent = T('文献只读，无法新增导图', 'Read-only item, cannot add map');
              primaryBtn.title = T('当前文献为只读（或在回收站中）', 'This item is read-only or in Trash');
            } else {
              primaryBtn.disabled = false;
              primaryBtn.removeAttribute('aria-disabled');
              primaryBtn.textContent = totalMaps > 0 ? T('＋ 按所选模板新增导图', '＋ Add map with template') : T('＋ 一键生成文献思维导图', '＋ Create map for this item');
              primaryBtn.setAttribute('data-l10n-id', totalMaps > 0 ? 'mindflow-item-pane-add-from-template' : 'mindflow-item-pane-generate-map');
            }
            wrapper.appendChild(primaryBtn);
            lastPaneActions.push({ id: 'create', button: primaryBtn });

            const primaryHint = createEl('div', 'mf-add-hint', !isEditable
              ? T('当前文献为只读（或在回收站中），导图仅保存在本地工作区，不会写入附件。', 'This item is read-only or in Trash. Maps are kept in local workspace and will not be saved as attachments.')
              : T('点击即可创建思维导图并关联当前文献 · 支持双向同步', 'Click to create a mind map linked to this item · syncs automatically'));
            primaryHint.setAttribute('data-l10n-id', !isEditable ? 'mindflow-item-pane-readonly-hint' : 'mindflow-item-pane-choose-template-hint');
            wrapper.appendChild(primaryHint);

            // 3. Quick Create Map Section
            const { createSection, templateSelect, templateCreateBtn } = this.createPaneTemplateSection(createEl, isEditable, T);
            wrapper.appendChild(createSection);
            lastPaneActions.push({ id: 'template', button: templateCreateBtn });

            const makeGenerateHandler = (button) => async (e = {}) => {
              e.preventDefault?.(); e.stopPropagation?.();
              const currentTarget = lastPaneTarget;
              if (button.disabled || !currentTarget || !this.isPaneTargetEditable(currentTarget)) return;
              button.disabled = true;
              try {
                const currentMaps = this.getMindflowAttachments(currentTarget);
                await this.openMindFlow({
                  mode: 'create_from_selection',
                  items: [currentTarget],
                  template: templateSelect.value || 'imrad',
                  forceNew: currentMaps.length > 0,
                }, win);
                state?.refresh?.();
              } catch (err) {
                Zotero.logError?.('[MindFlow] Create map failed: ' + err);
              } finally {
                const latestTarget = lastPaneTarget;
                const latestEditable = this.isPaneTargetEditable(latestTarget);
                button.disabled = !latestTarget || !latestEditable;
                if (!latestTarget || !latestEditable) button.setAttribute?.('aria-disabled', 'true');
                else button.removeAttribute?.('aria-disabled');
              }
            };
            primaryBtn.addEventListener('click', makeGenerateHandler(primaryBtn));
            templateCreateBtn.addEventListener('click', makeGenerateHandler(templateCreateBtn));

