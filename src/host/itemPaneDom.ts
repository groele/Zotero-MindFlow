/**
 * Zotero MindFlow - shared XHTML element factory for ItemPane views.
 */
const XHTML_NS = 'http://www.w3.org/1999/xhtml';

export function makeElementFactory(document: any) {
  return (tag: string, className = '', text: string | null = null) => {
    const el = document.createElementNS
      ? document.createElementNS(XHTML_NS, tag)
      : document.createElement(tag);
    if (className) el.className = className;
    if (text !== null && text !== undefined) el.textContent = text;
    return el;
  };
}

export function createTemplateSection(opts: {
  createEl: ReturnType<typeof makeElementFactory>;
  isEditable: boolean;
  T: (zh: string, en: string) => string;
}) {
  const { createEl, isEditable, T } = opts;
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
  return { createSection, templateSelect, templateCreateBtn };
}
