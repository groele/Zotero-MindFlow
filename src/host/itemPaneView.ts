/**
 * Zotero MindFlow - ItemPane DOM View & Interactive Actions
 */

import { makeElementFactory } from './itemPaneDom.js';
export { renderItemPaneFallback } from './itemPaneFallback.js';

export async function renderItemPaneContent(opts: {
  document: any;
  body: any;
  target: any;
  item: any;
  state: any;
  host: any;
  win: any;
  Zotero: any;
  T: (zh: string, en: string) => string;
  setSectionSummary?: (summary: string) => void;
  lastPaneTargetRef: { current: any };
  lastPaneActions: any[];
}): Promise<void> {
  const { document, body, target, item, state, host, win, Zotero, T, setSectionSummary, lastPaneTargetRef, lastPaneActions } = opts;
  const createEl = makeElementFactory(document);

  const maps = host.getMindflowAttachments(target);
  const totalMaps = maps.length;

  const signature = JSON.stringify([
    target.id, target.getField?.('title') || '', item?.id || null, host.paneText('zh', 'en'),
    maps.map((att: any) => [att.id, att.dateModified || '', att.getField?.('title') || att.attachmentFilename || '']),
    (target.getAttachments?.() || []).length,
  ]);
  if (state && state.paneSignature === signature && body.children?.length > 0 && body.children[0]?.className === 'mf-pane-wrap') {
    return;
  }
  body.replaceChildren();
  if (state) state.paneSignature = null;

  setSectionSummary?.(totalMaps ? String(totalMaps) : host.paneText('展开后快速新建', 'Create quickly'));

  const wrapper = createEl('div', 'mf-pane-wrap');
  if (totalMaps > 0) wrapper.setAttribute('data-has-maps', 'true');
  const actionStatus = createEl('div', 'mf-action-status');
  actionStatus.setAttribute?.('role', 'status');
  wrapper.appendChild(actionStatus);

  // 1. Header Card with Status Badge
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
  const hasPDF = Boolean(selectedPDF || (target?.getAttachments?.().some((id: any) => {
    const att = Zotero.Items.get(id);
    return att && !att.deleted && (att.isPDFAttachment?.() || att.attachmentContentType === 'application/pdf' || /\.pdf$/i.test(att.attachmentFilename || ''));
  })));

  const metaIndicator = createEl('span', 'mf-header-meta', hasPDF ? T('PDF 就绪', 'PDF ready') : T('无 PDF', 'No PDF'));
  metaIndicator.setAttribute('data-l10n-id', hasPDF ? 'mindflow-item-pane-pdf-ready' : 'mindflow-item-pane-pdf-missing');
  headerTop.appendChild(metaIndicator);
  headerCard.appendChild(headerTop);

  const paperTitle = target.getField?.('title') || host.paneText('未命名文献', 'Untitled item');
  const targetTitleEl = createEl('div', 'mf-target-title', paperTitle);
  targetTitleEl.title = paperTitle;
  headerCard.appendChild(targetTitleEl);
  wrapper.appendChild(headerCard);

  // 2. Primary Action Button
  const primaryBtn = createEl('button', 'mf-btn-primary');
  primaryBtn.type = 'button';
  if (!isEditable) {
    primaryBtn.disabled = true;
    primaryBtn.setAttribute('aria-disabled', 'true');
    primaryBtn.textContent = T('文献只读，无法新增导图', 'Read-only item, cannot add map');
    primaryBtn.title = T('当前文献为只读（或在回收站中）', 'This item is read-only or in Trash');
  } else {
    primaryBtn.removeAttribute('aria-disabled');
    primaryBtn.textContent = totalMaps > 0 ? T('＋ 按所选模板新增导图', '＋ Add map with template') : T('＋ 一键生成文献思维导图', '＋ Create map for this item');
    primaryBtn.setAttribute('data-l10n-id', totalMaps > 0 ? 'mindflow-item-pane-add-from-template' : 'mindflow-item-pane-generate-map');
  }
  wrapper.appendChild(primaryBtn);

  const primaryHint = createEl('div', 'mf-add-hint', !isEditable
    ? T('当前文献为只读（或在回收站中），导图仅保存在本地工作区，不会写入附件。', 'This item is read-only or in Trash. Maps are kept in local workspace and will not be saved as attachments.')
    : T('点击即可创建思维导图并关联当前文献 · 支持双向同步', 'Click to create a mind map linked to this item · syncs automatically'));
  primaryHint.setAttribute('data-l10n-id', !isEditable ? 'mindflow-item-pane-readonly-hint' : 'mindflow-item-pane-choose-template-hint');
  wrapper.appendChild(primaryHint);

  // 3. Quick Create Map Section
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
    (opt as HTMLOptionElement).value = t.id;
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
    templateCreateBtn.disabled = true;
    templateCreateBtn.setAttribute('aria-disabled', 'true');
    templateCreateBtn.title = T('当前文献为只读（或在回收站中）', 'This item is read-only or in Trash');
  }
  templateBox.appendChild(templateCreateBtn);
  createSection.appendChild(templateBox);
  wrapper.appendChild(createSection);

  const onGenerate = async (e: any) => {
    e.preventDefault(); e.stopPropagation();
    if (!isEditable) return;
    try {
      const currentTarget = lastPaneTargetRef.current || target;
      if (!currentTarget) return;
      await host.openMindFlow({ mode: 'create_from_selection', items: [currentTarget], template: (templateSelect as any).value || 'imrad', forceNew: totalMaps > 0 }, win);
      state?.refresh?.();
    } catch (err) {
      Zotero.logError?.('[MindFlow] Create map failed: ' + err);
    }
  };
  primaryBtn.addEventListener('click', onGenerate);
  templateCreateBtn.addEventListener('click', onGenerate);

  wrapper.appendChild(createEl('div', 'mf-divider'));

  // 4. Action Buttons Grid
  const toolsGrid = createEl('div', 'mindflow-pane-actions');

  const toolWorkbench = createEl('button', 'mf-tool-btn', T('导图工作台', 'Workspace'));
  toolWorkbench.type = 'button';
  toolWorkbench.setAttribute('data-l10n-id', 'mindflow-item-pane-action-workbench');
  toolWorkbench.setAttribute('data-mindflow-action', 'workbench');
  toolWorkbench.title = T('进入 MindFlow 总工作台，查看和管理已有导图', 'Open the MindFlow workspace to browse and manage maps');
  toolWorkbench.addEventListener('click', async (e: any = {}) => {
    e.preventDefault?.(); e.stopPropagation?.();
    try {
      await host.openMindFlow({ mode: 'open', targetMode: 'tab' }, win);
    } catch (error) {
      Zotero.logError?.('[MindFlow] Open workbench failed: ' + error);
      actionStatus.textContent = host.paneText('操作失败，请重试。', 'The action failed. Please try again.');
    }
  });
  toolsGrid.appendChild(toolWorkbench);

  const toolSubwin = createEl('button', 'mf-tool-btn', T('伴读窗口', 'Companion'));
  toolSubwin.setAttribute('data-l10n-id', 'mindflow-item-pane-action-companion');
  toolSubwin.type = 'button';
  toolSubwin.setAttribute?.('data-mindflow-action', 'workspace');
  toolSubwin.title = T('打开轻量独立窗口，适合与 PDF 左右分屏伴读对照', 'Open a compact window to read side by side with the PDF');
  toolSubwin.addEventListener('click', (e: any = {}) => {
    e.preventDefault?.(); e.stopPropagation?.();
    try {
      if (totalMaps > 0 && maps[0]) {
        host.openMindflowAttachment(maps[0], win);
      } else {
        host.openMindFlow({ mode: 'open' }, win);
      }
    } catch (err) {
      Zotero.logError?.('[MindFlow] Open standalone window failed: ' + err);
    }
  });
  toolsGrid.appendChild(toolSubwin);

  const toolAi = createEl('button', 'mf-tool-btn', T('AI 论文精读', 'AI Reading'));
  toolAi.setAttribute('data-l10n-id', 'mindflow-item-pane-action-ai');
  toolAi.type = 'button';
  toolAi.setAttribute?.('data-mindflow-action', 'ai');
  toolAi.title = T('为本文献启动 AI 智能精读与思维导图生成', 'Start AI reading and map generation for this item');
  toolAi.addEventListener('click', async (e: any = {}) => {
    e.preventDefault?.(); e.stopPropagation?.();
    try {
      const currentTarget = lastPaneTargetRef.current || target;
      if (!currentTarget) return;
      await host.openMindFlow({ mode: 'ai_analyze', items: [currentTarget] }, win);
    } catch (err) {
      Zotero.logError?.('[MindFlow] AI analyze action failed: ' + err);
      actionStatus.textContent = host.paneText('操作失败，请重试。', 'The action failed. Please try again.');
    }
  });
  toolsGrid.appendChild(toolAi);
  lastPaneActions.push({ id: 'ai', button: toolAi, hasPDF: true });

  if (hasPDF) {
    const toolPdf = createEl('button', 'mf-tool-btn mf-tool-btn-pdf', T('打开 PDF', 'Open PDF'));
    toolPdf.setAttribute('data-l10n-id', 'mindflow-item-pane-action-pdf');
    toolPdf.type = 'button';
    toolPdf.setAttribute?.('data-mindflow-action', 'pdf');
    toolPdf.title = T('在 Zotero 内置阅读器中打开本文献的 PDF 全文', 'Open this item\'s PDF in the Zotero reader');
    toolPdf.addEventListener('click', async (e: any = {}) => {
      e.preventDefault?.(); e.stopPropagation?.();
      try {
        if (!await host.openPDFForItem(selectedPDF || target, win)) throw new Error('PDF could not be opened');
        actionStatus.textContent = '';
        actionStatus.removeAttribute('data-l10n-id');
      } catch (error) {
        Zotero.logError?.('[MindFlow] Sidebar PDF open failed: ' + error);
        actionStatus.textContent = T('无法打开 PDF，请检查附件是否已下载。', 'Unable to open the PDF. Check that the attachment has been downloaded.');
        actionStatus.setAttribute('data-l10n-id', 'mindflow-item-pane-pdf-open-failed');
      }
    });
    toolsGrid.appendChild(toolPdf);
    lastPaneActions.push({ id: 'pdf', button: toolPdf, hasPDF: true });
  }

  const toolImport = createEl('button', 'mf-tool-btn', T('导入导图', 'Import Map'));
  toolImport.setAttribute('data-l10n-id', 'mindflow-item-pane-action-import');
  toolImport.type = 'button';
  toolImport.setAttribute?.('data-mindflow-action', 'import');
  toolImport.title = T('导入 MindFlow、JSON、Markdown 或 OPML 导图文件', 'Import a MindFlow, JSON, Markdown, or OPML map file');
  toolImport.addEventListener('click', async (e: any = {}) => {
    e.preventDefault?.(); e.stopPropagation?.();
    await host.openMindFlow({ mode: 'import_file' }, win);
  });
  toolsGrid.appendChild(toolImport);

  const toolBlank = createEl('button', 'mf-tool-btn', T('独立空白导图', 'Blank Map'));
  toolBlank.setAttribute('data-l10n-id', 'mindflow-item-pane-action-blank');
  toolBlank.type = 'button';
  toolBlank.setAttribute?.('data-mindflow-action', 'blank');
  toolBlank.title = T('新建不绑定本文献的独立空白思维导图', 'Create a blank map that is not linked to this item');
  toolBlank.addEventListener('click', async (e: any = {}) => {
    e.preventDefault?.(); e.stopPropagation?.();
    await host.openMindFlow({ mode: 'create_blank', forceNew: true }, win);
  });
  toolsGrid.appendChild(toolBlank);
  wrapper.appendChild(toolsGrid);

  // 5. Maps Section
  if (totalMaps > 0) {
    const mapsSection = createEl('div', 'mf-maps-section');
    const mapsHeader = createEl('div', 'mf-maps-header');
    mapsHeader.appendChild(createEl('span', 'mf-maps-title', `${T('关联导图', 'Linked maps')} (${totalMaps})`));

    const refreshBtn = createEl('button', 'mf-btn-refresh', '↻');
    refreshBtn.type = 'button';
    refreshBtn.title = T('刷新列表', 'Refresh list');
    refreshBtn.setAttribute('aria-label', refreshBtn.title);
    refreshBtn.addEventListener('click', (e: any) => {
      e.preventDefault(); e.stopPropagation();
      state?.refresh?.();
    });
    mapsHeader.appendChild(refreshBtn);
    mapsSection.appendChild(mapsHeader);

    const mapsList = createEl('div', 'mf-maps-list');
    for (const att of maps) {
      const rawTitle = att.getField?.('title') || att.attachmentFilename || T('思维导图', 'Mind map');
      const cleanTitle = String(rawTitle).replace(/\s*\(MindFlow\s*导图源文件\)$/i, '').replace(/\.mindflow$/i, '').trim() || String(rawTitle);

      const card = createEl('div', 'mf-map-card');
      card.title = T(`打开导图：${cleanTitle}`, `Open map: ${cleanTitle}`);
      card.addEventListener('click', (e: any) => {
        if (e?.target?.closest?.('button')) return;
        e?.preventDefault?.(); e?.stopPropagation?.();
        host.openMindflowAttachment(att, win);
      });

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
      openBtn.addEventListener('click', async (e: any) => {
        e.preventDefault(); e.stopPropagation();
        await host.openMindflowAttachment(att, win);
      });
      cardActions.appendChild(openBtn);

      const exportBtn = createEl('button', 'mf-card-btn', T('导出大纲', 'Export Outline'));
      exportBtn.setAttribute('data-l10n-id', 'mindflow-item-pane-card-export');
      exportBtn.type = 'button';
      if (!isEditable) {
        exportBtn.disabled = true;
        exportBtn.setAttribute('aria-disabled', 'true');
        exportBtn.title = T('当前文献处于只读库或回收站中，无法导出大纲笔记', 'Parent item is read-only or in Trash, cannot export outline note');
      }
      exportBtn.addEventListener('click', async (e: any) => {
        e.preventDefault(); e.stopPropagation();
        if (exportBtn.disabled || !isEditable) return;
        exportBtn.disabled = true;
        try {
          await host.exportAttachmentToNote(att, win);
        } finally {
          exportBtn.disabled = !isEditable;
        }
      });
      cardActions.appendChild(exportBtn);

      const locateBtn = createEl('button', 'mf-card-btn', T('定位附件', 'Locate Attachment'));
      locateBtn.setAttribute('data-l10n-id', 'mindflow-item-pane-card-locate');
      locateBtn.type = 'button';
      locateBtn.addEventListener('click', (e: any) => {
        e.preventDefault(); e.stopPropagation();
        const targetWin = win || (att.libraryID ? Zotero.getActiveZoteroPane?.()?.window : null) || Zotero.getMainWindow?.();
        targetWin?.ZoteroPane?.selectItem?.(att.id);
      });
      cardActions.appendChild(locateBtn);
      card.appendChild(cardActions);
      mapsList.appendChild(card);
    }
    mapsSection.appendChild(mapsList);
    wrapper.appendChild(mapsSection);
  }
  body.appendChild(wrapper);
  if (state) {
    state.paneSignature = signature;
    state.paneActions = lastPaneActions;
  }
}
