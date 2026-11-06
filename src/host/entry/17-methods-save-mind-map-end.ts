
    renderNodeToHtml(node, level = 1, parentNode = null) {
      if (!node) return '';
      const indent = '  '.repeat(level);

      const isAbstractText = (str) => typeof str === 'string' && /摘要|abstract|summary/i.test(str);
      const hasAbstractChild = level === 1 && Array.isArray(node.children) && node.children.some(c => c && isAbstractText(c.text));
      const isRedundantRootAbstract = hasAbstractChild && (
        (node.note && (/(?:【文献摘要】|文献摘要|abstract|summary)/i.test(node.note))) ||
        (Array.isArray(node.children) && node.children.some(c => c && c.note && (c.note === node.note || node.note?.includes(c.note))))
      );

      const isDuplicateAbstractChild = Boolean(parentNode && isAbstractText(parentNode.text) && (
        (node.note && parentNode.note && (node.note === parentNode.note || parentNode.note.includes(node.note))) ||
        (node.text && parentNode.note && parentNode.note.startsWith(node.text.replace(/\.\.\.$/, '')))
      ));

      if (isDuplicateAbstractChild && (!node.children || node.children.length === 0)) {
        return '';
      }

      const linkLabel = T('链接', 'Link');
      let taskPrefix = '';
      let textStyle = '';
      if (node.task) {
        if (node.task.status === 'done') {
          taskPrefix = '<span style="color: #10b981; font-weight: bold; margin-right: 4px;">☑</span>';
          textStyle = 'text-decoration: line-through; opacity: 0.75;';
        } else if (node.task.status === 'doing') {
          taskPrefix = '<span style="color: #2563eb; font-weight: bold; margin-right: 4px;">⏳</span>';
        } else {
          taskPrefix = '<span style="color: #94a3b8; font-weight: bold; margin-right: 4px;">☐</span>';
        }
      }
      let tagsHtml = '';
      if (Array.isArray(node.tags) && node.tags.length > 0 && level > 1) {
        tagsHtml = ' ' + node.tags.map(t => `<span style="display: inline-block; font-size: 11px; padding: 0 4px; border-radius: 3px; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; margin-left: 3px;">#${escapeHtml(t)}</span>`).join('');
      }
      let html = `${indent}<li>${taskPrefix}<strong style="${textStyle}">${escapeHtml(node.text)}</strong>${tagsHtml}`;
      if (node.link) {
        html += ` <a href="${escapeHtml(node.link)}" style="color: #0284c7; text-decoration: none;">[${linkLabel}]</a>`;
      }
      if (node.note && !isRedundantRootAbstract && !isDuplicateAbstractChild) {
        html += `<br/><small style="color: #64748b; line-height: 1.5; display: inline-block; margin-top: 3px;">${escapeHtml(node.note)}</small>`;
      }
      if (Array.isArray(node.children) && node.children.length > 0) {
        const renderedChildren = node.children
          .map(child => this.renderNodeToHtml(child, level + 1, node))
          .filter(Boolean)
          .join('');
        if (renderedChildren) {
          html += `\n${indent}<ul>\n${renderedChildren}${indent}</ul>\n${indent}`;
        }
      }
      html += `</li>\n`;
      return html;
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

