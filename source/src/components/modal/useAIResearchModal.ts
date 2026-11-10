import React, { useState } from 'react';
import type {
  ResearchSourceSelection, ResearchModelSelection, ResearchReasoningLevel,
  ResearchReadingMode, ResearchAnalysisIntensity,
} from '../../services/zotero/researchAnalysis';
import { getResearchTemplate } from '../../services/zotero/researchTemplates';
import { defaultResearchPresetConfig, type ResearchPresetConfig } from '../../services/zotero/researchPresets';
import { getProgressPercent, getLiveStatus } from './aiResearchModalUtils';
import type { AIResearchModalProps } from './aiResearchModalUtils';

export const useAIResearchModal = ({
  appearance, isOpen, stage, preview, progress, error, onStart, onRetry, onCancel, onClose, onRefresh, onSettings,
}: AIResearchModalProps) => {
  const [mode, setMode] = useState<ResearchAnalysisIntensity>('standard');
  const [readingMode, setReadingMode] = useState<ResearchReadingMode>('abstract');
  const [modelEntryId, setModelEntryId] = useState('');
  const [reasoningLevel, setReasoningLevel] = useState<ResearchReasoningLevel>('default');
  const [preset, setPreset] = useState<ResearchPresetConfig>(defaultResearchPresetConfig);
  const templateId = preset.templateId;
  const setTemplateId = (id: string) => setPreset(current => ({ ...current, templateId: id }));
  const generatedAppearance = preset.presentation || appearance;
  const [abstractEditor, setAbstractEditor] = useState(false);
  const [abstractDraft, setAbstractDraft] = useState('');
  const [excerptSelection, setExcerptSelection] = useState('');
  const captureExcerptSelection = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    setExcerptSelection(target.value.slice(target.selectionStart, target.selectionEnd));
  };
  const validAbstractDraft = abstractDraft.trim().length >= 50 && abstractDraft.trim().length <= 12000;
  const template = getResearchTemplate(templateId);
  const selectedModel = preview?.models?.find((entry) => entry.entryId === modelEntryId);
  const modelSelection: ResearchModelSelection = { modelEntryId, templateId, customPrompt: preset.customPrompt,
    presentation: preset.presentation,
    reasoningLevel: selectedModel?.reasoningSupported ? reasoningLevel : 'default' };
  const [sources, setSources] = useState<ResearchSourceSelection>({
    abstract: true, pdf: true, notes: false, highlights: false, comments: false,
  });
  const scope = preview?.sourceScope;
  const isAbstractMode = preview?.readingMode === 'abstract';
  const hasPdfAttachment = Boolean(scope?.pdfAttachmentCount && scope.pdfAttachmentCount > 0);
  const pdfAvailable = Boolean((scope?.pdfCharacters && scope.pdfCharacters > 0) || (preview?.sourceCharacters?.pdf && preview.sourceCharacters.pdf > 0));
  const sourceRows: Array<{
    key: keyof ResearchSourceSelection;
    label: string;
    available: boolean;
    hint?: string;
    canSwitchToPdf?: boolean;
  }> = [
    {
      key: 'abstract',
      label: '摘要',
      available: Boolean(scope?.hasAbstract || preview?.abstractText),
      hint: Boolean(scope?.hasAbstract || preview?.abstractText) ? undefined : '文献摘要为空',
    },
    {
      key: 'pdf',
      label: 'PDF 正文 / 节选',
      available: pdfAvailable,
      hint: pdfAvailable
        ? undefined
        : hasPdfAttachment && isAbstractMode
          ? '聚焦摘要模式未载入正文'
          : hasPdfAttachment
            ? 'PDF 未提取到可分析文字'
            : '文献无本地 PDF 附件',
      canSwitchToPdf: !pdfAvailable && hasPdfAttachment && isAbstractMode,
    },
    {
      key: 'notes',
      label: `Zotero 笔记（${scope?.noteCount || 0} 条）`,
      available: Boolean(scope?.noteCount),
      hint: scope?.noteCount ? undefined : '文献暂无笔记',
    },
    {
      key: 'highlights',
      label: `批注划线（${scope?.highlightCount || 0} 条）`,
      available: Boolean(scope?.highlightCount),
      hint: scope?.highlightCount ? undefined : '暂无高亮划线',
    },
    {
      key: 'comments',
      label: `读者评论（${scope?.commentCount || 0} 条）`,
      available: Boolean(scope?.commentCount),
      hint: scope?.commentCount ? undefined : '暂无批注评论',
    },
  ];
  const enabledSources: ResearchSourceSelection = {
    abstract: sources.abstract && Boolean(scope?.hasAbstract || preview?.abstractText),
    pdf: sources.pdf && Boolean((scope?.pdfCharacters && scope.pdfCharacters > 0) || (preview?.sourceCharacters?.pdf && preview.sourceCharacters.pdf > 0)),
    notes: sources.notes && Boolean(scope?.noteCount),
    highlights: sources.highlights && Boolean(scope?.highlightCount),
    comments: sources.comments && Boolean(scope?.commentCount),
  };
  const selectedCharacters = sourceRows.reduce((sum, row) => sum +
    (enabledSources[row.key] ? preview?.sourceCharacters?.[row.key] || 0 : 0), 0);
  const hasSelectedContent = Object.values(enabledSources).some(Boolean);
  const hasAvailableContent = sourceRows.some(row => row.available);
  const emptySourceMessage = preview?.readingMode === 'abstract'
    ? '当前为“聚焦摘要”模式。该条目的摘要字段为空，且本次未能从 PDF 提取文字。可在下方粘贴补充摘要或改选全文。'
    : scope?.sectionStatus?.missing.length
      ? '当前范围未提取到可分析的文字，所选章节未可靠识别。可以选择其他读取范围。'
      : '当前范围没有可分析的资料。请检查所选文献及关联 PDF 是否已下载、有可提取的文字。';
  const busy = stage === 'preparing' || stage === 'running' || stage === 'saving';
  const progressPercent = getProgressPercent(progress);
  const liveStatus = getLiveStatus(stage, progress, error);
  const dialogRef = React.useRef<HTMLElement>(null);
  const focusableControls = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
    'button, input:not([type="hidden"]), select, textarea, a[href], [tabindex]') || [])
    .filter(control => !control.matches(':disabled, [tabindex="-1"]')
      && !control.closest('[hidden], [inert]') && control.getClientRects().length > 0);
  const previewPaperRef = React.useRef('');
  // Initialize a new preview before controls can receive input. A delayed
  // passive effect could overwrite a user's freshly selected model.
  React.useLayoutEffect(() => {
    if (preview?.preparedId) {
      setAbstractEditor(false);
      setAbstractDraft(preview.abstractText || '');
      setExcerptSelection('');
      const samePaper = previewPaperRef.current === preview.zoteroUri;
      previewPaperRef.current = preview.zoteroUri;
      if (!samePaper) setSources({ abstract: true, pdf: true, notes: false, highlights: false, comments: false });
      setReadingMode(preview.readingMode);
      const model = samePaper && preview.models.find(entry => entry.entryId === modelEntryId && entry.available) ||
        preview.models.find(entry => entry.entryId === preview.defaultModelEntryId && entry.available);
      setModelEntryId(model?.entryId || preview.defaultModelEntryId);
      if (!samePaper || model?.entryId !== modelEntryId || !model?.reasoningSupported ||
          !model.reasoningOptions.some(option => option.id === reasoningLevel)) setReasoningLevel('default');
    }
  }, [preview?.preparedId]);
  React.useLayoutEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => { if (previous?.isConnected) previous.focus(); };
  }, [isOpen]);
  React.useLayoutEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const active = document.activeElement;
    const controls = focusableControls();
    // A stage change can disable or unmount the focused control. Keep typing
    // and Tab inside the dialog even while saving has no enabled controls.
    if (!active || !dialogRef.current.contains(active) || !controls.includes(active as HTMLElement)) {
      (controls[0] || dialogRef.current).focus();
    }
  }, [isOpen, stage, abstractEditor]);
  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (stage !== 'saving') (busy ? onCancel : onClose)();
      } else if (event.key === 'Tab') {
        event.stopPropagation();
        const controls = focusableControls();
        if (!controls.length) {
          event.preventDefault(); dialogRef.current?.focus(); return;
        }
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!controls.includes(document.activeElement as HTMLElement)) {
          event.preventDefault(); (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, stage, busy, onCancel, onClose]);

  return {
    appearance, isOpen, stage, preview, progress, error,
    onStart, onRetry, onCancel, onClose, onRefresh, onSettings,
    mode, setMode,
    readingMode, setReadingMode,
    modelEntryId, setModelEntryId,
    reasoningLevel, setReasoningLevel,
    preset, setPreset,
    templateId, setTemplateId,
    generatedAppearance,
    abstractEditor, setAbstractEditor,
    abstractDraft, setAbstractDraft,
    excerptSelection, setExcerptSelection,
    captureExcerptSelection,
    validAbstractDraft,
    template,
    selectedModel,
    modelSelection,
    sources, setSources,
    scope,
    sourceRows,
    enabledSources,
    selectedCharacters,
    hasSelectedContent,
    hasAvailableContent,
    emptySourceMessage,
    busy,
    progressPercent,
    liveStatus,
    dialogRef,
  };
};

export type AIResearchModalContext = ReturnType<typeof useAIResearchModal>;
