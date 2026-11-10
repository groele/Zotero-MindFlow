import type { AIResearchModalContext } from './useAIResearchModal';

export const AIResearchSourcesFieldset = ({ ctx }: { ctx: AIResearchModalContext }) => {
  const {
    preview, stage, sourceRows, sources, setSources, busy, hasSelectedContent, enabledSources,
    selectedCharacters, scope, abstractEditor, setAbstractEditor, captureExcerptSelection,
    excerptSelection, setAbstractDraft, abstractDraft, validAbstractDraft, onRefresh,
    emptySourceMessage, hasAvailableContent,
  } = ctx;
  if (!preview) return null;
  return (
    <>
      {(stage === 'ready' || stage === 'error') && (
        <fieldset className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <legend className="px-1 font-semibold text-slate-900 dark:text-white">本次发送的资料</legend>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">取消勾选的来源不会发送给模型，也不会用于引文核对。调整范围后重新分析会使用独立的会话结果。</p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {sourceRows.map(({ key, label, available, hint, canSwitchToPdf }) => (
              <div key={key} className="flex flex-col gap-0.5">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={available && sources[key]} disabled={!available || busy}
                    onChange={(event) => setSources((current) => ({ ...current, [key]: event.target.checked }))} />
                  <span className={!available ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}>
                    {key === 'abstract' && scope?.abstractSource === 'manual'
                      ? '摘要（待核对）'
                      : key === 'abstract' && scope?.abstractSource === 'pdf-selected'
                        ? '摘要（已选 PDF 片段）'
                        : label}
                  </span>
                  {hint && <span className="text-[11px] text-slate-400 dark:text-slate-500">（{hint}）</span>}
                </label>
                {canSwitchToPdf && (
                  <div className="ml-5 flex items-center gap-1.5 text-[11px]">
                    <span className="text-blue-600 dark:text-blue-400">想读取正文？</span>
                    <button type="button" onClick={() => onRefresh('full')}
                      className="font-medium text-blue-700 dark:text-blue-300 underline hover:text-blue-800">
                      切换全文
                    </button>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <button type="button" onClick={() => onRefresh('key-sections')}
                      className="font-medium text-blue-700 dark:text-blue-300 underline hover:text-blue-800">
                      核心章节
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div role="status" aria-live="polite" className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {hasSelectedContent
              ? `当前将发送 ${Object.values(enabledSources).filter(Boolean).length} 类资料，约 ${selectedCharacters.toLocaleString()} 字符；未勾选的来源不会发送给模型。`
              : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-amber-700 dark:text-amber-300">当前没有选中可发送的资料；请至少勾选一种已有内容的来源。</span>
                  <div className="flex items-center gap-1.5">
                    {Boolean(scope?.hasAbstract || preview?.abstractText) && (
                      <button type="button" onClick={() => setSources(s => ({ ...s, abstract: true }))}
                        className="rounded bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-700">
                        恢复勾选摘要
                      </button>
                    )}
                    {Boolean(scope?.pdfAttachmentCount) && preview.readingMode === 'abstract' && (
                      <button type="button" onClick={() => onRefresh('full')}
                        className="rounded border border-blue-400 bg-white px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-50 dark:bg-slate-800 dark:text-blue-300">
                        切换为全文精读
                      </button>
                    )}
                  </div>
                </div>
              )}
          </div>
          {preview.readingMode === 'abstract' && Boolean(scope?.pdfAttachmentCount) && (
            <div className="mt-2.5 flex items-center justify-between rounded-lg border border-blue-200/70 bg-blue-50/60 px-3 py-2 text-xs text-blue-900 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-200">
              <span className="flex items-center gap-1.5">
                <span>📄</span>
                <span>本文献检测到本地 PDF 附件。当前为<strong>聚焦摘要</strong>模式，未读取正文。如需分析正文：</span>
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                <button type="button" onClick={() => onRefresh('key-sections')}
                  className="rounded border border-blue-300 bg-white px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:bg-slate-800 dark:text-blue-300">
                  摘要＋引言＋结论
                </button>
                <button type="button" onClick={() => onRefresh('full')}
                  className="rounded border border-blue-300 bg-white px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:bg-slate-800 dark:text-blue-300">
                  全文精读
                </button>
              </div>
            </div>
          )}
          {preview.readingMode === 'abstract' && <div className="mt-3 space-y-2">
            <button type="button" aria-expanded={abstractEditor} onClick={() => setAbstractEditor(current => !current)}
              className="rounded-lg border border-blue-300 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
              {scope?.hasAbstract ? '核对／修改本次摘要' : '选择／补充摘要'}
            </button>
            {!scope?.hasAbstract && <p className="text-xs leading-5 text-amber-700 dark:text-amber-300">
              PDF 没有摘要标题时可能无法自动识别。可选取下方 PDF 前页中的摘要段落，或粘贴摘要；确认后即可勾选“摘要”。
            </p>}
            {abstractEditor && <div aria-label="摘要选择编辑器" className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/40 p-3 dark:border-blue-800 dark:bg-blue-950/20">
              {preview.abstractExcerpt && <>
                <label className="block text-xs">PDF 前页文字（仅在本地显示，选中摘要段落后点击下方按钮）
                  <textarea aria-label="PDF 前页文字" readOnly value={preview.abstractExcerpt}
                    onSelect={captureExcerptSelection} onMouseUp={captureExcerptSelection} onKeyUp={captureExcerptSelection}
                    className="mt-2 h-40 w-full resize-y rounded-lg border border-slate-300 bg-white p-2 text-xs leading-5 dark:border-slate-600 dark:bg-slate-800" />
                </label>
                <button type="button" disabled={!excerptSelection.trim()} onClick={() => setAbstractDraft(excerptSelection.trim())}
                  className="rounded-lg border border-blue-300 px-3 py-2 text-xs text-blue-700 disabled:opacity-50 dark:text-blue-300">使用选中文字</button>
              </>}
              <label className="block text-xs">本次摘要（可粘贴或修正；请只保留摘要正文）
                <textarea aria-label="本次摘要正文" value={abstractDraft} maxLength={12000}
                  onChange={event => setAbstractDraft(event.target.value)}
                  className="mt-2 h-36 w-full resize-y rounded-lg border border-slate-300 bg-white p-2 text-xs leading-5 dark:border-slate-600 dark:bg-slate-800" />
              </label>
              <p className="text-xs leading-5 text-slate-500">{abstractDraft.trim().length} 字符，需 50～12000 字符。此操作只设置本次输入；不会修改 Zotero 条目。未匹配本地原文的粘贴内容会标为待核验。</p>
              <button type="button" disabled={!validAbstractDraft || busy} onClick={() => {
                setSources(current => ({ ...current, abstract: true }));
                onRefresh('abstract', { preparedId: preview.preparedId, text: abstractDraft.trim() });
              }} className="rounded-lg bg-blue-600 px-3 py-2 text-xs text-white disabled:opacity-50">确认使用摘要</button>
            </div>}
          </div>}
          {(!hasAvailableContent || (preview.readingMode === 'abstract' && !scope?.hasAbstract)) && <div role="alert" aria-label="无可选资料" className="mt-3 space-y-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <p>{emptySourceMessage}</p>
            {Boolean(scope?.pdfAttachmentCount) && <>
              <p>该文献有 {scope?.pdfAttachmentCount} 个 PDF 附件。可明确改选其他范围并重新准备；只发送该范围内的资料。</p>
              <div className="flex flex-wrap gap-2">
                {preview.readingMode !== 'key-sections' && <button type="button" onClick={() => onRefresh('key-sections')}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs dark:border-amber-700 dark:bg-slate-800">读取摘要＋引言＋结论</button>}
                {preview.readingMode !== 'full' && <button type="button" onClick={() => onRefresh('full')}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs dark:border-amber-700 dark:bg-slate-800">读取全文 PDF</button>}
              </div>
            </>}
            {scope?.paperHasAbstract && preview.readingMode !== 'abstract' && <button type="button" onClick={() => onRefresh('abstract')}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs dark:border-amber-700 dark:bg-slate-800">改为读取摘要</button>}
            {!scope?.pdfAttachmentCount && <p>请在 Zotero 检查是否选中了正确文献，为该条目添加 PDF 或补充摘要后重新读取。</p>}
          </div>}
          {hasAvailableContent && !hasSelectedContent && <p role="alert" className="mt-3 text-xs text-amber-700 dark:text-amber-300">请至少勾选一种已有内容的资料。</p>}
        </fieldset>
      )}
    </>
  );
};
