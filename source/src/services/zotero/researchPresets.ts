import { safeStorage } from '../storage/safeStorage';
import { defaultResearchTemplateId, getResearchTemplate } from './researchTemplates';
import { THEMES } from '../../core/theme/themes';
import type { LayoutType } from '../../core/model/types';
import type { ResearchFocus } from './researchAnalysisTypes';

export { type ResearchFocus };
export const MAX_RESEARCH_PROMPT_LENGTH = 6000;
const KEY = 'mindflow_research_presets_v1';

export type PresetCategory = 'presentation' | 'evidence' | 'reproduce' | 'general' | 'custom';

export interface ResearchPresetConfig {
  templateId: string;
  customPrompt: string;
  // null explicitly preserves the current map's appearance.
  presentation: { themeId: string; layoutType: LayoutType } | null;
  focus?: ResearchFocus;
  category?: string;
}

export interface ResearchPreset extends ResearchPresetConfig {
  id: string;
  name: string;
}

interface PresetStore {
  version: 1;
  defaultId: string;
  presets: ResearchPreset[];
}

export const defaultResearchPresetConfig = (): ResearchPresetConfig => ({
  templateId: defaultResearchTemplateId,
  customPrompt: '',
  presentation: null,
  focus: 'all',
  category: 'general',
});

export interface BuiltinPrompt {
  id: string;
  name: string;
  category: PresetCategory;
  categoryLabel: string;
  focus: ResearchFocus;
  badge: string;
  description: string;
  text: string;
}

export const builtinResearchPrompts: BuiltinPrompt[] = [
  {
    id: 'general',
    name: '通用系统精读',
    category: 'general',
    categoryLabel: '系统综合',
    focus: 'all',
    badge: '全面精读',
    description: '系统梳理背景问题、方法、主要结果、机理因果与最终结论，保持全局结构平衡。',
    text: '',
  },
  {
    id: 'presentation',
    name: '组会汇报脉络精讲',
    category: 'presentation',
    categoryLabel: '汇报研讨',
    focus: 'all',
    badge: '组会汇报',
    description: '围绕“为什么做、怎样做、发现了什么、意义与不足”组织汇报脉络，突出3个核心亮点。',
    text: '【组会汇报导图】围绕为什么做（背景痛点）、怎样做（核心方法）、发现了什么（关键结果）以及证据是否充分组织信息。优先保留最多三个核心亮点，使用清楚规范的学术中文，保留专业名词缩写和关键定量指标。',
  },
  {
    id: 'evidence',
    name: '严谨证据链与复现验证',
    category: 'evidence',
    categoryLabel: '证据核验',
    focus: 'all',
    badge: '严格证据',
    description: '以科学证据链为核心，逐项核验假设→测量→解释的支撑力度，指出潜在假设缺口。',
    text: '【严谨证据链分析】优先梳理核心研究问题、关键对照和可直接支持结论的证据；明确区分直接观察、作者解释和仍需验证的机理。保留关键数值、条件及不确定性，标明对照缺失与待核验内容。',
  },
  {
    id: 'reproduce',
    name: '实验复现与参数提取',
    category: 'reproduce',
    categoryLabel: '复现提取',
    focus: 'all',
    badge: '实验复现',
    description: '提取具体材料配比、工艺流程、关键仪器参数与测量条件，为实验复现提供依据。',
    text: '【实验复现与参数提取】重点提取研究中的材料制备配比、关键测量参数（温度、压力、浓度、电压等具象数值与单位）及处理流程；标记作者未明确说明但复现必需的边界条件。',
  },
];

export const builtinResearchPresentations = [
  { id: 'inherit', name: '沿用当前导图', value: null },
  { id: 'reading', name: '论文精读 · 青绿双侧', value: { themeId: 'paper-reading', layoutType: 'mindmap' as LayoutType } },
  { id: 'academic', name: '学术报告 · 向右逻辑', value: { themeId: 'academic-paper', layoutType: 'logic-right' as LayoutType } },
  { id: 'outline', name: '研究大纲 · 向下层级', value: { themeId: 'minimal-ink', layoutType: 'org-down' as LayoutType } },
];

