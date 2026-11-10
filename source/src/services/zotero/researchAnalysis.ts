/**
 * Zotero MindFlow - AI research analysis request channel.
 * Data contracts live in researchAnalysisTypes, document construction
 * in researchDocument; both are re-exported to keep the public API stable.
 */
import { getZoteroInstance } from './zoteroBridge';
import type {
  ResearchInputPreview, ResearchAnalysis, ResearchRequestOptions, ResearchReadingMode,
} from './researchAnalysisTypes';
export * from './researchAnalysisTypes';
export { createResearchDocument } from './researchDocument';

function requestFromHost<T>(type: 'MINDFLOW_PREPARE_PAPER' | 'MINDFLOW_ANALYZE_PAPER',
  reference: string, options: ResearchRequestOptions = {}): Promise<T> {
  if (typeof window === 'undefined' || window.parent === window) {
    throw new Error('未检测到 Zotero AI 分析通道。');
  }
  return new Promise<T>((resolve, reject) => {
    const requestId = `mindflow-ai-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const resultType = `${type}_RESULT`;
    let settled = false;
    const cancelHost = () => {
      try { window.parent.postMessage({ type: 'MINDFLOW_CANCEL_PAPER', requestId }, '*'); }
      catch { /* The workspace may have been closed while cancelling. */ }
    };
    const finish = (error?: Error, result?: T) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      options.signal?.removeEventListener('abort', onAbort);
      window.clearTimeout(timeout);
      if (error) reject(error);
      else if (result) resolve(result);
      else reject(new Error('Zotero 未返回分析结果。'));
    };
    const onAbort = () => { cancelHost(); finish(new Error('AI 分析已取消；未创建或归档导图。')); };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const data = event.data;
      if (data?.requestId !== requestId) return;
      if (data.type === 'MINDFLOW_ANALYZE_PAPER_PROGRESS') {
        options.onProgress?.({ phase: String(data.phase || ''),
          completed: Number(data.completed) || 0, total: Number(data.total) || 1 });
        return;
      }
      if (data.type !== resultType) return;
      finish(data.error ? new Error(String(data.error)) : undefined, data.result);
    };
    const timeout = window.setTimeout(() => {
      cancelHost();
      finish(new Error(type === 'MINDFLOW_ANALYZE_PAPER'
        ? '等待模型分析超时；当前请求已取消，可在预览中重试并恢复已完成的分段。'
        : '准备论文资料超时；请检查 PDF 附件后重试。'));
    }, type === 'MINDFLOW_ANALYZE_PAPER'
      ? Math.min(30 * 60 * 1000, Math.max(5 * 60 * 1000,
        (Math.max(1, Number(options.expectedCalls) || 1) * 180000) + 60000))
      : 240000);
    window.addEventListener('message', onMessage);
    options.signal?.addEventListener('abort', onAbort, { once: true });
    if (options.signal?.aborted) { onAbort(); return; }
    try { window.parent.postMessage({ type, requestId, reference,
      preparedId: options.preparedId, mode: options.mode, sources: options.sources,
      modelEntryId: options.modelEntryId, reasoningLevel: options.reasoningLevel, templateId: options.templateId, readingMode: options.readingMode,
      customPrompt: options.customPrompt,
      analysisFocus: options.analysisFocus,
      abstractSelection: options.abstractSelection }, '*'); }
    catch { finish(new Error('无法向 Zotero 主窗口发送 AI 分析请求。')); }
  });
}

export async function prepareResearchAnalysis(reference: string,
  signal?: AbortSignal, readingMode: ResearchReadingMode = 'abstract',
  abstractSelection?: ResearchRequestOptions['abstractSelection']): Promise<ResearchInputPreview> {
  // Zotero injects the host API into its chrome workspace. Prefer this channel,
  // as with storage: privileged Gecko postMessage can omit event.source.
  const zotero = getZoteroInstance();
  if (zotero?.MindFlow?.preparePaperAnalysis) {
    if (signal?.aborted) throw new Error('AI 分析已取消。');
    return zotero.MindFlow.preparePaperAnalysis(reference, { signal, readingMode, abstractSelection }) as Promise<ResearchInputPreview>;
  }
  return requestFromHost<ResearchInputPreview>('MINDFLOW_PREPARE_PAPER', reference, { signal, readingMode, abstractSelection });
}

export async function requestResearchAnalysis(reference: string,
  options: ResearchRequestOptions = {}): Promise<ResearchAnalysis> {
  const zotero = getZoteroInstance();
  if (zotero?.MindFlow?.analyzePaperWithAI) {
    return zotero.MindFlow.analyzePaperWithAI(reference, {
      ...options,
      onProgress: (phase: string, completed: number, total: number) =>
        options.onProgress?.({ phase, completed, total }),
    }) as Promise<ResearchAnalysis>;
  }
  return requestFromHost<ResearchAnalysis>('MINDFLOW_ANALYZE_PAPER', reference, options);
}
