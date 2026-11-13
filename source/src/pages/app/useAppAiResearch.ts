import { useCallback, useEffect, useRef } from 'react';
import { getSelectedZoteroItems, saveMindMapToZoteroAttachment } from '../../services/zotero/zoteroBridge';
import { ResearchAnalysisIntensity, ResearchModelSelection, ResearchReadingMode, ResearchRequestOptions, ResearchSourceSelection, createResearchDocument, prepareResearchAnalysis, requestResearchAnalysis } from '../../services/zotero/researchAnalysis';
import { computeLayout } from '../../core/layout/layoutEngine';
import { getTheme } from '../../core/theme/themes';
import { StorageService } from '../../services/storage/storageService';
import type { AppContext } from './appContext';

export const useAppAiResearch = (ctx: AppContext): void => {
  const { setDoc, doc, setSelectedId, setSelectedIds, isZoteroMode,
         setIsAiAnalyzing, aiAnalyzingRef, analyzeRequestRef, aiAbortRef, aiRequestTokenRef,
         setAiWorkflow, aiWorkflow, setIsArchivingAiDraft, aiArchivingRef, setIsWelcomeOpen,
         setRelationships, settings, setSaveStatus, cleanDocRef, cleanRelationshipsRef,
         latestDocRef, latestRelationshipsRef, currentDocIdRef, zoteroSyncQueueRef, historyRef, syncHistoryState, centerCanvas,
         flushCurrentDocument, persistArchiveAssociation, handleOpenSettings } = ctx;
  const centerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    ++aiRequestTokenRef.current;
    aiAbortRef.current?.abort();
    aiAbortRef.current = null;
    aiAnalyzingRef.current = false;
    if (centerTimerRef.current) {
      clearTimeout(centerTimerRef.current);
      centerTimerRef.current = null;
    }
  }, []);
  // The welcome-card action analyzes the selected Zotero paper/PDF. It must
  // never substitute sample records when the host selection is unavailable.
  const handleCreateAiResearchFromSelection = useCallback(() => {
    if (!isZoteroMode) {
      setSaveStatus({ state: 'warning', message: 'Zotero 连接尚未就绪；请从 Zotero 打开 MindFlow 后再选择论文。' });
      return;
    }
    const items = getSelectedZoteroItems();
    if (items.length === 0) {
      setSaveStatus({ state: 'warning', message: '请先在 Zotero 文献列表中选中一篇论文或其 PDF 附件。' });
      return;
    }
    if (items.length > 1) {
      setSaveStatus({ state: 'warning', message: '论文研究导图一次分析一篇；请只选择一篇论文或它的 PDF 附件。' });
      return;
    }
    void analyzeRequestRef.current(items[0].zoteroUri);
  }, [isZoteroMode]);

  const handleAnalyzeZoteroPaper = useCallback(async (referenceOverride?: string, readingMode: ResearchReadingMode = 'abstract',
    abstractSelection?: ResearchRequestOptions['abstractSelection']) => {
    if (!isZoteroMode || aiAnalyzingRef.current) {
      if (!isZoteroMode) {
        setSaveStatus({ state: 'warning', message: 'Zotero 连接尚未就绪；请从 Zotero 打开 MindFlow 后再选择论文。' });
      }
      return;
    }
    const selected = getSelectedZoteroItems();
    if (!referenceOverride && selected.length > 1) {
      setSaveStatus({ state: 'warning', message: 'AI 论文分析一次只能处理一篇文献；请只选中一篇。' });
      return;
    }
    const boundReference = !latestDocRef.current?.metadata?.mindflowUnlinkedContainer
      ? (latestDocRef.current?.metadata?.zoteroUri || latestDocRef.current?.metadata?.zoteroItemKey)
      : undefined;
    const reference = referenceOverride || selected[0]?.zoteroUri || boundReference;
    if (!reference) {
      setSaveStatus({ state: 'warning', message: '请先在 Zotero 文献列表选择一篇论文，或打开一份关联文献的导图。' });
      return;
    }
    const token = ++aiRequestTokenRef.current;
    const controller = new AbortController();
    aiAbortRef.current = controller;
    aiAnalyzingRef.current = true;
    setIsAiAnalyzing(true);
    setAiWorkflow({ reference, stage: 'preparing', preview: null, progress: null, error: '' });
    setSaveStatus({ state: 'saving', message: '正在保存当前导图并整理 Zotero 论文资料…' });
    try {
      if (!(await flushCurrentDocument())) throw new Error('当前导图尚未保存，暂不能开始论文分析。');
      if (controller.signal.aborted || token !== aiRequestTokenRef.current) return;
      const preview = await prepareResearchAnalysis(reference, controller.signal, readingMode, abstractSelection);
      if (controller.signal.aborted || token !== aiRequestTokenRef.current) return;
      setAiWorkflow({ reference, stage: 'ready', preview, progress: null, error: '' });
      setSaveStatus({ state: 'saved', message: '论文资料已准备；请确认分析范围后开始。' });
    } catch (error: any) {
      if (controller.signal.aborted || token !== aiRequestTokenRef.current) return;
      const message = String(error?.message || error);
      setAiWorkflow({ reference, stage: 'error', preview: null, progress: null, error: message });
      setSaveStatus({ state: 'error', message: `论文资料准备失败：${message}` });
      if (message.includes('MindFlow 设置')) handleOpenSettings();
    } finally {
      if (token === aiRequestTokenRef.current) {
        if (aiAbortRef.current === controller) aiAbortRef.current = null;
        aiAnalyzingRef.current = false;
        setIsAiAnalyzing(false);
      }
    }
  }, [flushCurrentDocument, handleOpenSettings, isZoteroMode]);
  analyzeRequestRef.current = handleAnalyzeZoteroPaper;

  const handleCancelAiAnalysis = useCallback(() => {
    ++aiRequestTokenRef.current;
    aiAbortRef.current?.abort();
    aiAbortRef.current = null;
    aiAnalyzingRef.current = false;
    setIsAiAnalyzing(false);
    setAiWorkflow(null);
    setSaveStatus({ state: 'warning', message: 'AI 分析已取消；未创建或归档导图。' });
  }, []);

  const handleStartAiAnalysis = useCallback(async (mode: ResearchAnalysisIntensity, sources: ResearchSourceSelection, model: ResearchModelSelection) => {
    const workflow = aiWorkflow;
    if (!workflow?.preview || aiAnalyzingRef.current) return;
    const currentMap = latestDocRef.current;
    const appearance = model.presentation || { themeId: currentMap?.themeId || settings.defaultThemeId,
      layoutType: currentMap?.layoutType || settings.defaultLayout };
    const token = ++aiRequestTokenRef.current;
    const controller = new AbortController();
    aiAbortRef.current = controller;
    aiAnalyzingRef.current = true;
    setIsAiAnalyzing(true);
    setAiWorkflow({ ...workflow, stage: 'running', progress: null, error: '' });
    setSaveStatus({ state: 'saving', message: '正在分析论文；导图尚未创建。' });
    try {
      const analysis = await requestResearchAnalysis(workflow.reference, {
        preparedId: workflow.preview.preparedId, mode, sources, ...model, signal: controller.signal,
        expectedCalls: mode === 'deep' && sources.pdf && workflow.preview.readingMode === 'full' ? workflow.preview.deepCalls : 1,
        onProgress: (progress) => {
          if (token === aiRequestTokenRef.current) {
            setAiWorkflow((current: any) => current ? { ...current, progress } : current);
          }
        },
      });
      if (controller.signal.aborted || token !== aiRequestTokenRef.current) return;
      setAiWorkflow((current: any) => current ? { ...current, stage: 'saving' } : current);
      const newDoc = createResearchDocument(analysis, appearance);
      newDoc.metadata = { ...newDoc.metadata, aiPresentation: { ...appearance } };
      const generatedBounds = computeLayout(newDoc.root, newDoc.layoutType, getTheme(newDoc.themeId), {
        rainbowBranches: settings.rainbowBranches, curveStyle: settings.curveStyle,
      }).bounds;
      if (!(await flushCurrentDocument())) throw new Error('当前导图尚未保存，请稍后重试。');
      if (controller.signal.aborted || token !== aiRequestTokenRef.current) return;
      const savedDoc = await StorageService.saveDocument(newDoc);
      if (controller.signal.aborted || token !== aiRequestTokenRef.current) return;
      await StorageService.setActiveDocumentId(savedDoc.id);
      if (controller.signal.aborted || token !== aiRequestTokenRef.current) return;
      cleanDocRef.current = savedDoc;
      cleanRelationshipsRef.current = [];
      latestDocRef.current = savedDoc;
      latestRelationshipsRef.current = cleanRelationshipsRef.current;
      currentDocIdRef.current = savedDoc.id;
      setRelationships(cleanRelationshipsRef.current);
      setDoc(savedDoc);
      setSelectedId(savedDoc.root.id);
      setSelectedIds([]);
      historyRef.current.clear();
      syncHistoryState();
      setIsWelcomeOpen(false);
      if (centerTimerRef.current) clearTimeout(centerTimerRef.current);
      centerTimerRef.current = setTimeout(() => {
        centerTimerRef.current = null;
        centerCanvas(generatedBounds, 0.05);
      }, 60);
      setAiWorkflow(null);
      const evidenceCount = Number(newDoc.metadata?.aiEvidenceCount) || 0;
      const reviewCount = Number(newDoc.metadata?.aiReviewCount) || 0;
      setSaveStatus(evidenceCount > 0
        ? { state: 'saved', message: `AI 研究导图草稿已保存；${evidenceCount} 条有原文片段匹配，${reviewCount} 条需核对。请审阅后归档。` }
        : { state: 'warning', message: 'AI 草稿已保存在本机，但没有条目通过原文片段核对；请逐条核查后再归档。' });
    } catch (error: any) {
      if (controller.signal.aborted || token !== aiRequestTokenRef.current) return;
      const message = String(error?.message || error);
      const previewInvalid = message.includes('预览已过期') || message.includes('配置已变化') || message.includes('读取范围已变化');
      setAiWorkflow((current: any) => current ? {
        ...current, stage: 'error', preview: previewInvalid ? null : current.preview, error: message,
      } : current);
      setSaveStatus({ state: 'error', message: `AI 论文分析失败：${message}` });
    } finally {
      if (token === aiRequestTokenRef.current) {
        if (aiAbortRef.current === controller) aiAbortRef.current = null;
        aiAnalyzingRef.current = false;
        setIsAiAnalyzing(false);
      }
    }
  }, [aiWorkflow, centerCanvas, flushCurrentDocument, settings.defaultThemeId, settings.defaultLayout, syncHistoryState]);

  const handleArchiveAiDraft = useCallback(async () => {
    if (aiArchivingRef.current || !doc?.metadata?.aiDraft) return;
    const targetId = doc.id;
    aiArchivingRef.current = true;
    setIsArchivingAiDraft(true);
    try {
      if (!(await flushCurrentDocument(true))) return;
      const current = latestDocRef.current;
      if (!current?.metadata?.aiDraft || !current.metadata.zoteroItemKey || current.id !== targetId) return;
      setSaveStatus({ state: 'saving', message: '正在将已审阅草稿归档到 Zotero 文献…' });
      await zoteroSyncQueueRef.current;
      if (currentDocIdRef.current !== current.id) return;
      const archivedDoc = { ...current, metadata: {
        ...current.metadata, aiDraft: false, autoSyncToZotero: true,
      } };
      const archived = await saveMindMapToZoteroAttachment(archivedDoc, current.metadata.zoteroItemKey, { silent: true });
      if (currentDocIdRef.current !== current.id) return;
      if (!archived.success) throw new Error(archived.message);
      if (!(await persistArchiveAssociation(current.id, archived, true))) return;
      if (currentDocIdRef.current !== current.id) return;
      setSaveStatus(archived.noteRequested && !archived.savedNote
        ? { state: 'warning', message: `导图附件已归档，但 Zotero 大纲笔记保存失败：${archived.noteError || '请检查 Zotero 日志'}。本地草稿状态正在保存。` }
        : { state: 'saving', message: '导图附件已归档至 Zotero；正在保存本地归档状态，后续编辑将自动同步。' });
    } catch (error: any) {
      if (currentDocIdRef.current === targetId) {
        setSaveStatus({ state: 'warning', message: `草稿仍保存在本机，Zotero 归档失败：${error?.message || error}` });
      }
    } finally {
      aiArchivingRef.current = false;
      setIsArchivingAiDraft(false);
    }
  }, [doc?.metadata?.aiDraft, flushCurrentDocument, persistArchiveAssociation]);
  Object.assign(ctx, { handleCreateAiResearchFromSelection, handleAnalyzeZoteroPaper, handleCancelAiAnalysis, handleStartAiAnalysis, handleArchiveAiDraft });
};
