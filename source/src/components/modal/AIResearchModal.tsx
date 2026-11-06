import React from 'react';
import { AlertCircle, CheckCircle2, Loader2, Sparkles, X } from 'lucide-react';
import type { ResearchReadingMode } from '../../services/zotero/researchAnalysis';
import { ResearchPresetsPanel } from './ResearchPresetsPanel';
import { useAIResearchModal } from './useAIResearchModal';
import type { AIResearchModalProps } from './aiResearchModalUtils';
import { AIResearchPreviewCard } from './AIResearchPreviewCard';
import { AIResearchConfigFieldsets } from './AIResearchConfigFieldsets';
import { AIResearchSourcesFieldset } from './AIResearchSourcesFieldset';
import { AIResearchTrailingPanel } from './AIResearchTrailingPanel';

export type { AIResearchStage } from './aiResearchModalUtils';

export const AIResearchModal: React.FC<AIResearchModalProps> = (props) => {
  const ctx = useAIResearchModal(props);
  const {
    isOpen, stage, busy, liveStatus, dialogRef, readingMode, setReadingMode, onRefresh,
    preview, progress, progressPercent, error, onSettings, onStart, onRetry, onCancel, onClose,
    mode, enabledSources, modelSelection, abstractEditor, hasSelectedContent, selectedModel,
    preset, setPreset,
  } = ctx;
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6"
      role="presentation">
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="ai-research-title" aria-describedby="ai-research-live-status"
        aria-busy={busy}
        className="flex max-h-[min(760px,92vh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <span id="ai-research-live-status" className="sr-only" role="status" aria-live="polite">{liveStatus}</span>
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Sparkles size={18} /><span className="text-xs font-semibold">Zotero 论文研究导图</span>
            </div>
            <h2 id="ai-research-title" className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
              {stage === 'preparing' ? '正在整理论文资料' : stage === 'running' ? '正在分析论文' :
                stage === 'saving' ? '正在保存草稿' :
                stage === 'error' ? '分析尚未完成' : '确认分析范围'}
            </h2>
          </div>
          <button type="button" onClick={busy && stage !== 'saving' ? onCancel : onClose}
            disabled={stage === 'saving'} aria-label={busy ? '取消分析' : '关闭'}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </header>

        <div className="shrink-0 border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <label className="block text-xs font-semibold text-slate-900 dark:text-white">文章读取范围与分析焦点
            <select aria-label="文章读取范围" value={readingMode} disabled={busy}
              onChange={event => { const value = event.target.value as ResearchReadingMode; setReadingMode(value); onRefresh(value); }}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-normal dark:border-slate-600 dark:bg-slate-800">
              <option value="abstract">聚焦摘要 · 核心贡献与主旨</option>
              <option value="introduction">聚焦引言 · 研究动机与问题缺口</option>
              <option value="conclusion">聚焦结论 · 核心成果与局限展望</option>
              <option value="key-sections">核心框架 · 摘要＋引言＋结论</option>
              <option value="full">全文综合 · 系统精读与完整复现</option>
            </select>
          </label>
          <p className="mt-1 text-xs leading-5 text-slate-500">提示词结合读取范围智能聚焦分析焦点；未标注独立小节标题的文献由模型在提供文本中智能定位并提炼。</p>
        </div>

        <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-5 text-sm text-slate-700 dark:text-slate-200">
          <div hidden={!preview || (stage !== 'ready' && stage !== 'error')}>
            <ResearchPresetsPanel isOpen={isOpen} value={preset} onChange={setPreset} />
          </div>
          {stage === 'preparing' && (
            <div className="flex items-center gap-3 rounded-xl bg-blue-50 p-4 dark:bg-blue-950/40">
              <Loader2 className="animate-spin text-blue-600" size={19} />
              <span>正在本机整理所选范围的资料；仅摘要优先读取条目摘要，缺失时在 PDF 前几页定位摘要。此阶段不向模型发送资料。</span>
            </div>
          )}
          {preview && (
            <>
              <AIResearchPreviewCard ctx={ctx} />
              <AIResearchConfigFieldsets ctx={ctx} />
              <AIResearchSourcesFieldset ctx={ctx} />
              <AIResearchTrailingPanel ctx={ctx} />
            </>
          )}

          {stage === 'running' && (
            <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-xl bg-blue-50 p-4 dark:bg-blue-950/40">
              <Loader2 className="shrink-0 animate-spin text-blue-600" size={19} />
              <div className="min-w-0 flex-1"><strong>{progress?.phase || '正在联系模型服务'}</strong>
                <div className="mt-1 text-xs">{progress ? `${progress.completed} / ${progress.total} 步完成` : '准备请求中'}。
                  取消会中止当前请求；已发送的请求可能由模型服务计费。</div>
                <div
                  role="progressbar"
                  aria-label="论文分析进度"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressPercent === null ? undefined : progressPercent}
                  aria-valuetext={progressPercent === null ? '正在准备分析进度' : `${progressPercent}%`}
                  className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/60"
                >
                  <div className={`h-full rounded-full bg-blue-600 transition-all ${progressPercent === null ? 'w-1/3 animate-pulse' : ''}`}
                    style={progressPercent === null ? undefined : { width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>
          )}
          {stage === 'saving' && <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-xl bg-blue-50 p-4 dark:bg-blue-950/40">
            <Loader2 className="animate-spin text-blue-600" size={19} />正在把可编辑草稿保存到本机。保存完成后可在画布审阅，再归档至 Zotero。
          </div>}
          {stage === 'error' && <div role="alert" className="flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertCircle size={18} className="shrink-0" /><span>{error}</span>
          </div>}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={onSettings} disabled={busy}
              className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800">
              llm-for-zotero 设置
            </button>
            {preview && !busy && <button type="button" onClick={() => onRefresh(readingMode)}
              className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              重新读取资料
            </button>}
          </div>
          <div className="flex gap-2">
            {stage === 'ready' && <button type="button" onClick={() => onStart(mode, enabledSources, modelSelection)} disabled={abstractEditor || !hasSelectedContent || !selectedModel?.available}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              <CheckCircle2 size={16} />开始分析</button>}
            {stage === 'error' && <button type="button" onClick={() => onRetry(mode, enabledSources, modelSelection)} disabled={abstractEditor || (Boolean(preview) && (!hasSelectedContent || !selectedModel?.available))}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">重试</button>}
            {busy && stage !== 'saving' && <button type="button" onClick={onCancel}
              className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800">取消</button>}
            {!busy && <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800">关闭</button>}
          </div>
        </footer>
      </section>
    </div>
  );
};
