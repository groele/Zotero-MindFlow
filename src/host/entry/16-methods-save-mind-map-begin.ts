    async _saveMindMapToItem(data = {}, targetWindow = null) {
      try {
        const win =
          targetWindow ||
          (typeof window !== 'undefined' ? window : null) ||
          (Zotero.getMainWindow ? Zotero.getMainWindow() : null);

        const doc = data.doc;
        if (!doc?.id || !doc?.root?.id) return { success: false, message: '导图身份或结构无效；未归档' };
        validateHostDocument(doc);
        if (await this.workspaceStorage('get', { key: `mindflow_deleted_doc_${doc.id}` })) {
          return { success: false, message: '此导图已从工作区删除；已停止后台归档' };
        }
        const workspaceRaw = await this.workspaceStorage('get', { key: `mindflow_doc_${doc.id}` });
        if (workspaceRaw && (Number(JSON.parse(workspaceRaw).revision) || 0) > (Number(doc.revision) || 0)) {
          return { success: false, message: '当前导图已有更新版本；已停止过时归档，请重新保存' };
        }
        if (workspaceRaw) {
          const current = JSON.parse(workspaceRaw);
          const content = value => JSON.stringify([value.title, value.root, value.relationships || []]);
          if ((current.revision || 0) === (doc.revision || 0) && content(current) !== content(doc)) {
            return { success: false, message: '归档内容与同版本本地导图不一致；请先保存最新编辑' };
          }
        }

        const safeTitle = (String(doc.title || '思维导图')
          .replace(/[\\/:*?"<>|]/g, '_')
          .trim()
          .slice(0, 80)) || '思维导图';
        const safeTitleHtml = escapeHtml(safeTitle);
        const docToken = String(doc.id);
        if (!/^[a-zA-Z0-9_-]{1,150}$/.test(docToken)) return { success: false, message: '导图 ID 无法作为有效文件名' };
        const tempToken = `${docToken}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        let parentItem = null;

        const forceUnlinked = data.archiveToUnlinkedContainer === true;
        const explicitReference = forceUnlinked ? null :
          (data.parentItemKey || doc.metadata?.zoteroUri || doc.metadata?.zoteroItemKey);
        if (explicitReference) {
          parentItem = resolveItemReference(explicitReference, doc.metadata?.zoteroLibraryID);
          if (!parentItem) {
            const explicitDoi = normalizeDOI(explicitReference);
            if (explicitDoi) {
              parentItem = await searchItemByDoi(explicitDoi, doc.metadata?.zoteroLibraryID);
            }
          }
        }

        // Selection is a fallback only for maps without a stored association.
        let usedUnlinkedContainer = !!parentItem &&
          String(parentItem.getField?.('extra') || '') === 'MindFlow standalone maps container: mindflow@groele.org';
        if (!explicitReference && !parentItem) {
          try {
            parentItem = await this.ensureUnlinkedMapContainer();
            usedUnlinkedContainer = true;
          } catch (error) {
            return { success: false, message: `无法创建 MindFlow 独立导图位置：${error?.message || error}` };
          }
        }

        // Ensure parentItem is a regular item (if attachment, get parent)
        if (parentItem && typeof parentItem.isAttachment === 'function' && parentItem.isAttachment() && parentItem.parentItemID) {
          const realParent = Zotero.Items.get(parentItem.parentItemID);
          if (realParent) parentItem = realParent;
        }
        if (parentItem && typeof parentItem.isNote === 'function' && parentItem.isNote() && parentItem.parentItemID) {
          const realParent = Zotero.Items.get(parentItem.parentItemID);
          if (realParent) parentItem = realParent;
        }
        if (parentItem && (!parentItem.isRegularItem?.() || parentItem.deleted)) {
          parentItem = null;
        }

        let savedAttachment = false;
        let savedNote = false;
        let noteError = '';
        let savedPath = '';

        // Save to Custom Local Path if configured
        let customSavePath = '';
        try {
          if (Zotero.Prefs) {
            customSavePath = Zotero.Prefs.get('extensions.mindflow.customSavePath', true) || '';
          }
        } catch (_) {}

        if (customSavePath && typeof customSavePath === 'string') {
          customSavePath = customSavePath.trim();
          if (customSavePath) {
            try {
              const localFilePath = PathUtils.join(customSavePath, `${safeTitle}-${docToken}.mindflow`);
              const localContent = JSON.stringify(doc, null, 2);
              await IOUtils.writeUTF8(localFilePath, localContent, {
                tmpPath: `${localFilePath}.tmp`, backupFile: `${localFilePath}.bak`, flush: true,
              });
              savedPath = localFilePath;
              Zotero.log?.(`[MindFlow] Successfully saved copy to custom path: ${localFilePath}`);
            } catch (err) {
              Zotero.logError?.(`[MindFlow] Failed to write to customSavePath: ${err}`);
            }
          }
        }

        if (parentItem) {
          const isItemEditable = typeof parentItem.isEditable === 'function' ? parentItem.isEditable() : (parentItem.deleted ? false : true);
          const library = Zotero.Libraries?.get?.(parentItem.libraryID);
          if (!isItemEditable || library?.editable === false || library?.filesEditable === false) {
            return {
              success: false,
              savedPath,
              message: (!isItemEditable || library?.editable === false)
                ? '目标文献或所在群组库为只读（或已删除）；导图仅保存在本地，未写入该文献。'
                : '目标 Zotero 群组库不允许上传附件；导图仅保存在本地，未写入该文献。',
            };
          }

          const tempDir = PathUtils.join(PathUtils.tempDir, `mindflow-${tempToken}`);
          await IOUtils.makeDirectory(tempDir, { createAncestors: true, ignoreExisting: true });
          const attachmentFilename = `${safeTitle}-${docToken}.mindflow`;
          const tempPath = PathUtils.join(tempDir, attachmentFilename);
          const serializedDoc = JSON.stringify(doc, null, 2);
          await IOUtils.writeUTF8(tempPath, serializedDoc);

          // Filenames and titles are display fields, never document identity.
          let existingAtt = null;
          let archivedAtt = null;
          try {
            const sourceKey = forceUnlinked ? null : doc.metadata?.zoteroAttachmentKey;
            const sourceLibrary = doc.metadata?.zoteroAttachmentLibraryID;
            if (sourceKey) {
              existingAtt = resolveItemReference(sourceKey, sourceLibrary);
              if (!existingAtt || !isMindFlowAttachment(existingAtt) ||
                  existingAtt.parentItemID !== parentItem.id || existingAtt.libraryID !== parentItem.libraryID) {
                throw new Error('原导图附件已删除、移走或与目标文献不一致；已停止归档');
              }
            } else {
              const matches = [];
              for (const att of this.getMindflowAttachments(parentItem)) {
                const path = await att.getFilePathAsync?.();
                if (!path || !await IOUtils.exists(path)) continue;
                try {
                  if (JSON.parse(await IOUtils.readUTF8(path))?.id === doc.id) matches.push(att);
                } catch (_) {}
              }
              if (matches.length > 1) throw new Error('此文献有多份相同文档 ID 的附件；请明确打开其中一份再归档');
              existingAtt = matches[0] || null;
            }
            if (existingAtt) {
              const path = await existingAtt.getFilePathAsync?.();
              if (!path || !await IOUtils.exists(path)) throw new Error('已有导图附件未下载；请先下载再更新');
              const original = JSON.parse(await IOUtils.readUTF8(path));
              if (original.updatedAt > doc.updatedAt && JSON.stringify(original.root) !== JSON.stringify(doc.root)) {
                throw new Error('附件包含较新的编辑；已停止覆盖，请重新打开后核对');
              }
            }
          } catch (error) {
            await IOUtils.remove(tempDir, { recursive: true });
            return { success: false, message: error.message };
          }

          // 2. Update existing attachment or create a new one
          if (existingAtt) {
            try {
              let updated = false;
              const targetPath = await existingAtt.getFilePathAsync?.();
              if (targetPath) {
                const parentDir = PathUtils.parent(targetPath);
                await IOUtils.makeDirectory(parentDir, { createAncestors: true, ignoreExisting: true });
                await IOUtils.writeUTF8(targetPath, serializedDoc, {
                  tmpPath: `${targetPath}.tmp`,
                  backupFile: `${targetPath}.bak`,
                  flush: true,
                });
                updated = true;
              } else if (typeof existingAtt.relinkAttachmentFile === 'function') {
                updated = await existingAtt.relinkAttachmentFile(tempPath);
              }
              if (updated) {
                if (Number(existingAtt.parentItemID) !== Number(parentItem.id)) {
                  existingAtt.parentItemID = parentItem.id;
                }
                const newTitle = `${attachmentFilename} (MindFlow 导图源文件)`;
                if (existingAtt.getField?.('title') !== newTitle) {
                  existingAtt.setField('title', newTitle);
                }
                existingAtt.attachmentSynced = false;
                existingAtt.attachmentHash = null;
                await existingAtt.saveTx();
                archivedAtt = existingAtt;
                savedAttachment = true;
              }
            } catch (updateErr) {
              noteError = `已有导图附件更新受阻: ${updateErr?.message || updateErr}`;
              Zotero.logError?.('[MindFlow] Existing attachment update failed: ' + updateErr);
            }
          }

          if (!savedAttachment && !existingAtt) {
            try {
              const newAtt = await Zotero.Attachments.importFromFile({
                file: tempPath,
                parentItemID: parentItem.id,
                libraryID: parentItem.libraryID,
                title: `${attachmentFilename} (MindFlow 导图源文件)`,
                contentType: 'application/json',
              });
              if (newAtt) {
                if (Number(newAtt.parentItemID) !== Number(parentItem.id)) {
                  newAtt.parentItemID = parentItem.id;
                  await newAtt.saveTx();
                }
                try {
                  const freshParent = Zotero.Items.get(parentItem.id);
                  if (freshParent && typeof freshParent.getAttachments === 'function') {
                    freshParent.getAttachments(true);
                  }
                } catch (_) {}
                archivedAtt = newAtt;
                savedAttachment = true;
              } else {
                throw new Error('Zotero 未返回新建的导图附件条目');
              }
            } catch (importErr) {
              noteError = `附件未能归属到目标文献: ${importErr?.message || importErr}`;
              Zotero.logError?.('[MindFlow] Zotero import failed: ' + importErr);
            }
          }

          if (savedAttachment) {
            try {
              const path = await archivedAtt.getFilePathAsync?.();
              const parentAttachments = Zotero.Items.get(parentItem.id)?.getAttachments?.() || [];
              if (archivedAtt.parentItemID !== parentItem.id || archivedAtt.libraryID !== parentItem.libraryID ||
                  !parentAttachments.includes(archivedAtt.id) || !path || !await IOUtils.exists(path) ||
                  await IOUtils.readUTF8(path) !== serializedDoc) throw new Error('附件归属或写后回读校验失败');
            } catch (error) {
              savedAttachment = false;
              noteError = `附件未通过验证：${error.message}`;
              if (!existingAtt) {
                try { await archivedAtt.eraseTx?.(); } catch (_) {}
              }
            }
          }

          // Clean up temp staging file
          try { await IOUtils.remove(tempPath); } catch (_) {}
          try { await IOUtils.remove(tempDir, { recursive: true }); } catch (_) {}

          // 3. Create or update structured outline child note
          let shouldCreateNote = !usedUnlinkedContainer;
          try {
            if (Zotero.Prefs) {
              shouldCreateNote = shouldCreateNote && Zotero.Prefs.get('extensions.mindflow.autoArchiveToItem', true) !== false;
            }
          } catch (_) {}

          if (shouldCreateNote && savedAttachment) {
            try {
              const noteHeader = T('MindFlow 导图大纲', 'MindFlow Map Outline');
              const lastArchivedLabel = T('最后归档', 'Last archived');
              const attachmentNotice = T('已挂载 .mindflow 源文件附件；跨设备可用性取决于 Zotero 文件同步设置', 'Mounted .mindflow source attachment; cross-device availability depends on Zotero sync settings');
              const noteHtml = `
                <div data-mindflow-document-id="${escapeHtml(doc.id || '')}" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  <h3 style="color: #0284c7;">${noteHeader}: ${safeTitleHtml}</h3>
                  <p style="color: #64748b; font-size: 11px;">${lastArchivedLabel}: ${new Date().toLocaleString()}</p>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 8px 0;" />
                  <ul>
                    ${this.renderNodeToHtml(doc.root)}
                  </ul>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 8px 0;" />
                  <p style="font-size: 11px; color: #94a3b8;">${attachmentNotice}</p>
                </div>
              `.trim();

              let existingNote = null;
              if (typeof parentItem.getNotes === 'function') {
                const noteIds = parentItem.getNotes(true);
                for (const nId of noteIds) {
                  const n = Zotero.Items.get(nId);
                  if (n && n.isNote && n.isNote()) {
                    const text = n.getNote ? n.getNote() : '';
                    const docIdMarker = escapeHtml(doc.id || '');
                    const hasDocumentMarker = docIdMarker && text.includes(`data-mindflow-document-id="${docIdMarker}"`);
                    if (hasDocumentMarker) {
                      existingNote = n;
                      break;
                    }
                  }
                }
              }

              if (existingNote) {
                existingNote.setNote(noteHtml);
                await existingNote.saveTx();
              } else {
                const noteItem = new Zotero.Item('note');
                noteItem.libraryID = parentItem.libraryID;
                noteItem.parentItemID = parentItem.id;
                noteItem.setNote(noteHtml);
                await noteItem.saveTx();
              }
              savedNote = true;
            } catch (noteErr) {
              noteError = noteErr?.message || String(noteErr);
              Zotero.logError?.('[MindFlow] Failed to create or update child note: ' + noteErr);
            }
          }

          const itemTitle = (typeof parentItem.getField === 'function' ? parentItem.getField('title') : parentItem.title) || '文献条目';
          const completedTargets = [
            savedAttachment ? `子附件：${safeTitle}-${docToken}.mindflow` : '',
            savedNote ? '子笔记：导图结构化大纲' : '',
            savedPath ? `本地备份：${savedPath}` : '',
          ].filter(Boolean);
          const success = savedAttachment;
          const locationLabel = usedUnlinkedContainer ? '独立导图位置' : '文献';
          const successMsg = `${success ? '归档完成' : '附件归档失败'}：${locationLabel}【${itemTitle.length > 25 ? itemTitle.slice(0, 25) + '...' : itemTitle}】${completedTargets.length ? `\n- ${completedTargets.join('\n- ')}` : ''}${noteError ? `\n- ${noteError}` : ''}`;

          return { success, message: successMsg, parentItemTitle: itemTitle, savedPath,
            parentItemUri: itemSelectUri(parentItem), parentLibraryID: parentItem.libraryID,
            attachmentKey: savedAttachment ? archivedAtt.key : undefined,
            attachmentLibraryID: savedAttachment ? archivedAtt.libraryID : undefined,
            usedUnlinkedContainer, noteRequested: shouldCreateNote, savedNote, noteError };
        } else {
          // If no parent item found
          let msg = '';
          if (savedPath) {
            msg = `已保存本地备份，但未归档至 Zotero 文献附件：\n${savedPath}\n\n请确认目标文献仍存在，并且所在文献库可编辑。`;
          } else {
            msg = explicitReference
              ? '未找到关联的 Zotero 文献条目；未向当前选中的其他文献归档。请检查原条目是否已删除或当前文献库是否可用。'
              : '未确定唯一的 Zotero 文献归档目标，且未设置本地备份目录。请先仅选中一篇目标文献。';
          }
          return { success: false, message: msg, savedPath };
        }
      } catch (err) {
        Zotero.logError?.('[MindFlow] saveMindMapToItem error: ' + err);
        return { success: false, message: '保存失败: ' + err };
      }
    },
