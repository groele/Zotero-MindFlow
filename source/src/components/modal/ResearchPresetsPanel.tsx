import React, { useLayoutEffect, useState } from 'react';
import { Sliders, Sparkles, Edit3 } from 'lucide-react';
import { THEMES } from '../../core/theme/themes';
import {
  ResearchPresetService, builtinResearchPrompts, builtinResearchPresentations,
  MAX_RESEARCH_PROMPT_LENGTH, type ResearchPresetConfig, type ResearchFocus,
} from '../../services/zotero/researchPresets';
import type { LayoutType } from '../../core/model/types';
import { ResearchPromptEditorModal } from './ResearchPromptEditorModal';

interface Props {
  isOpen: boolean;
  value: ResearchPresetConfig;
  onChange: (value: ResearchPresetConfig) => void;
}

export const ResearchPresetsPanel: React.FC<Props> = ({ isOpen, value, onChange }) => {
  const [store, setStore] = useState<ReturnType<typeof ResearchPresetService.read>>({ version: 1, defaultId: '', presets: [] });
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const run = (action: () => void) => {
    try {
      action();
      setFailed(false);
    } catch (error: any) {
      setFailed(true);
      setMessage(String(error.message));
    }
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    run(() => {
      const next = ResearchPresetService.read();
      setStore(next);
      const preset = next.presets.find(p => p.id === next.defaultId);
      setSelectedId(preset?.id || '');
      setName(preset?.name || '');
      setMessage('');
      if (preset) onChange(preset);
    });
  }, [isOpen]);

  const activeFocus = value.focus || 'all';

  const handleSelectQuickFocus = (focus: ResearchFocus) => {
    const matchedPrompt = builtinResearchPrompts.find(p => p.focus === focus);
    if (matchedPrompt) {
      onChange({
        ...value,
        focus,
        customPrompt: matchedPrompt.text,
        category: matchedPrompt.category,
      });
      setMessage(`已应用【${matchedPrompt.name}】功能属性提示词。`);
    } else {
      onChange({ ...value, focus });
    }
  };

  const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-800';
  const buttonClass = 'rounded-lg border border-slate-300 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-slate-600';
  const presentationId = builtinResearchPresentations.find(p => JSON.stringify(p.value) === JSON.stringify(value.presentation))?.id || 'custom';

  return (
    <fieldset className="space-y-3.5 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <legend className="px-1 font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Sparkles size={14} className="text-blue-600 dark:text-blue-400" />
          <span>提示词与呈现预设</span>
        </legend>
        <button
          type="button"
          onClick={() => setIsEditorOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors shadow-xs"
        >
          <Sliders size={13} />
          <span>打开可编辑视窗 / 预设工作台</span>
        </button>
      </div>

      <p className="text-xs leading-5 text-slate-500">
        快捷点击下方功能属性卡片可直观切换专属提示词；点击右上角工作台可全屏编辑或自定义保存。
      </p>

      {/* 快捷功能属性切换视窗卡片网格 */}
      <div>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
          学术功能属性快速切换：
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {builtinResearchPrompts.map(p => {
            const isSelected = value.customPrompt === p.text || (value.focus === p.focus && !value.customPrompt && !p.text);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectQuickFocus(p.focus)}
                className={`p-2 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/60 dark:border-blue-700 text-blue-900 dark:text-blue-200 shadow-xs ring-1 ring-blue-400/50'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-medium truncate">{p.name}</span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {p.badge}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-1 leading-tight">{p.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 可编辑补充提示词 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            当前生效的补充提示词（可直接在下方编辑微调）
          </label>
          <button
            type="button"
            onClick={() => setIsEditorOpen(true)}
            className="text-[11px] text-blue-600 hover:underline dark:text-blue-400 inline-flex items-center gap-1"
          >
            <Edit3 size={11} />在工作台中编辑
          </button>
        </div>
        <textarea
          aria-label="补充提示词"
          rows={3}
          maxLength={MAX_RESEARCH_PROMPT_LENGTH}
          value={value.customPrompt}
          onChange={e => onChange({ ...value, customPrompt: e.target.value })}
          className={inputClass}
          placeholder="例如：重点分析材料体系、温度依赖和对照实验，保留数值、单位与原文线索。"
        />
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span>{value.customPrompt.length}/{MAX_RESEARCH_PROMPT_LENGTH} 字符。提示词随资料发送给模型。</span>
          {activeFocus !== 'all' && (
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              当前重点侧重：{builtinResearchPrompts.find(p => p.focus === activeFocus)?.name || activeFocus}
            </span>
          )}
        </div>
      </div>

      {/* 预设管理下拉与保存 */}
      <div className="grid gap-3 sm:grid-cols-2 pt-1 border-t border-slate-200 dark:border-slate-700">
        <label className="block text-xs">我的预设
          <select aria-label="我的导图预设" className={inputClass} value={selectedId} onChange={e => run(() => {
            const next = ResearchPresetService.read();
            setStore(next);
            const preset = next.presets.find(p => p.id === e.target.value);
            setSelectedId(preset?.id || '');
            setName(preset?.name || '');
            setMessage('');
            if (preset) onChange(preset);
          })}>
            <option value="">本次自定义</option>
            {store.presets.map(p => <option key={p.id} value={p.id}>{p.name}{store.defaultId === p.id ? '（默认）' : ''}</option>)}
          </select>
        </label>

        <label className="block text-xs">呈现模板
          <select aria-label="呈现模板" className={inputClass} value={presentationId} onChange={e => {
            const chosen = builtinResearchPresentations.find(p => p.id === e.target.value);
            onChange({ ...value, presentation: chosen ? chosen.value : { themeId: 'classic-blue', layoutType: 'mindmap' } });
          }}>
            {builtinResearchPresentations.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="custom">自选主题与布局</option>
          </select>
        </label>
      </div>

      {value.presentation && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs">主题<select aria-label="预设主题" className={inputClass} value={value.presentation.themeId}
            onChange={e => onChange({ ...value, presentation: { ...value.presentation!, themeId: e.target.value } })}>
            {Object.values(THEMES).map(theme => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
          </select></label>
          <label className="text-xs">布局<select aria-label="预设布局" className={inputClass} value={value.presentation.layoutType}
            onChange={e => onChange({ ...value, presentation: { ...value.presentation!, layoutType: e.target.value as LayoutType } })}>
            <option value="mindmap">双侧思维导图</option><option value="logic-right">向右逻辑图</option><option value="org-down">向下层级图</option>
          </select></label>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <input aria-label="预设名称" maxLength={60} value={name} onChange={e => setName(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-800 flex-1 min-w-[140px]"
          placeholder="另存预设名称..." />
        <button type="button" className={buttonClass} disabled={!name.trim()} onClick={() => run(() => {
          const next = ResearchPresetService.save(name, value);
          setStore(next);
          setSelectedId(next.presets[next.presets.length - 1].id);
          setMessage('已另存为新预设。');
        })}>另存为新预设</button>
        <button type="button" className={buttonClass} disabled={!selectedId || !name.trim()} onClick={() => run(() => {
          setStore(ResearchPresetService.save(name, value, selectedId));
          setMessage('已更新预设。');
        })}>更新所选预设</button>
        <button type="button" className={buttonClass} disabled={!selectedId} onClick={() => run(() => {
          setStore(ResearchPresetService.setDefault(selectedId));
          setMessage('下次打开分析窗口时自动载入已保存的默认预设。');
        })}>设为默认</button>
      </div>

      {message && (
        <p role={failed ? 'alert' : 'status'} className={failed ? 'text-xs text-red-600' : 'text-xs text-emerald-700 dark:text-emerald-400'}>
          {message}
        </p>
      )}

      {/* 专用可编辑工作台视窗 Modal */}
      <ResearchPromptEditorModal
        isOpen={isEditorOpen}
        value={value}
        onClose={() => setIsEditorOpen(false)}
        onApply={(newConfig) => {
          onChange(newConfig);
          setMessage(`已应用预设配置。`);
        }}
      />
    </fieldset>
  );
};
