            // Divider before action grid
            wrapper.appendChild(createEl('div', 'mf-divider'));

            // 4. Action Buttons Grid (2 Columns, matching TaskFlow td-action-grid)
            const toolsGrid = createEl('div', 'mindflow-pane-actions');

            const toolWorkbench = createEl('button', 'mf-tool-btn', T('导图工作台', 'Workspace'));
            toolWorkbench.type = 'button';
            toolWorkbench.setAttribute('data-l10n-id', 'mindflow-item-pane-action-workbench');
            toolWorkbench.setAttribute('data-mindflow-action', 'workbench');
            toolWorkbench.title = T('进入 MindFlow 总工作台，查看和管理已有导图', 'Open the MindFlow workspace to browse and manage maps');
            toolWorkbench.addEventListener('click', async (e = {}) => {
              e.preventDefault?.(); e.stopPropagation?.();
              if (toolWorkbench.disabled) return;
              toolWorkbench.disabled = true;
              try {
                await this.openMindFlow({ mode: 'open', targetMode: 'tab' }, win);
              } catch (error) {
                Zotero.logError?.('[MindFlow] Open workbench failed: ' + error);
                actionStatus.textContent = this.paneText('操作失败，请重试。', 'The action failed. Please try again.');
              } finally {
                toolWorkbench.disabled = false;
              }
            }, listenerOpts);
            toolsGrid.appendChild(toolWorkbench);

            const toolSubwin = createEl('button', 'mf-tool-btn', T('伴读窗口', 'Companion'));
            toolSubwin.setAttribute('data-l10n-id', 'mindflow-item-pane-action-companion');
            toolSubwin.type = 'button';
            toolSubwin.setAttribute?.('data-mindflow-action', 'workspace');
            toolSubwin.title = T('打开轻量独立窗口，适合与 PDF 左右分屏伴读对照', 'Open a compact window to read side by side with the PDF');
            toolSubwin.addEventListener('click', (e = {}) => {
              e.preventDefault?.(); e.stopPropagation?.();
              try {
                const currentTarget = lastPaneTarget;
                const currentMaps = currentTarget ? this.getMindflowAttachments(currentTarget) : [];
                if (currentMaps.length > 0 && currentMaps[0]) {
                  this.openMindflowAttachment(currentMaps[0], win);
                } else {
                  this.openMindFlow({ mode: 'open' }, win);
                }
              } catch (err) {
                Zotero.logError?.('[MindFlow] Open standalone window failed: ' + err);
              }
            }, listenerOpts);
            toolsGrid.appendChild(toolSubwin);

            const toolAi = createEl('button', 'mf-tool-btn', T('AI 论文精读', 'AI Reading'));
            toolAi.setAttribute('data-l10n-id', 'mindflow-item-pane-action-ai');
            toolAi.type = 'button';
            toolAi.disabled = false;
            toolAi.setAttribute?.('data-mindflow-action', 'ai');
            toolAi.title = T('为本文献启动 AI 智能精读与思维导图生成', 'Start AI reading and map generation for this item');
            toolAi.addEventListener('click', async (e = {}) => {
              e.preventDefault?.(); e.stopPropagation?.();
              const currentTarget = lastPaneTarget;
              if (toolAi.disabled || !currentTarget) return;
              toolAi.disabled = true;
              try {
                await this.openMindFlow({ mode: 'ai_analyze', items: [currentTarget] }, win);
              } catch (err) {
                Zotero.logError?.('[MindFlow] AI analyze action failed: ' + err);
                actionStatus.textContent = this.paneText('操作失败，请重试。', 'The action failed. Please try again.');
              } finally {
                toolAi.disabled = !lastPaneTarget;
              }
            }, listenerOpts);
            toolsGrid.appendChild(toolAi);
            lastPaneActions.push({ id: 'ai', button: toolAi, hasPDF: true });

            if (hasPDF) {
              const toolPdf = createEl('button', 'mf-tool-btn mf-tool-btn-pdf', T('打开 PDF', 'Open PDF'));
              toolPdf.setAttribute('data-l10n-id', 'mindflow-item-pane-action-pdf');
              toolPdf.type = 'button';
              toolPdf.disabled = false;
              toolPdf.setAttribute?.('data-mindflow-action', 'pdf');
              toolPdf.title = T('在 Zotero 内置阅读器中打开本文献的 PDF 全文', 'Open this item\'s PDF in the Zotero reader');
              toolPdf.addEventListener('click', async (e = {}) => {
                e.preventDefault?.(); e.stopPropagation?.();
                const currentTarget = lastPaneTarget;
                if (toolPdf.disabled || !currentTarget) return;
                const currentItem = lastPaneItem;
                const pdfTarget = currentItem && Number(currentItem.parentItemID) === Number(currentTarget.id) && this.isPanePdfAttachment(currentItem)
                  ? currentItem
                  : currentTarget;
                toolPdf.disabled = true;
                try {
                  if (!await openPDFForItem(pdfTarget, win)) throw new Error('PDF could not be opened');
                  actionStatus.textContent = '';
                  actionStatus.removeAttribute('data-l10n-id');
                } catch (error) {
                  Zotero.logError?.('[MindFlow] Sidebar PDF open failed: ' + error);
                  actionStatus.textContent = T('无法打开 PDF，请检查附件是否已下载。', 'Unable to open the PDF. Check that the attachment has been downloaded.');
                  actionStatus.setAttribute('data-l10n-id', 'mindflow-item-pane-pdf-open-failed');
                } finally {
                  const latestTarget = lastPaneTarget;
                  toolPdf.disabled = !latestTarget || !this.hasPaneTargetPDF(latestTarget, lastPaneItem);
                }
              }, listenerOpts);
              toolsGrid.appendChild(toolPdf);
              lastPaneActions.push({ id: 'pdf', button: toolPdf, hasPDF: true });
            }

            const toolImport = createEl('button', 'mf-tool-btn', T('导入导图', 'Import Map'));
            toolImport.setAttribute('data-l10n-id', 'mindflow-item-pane-action-import');
            toolImport.type = 'button';
            toolImport.disabled = false;
            toolImport.setAttribute?.('data-mindflow-action', 'import');
            toolImport.title = T('导入 MindFlow、JSON、Markdown 或 OPML 导图文件', 'Import a MindFlow, JSON, Markdown, or OPML map file');
            toolImport.addEventListener('click', async (e = {}) => {
              e.preventDefault?.(); e.stopPropagation?.();
              await this.openMindFlow({ mode: 'import_file' }, win);
            }, listenerOpts);
            toolsGrid.appendChild(toolImport);

            const toolBlank = createEl('button', 'mf-tool-btn', T('独立空白导图', 'Blank Map'));
            toolBlank.setAttribute('data-l10n-id', 'mindflow-item-pane-action-blank');
            toolBlank.type = 'button';
            toolBlank.disabled = false;
            toolBlank.setAttribute?.('data-mindflow-action', 'blank');
            toolBlank.title = T('新建不绑定本文献的独立空白思维导图', 'Create a blank map that is not linked to this item');
            toolBlank.addEventListener('click', async (e = {}) => {
              e.preventDefault?.(); e.stopPropagation?.();
              await this.openMindFlow({ mode: 'create_blank', forceNew: true }, win);
            }, listenerOpts);
            toolsGrid.appendChild(toolBlank);
            wrapper.appendChild(toolsGrid);

            // 5. Maps Section or Empty Guide
            if (totalMaps > 0) {
              const mapsSection = createEl('div', 'mf-maps-section');
              const mapsHeader = createEl('div', 'mf-maps-header');
              mapsHeader.appendChild(createEl('span', 'mf-maps-title', `${T('关联导图', 'Linked maps')} (${totalMaps})`));

              const refreshBtn = createEl('button', 'mf-btn-refresh', '↻');
              refreshBtn.type = 'button';
              refreshBtn.title = T('刷新列表', 'Refresh list');
              refreshBtn.setAttribute('aria-label', refreshBtn.title);
              refreshBtn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                state?.refresh?.();
              }, listenerOpts);
              mapsHeader.appendChild(refreshBtn);
              mapsSection.appendChild(mapsHeader);

              const mapsList = createEl('div', 'mf-maps-list');
              if (maps[0]) {
                const firstTitle = String(maps[0].getField?.('title') || maps[0].attachmentFilename || T('思维导图', 'Mind map'))
                  .replace(/\s*\(MindFlow\s*导图源文件\)$/i, '')
                  .replace(/\.mindflow$/i, '').trim();
                mapsList.title = T(`打开导图：${firstTitle}`, `Open map: ${firstTitle}`);
                mapsList.addEventListener('click', (e = {}) => {
                  if (e.target?.closest?.('button')) return;
                  this.openMindflowAttachment(maps[0], win);
                }, listenerOpts);
              }
              for (const att of maps) {
                const rawTitle = att.getField?.('title') || att.attachmentFilename || T('思维导图', 'Mind map');
                const cleanTitle = String(rawTitle)
                  .replace(/\s*\(MindFlow\s*导图源文件\)$/i, '')
                  .replace(/\.mindflow$/i, '')
                  .trim() || String(rawTitle);

                const card = createEl('div', 'mf-map-card');
                card.title = T(`打开导图：${cleanTitle}`, `Open map: ${cleanTitle}`);
                card.addEventListener('click', (e) => {
                  if (e?.target?.closest?.('button')) return;
                  e?.preventDefault?.();
                  e?.stopPropagation?.();
                  this.openMindflowAttachment(att, win);
                }, listenerOpts);

                const cardTop = createEl('div', 'mf-map-card-top');
                const cardName = createEl('span', 'mf-map-name', cleanTitle);
                cardName.title = cleanTitle;
                cardTop.appendChild(cardName);
                card.appendChild(cardTop);

                if (att.dateModified) {
                  try {
                    const d = new Date(att.dateModified);
                    const metaTime = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                    card.appendChild(createEl('div', 'mf-map-card-meta', T(`修改于：${metaTime}`, `Modified ${metaTime}`)));
                  } catch (_) {}
                }

                const cardActions = createEl('div', 'mf-map-card-actions');

                const openBtn = createEl('button', 'mf-card-btn mf-card-btn-primary', T('打开', 'Open'));
                openBtn.setAttribute('data-l10n-id', 'mindflow-item-pane-card-open');
                openBtn.type = 'button';
                openBtn.title = T('在工作台中打开并编辑此思维导图', 'Open and edit this map in the workspace');
                openBtn.addEventListener('click', async (e) => {
                  e.preventDefault(); e.stopPropagation();
                  if (openBtn.disabled) return;
                  openBtn.disabled = true;
                  try {
                    await this.openMindflowAttachment(att, win);
                  } catch (err) {
                    Zotero.logError?.('[MindFlow] Open map attachment failed: ' + err);
                  } finally {
                    openBtn.disabled = false;
                  }
                }, listenerOpts);
                cardActions.appendChild(openBtn);

                const exportBtn = createEl('button', 'mf-card-btn', T('导出大纲', 'Export Outline'));
                exportBtn.setAttribute('data-l10n-id', 'mindflow-item-pane-card-export');
                exportBtn.type = 'button';
                if (!isEditable) {
                  exportBtn.disabled = true;
                  exportBtn.setAttribute('aria-disabled', 'true');
                  exportBtn.title = T('当前文献处于只读库或回收站中，无法导出大纲笔记', 'Parent item is read-only or in Trash, cannot export outline note');
                  exportBtn.setAttribute('aria-label', exportBtn.title);
                } else {
                  exportBtn.removeAttribute('aria-disabled');
                  exportBtn.title = T('将思维导图结构一键导出为 Zotero 文献子笔记', 'Export the map outline as a Zotero child note');
                }
                exportBtn.addEventListener('click', async (e) => {
                  e.preventDefault(); e.stopPropagation();
                  const currentTarget = lastPaneTarget;
                  const currentEditable = this.isPaneTargetEditable(currentTarget);
                  if (exportBtn.disabled || !currentTarget || !currentEditable) return;
                  exportBtn.disabled = true;
                  try {
                    await this.exportAttachmentToNote(att, win);
                  } catch (err) {
                    Zotero.logError?.('[MindFlow] Export attachment to note failed: ' + err);
                  } finally {
                    const latestTarget = lastPaneTarget;
                    const latestEditable = this.isPaneTargetEditable(latestTarget);
                    exportBtn.disabled = !latestTarget || !latestEditable;
                    if (latestTarget && latestEditable) exportBtn.removeAttribute('aria-disabled');
                    else exportBtn.setAttribute('aria-disabled', 'true');
                  }
                }, listenerOpts);
                cardActions.appendChild(exportBtn);
                lastPaneActions.push({ id: 'export', button: exportBtn });

                const locateBtn = createEl('button', 'mf-card-btn', T('定位附件', 'Locate Attachment'));
                locateBtn.setAttribute('data-l10n-id', 'mindflow-item-pane-card-locate');
                locateBtn.type = 'button';
                locateBtn.title = T('在文献库列表中定位并选中此思维导图附件', 'Select this map attachment in the item list');
                locateBtn.addEventListener('click', (e) => {
                  e.preventDefault(); e.stopPropagation();
                  try {
                    const mainWin = Zotero.getMainWindow?.();
                    mainWin?.ZoteroPane?.selectItem?.(att.id);
                  } catch (err) {
                    Zotero.logError?.('[MindFlow] Locate attachment failed: ' + err);
                  }
                }, listenerOpts);
                cardActions.appendChild(locateBtn);

                card.appendChild(cardActions);
                mapsList.appendChild(card);
              }
              mapsSection.appendChild(mapsList);
              wrapper.appendChild(mapsSection);
            }
            body.appendChild(wrapper);
            if (state) { state.paneSignature = signature; state.paneActions = lastPaneActions; }
          },
        });
      } catch (error) {
        Zotero.logError?.('[MindFlow] Could not register ItemPane section: ' + error);
      }
    },

    async exportAttachmentToNote(attachment, win) {
      return mfNoteSync.exportAttachmentToNote(attachment, win);
    },

    initWindowListener() {
      windowListener = {
        onOpenWindow: (xulWindow) => {
          let domWindow;
          try {
            domWindow = xulWindow
              .QueryInterface(Ci.nsIInterfaceRequestor)
              .getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
          } catch (_) {
            return;
          }
          const onLoad = () => {
            domWindow.removeEventListener('load', onLoad, false);
            pendingWindowLoads.delete(domWindow);
            if (!domWindow.closed && this._lifecycleActive !== false) {
              const winType = domWindow.document?.documentElement?.getAttribute?.('windowtype');
              if (winType && winType !== 'navigator:browser') {
                return;
              }
              Zotero.MindFlow?.addToWindow(domWindow);
            }
          };
          pendingWindowLoads.set(domWindow, onLoad);
          domWindow.addEventListener('load', onLoad, { once: true });
          if (domWindow.document?.readyState === 'complete') onLoad();
        },
        onCloseWindow: (xulWindow) => {
          try {
            const domWindow = xulWindow
              .QueryInterface(Ci.nsIInterfaceRequestor)
              .getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
            const onLoad = pendingWindowLoads.get(domWindow);
            if (onLoad) domWindow.removeEventListener('load', onLoad, false);
            pendingWindowLoads.delete(domWindow);
            Zotero.MindFlow?.removeFromWindow(domWindow);
          } catch (_) {}
        },
        onWindowTitleChange: () => {},
      };
      Services.wm.addListener(windowListener);
    },

