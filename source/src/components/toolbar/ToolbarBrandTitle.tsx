import { MindFlowMark } from '../brand/MindFlowMark';
import { saveStatusLabel } from '../../core/model/saveStatus';
import type { ToolbarGroupProps } from './ToolbarConfig';

export const ToolbarBrandTitle = ({ ctx }: ToolbarGroupProps) => {
  const { title, onTitleChange, saveStatus } = ctx;

  return (
    <>
      {/* Left: App Logo & Document Title */}
      <div style={{ flex: '0 1 auto', width: 'auto', maxWidth: '100%' }} className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 flex-shrink-0" title="MindFlow" aria-label="MindFlow">
          <MindFlowMark className="w-8 h-8 flex-shrink-0" />

        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        {/* Editable Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 px-2 py-1 rounded-md border border-transparent focus:border-blue-400 outline-none transition-colors truncate max-w-[140px] sm:max-w-[240px]"
          title="点击修改思维导图标题"
          aria-label="思维导图标题"
        />
        {saveStatus && (
          <div
            role="status"
            aria-live="polite"
            title={saveStatus.message}
            className={`relative text-xs whitespace-nowrap shrink-0 ${
              saveStatus.state === 'error'
                ? 'text-red-600 dark:text-red-400'
                : saveStatus.state === 'warning'
                ? 'text-amber-600 dark:text-amber-400'
                : saveStatus.state === 'saving'
                ? 'text-slate-600 dark:text-slate-300'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {saveStatus.state === 'warning' || saveStatus.state === 'error' ? (
              <details key={saveStatus.message}>
                <summary aria-label="查看状态详情" className="cursor-pointer">{saveStatusLabel(saveStatus)}</summary>
                <p className="absolute left-0 top-full z-50 mt-2 w-[min(420px,80vw)] whitespace-normal rounded-lg border border-amber-200 bg-white p-3 text-xs leading-5 text-slate-800 shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">{saveStatus.message}</p>
              </details>
            ) : saveStatusLabel(saveStatus)}
          </div>
        )}
      </div>
    </>
  );
};
