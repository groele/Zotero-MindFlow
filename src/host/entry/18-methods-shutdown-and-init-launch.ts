    async finishShutdown() {
      for (const job of this._aiJobs?.values() || []) job.cancel();
      this._aiJobs?.clear();
      // Direct injected API calls bypass the message-job map and need the same cleanup.
      for (const cancel of this._aiCancellers || []) cancel();
      this._aiCancellers?.clear();
      this._aiPrepared?.clear();
      if (this._quitObserver) {
        try { Services.obs.removeObserver(this._quitObserver,'quit-application-granted'); } catch (_) {}
        this._quitObserver = null;
      }
      if (this._shutdownBarrier && this._shutdownSave) {
        this._shutdownBarrier.removeBlocker(this._shutdownSave);
        this._shutdownBarrier = null;
      }
      for (const state of [...(this._itemPaneStates || [])]) {
        this.cancelItemPaneRefresh(state);
        state.disposeVisibility?.();
      }
      if (this._itemPaneNotifierID && Zotero.Notifier?.unregisterObserver) {
        try {
          Zotero.Notifier.unregisterObserver(this._itemPaneNotifierID);
        } catch (_) {}
        this._itemPaneNotifierID = null;
      }
      if (this.itemPaneSectionID && typeof Zotero.ItemPaneManager?.unregisterSection === 'function') {
        try {
          Zotero.ItemPaneManager.unregisterSection(this.itemPaneSectionID);
        } catch (error) {
          Zotero.logError?.('[MindFlow] Could not unregister item pane section: ' + error);
        }
        this.itemPaneSectionID = null;
      }
      if (windowListener) {
        Services.wm.removeListener(windowListener);
        windowListener = null;
      }
      for (const [win, handler] of pendingWindowLoads) {
        try {
          win.removeEventListener('load', handler, false);
        } catch (_) {}
      }
      pendingWindowLoads.clear();
      await this.drainPendingWrites();
      await this._preferenceRegistration;
      this.unregisterPreferencePane();
      for (const win of new Set(this._standaloneWindows?.values() || [])) {
        try { if (!win.closed) win.close(); }
        catch (error) { Zotero.logError?.('[MindFlow] Could not close workspace: ' + error); }
      }
      for (const [win] of injectedElements) {
        for (const tab of [...(win.Zotero_Tabs?._tabs || [])]) {
          if (tab.type === 'mindflow') {
            try { win.Zotero_Tabs.close?.(tab.id); }
            catch (error) { Zotero.logError?.('[MindFlow] Could not close workspace tab: ' + error); }
          }
        }
        this.removeFromWindow(win);
      }
      // Native close hooks may enqueue a final captured edit.
      await this.drainPendingWrites();
      injectedElements.clear();
      this._standaloneWindows?.clear();
      for (const doc of this.localizedDocs) this.removeLocalization(doc);
      if (Zotero.MindFlow === this) delete Zotero.MindFlow;
      Zotero.log('[MindFlow] Shutdown and cleaned up successfully');
    },
  };

  // Launch initial registration
  Zotero.MindFlow.init();
})();