export function validateResearchPresetConfig(value: unknown): ResearchPresetConfig {
  const v = value as ResearchPresetConfig;
  if (!v || typeof v.templateId !== 'string') throw new Error('内容模板无效。');
  getResearchTemplate(v.templateId);
  if (typeof v.customPrompt !== 'string' || v.customPrompt.length > MAX_RESEARCH_PROMPT_LENGTH) {
    throw new Error(`补充提示词须为文本且不超过 ${MAX_RESEARCH_PROMPT_LENGTH} 字符。`);
  }
  if (v.presentation !== null && (!v.presentation || !Object.prototype.hasOwnProperty.call(THEMES, v.presentation.themeId) ||
      !['mindmap', 'logic-right', 'org-down'].includes(v.presentation.layoutType))) {
    throw new Error('呈现模板的主题或布局无效。');
  }
  const focus = ['all', 'abstract', 'methods', 'results', 'discussion', 'conclusion'].includes(v.focus as string)
    ? v.focus : 'all';
  return {
    templateId: v.templateId,
    customPrompt: v.customPrompt.trim(),
    presentation: v.presentation ? { themeId: v.presentation.themeId, layoutType: v.presentation.layoutType } : null,
    focus,
    category: typeof v.category === 'string' ? v.category : 'general',
  };
}

export class ResearchPresetService {
  static read(): PresetStore {
    const raw = safeStorage.getItem(KEY);
    if (raw === null) return { version: 1, defaultId: '', presets: [] };
    let data: PresetStore;
    try { data = JSON.parse(raw); } catch { throw new Error('导图预设数据损坏；未覆盖原数据。'); }
    if (!data || data.version !== 1 || !Array.isArray(data.presets) || data.presets.length > 30 ||
        typeof data.defaultId !== 'string') throw new Error('导图预设格式不兼容；未覆盖原数据。');
    const ids = new Set<string>();
    const presets = data.presets.map(p => {
      if (!p || typeof p.id !== 'string' || !/^preset_[\w-]{1,100}$/.test(p.id) || ids.has(p.id) ||
          typeof p.name !== 'string' || !p.name.trim() || p.name.length > 60) throw new Error('导图预设记录无效；未覆盖原数据。');
      ids.add(p.id);
      return { id: p.id, name: p.name, ...validateResearchPresetConfig(p) };
    });
    if (data.defaultId && !ids.has(data.defaultId)) throw new Error('默认预设不存在；未覆盖原数据。');
    return { version: 1, defaultId: data.defaultId, presets };
  }

  static save(name: string, config: ResearchPresetConfig, id?: string): PresetStore {
    const validated = validateResearchPresetConfig(config);
    if (!name.trim() || name.trim().length > 60) throw new Error('预设名称须为 1–60 个字符。');
    const store = this.read();
    if (id && !store.presets.some(p => p.id === id)) throw new Error('该预设已被删除，请另存为新预设。');
    if (!id && store.presets.length >= 30) throw new Error('最多保存 30 个预设，请先删除不再使用的预设。');
    const randomId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    const preset: ResearchPreset = {
      id: id || `preset_${randomId}`,
      name: name.trim(),
      ...validated,
    };
    store.presets = id ? store.presets.map(p => p.id === id ? preset : p) : [...store.presets, preset];
    this.write(store);
    return store;
  }

  static remove(id: string): PresetStore {
    const store = this.read();
    store.presets = store.presets.filter(p => p.id !== id);
    if (store.defaultId === id) store.defaultId = '';
    this.write(store);
    return store;
  }

  static setDefault(id: string): PresetStore {
    const store = this.read();
    if (id && !store.presets.some(p => p.id === id)) throw new Error('默认预设已不存在，请重新选择。');
    store.defaultId = id;
    this.write(store);
    return store;
  }

  private static write(store: PresetStore): void {
    safeStorage.setItem(KEY, JSON.stringify(store));
  }
}
