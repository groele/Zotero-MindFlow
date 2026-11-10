import React, { useState, useLayoutEffect } from 'react';
import { X, Check, Bookmark, Plus, Trash2, Star, Sliders, FileText } from 'lucide-react';
import {
  ResearchPresetService, builtinResearchPrompts, builtinResearchPresentations,
  MAX_RESEARCH_PROMPT_LENGTH, type ResearchPresetConfig, type BuiltinPrompt,
} from '../../services/zotero/researchPresets';
import { type PromptEditorModalProps, FOCUS_OPTIONS, PROMPT_CHIPS } from './ResearchPromptEditorTypes';

export const ResearchPromptEditorModal: React.FC<PromptEditorModalProps> = ({ isOpen, value, onClose, onApply }) => {
  const [store, setStore] = useState<ReturnType<typeof ResearchPresetService.read>>({ version: 1, defaultId: '', presets: [] });
  const [activeTab, setActiveTab] = useState<string>('methods');
  const [editingConfig, setEditingConfig] = useState<ResearchPresetConfig>(value);
  const [name, setName] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);

  const loadStore = () => {
    try {
      const s = ResearchPresetService.read();
      setStore(s);
      setIsError(false);
      return s;
    } catch (err: any) {
      setIsError(true);
      setMessage(err.message || '加载预设失败');
      return { version: 1 as const, defaultId: '', presets: [] };
    }
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    loadStore();
    setEditingConfig(value);
    const matched = builtinResearchPrompts.find(p => p.text === value.customPrompt && p.focus === value.focus);
    if (matched) { setActiveTab(matched.id); setName(matched.name); }
    else { setActiveTab('custom'); setName('自定义提示词'); }
    setMessage('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectBuiltin = (prompt: BuiltinPrompt) => {
    setActiveTab(prompt.id);
    setName(prompt.name);
    setEditingConfig({ ...editingConfig, customPrompt: prompt.text, focus: prompt.focus, category: prompt.category });
    setMessage(`已切换为【${prompt.name}】功能属性提示词。`);
    setIsError(false);
  };

  const handleSelectUserPreset = (presetId: string) => {
    const p = store.presets.find(item => item.id === presetId);
    if (!p) return;
    setActiveTab(p.id);
    setName(p.name);
    setEditingConfig({ ...p });
    setMessage(`已载入用户自定义预设【${p.name}】。`);
    setIsError(false);
  };

  const handleInsertChip = (chip: string) => {
    const current = editingConfig.customPrompt || '';
    const prefix = current.trim() ? (current.endsWith('。') || current.endsWith('\n') ? current : current + '；') : '';
    const nextText = `${prefix}${prefix ? ' ' : ''}请${chip}。`;
    if (nextText.length <= MAX_RESEARCH_PROMPT_LENGTH) setEditingConfig({ ...editingConfig, customPrompt: nextText });
  };

  const handleSaveAsNew = () => {
    try {
      if (!name.trim()) throw new Error('请为新预设输入名称。');
      const updatedStore = ResearchPresetService.save(name, editingConfig);
      setStore(updatedStore);
      setActiveTab(updatedStore.presets[updatedStore.presets.length - 1].id);
      setIsError(false);
      setMessage(`已另存为新预设【${name.trim()}】。`);
    } catch (err: any) { setIsError(true); setMessage(err.message || '保存失败'); }
  };

  const handleUpdateCurrent = () => {
    try {
      if (!name.trim()) throw new Error('预设名称不能为空。');
      setStore(ResearchPresetService.save(name, editingConfig, activeTab));
      setIsError(false);
      setMessage(`已更新预设【${name.trim()}】。`);
    } catch (err: any) { setIsError(true); setMessage(err.message || '更新失败'); }
  };

  const handleDelete = () => {
    try {
      setStore(ResearchPresetService.remove(activeTab));
      setActiveTab('general');
      const fb = builtinResearchPrompts[0];
      setEditingConfig({ ...editingConfig, customPrompt: fb.text, focus: fb.focus });
      setName(fb.name);
      setIsError(false);
      setMessage('预设已删除。');
    } catch (err: any) { setIsError(true); setMessage(err.message || '删除失败'); }
  };

  const handleSetDefault = () => {
    try {
      setStore(ResearchPresetService.setDefault(activeTab));
      setIsError(false);
      setMessage('已设为默认预设。');
    } catch (err: any) { setIsError(true); setMessage(err.message || '设置默认失败'); }
  };

  const isUserPreset = store.presets.some(p => p.id === activeTab);
  const isDefault = store.defaultId === activeTab;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-3 sm:p-5" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="prompt-editor-title"
        className="flex max-h-[min(800px,95vh)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Sliders size={17} /><h2 id="prompt-editor-title" className="text-base font-bold text-slate-900 dark:text-white">提示词与功能预设工作台</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"><X size={18} /></button>
        </header>

        <div className="flex flex-1 min-h-0 flex-col md:flex-row overflow-hidden">
          {/* 左侧预设库列表 */}
          <div className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-3 overflow-y-auto space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">学术功能预设</span>
              <button type="button" onClick={() => { setActiveTab('custom'); setName('新自定义预设'); setEditingConfig({ ...editingConfig, customPrompt: '', focus: 'all' }); setMessage('已进入新预设编辑模式。'); }}
                className="inline-flex items-center gap-0.5 text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"><Plus size={11} />新建</button>
            </div>

            <div className="space-y-1">
              {builtinResearchPrompts.map(p => (
                <button key={p.id} type="button" onClick={() => handleSelectBuiltin(p)}
                  className={`w-full text-left rounded-xl p-2 transition-all text-xs flex items-center justify-between border ${activeTab === p.id ? 'bg-blue-50 border-blue-200 text-blue-900 font-medium dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-200 shadow-xs' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'}`}>
                  <div className="flex items-center gap-2 truncate">
                    <span className="shrink-0 text-sm leading-none">{FOCUS_OPTIONS.find(f => f.id === p.focus)?.icon || '📖'}</span>
                    <span className="truncate">{p.name}</span>
                  </div>
                  <span className="shrink-0 text-[10px] px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{p.badge}</span>
                </button>
              ))}
            </div>

            {store.presets.length > 0 && (
              <>
                <div className="px-1 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">我的预设</span>
                </div>
                <div className="space-y-1">
                  {store.presets.map(p => (
                    <button key={p.id} type="button" onClick={() => handleSelectUserPreset(p.id)}
                      className={`w-full text-left rounded-xl p-2 transition-all text-xs flex items-center justify-between border ${activeTab === p.id ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200 shadow-xs' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'}`}>
                      <div className="flex items-center gap-1.5 truncate"><Bookmark size={12} className="text-emerald-600 shrink-0" /><span className="truncate">{p.name}</span></div>
                      {store.defaultId === p.id && <span className="shrink-0 text-[10px] px-1 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-medium">默认</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 右侧主编辑工作台 */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-900 dark:text-white">预设名称
                <input type="text" maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="例如：重点方法与定量复现"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-normal dark:border-slate-600 dark:bg-slate-800" />
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">重点分析侧重（模型研读焦点）</label>
                <div className="flex flex-wrap gap-1">
                  {FOCUS_OPTIONS.map(opt => (
                    <button key={opt.id} type="button" onClick={() => setEditingConfig({ ...editingConfig, focus: opt.id })}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors border ${(editingConfig.focus || 'all') === opt.id ? 'bg-blue-600 border-blue-600 text-white font-medium shadow-xs' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'}`}>
                      <span>{opt.icon}</span><span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 提示词编辑 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileText size={13} className="text-blue-600 dark:text-blue-400" /><span>可编辑补充提示词</span>
                </label>
                <span className="text-[11px] text-slate-400">{editingConfig.customPrompt.length} / {MAX_RESEARCH_PROMPT_LENGTH} 字符</span>
              </div>
              <textarea rows={5} maxLength={MAX_RESEARCH_PROMPT_LENGTH} value={editingConfig.customPrompt}
                onChange={e => setEditingConfig({ ...editingConfig, customPrompt: e.target.value })}
                placeholder="在此输入或微调学术指导词。例如：重点提炼实验方法、材料配比、测量条件与对照设计，保留数值、单位与原文线索..."
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-normal leading-relaxed dark:border-slate-600 dark:bg-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>

            {/* 快捷引导词标签 */}
            <div>
              <span className="text-[11px] text-slate-400 block mb-1">快捷插入学术分析要求：</span>
              <div className="flex flex-wrap gap-1">
                {PROMPT_CHIPS.map(chip => (
                  <button key={chip} type="button" onClick={() => handleInsertChip(chip)}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-800 dark:hover:bg-blue-950/60 dark:hover:text-blue-300 text-slate-600 dark:text-slate-300 transition-colors border border-slate-200/60 dark:border-slate-700/60">
                    <Plus size={10} />{chip}
                  </button>
                ))}
              </div>
            </div>

            {/* 导图外观绑定 */}
            <label className="block text-xs font-semibold text-slate-900 dark:text-white">绑定导图生成外观模板
              <select value={builtinResearchPresentations.find(p => JSON.stringify(p.value) === JSON.stringify(editingConfig.presentation))?.id || 'inherit'}
                onChange={e => { const chosen = builtinResearchPresentations.find(p => p.id === e.target.value); setEditingConfig({ ...editingConfig, presentation: chosen ? chosen.value : null }); }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-normal dark:border-slate-600 dark:bg-slate-800">
                {builtinResearchPresentations.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>

            {message && (
              <p role={isError ? 'alert' : 'status'}
                className={`text-xs px-2.5 py-1.5 rounded-lg border ${isError ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300'}`}>
                {message}
              </p>
            )}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={handleSaveAsNew} disabled={!name.trim()}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 disabled:opacity-40">
              <Bookmark size={12} />另存为新预设
            </button>
            {isUserPreset && (
              <>
                <button type="button" onClick={handleUpdateCurrent}
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100">更新预设</button>
                <button type="button" onClick={handleDelete}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"><Trash2 size={12} />删除</button>
              </>
            )}
            {activeTab && (
              <button type="button" onClick={handleSetDefault} disabled={isDefault}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-40">
                <Star size={12} className={isDefault ? 'fill-amber-400 text-amber-500' : ''} />{isDefault ? '当前已为默认' : '设为默认'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100">取消</button>
            <button type="button" onClick={() => { onApply(editingConfig); onClose(); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 shadow-xs"><Check size={13} />应用此配置</button>
          </div>
        </footer>
      </section>
    </div>
  );
};
