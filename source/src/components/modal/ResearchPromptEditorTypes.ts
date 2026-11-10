import type { ResearchPresetConfig, ResearchFocus } from '../../services/zotero/researchPresets';

export interface PromptEditorModalProps {
  isOpen: boolean;
  value: ResearchPresetConfig;
  onClose: () => void;
  onApply: (value: ResearchPresetConfig) => void;
}

export const FOCUS_OPTIONS: Array<{ id: ResearchFocus; label: string; icon: string }> = [
  { id: 'all', label: '全文综合', icon: '🌟' },
  { id: 'methods', label: '方法与实验', icon: '🔬' },
  { id: 'discussion', label: '讨论与机理', icon: '💡' },
  { id: 'results', label: '结果与数据', icon: '📊' },
  { id: 'conclusion', label: '结论与贡献', icon: '🎯' },
  { id: 'abstract', label: '摘要与主旨', icon: '📝' },
];

export const PROMPT_CHIPS = [
  '提取定量数值与单位',
  '重点辨析因果机理',
  '突出对照组实验设计',
  '区分作者解释与直接证据',
  '强调局限性与未解问题',
  '规范学术中文术语',
];
