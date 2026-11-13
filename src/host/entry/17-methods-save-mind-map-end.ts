
    renderNodeToHtml(node, level = 1, parentNode = null) {
      return mfNoteSync.renderNodeToHtml(node, level, parentNode);
    },

    openPreferencesPane(targetWindow) {
      try {
        const win =
          targetWindow ||
          (typeof window !== 'undefined' ? window : null) ||
          (Zotero.getMainWindow ? Zotero.getMainWindow() : null);

        // 1. Zotero.openPreferences API
        if (typeof Zotero.openPreferences === 'function') {
          Zotero.openPreferences('mindflow@groele.org');
          return;
        }

        // 2. Open preferences.xhtml dialog with pane selection
        if (win && typeof win.openDialog === 'function') {
          win.openDialog(
            'chrome://zotero/content/preferences/preferences.xhtml',
            'preferences',
            'chrome,titlebar,toolbar,centerscreen,resizable=yes',
            { pane: 'mindflow@groele.org' }
          );
          return;
        }

        // 3. Fallback via command dispatcher
        if (win && typeof win.goDoCommand === 'function') {
          win.goDoCommand('cmd_preferences');
        }
      } catch (e) {
        Zotero.logError?.('[MindFlow] Error opening preferences pane: ' + e);
      }
    },

    shutdown() {
      if (this._shutdownTask) return this._shutdownTask;
      this._lifecycleActive = false;
      this.captureAllWorkspaces();
      this._shutdownTask = this.finishShutdown();
      return this._shutdownTask;
    },

    unregisterPreferencePane() {
      const id = this._preferencePaneID;
      this._preferencePaneID = null;
      if (id) Zotero.PreferencePanes?.unregister?.(id);
    },

