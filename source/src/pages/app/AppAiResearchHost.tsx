import { AIResearchModal } from '../../components/modal/AIResearchModal';
import { openZoteroPreferences } from '../../services/zotero/zoteroBridge';
import type { AppContext } from './appContext';

export const AppAiResearchHost = ({ ctx }: { ctx: AppContext }) => {
  const { doc, aiWorkflow, setAiWorkflow, settings, handleAnalyzeZoteroPaper,
         handleCancelAiAnalysis, handleStartAiAnalysis } = ctx;
  return (
    <>
      <AIResearchModal
        appearance={{ themeId: doc?.themeId || settings.defaultThemeId, layoutType: doc?.layoutType || settings.defaultLayout }}
        isOpen={Boolean(aiWorkflow)}
        stage={aiWorkflow?.stage || 'preparing'}
        preview={aiWorkflow?.preview || null}
        progress={aiWorkflow?.progress || null}
        error={aiWorkflow?.error || ''}
        onStart={(mode, sources, model) => { void handleStartAiAnalysis(mode, sources, model); }}
        onRetry={(mode, sources, model) => {
          if (aiWorkflow?.preview) void handleStartAiAnalysis(mode, sources, model);
          else if (aiWorkflow?.reference) void handleAnalyzeZoteroPaper(aiWorkflow.reference);
        }}
        onCancel={handleCancelAiAnalysis}
        onClose={() => setAiWorkflow(null)}
        onRefresh={(readingMode, abstractSelection) => { if (aiWorkflow?.reference) void handleAnalyzeZoteroPaper(aiWorkflow.reference, readingMode || aiWorkflow.preview?.readingMode, abstractSelection); }}
        onSettings={() => openZoteroPreferences('llm-for-zotero')}
      />
    </>
  );
};
