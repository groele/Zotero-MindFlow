import React from 'react';
import { AlertCircle, CheckCircle2, Loader2, RotateCw, Settings, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import type { ResearchReadingMode } from '../../services/zotero/researchAnalysis';
import { builtinResearchPrompts } from '../../services/zotero/researchPresets';
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
        className="flex max-h-[min(800px,94vh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <span id="ai-research-live-status" className="sr-only" role="status" aria-live="polite">{liveStatus}</span>
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-3.5 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Sparkles size={16} /><span className="text-xs font-semibold">Zotero 论文研究导图</span>
            </div>
            <h2 id="ai-research-title" className="mt-0.5 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {stage === 'preparing' ? '正在整理论文资料' : stage === 'running' ? '正在分析论文' :
                stage === 'saving' ? '正在保存草稿' :
                stage === 'error' ? '分析尚未完成' : '确认分析范围与参数'}
            </h2>
          </div>
          <button type="button" onClick={busy && stage !== 'saving' ? onCancel : onClose}
            disabled={stage === 'saving'} aria-label={busy ? '取消分析' : '关闭'}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </header>

        <div className="shrink-0 border-b border-slate-200 bg-slate-50/70 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/40">
          <label className="block text-xs font-semibold text-slate-900 dark:text-white">文章读取范围与分析焦点
            <select aria-label="文章读取范围" value={readingMode} disabled={busy}
              onChange={event => { const value = event.target.value as ResearchReadingMode; setReadingMode(value); onRefresh(value); }}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs sm:text-sm font-normal dark:border-slate-600 dark:bg-slate-800">
              <option value="abstract">聚焦摘要 · 核心贡献与主旨（极速轻量，未载入 PDF 正文）</option>
              <option value="introduction">聚焦引言 · 研究动机与问题缺口</option>
              <option value="conclusion">聚焦结论 · 核心成果与局限展望</option>
              <option value="key-sections">核心框架 · 摘要＋引言＋结论（推荐 · 深度适中）</option>
              <option value="full">全文综合 · 系统精读与完整复现（详析 PDF 全文证据）</option>
            </select>
          </label>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">提示词结合读取范围智能聚焦分析焦点；可在下方选择本次具体发送给模型的资料子集。</p>
        </div>

        <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-5 text-sm text-slate-700 dark:text-slate-200">
          {stage === 'preparing' && (
            <div className="flex items-center gap-3 rounded-xl bg-blue-50 p-4 dark:bg-blue-950/40">
              <Loader2 className="animate-spin text-blue-600" size={19} />
              <span>正在本机整理所选范围的资料；仅摘要优先读取条目摘要，缺失时在 PDF 前几页定位摘要。此阶段不向模型发送资料。</span>
            </div>
          )}
          {preview && (
            <>
              {/* 1. 论文与已检测资产概览卡片 (Prominent Literature Context) */}
              <AIResearchPreviewCard ctx={ctx} />

              {/* 2. 本次具体发送的资料来源 (Data Sources to Send) */}
              <AIResearchSourcesFieldset ctx={ctx} />

              {/* 3. 分析框架与模型选择 (Framework, Template & Model) */}
              <AIResearchConfigFieldsets ctx={ctx} />

              {/* 4. 分析强度 / 复杂度 (Quick / Standard / Deep) */}
              <AIResearchTrailingPanel ctx={ctx} />

              {/* 5. 进阶定制：提示词与呈现预设（可折叠） (Advanced Custom Prompts & Presets) */}
              <div hidden={stage !== 'ready' && stage !== 'error'}>
                <details className="group rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 overflow-hidden transition-colors">
                  <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-2">
                      <SlidersHorizontal size={14} className="text-slate-500 dark:text-slate-400" />
                      <span>提示词与导图风格进阶定制</span>
                      {preset.focus && preset.focus !== 'all' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-medium">
                          侧重：{builtinResearchPrompts.find(p => p.focus === preset.focus)?.name || preset.focus}
                        </span>
                      )}
                      <span className="font-normal text-[11px] text-slate-400 dark:text-slate-500">（可选 · 切换预设与提示词工作台）</span>
                    </span>
                    <span className="text-[11px] font-normal text-blue-600 dark:text-blue-400 group-open:hidden">展开定制 ▾</span>
                    <span className="text-[11px] font-normal text-blue-600 dark:text-blue-400 hidden group-open:inline">收起定制 ▴</span>
                  </summary>
                  <div className="p-4 pt-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <ResearchPresetsPanel isOpen={isOpen} value={preset} onChange={setPreset} />
                  </div>
                </details>
              </div>
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

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-3.5 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20">
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={onSettings} disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-700 shadow-xs">
              <Settings size={13} />
              <span>模型服务设置</span>
            </button>
            {preview && !busy && <button type="button" onClick={() => onRefresh(readingMode)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 shadow-xs">
              <RotateCw size={13} />
              <span>重新读取资料</span>
            </button>}
          </div>
          <div className="flex gap-2">
            {stage === 'ready' && <button type="button" onClick={() => onStart(mode, enabledSources, modelSelection)} disabled={abstractEditor || !hasSelectedContent || !selectedModel?.available}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 shadow-xs transition-colors">
              <CheckCircle2 size={16} />开始分析</button>}
            {stage === 'error' && <button type="button" onClick={() => onRetry(mode, enabledSources, modelSelection)} disabled={abstractEditor || (Boolean(preview) && (!hasSelectedContent || !selectedModel?.available))}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 shadow-xs">重试</button>}
            {busy && stage !== 'saving' && <button type="button" onClick={onCancel}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs sm:text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800">取消</button>}
            {!busy && <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs sm:text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800">关闭</button>}
          </div>
        </footer>
      </section>
    </div>
  );
};
