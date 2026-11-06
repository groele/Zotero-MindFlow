import { Check } from 'lucide-react';
import type { SettingsModalContext } from './useSettingsModal';

export const SettingsInterfaceTab = ({ ctx }: { ctx: SettingsModalContext }) => {
  const { currentSettings, handleSaveSettings } = ctx;
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
          工具栏位置定制
        </h3>
        <p className="text-[11px] text-slate-400 mb-2.5">
          根据日常操作习惯选择工具栏停靠在窗口顶部还是底部：
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleSaveSettings({ toolbarPosition: 'top' })}
            className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
              currentSettings.toolbarPosition === 'top'
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold ring-1 ring-blue-500'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              顶部置顶 (Top)
            </span>
            {currentSettings.toolbarPosition === 'top' && <Check className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => handleSaveSettings({ toolbarPosition: 'bottom' })}
            className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
              currentSettings.toolbarPosition === 'bottom'
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold ring-1 ring-blue-500'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              底部置底 (Bottom)
            </span>
            {currentSettings.toolbarPosition === 'bottom' && <Check className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="h-px bg-slate-200 dark:border-slate-800" />

      <div>
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
          宏观工作台停靠位置
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleSaveSettings({ workbenchDockPosition: 'left' })}
            className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
              currentSettings.workbenchDockPosition === 'left'
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold ring-1 ring-blue-500'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>左侧停靠 (Left)</span>
            {currentSettings.workbenchDockPosition === 'left' && <Check className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => handleSaveSettings({ workbenchDockPosition: 'right' })}
            className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
              currentSettings.workbenchDockPosition === 'right'
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold ring-1 ring-blue-500'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>右侧停靠 (Right)</span>
            {currentSettings.workbenchDockPosition === 'right' && <Check className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="h-px bg-slate-200 dark:border-slate-800" />

      <div>
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-1">
          工具栏功能按钮定制
        </h3>
        <p className="text-[11px] text-slate-400 mb-2.5">
          勾选希望常驻显示的工具栏按钮，在紧凑界面或侧边栏模式下可隐藏不常用项：
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'history', label: '撤销 / 重做' },
            { key: 'insert', label: '新建子级 / 同级分支' },
            { key: 'layout', label: '思维导图/逻辑/组织架构' },
            { key: 'theme', label: '主题配色选择器' },
            { key: 'outline', label: '大纲视图切换' },
            { key: 'inbox', label: '灵感收集箱' },
            { key: 'templates', label: '专业模板库' },
            { key: 'zen', label: 'Zen 专注模式' },
            { key: 'export', label: '导入 / 导出菜单' },
            { key: 'zoom', label: '画布缩放控件' },
          ].map((btn) => {
            const isChecked = currentSettings.toolbarButtons[btn.key as keyof typeof currentSettings.toolbarButtons];
            return (
              <label
                key={btn.key}
                className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    handleSaveSettings({
                      toolbarButtons: {
                        ...currentSettings.toolbarButtons,
                        [btn.key]: e.target.checked,
                      },
                    });
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span className="text-[11px]">{btn.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-500">低频入口位置：原有功能开关关闭时，该入口同时隐藏。</p>
        {([['toolbarTemplatesPlacement', '模板'], ['toolbarPresentationPlacement', '演示'], ['toolbarExportPlacement', '导入与导出']] as const).map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-3 text-xs">
            {label}
            <select value={currentSettings[key]} onChange={event => handleSaveSettings({ [key]: event.target.value })}
              className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1">
              <option value="toolbar">工具栏</option><option value="more">更多</option><option value="hidden">隐藏</option>
            </select>
          </label>
        ))}
      </div>

      <div className="h-px bg-slate-200 dark:border-slate-800" />

      <div>
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
          画布背景纹理
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'dots', label: '点阵纹理 (Dots)' },
            { id: 'grid', label: '方格纹理 (Grid)' },
            { id: 'blank', label: '纯净无格 (Blank)' },
          ].map((bg) => (
            <button
              key={bg.id}
              onClick={() => handleSaveSettings({ canvasBackground: bg.id as any })}
              className={`p-2 rounded-xl border text-center transition-all ${
                currentSettings.canvasBackground === bg.id
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold ring-1 ring-blue-500'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {bg.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
