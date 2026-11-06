import type {
  ResearchAppearance, ResearchInputPreview, ResearchProgress, ResearchSourceSelection,
  ResearchModelSelection, ResearchAnalysisIntensity, ResearchReadingMode,
} from '../../services/zotero/researchAnalysis';

export type AIResearchStage = 'preparing' | 'ready' | 'running' | 'saving' | 'error';

export interface AIResearchModalProps {
  appearance: ResearchAppearance;
  isOpen: boolean;
  stage: AIResearchStage;
  preview: ResearchInputPreview | null;
  progress: ResearchProgress | null;
  error: string;
  onStart: (mode: ResearchAnalysisIntensity, sources: ResearchSourceSelection, model: ResearchModelSelection) => void;
  onRetry: (mode: ResearchAnalysisIntensity, sources: ResearchSourceSelection, model: ResearchModelSelection) => void;
  onCancel: () => void;
  onClose: () => void;
  onRefresh: (readingMode?: ResearchReadingMode, abstractSelection?: { preparedId: string; text: string }) => void;
  onSettings: () => void;
}

export const getProgressPercent = (progress: ResearchProgress | null): number | null =>
  progress && Number.isFinite(progress.total) && Number.isFinite(progress.completed) && progress.total > 0
    ? Math.min(100, Math.max(0, Math.round((progress.completed / progress.total) * 100)))
    : null;

export const getLiveStatus = (stage: AIResearchStage, progress: ResearchProgress | null, error: string): string =>
  stage === 'preparing' ? '正在整理所选论文资料，尚未向模型发送内容。'
    : stage === 'running' ? (progress?.phase || '正在分析论文。')
      : stage === 'saving' ? '分析结果已生成，正在保存可编辑草稿。'
        : stage === 'error' ? `分析失败：${error || '请检查设置后重试。'}`
          : '论文资料已准备，请确认发送范围后开始分析。';
