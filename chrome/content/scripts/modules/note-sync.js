/**
 * Zotero MindFlow - Note Sync Module
 * Synchronizes mind map attachments and Zotero child notes with read-only guards.
 */

(function (global) {
  function createNoteSyncModule(deps = {}) {
    const getZotero = () => deps.Zotero || global.Zotero;
    const getHost = () => deps.host || global.Zotero?.MindFlow;
    const getIOUtils = () => deps.IOUtils || global.IOUtils;
    const getPathUtils = () => deps.PathUtils || global.PathUtils;
    const getConstants = () => deps.constants || global.MindFlowConstants || {};

    const T = (zh, en) => {
      const constants = getConstants();
      if (typeof constants.T === 'function') return constants.T(zh, en);
      return /^en/i.test(String(getZotero()?.locale || '')) ? en : zh;
    };

    const escapeHtml = (val) => {
      const constants = getConstants();
      if (typeof constants.escapeHtml === 'function') return constants.escapeHtml(val);
      return String(val ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };

    function renderNodeToHtml(node, level = 1, parentNode = null) {
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
          .map(child => renderNodeToHtml(child, level + 1, node))
          .filter(Boolean)
          .join('');
        if (renderedChildren) {
          html += `\n${indent}<ul>\n${renderedChildren}${indent}</ul>\n${indent}`;
        }
      }
      html += `</li>\n`;
      return html;
    }

    async function exportAttachmentToNote(attachment, win) {
      if (!attachment) return;
      const Zotero = getZotero();
      const IOUtils = getIOUtils();
      const targetWindow = win || Zotero.getMainWindow?.();
      try {
        const parentID = attachment.parentItemID;
        const parentItem = parentID ? Zotero.Items.get(parentID) : null;
        if (!parentItem || parentItem.deleted || (typeof parentItem.isEditable === 'function' && !parentItem.isEditable())) {
          targetWindow?.ZoteroPane?.displayCannotEditLibraryMessage?.();
          throw new Error(T('当前文献处于只读库或回收站中，无法导出大纲笔记', 'Parent item is read-only or in Trash, cannot export outline note'));
        }
        const library = Zotero.Libraries?.get?.(parentItem.libraryID);
        if (library?.editable === false || library?.filesEditable === false) {
          targetWindow?.ZoteroPane?.displayCannotEditLibraryMessage?.();
          throw new Error(T('当前文献处于只读库或回收站中，无法导出大纲笔记', 'Parent item is read-only or in Trash, cannot export outline note'));
        }

        const path = await attachment.getFilePathAsync?.();
        if (!path || !(await IOUtils.exists(path))) {
          targetWindow?.ZoteroPane?.displayCannotEditLibraryMessage?.();
          return;
        }
        const content = await IOUtils.readUTF8(path);
        const docData = JSON.parse(content);
        if (!docData || !docData.root) {
          throw new Error('导图数据格式不正确');
        }

        const defaultTitle = T('思维导图', 'Mind Map');
        const safeTitle = escapeHtml(docData.title || attachment.getField?.('title') || defaultTitle);
        const outlineHtml = renderNodeToHtml(docData.root);
        const noteHeader = T('🧠 MindFlow 导图大纲', '🧠 MindFlow Map Outline');
        const exportTimeLabel = T('导出时间', 'Exported at');
        const noteHtml = `
          <div data-mindflow-document-id="${escapeHtml(docData.id || '')}" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <h3 style="color: #4072e5; margin-bottom: 4px;">${noteHeader}: ${safeTitle}</h3>
            <p style="color: #64748b; font-size: 11px; margin-top: 0;">${exportTimeLabel}: ${new Date().toLocaleString()}</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 8px 0;" />
            <ul style="padding-left: 20px; line-height: 1.6;">
              ${outlineHtml}
            </ul>
          </div>
        `.trim();

        let targetNote = null;
        const childItemIDs = parentItem.getNotes ? parentItem.getNotes() : [];
        for (const noteID of childItemIDs) {
          const noteItem = Zotero.Items.get(noteID);
          if (noteItem && !noteItem.deleted) {
            const currentNote = noteItem.getNote();
            if (currentNote && currentNote.includes(`data-mindflow-document-id="${docData.id}"`)) {
              targetNote = noteItem;
              break;
            }
          }
        }

        if (targetNote) {
          targetNote.setNote(noteHtml);
          await targetNote.saveTx();
        } else {
          targetNote = new Zotero.Item('note');
          targetNote.libraryID = parentItem.libraryID;
          targetNote.parentItemID = parentItem.id;
          targetNote.setNote(noteHtml);
          await targetNote.saveTx();
        }

        const alertTitle = T('大纲笔记已生成', 'Outline Note Created');
        const alertMsg = T(
          `已将思维导图《${safeTitle}》结构成功导出为文献子笔记！`,
          `Successfully exported map outline for "${safeTitle}" to a child note!`
        );
        targetWindow?.ZoteroPane?.displayAlert?.(alertTitle, alertMsg);

        let autoOpen = true;
        try {
          if (Zotero.Prefs) {
            autoOpen = Zotero.Prefs.get('extensions.mindflow.autoOpenAfterExport', true) !== false;
          }
        } catch (_) {}

        if (autoOpen && targetNote?.id && targetWindow?.ZoteroPane) {
          try {
            targetWindow.ZoteroPane.selectItem?.(targetNote.id);
          } catch (_) {}
        }
      } catch (err) {
        Zotero.logError?.('[MindFlow] exportAttachmentToNote error: ' + err);
        throw err;
      }
    }

    return {
      exportAttachmentToNote,
      renderNodeToHtml,
    };
  }

  const MindFlowNoteSync = {
    createNoteSyncModule,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MindFlowNoteSync;
  }
  global.MindFlowNoteSync = MindFlowNoteSync;
})(typeof globalThis !== 'undefined' ? globalThis : this);
