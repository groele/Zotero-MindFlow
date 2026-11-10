import { Target } from 'lucide-react';
import { researchTemplates, defaultResearchTemplateId, researchSectionDefinitions } from '../../services/zotero/researchTemplates';
import { getTheme } from '../../core/theme/themes';
import { builtinResearchPrompts, type ResearchFocus } from '../../services/zotero/researchPresets';
import type { ResearchReasoningLevel } from '../../services/zotero/researchAnalysis';
import type { AIResearchModalContext } from './useAIResearchModal';

const FOCUS_CARDS: Array<{ id: ResearchFocus; label: string; desc: string; icon: string }> = [
  { id: 'all', label: '全文综合研读', desc: '系统平衡覆盖全部分支', icon: '🌟' },
  { id: 'methods', label: '方法与实验设计', desc: '重点剖析材料/参数/对照/复现', icon: '🔬' },
  { id: 'discussion', label: '讨论与深度机理', desc: '深入分析因果推导/竞争解释', icon: '💡' },
  { id: 'results', label: '数据与关键发现', desc: '提炼直接观测/定量基准指标', icon: '📊' },
  { id: 'conclusion', label: '结论与学术贡献', desc: '总结核心结论/局限与展望', icon: '🎯' },
  { id: 'abstract', label: '摘要与主旨速览', desc: '极速概览痛点/方案/最高主张', icon: '📝' },
];

export const AIResearchConfigFieldsets = ({ ctx }: { ctx: AIResearchModalContext }) => {
  const {
    preview, stage, busy, template, templateId, setTemplateId, preset, setPreset, generatedAppearance,
    modelEntryId, setModelEntryId, setReasoningLevel, modelSelection, selectedModel,
  } = ctx;
  if (!preview) return null;

  return (
    <>
      {(stage === 'ready' || stage === 'error') && (
        <fieldset className="space-y-3.5 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <legend className="px-1 font-semibold text-slate-900 dark:text-white">分析框架与内容组织</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs">论文类型
              <select aria-label="论文分析框架" value={template.family} disabled={busy}
                onChange={event => setTemplateId(event.target.value === 'experimental' ? defaultResearchTemplateId : event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs sm:text-sm dark:border-slate-600 dark:bg-slate-800">
                <option value="experimental">实验研究</option><option value="theoretical">理论与计算</option>
                <option value="mechanism">机理辨析</option><option value="review">综述与对比</option>
              </select>
            </label>
            {template.family === 'experimental' ? (
              <label className="block text-xs">实验论文内容模板
                <select aria-label="实验论文内容模板" value={templateId} disabled={busy}
                  onChange={event => setTemplateId(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs sm:text-sm dark:border-slate-600 dark:bg-slate-800">
                  {researchTemplates.filter(entry => entry.family === 'experimental').map(entry =>
                    <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                </select>
              </label>
            ) : (
              <div className="flex flex-col justify-end text-xs text-slate-500 pb-1">
                <span>框架风格：{template.style === 'story' ? '主线叙事 · 重点突出' : '标准多维结构'}</span>
              </div>
            )}
          </div>
          <p className="text-xs leading-5 text-slate-500">{template.description} {template.framework}</p>
          <div className="flex flex-wrap gap-1.5" aria-label="导图内容范围">
            {template.keys.map(key => <span key={key} className="rounded bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">
              {researchSectionDefinitions[key].label}</span>)}
          </div>

          {/* AI 重点分析侧重（在全文中重点分析某一部分） */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Target size={14} className="text-blue-600 dark:text-blue-400" />
                <span>AI 重点分析侧重（在发送资料中重点剖析目标章节）</span>
              </label>
              <span className="text-[11px] text-slate-400">即使发送全文，AI 也会根据侧重优先展开该模块</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FOCUS_CARDS.map(item => {
                const isSelected = (preset.focus || 'all') === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      const matched = builtinResearchPrompts.find(p => p.focus === item.id);
                      setPreset(current => ({
                        ...current,
                        focus: item.id,
                        customPrompt: matched && (!current.customPrompt || builtinResearchPrompts.some(bp => bp.text === current.customPrompt))
                          ? matched.text
                          : current.customPrompt,
                      }));
                    }}
                    className={`p-2 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 dark:border-blue-700 text-blue-900 dark:text-blue-200 shadow-xs ring-1 ring-blue-400/40'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-medium mb-0.5">
                      <span>{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 leading-tight">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-slate-500">{template.style === 'story' ? '最多五条主线、三个核心发现 · 省去单子节点分类层 · 补充资料保留在备注' : `${template.keys.length} 个固定分支 · 数值与单位保留，缺失内容标为待补充。`}</p>
          <p aria-label="生成导图外观" className="text-xs text-slate-500">{preset.presentation ? '使用呈现模板：' : '生成时保留当前外观：'}{getTheme(generatedAppearance.themeId).name} · {generatedAppearance.layoutType === 'logic-right' ? '向右逻辑图' : generatedAppearance.layoutType === 'org-down' ? '向下层级图' : '双侧思维导图'}。内容模板只决定分析逻辑和层级。</p>
          <p className="text-xs text-slate-500">{template.style === 'story' ? '观测、条件、对照与作者解释直接显示在图中，原文及核对状态保留在备注。仅摘要无法覆盖全文证据；需要完整结果时请选择全文 PDF。' : '节点采用精炼要点：材料／参数直接列出，机理用原因→过程→结果；解释、条件与原文放在备注。绿色勾为引文匹配，问号为待核验。'}</p>
        </fieldset>
      )}

      {(stage === 'ready' || stage === 'error') && (
        <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <legend className="px-1 font-semibold text-slate-900 dark:text-white">本次使用的模型</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs">llm-for-zotero 已配置模型
              <select aria-label="本次分析模型" value={modelEntryId} disabled={busy}
                onChange={(event) => { setModelEntryId(event.target.value); setReasoningLevel('default'); }}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs sm:text-sm dark:border-slate-600 dark:bg-slate-800">
                {preview.models?.map((entry) => <option key={entry.entryId} value={entry.entryId} disabled={!entry.available}>
                  {entry.model}{entry.host ? ` · ${entry.host}` : ''}{entry.available ? '' : '（暂不支持）'}
                </option>)}
              </select>
            </label>
            <label className="block text-xs">推理强度
              <select aria-label="本次推理强度" value={modelSelection.reasoningLevel}
                disabled={busy || !selectedModel?.reasoningSupported}
                onChange={(event) => setReasoningLevel(event.target.value as ResearchReasoningLevel)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs sm:text-sm disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800">
                {(selectedModel?.reasoningOptions || [{ id: 'default', label: '模型默认' }]).map((option) =>
                  <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
          </div>
          <p className="text-xs leading-5 text-slate-500">仅影响本次分析。{selectedModel?.reasoningOptionsSource === 'llm-for-zotero-profile'
            ? '选项来自该模型在 llm-for-zotero 中的能力配置，参数由该插件发送。'
            : !selectedModel?.reasoningSupported ? '该模型未启用推理强度选择。'
            : '推理参数由 llm-for-zotero 按模型能力映射；其公开接口未提供完整强度列表，部分选项可能采用模型默认值。'}</p>
        </fieldset>
      )}
    </>
  );
};
