import { researchTemplates, defaultResearchTemplateId, researchSectionDefinitions } from '../../services/zotero/researchTemplates';
import { getTheme } from '../../core/theme/themes';
import type { ResearchReasoningLevel } from '../../services/zotero/researchAnalysis';
import type { AIResearchModalContext } from './useAIResearchModal';

export const AIResearchConfigFieldsets = ({ ctx }: { ctx: AIResearchModalContext }) => {
  const {
    preview, stage, busy, template, templateId, setTemplateId, preset, generatedAppearance,
    modelEntryId, setModelEntryId, setReasoningLevel, modelSelection, selectedModel,
  } = ctx;
  if (!preview) return null;
  return (
    <>
      {(stage === 'ready' || stage === 'error') && (
        <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <legend className="px-1 font-semibold text-slate-900 dark:text-white">分析框架与内容组织</legend>
          <label className="block text-xs">论文类型
            <select aria-label="论文分析框架" value={template.family} disabled={busy}
              onChange={event => setTemplateId(event.target.value === 'experimental' ? defaultResearchTemplateId : event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-600 dark:bg-slate-800">
              <option value="experimental">实验研究</option><option value="theoretical">理论与计算</option>
              <option value="mechanism">机理辨析</option><option value="review">综述与对比</option>
            </select>
          </label>
          {template.family === 'experimental' && <label className="block text-xs">实验论文内容模板
            <select aria-label="实验论文内容模板" value={templateId} disabled={busy}
              onChange={event => setTemplateId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-600 dark:bg-slate-800">
              {researchTemplates.filter(entry => entry.family === 'experimental').map(entry =>
                <option key={entry.id} value={entry.id}>{entry.name}</option>)}
            </select>
          </label>}
          <p className="text-xs leading-5 text-slate-500">{template.description} {template.framework}</p>
          <div className="flex flex-wrap gap-1.5" aria-label="导图内容范围">
            {template.keys.map(key => <span key={key} className="rounded bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">
              {researchSectionDefinitions[key].label}</span>)}
          </div>
          <p className="text-xs text-slate-500">{template.style === 'story' ? '最多五条主线、三个核心发现 · 省去单子节点分类层 · 补充资料保留在备注' : `${template.keys.length} 个固定分支 · 数值与单位保留，缺失内容标为待补充。`}</p>
          <p aria-label="生成导图外观" className="text-xs text-slate-500">{preset.presentation ? '使用呈现模板：' : '生成时保留当前外观：'}{getTheme(generatedAppearance.themeId).name} · {generatedAppearance.layoutType === 'logic-right' ? '向右逻辑图' : generatedAppearance.layoutType === 'org-down' ? '向下层级图' : '双侧思维导图'}。内容模板只决定分析逻辑和层级。</p>
          <p className="text-xs text-slate-500">{template.style === 'story' ? '观测、条件、对照与作者解释直接显示在图中，原文及核对状态保留在备注。仅摘要无法覆盖全文证据；需要完整结果时请选择全文 PDF。' : '节点采用精炼要点：材料／参数直接列出，机理用原因→过程→结果；解释、条件与原文放在备注。绿色勾为引文匹配，问号为待核验。'}</p>
        </fieldset>
      )}

      {(stage === 'ready' || stage === 'error') && (
        <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <legend className="px-1 font-semibold text-slate-900 dark:text-white">本次使用的模型</legend>
          <label className="block text-xs">llm-for-zotero 已配置模型
            <select aria-label="本次分析模型" value={modelEntryId} disabled={busy}
              onChange={(event) => { setModelEntryId(event.target.value); setReasoningLevel('default'); }}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-600 dark:bg-slate-800">
              {preview.models?.map((entry) => <option key={entry.entryId} value={entry.entryId} disabled={!entry.available}>
                {entry.model}{entry.host ? ` · ${entry.host}` : ''}{entry.available ? '' : '（暂不支持）'}
              </option>)}
            </select>
          </label>
          <label className="block text-xs">推理强度
            <select aria-label="本次推理强度" value={modelSelection.reasoningLevel}
              disabled={busy || !selectedModel?.reasoningSupported}
              onChange={(event) => setReasoningLevel(event.target.value as ResearchReasoningLevel)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-2 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800">
              {(selectedModel?.reasoningOptions || [{ id: 'default', label: '模型默认' }]).map((option) =>
                <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <p className="text-xs leading-5 text-slate-500">仅影响本次分析。{selectedModel?.reasoningOptionsSource === 'llm-for-zotero-profile'
            ? '选项来自该模型在 llm-for-zotero 中的能力配置，参数由该插件发送。'
            : !selectedModel?.reasoningSupported ? '该模型未启用推理强度选择。'
            : '推理参数由 llm-for-zotero 按模型能力映射；其公开接口未提供完整强度列表，部分选项可能采用模型默认值。'}</p>
        </fieldset>
      )}
    </>
  );
};
