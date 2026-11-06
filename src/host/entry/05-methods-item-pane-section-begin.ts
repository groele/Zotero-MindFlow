    registerItemPaneSection() {
      if (typeof Zotero.ItemPaneManager?.registerSection !== 'function') return;
      try {
        const sectionStates = new WeakMap();
        let renderItemPaneAsync = null;
        let lastPaneBody = null;
        let lastPaneTarget = null;
        let lastPaneActions = [];
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
            const target = this.resolveLiteratureTarget(item) || this.resolveLiteratureTarget(
              this.resolveContextSelection(win, document)
            );
            const state = sectionStates.get(body);
            if (state) {
              if (win) state.window = win;
              state.itemKey = target?.key || null;
              state.libraryID = target?.libraryID || null;
              state.targetID = target?.id || null;
              state.renderVersion++;
            }
            lastPaneTarget = target;
            for (const action of lastPaneActions) {
              if (action.id === 'ai' || action.id === 'pdf') action.button.disabled = !target || (action.id === 'pdf' && !action.hasPDF);
            }
            if (!body && lastPaneBody && renderItemPaneAsync) {
              void renderItemPaneAsync({ doc, body: lastPaneBody, item: target || item, setSectionSummary: null });
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
            const target = this.resolveLiteratureTarget(item) || this.resolveLiteratureTarget(
              this.resolveContextSelection(win, document)
            );
            lastPaneBody = body;
            lastPaneTarget = target;
            lastPaneActions = [];
            let state = sectionStates.get(body);
            if (!state) {
              state = { itemKey: target?.key || null, libraryID: target?.libraryID || null, targetID: target?.id || null, window: win, renderVersion: 0, saving: false };
              state.refresh = () => renderItemPaneAsync?.({ doc, body, item: lastPaneTarget || item, setSectionSummary });
              sectionStates.set(body, state);
              this._itemPaneStates.add(state);
            } else if (win) {
              state.window = win;
            }
            if (target && renderItemPaneAsync) {
              void renderItemPaneAsync({ doc, body, item, setSectionSummary });
              return;
            }
            const maps = target ? this.getMindflowAttachments(target) : [];
            const totalMaps = maps.length;
            setSectionSummary?.(totalMaps ? String(totalMaps) : this.paneText('展开后快速新建', 'Create quickly'));
            body.replaceChildren();
            if (state) state.paneSignature = null;

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
              const currentTarget = state?.targetID ? Zotero.Items.get(state.targetID) : null;
              primaryBtn.disabled = true;
              try {
                if (totalMaps > 0 && maps[0]) {
                  await this.openMindflowAttachment(maps[0], win);
                } else if (currentTarget) {
                  await this.openMindFlow({ mode: 'create_from_selection', items: [currentTarget], forceNew: false }, win);
                } else {
                  await this.openMindFlow({ mode: 'create_blank', forceNew: true }, win);
                }
                await state?.refresh?.();
              } catch (error) {
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
            const target = this.resolveLiteratureTarget(item) || this.resolveLiteratureTarget(
              this.resolveContextSelection(win, document)
            );
            lastPaneBody = body;
            lastPaneTarget = target;
            lastPaneActions = [];
            if (!target) return;

            const state = sectionStates.get(body);
            if (state && win) state.window = win;
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

            const signature = JSON.stringify([
              target.id, target.getField?.('title') || '', item?.id || null, this.paneText('zh', 'en'),
              maps.map(att => [att.id, att.dateModified || '', att.getField?.('title') || att.attachmentFilename || '']),
              (target.getAttachments?.() || []).length,
            ]);
            if (state && state.paneSignature === signature && body.children?.length > 0 && body.children[0]?.className === 'mf-pane-wrap') {
              lastPaneActions = state.paneActions || lastPaneActions;
              return;
            }
            if (state && renderVersion !== state.renderVersion) return;
            body.replaceChildren();
            if (state) state.paneSignature = null;

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

            const isEditable = Boolean(target && !target.deleted && (typeof target.isEditable !== 'function' || target.isEditable()));
            const statusBadge = createEl('span', `mf-status-badge ${!isEditable ? 'mf-status-readonly' : (totalMaps > 0 ? 'mf-status-active' : 'mf-status-empty')}`);
            if (!isEditable) {
              statusBadge.textContent = T('只读文献', 'Read-only');
              statusBadge.setAttribute('data-l10n-id', 'mindflow-item-pane-readonly-badge');
            } else {
              statusBadge.textContent = totalMaps > 0 ? `${T('已关联导图', 'Linked maps')} (${totalMaps})` : T('暂无导图', 'No maps yet');
              statusBadge.setAttribute('data-l10n-id', totalMaps > 0 ? 'mindflow-item-pane-linked-maps-title' : 'mindflow-item-pane-no-map');
            }
            headerTop.appendChild(statusBadge);

            const selectedPDF = item?.isPDFAttachment?.() || /\.pdf$/i.test(item?.attachmentFilename || '') ? item : null;
            const hasPDF = Boolean(selectedPDF || (target?.getAttachments?.().some(id => {
              const att = Zotero.Items.get(id);
              return att && !att.deleted && (att.isPDFAttachment?.() || att.attachmentContentType === 'application/pdf' || /\.pdf$/i.test(att.attachmentFilename || ''));
            })));

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
              primaryBtn.textContent = T('文献只读，无法新增导图', 'Read-only item, cannot add map');
              primaryBtn.title = T('当前文献为只读（或在回收站中）', 'This item is read-only or in Trash');
            } else {
              primaryBtn.textContent = totalMaps > 0 ? T('＋ 按所选模板新增导图', '＋ Add map with template') : T('＋ 一键生成文献思维导图', '＋ Create map for this item');
              primaryBtn.setAttribute('data-l10n-id', totalMaps > 0 ? 'mindflow-item-pane-add-from-template' : 'mindflow-item-pane-generate-map');
            }
            primaryBtn.addEventListener('click', async (e) => {
              e.preventDefault(); e.stopPropagation();
              if (primaryBtn.disabled) return;
              primaryBtn.disabled = true;
              try {
                const currentTarget = lastPaneTarget || target;
                if (!currentTarget) return;
                await this.openMindFlow({ mode: 'create_from_selection', items: [currentTarget], template: templateSelect.value || 'imrad', forceNew: totalMaps > 0 }, win);
                state?.refresh?.();
              } catch (err) {
                Zotero.logError?.('[MindFlow] Sidebar primary action failed: ' + err);
              } finally {
                primaryBtn.disabled = false;
              }
            });
            wrapper.appendChild(primaryBtn);

            const primaryHint = createEl('div', 'mf-add-hint', !isEditable
              ? T('当前文献为只读（或在回收站中），导图仅保存在本地工作区，不会写入附件。', 'This item is read-only or in Trash. Maps are kept in local workspace and will not be saved as attachments.')
              : T('点击即可创建思维导图并关联当前文献 · 支持双向同步', 'Click to create a mind map linked to this item · syncs automatically'));
            if (!isEditable) {
              primaryHint.setAttribute('data-l10n-id', 'mindflow-item-pane-readonly-hint');
            } else {
              primaryHint.setAttribute('data-l10n-id', 'mindflow-item-pane-choose-template-hint');
            }
            wrapper.appendChild(primaryHint);

            // 3. Quick Create Map Section (Matching TaskFlow "快速新建待办" + template + green action button)
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
            const templates = [
              { id: 'imrad', name: T('经典论文框架 (IMRaD 结构)', 'Research paper (IMRaD)') },
              { id: 'review', name: T('文献对比与综述导图', 'Literature comparison and review') },
              { id: 'critical', name: T('批判性精读导图', 'Critical reading') },
              { id: 'outline', name: T('极简结构大纲', 'Minimal outline') },
              { id: 'blank', name: T('空白思维导图', 'Blank map') },
            ];
            for (const t of templates) {
              const opt = createEl('option', '', t.name);
              opt.value = t.id;
              templateSelect.appendChild(opt);
            }
            templateRow.appendChild(templateSelect);
            templateBox.appendChild(templateRow);

            const templateDesc = createEl('div', 'mf-hint-text', T('选择预设学术模板，一键生成结构化文献研读导图', 'Select an academic template to generate a structured map'));
            templateBox.appendChild(templateDesc);

            const templateCreateBtn = createEl('button', 'mf-btn-template-create', !isEditable ? T('文献只读，无法按模板生成', 'Read-only item, cannot generate') : T('按所选模板生成导图', 'Generate map from template'));
            templateCreateBtn.setAttribute('data-l10n-id', 'mindflow-item-pane-template-create');
            templateCreateBtn.type = 'button';
            if (!isEditable) {
