import { THEMES } from '../../core/theme/themes';
import type { SettingsModalContext } from './useSettingsModal';

export const SettingsEditingTab = ({ ctx }: { ctx: SettingsModalContext }) => {
  const { currentSettings, handleSaveSettings } = ctx;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
          新建导图默认选项
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              默认配色主题
            </label>
            <select
              value={currentSettings.defaultThemeId}
              onChange={(e) => handleSaveSettings({ defaultThemeId: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none"
            >
              {Object.values(THEMES).map((th) => (
                <option key={th.id} value={th.id}>{th.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              默认布局方式
            </label>
            <select
              value={currentSettings.defaultLayout}
              onChange={(e) => handleSaveSettings({ defaultLayout: e.target.value as any })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none"
            >
              <option value="mindmap">左右平衡思维导图</option>
              <option value="logic-right">向右逻辑结构图</option>
              <option value="org-down">向下组织架构图</option>
            </select>
          </div>
        </div>
      </div>

      <div className="h-px bg-slate-200 dark:border-slate-800" />

      <div>
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
          分支连线与视觉艺术
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              连线连接风格 (Curve Style)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'bezier', label: '平滑曲线 (Smooth)' },
                { id: 'straight', label: '直连线 (Straight)' },
                { id: 'rounded', label: '圆角正交 (Rounded)' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSaveSettings({ curveStyle: c.id as any })}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    currentSettings.curveStyle === c.id
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold ring-1 ring-blue-500'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">彩虹分支色彩 (Rainbow Branches)</div>
              <div className="text-[10px] text-slate-400">第一层各大主分支自动分配色彩缤纷的谱系颜色，子级自动继承</div>
            </div>
            <input
              type="checkbox"
              checked={currentSettings.rainbowBranches}
              onChange={(e) => handleSaveSettings({ rainbowBranches: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">交互音效反馈 (Sound Effects)</div>
              <div className="text-[10px] text-slate-400">新增节点、完成任务打勾、删除时播放原生合成的高质感微音效</div>
            </div>
            <input
              type="checkbox"
              checked={currentSettings.soundEffects}
              onChange={(e) => handleSaveSettings({ soundEffects: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
          </label>
        </div>
      </div>

      <div className="h-px bg-slate-200 dark:border-slate-800" />

      <div>
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
          节点交互习惯
        </h3>
        <div className="space-y-2.5">
          <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">添加子节点时自动展开父节点</div>
              <div className="text-[10px] text-slate-400">若父分支当前处于折叠状态，按 Tab 时将自动展开显示新子项</div>
            </div>
            <input
              type="checkbox"
              checked={currentSettings.autoExpandOnAddChild}
              onChange={(e) => handleSaveSettings({ autoExpandOnAddChild: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
