                if (typeof Zotero.launchURL === 'function') {
                  Zotero.launchURL(data.url);
                } else if (typeof window.open === 'function') {
                  window.open(data.url, '_blank');
                }
              }
            } catch (err) {
              Zotero.log?.('[MindFlow] MINDFLOW_LAUNCH_URL error: ' + err);
            }
            return;
          }

          // Titles and routing data belong only to the exact sending frame.
          if ((data.type === 'MINDFLOW_SET_TAB_TITLE' || data.type === 'MINDFLOW_DOCUMENT_CONTEXT') &&
              typeof data.title === 'string' && data.title.trim()) {
            const tabs = window.Zotero_Tabs;
            const ownerTab = this.workspaceOwner(source)?.tab;
            if (ownerTab?.type === 'mindflow') {
              const displayTitle = `MindFlow - ${data.title.trim().replace(/^MindFlow - /, '').slice(0, 140)}`;
              tabs.rename?.(ownerTab.id, displayTitle);
              if (data.type === 'MINDFLOW_DOCUMENT_CONTEXT' && typeof data.documentId === 'string') {
                this.updateWorkspaceContext(source, data);
              }
            }
          }

          // D. Update Zotero preference from MindFlow UI
          if (data.type === 'MINDFLOW_SET_PREF' && Object.prototype.hasOwnProperty.call(ALLOWED_PREF_MESSAGES, data.key) && ALLOWED_PREF_MESSAGES[data.key](data.value)) {
            if (Zotero.Prefs) {
              Zotero.Prefs.set('extensions.mindflow.' + data.key, data.value, true);
              Zotero.log?.(`[MindFlow] Preference extensions.mindflow.${data.key} updated to: ${data.value}`);
            }
          }

          // E. Request opening in a standalone window or switching mode
          if (data.type === 'MINDFLOW_SET_WINDOW_MODE' && (data.targetMode === 'tab' || data.targetMode === 'window')) {
            if (Zotero.Prefs) {
              Zotero.Prefs.set('extensions.mindflow.windowMode', data.targetMode, true);
            }
            if (data.targetMode === 'window') {
              this.openStandaloneWindow({ mode: 'open' }, window);
            }
          }

          // F. Request opening Zotero Native Preferences Page (Plugin Settings Area)
          if (data.type === 'MINDFLOW_OPEN_PREFERENCES') {
            data.target === 'llm-for-zotero' ? this.openLLMPreferences() : this.openPreferencesPane(window);
          }

          // G. Request saving MindMapDocument directly to Zotero Item Attachment & Note
          if (data.type === 'MINDFLOW_SAVE_ATTACHMENT' && data.doc && typeof data.requestId === 'string') {
            const source = event.source;
            const responseOrigin = event.origin && event.origin !== 'null' ? event.origin : '*';
            const sendSaveResult = (result) => {
              try {
                if (source && typeof source.postMessage === 'function') {
                  source.postMessage({ type: 'MINDFLOW_SAVE_ATTACHMENT_RESULT', requestId: data.requestId, result }, responseOrigin);
                }
              } catch (responseError) {
                Zotero.log?.('[MindFlow] Could not return archive result to workspace: ' + responseError);
              }
            };
            this.saveMindMapToItem(data, window)
              .then(sendSaveResult)
              .catch((error) => {
                sendSaveResult({ success: false, message: `归档失败: ${error?.message || error}` });
              });
          }

          if (data.type === 'MINDFLOW_PREPARE_PAPER' && typeof data.reference === 'string' &&
              typeof data.requestId === 'string' && data.requestId.length < 100) {
            const source = event.source;
            const responseOrigin = event.origin && event.origin !== 'null' ? event.origin : '*';
            const job = { cancelled: false, cancel() { this.cancelled = true; } };
            const onWinAbort = () => job.cancel();
            winSignal?.addEventListener('abort', onWinAbort, { once: true });
            if (!this._aiJobs) this._aiJobs = new Map();
            this._aiJobs.set(data.requestId, job);
            const reply = (payload) => {
              try { source?.postMessage({ type: 'MINDFLOW_PREPARE_PAPER_RESULT', requestId: data.requestId, ...payload }, responseOrigin); }
              catch (error) { Zotero.log?.('[MindFlow] AI preparation result window closed: ' + error); }
            };
            this.preparePaperAnalysis(data.reference, {
              readingMode: data.readingMode,
              abstractSelection: data.abstractSelection,
              registerCancel: (cancel) => { job.cancel = cancel; if (job.cancelled) cancel(); },
            })
              .then((result) => reply({ result }))
              .catch((error) => reply({ error: String(error?.message || error).slice(0, 300) }))
              .finally(() => {
                winSignal?.removeEventListener('abort', onWinAbort);
                this._aiJobs?.delete(data.requestId);
              });
          }

          if (data.type === 'MINDFLOW_CANCEL_PAPER' && typeof data.requestId === 'string') {
            this._aiJobs?.get(data.requestId)?.cancel();
          }

          if (data.type === 'MINDFLOW_ANALYZE_PAPER' && typeof data.reference === 'string' &&
              typeof data.requestId === 'string' && data.requestId.length < 100) {
            const source = event.source;
            const responseOrigin = event.origin && event.origin !== 'null' ? event.origin : '*';
            const reply = (payload) => {
              try { source?.postMessage({ type: 'MINDFLOW_ANALYZE_PAPER_RESULT', requestId: data.requestId, ...payload }, responseOrigin); }
              catch (error) { Zotero.log?.('[MindFlow] AI result window closed: ' + error); }
            };
            const job = { cancelled: false, cancel() { this.cancelled = true; } };
            const onWinAbort = () => job.cancel();
            winSignal?.addEventListener('abort', onWinAbort, { once: true });
            if (!this._aiJobs) this._aiJobs = new Map();
            this._aiJobs.set(data.requestId, job);
            const progress = (phase, completed, total) => {
              try { source?.postMessage({ type: 'MINDFLOW_ANALYZE_PAPER_PROGRESS', requestId: data.requestId,
                phase, completed, total }, responseOrigin); } catch (_) {}
            };
            this.analyzePaperWithAI(data.reference, {
              preparedId: data.preparedId,
              mode: data.mode,
              sources: data.sources,
              modelEntryId: data.modelEntryId,
              reasoningLevel: data.reasoningLevel,
              templateId: data.templateId,
              customPrompt: data.customPrompt,
              onProgress: progress,
              registerCancel: (cancel) => { job.cancel = cancel; if (job.cancelled) cancel(); },
            })
              .then((result) => reply({ result }))
              .catch((error) => reply({ error: String(error?.message || error).slice(0, 300) }))
              .finally(() => {
                winSignal?.removeEventListener('abort', onWinAbort);
                this._aiJobs?.delete(data.requestId);
              });
          }
        } catch (e) {
          Zotero.log?.('[MindFlow] Message processing note: ' + e);
        }
      };
      window.addEventListener('message', handleHostMessage, winSignal ? { signal: winSignal } : undefined);
      windowElements.push({
        remove: () => window.removeEventListener('message', handleHostMessage),
      });

      // 7. Add to Main Items Toolbar (功能启动 Icon)
      const toolbarRetryState = { cancelled: false, timers: new Set() };
      windowElements.push({
        remove: () => {
          toolbarRetryState.cancelled = true;
          for (const timer of toolbarRetryState.timers) window.clearTimeout(timer);
          toolbarRetryState.timers.clear();
        },
      });
      this.injectToolbarButton(window, windowElements, 0, toolbarRetryState);

      // 8. Intercept double-click on .mindflow attachments in the library items tree to open directly in MindFlow
      try {
        const handleTreeDblClick = async (e) => {
          try {
            const pane =
              window.ZoteroPane ||
              (Zotero.getActiveZoteroPane ? Zotero.getActiveZoteroPane() : null) ||
              (Zotero.getMainWindow ? Zotero.getMainWindow().ZoteroPane : null);
            const selected = pane && typeof pane.getSelectedItems === 'function' ? pane.getSelectedItems() : [];
            if (selected && selected.length === 1) {
              const item = selected[0];
              if (isMindFlowAttachment(item)) {
                e.preventDefault?.();
                e.stopPropagation?.();
                e.stopImmediatePropagation?.();
                await this.openMindflowAttachment(item, window);
              }
            }
          } catch (_) {}
        };

        const itemsTree =
          doc.getElementById('zotero-items-tree') ||
          doc.querySelector('item-tree');
        // Never attach this shortcut to the whole document: a selected map
        // must not hijack double-clicks in the item pane or other Zotero UI.
        if (itemsTree) {
          itemsTree.addEventListener('dblclick', handleTreeDblClick, winSignal ? { capture: true, signal: winSignal } : true);
          windowElements.push({
            remove: () => itemsTree.removeEventListener('dblclick', handleTreeDblClick, true),
          });
        }
      } catch (treeErr) {
        Zotero.log?.('[MindFlow] Note on items tree dblclick listener: ' + treeErr);
      }

      injectedElements.set(window, windowElements);
    },

