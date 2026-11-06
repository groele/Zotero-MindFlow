import * as React from 'react';
import { useAppController } from './useAppController';
import { AppShell } from './AppShell';
import { AppAiResearchHost } from './AppAiResearchHost';
import type { AppContext } from './appContext';

interface AppProps {
  isSidepanelMode?: boolean;
}

export const App: React.FC<AppProps> = ({ isSidepanelMode = false }) => {
  const ctx: AppContext = useAppController({ isSidepanelMode });
  const { doc, aiWorkflow, saveStatus, createBlankDocRef } = ctx;

  // AI can start before any map exists. Keep its preview visible in that state.
  if (!doc) {
    return (
      <>
        <div className="w-full h-full flex flex-col gap-3 items-center justify-center bg-slate-50 text-slate-400 text-sm">
          {aiWorkflow ? '请确认论文分析设置' : saveStatus.state === 'error' || saveStatus.state === 'warning' ? saveStatus.message : '正在加载思维导图...'}
          {!aiWorkflow && (saveStatus.state === 'error' || saveStatus.state === 'warning') &&
            <button type="button" onClick={() => { void createBlankDocRef.current(); }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white">新建空白导图</button>}
        </div>
        <AppAiResearchHost ctx={ctx} />
      </>
    );
  }

  return <AppShell ctx={ctx} />;
};
