import { ShieldCheck } from 'lucide-react';
import type { AIResearchModalContext } from './useAIResearchModal';

export const AIResearchTrailingPanel = ({ ctx }: { ctx: AIResearchModalContext }) => {
  const { preview, stage, mode, setMode, busy, selectedModel, modelSelection, selectedCharacters } = ctx;
  if (!preview) return null;
  return (
    <>
      {(stage === 'ready' || stage === 'error') && (
        <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <legend className="px-1 font-semibold text-slate-900 dark:text-white">分析强度 / 复杂度</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              {
                value: 'quick' as const,
                label: '⚡ 简要快速',
                badge: '速览',
                desc: '3~4 核心分支 · 精炼主干要点，去除繁杂铺垫与次要参数，极速生成。',
              },
              {
                value: 'standard' as const,
                label: '⚖️ 中等复杂度',
                badge: '推荐',
                desc: '5~6 标准分支 · 平衡学术框架，兼顾研究背景、方法与关键结论。',
              },
              {
                value: 'deep' as const,
                label: '🔬 详细深析',
                badge: '深度',
                desc: '全景多层级 · 深入量化实验指标、因果机理链条与局限展望。',
              },
            ].map((item) => (
              <label
                key={item.value}
                className={`flex cursor-pointer flex-col justify-between rounded-xl border p-3 transition-colors ${
                  mode === item.value
                    ? 'border-blue-500 bg-blue-50/80 shadow-sm dark:border-blue-500 dark:bg-blue-950/40'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="ai-research-mode"
                        value={item.value}
                        checked={mode === item.value}
                        disabled={busy}
                        onChange={() => setMode(item.value)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {item.label}
                      </span>
                    </div>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {item.badge}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-4 text-slate-500 dark:text-slate-400">
                    {item.desc}
                  </p>
                </div>
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            分析强度精准控制提示词与导图细化粒度；结合上方“文章读取范围与焦点”实现灵活多维度的深度研究。
          </p>
        </fieldset>
      )}

      <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 dark:bg-slate-800">
        <div className="flex items-center gap-2 font-semibold"><ShieldCheck size={15} />数据与费用</div>
        <p className="mt-1">开始后将通过 llm-for-zotero 向 {selectedModel?.local ? '本机模型' : selectedModel?.host || preview.endpointHost}（{selectedModel?.model || preview.model}，推理强度：{modelSelection.reasoningLevel}）发送资料，
          本次选中资料约 {selectedCharacters.toLocaleString()} 字符{mode === 'quick' ? '（简要模式将精炼节选）' : ''}。调用记录由 llm-for-zotero 管理；实际 token、费用和耗时由模型服务决定。
          仅有短引文与指定资料片段匹配的判断会标为“原文支持”，仍需回到原文核对。
          PDF、笔记、批注划线和批注评论会分别编号；评论只作为读者材料。</p>
      </div>
    </>
  );
};
