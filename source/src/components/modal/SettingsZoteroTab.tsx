import { Monitor, Pin, AppWindow, BookOpen, GraduationCap, Check, ExternalLink } from 'lucide-react';
import { isZoteroEnvironment, setZoteroPref, requestZoteroWindowMode } from '../../services/zotero/zoteroBridge';
import type { SettingsModalContext } from './useSettingsModal';

export const SettingsZoteroTab = ({ ctx }: { ctx: SettingsModalContext }) => {
  const { currentSettings, handleSaveSettings } = ctx;
  return (
    <div className="space-y-4">
      {/* 1. Window Mode */}
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
          <Monitor className="h-4 w-4" />导图展示与窗口协同模式
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              handleSaveSettings({ zoteroWindowMode: 'tab' });
              setZoteroPref('windowMode', 'tab');
            }}
            className={`p-3 rounded-xl border text-left transition-all ${
              currentSettings.zoteroWindowMode === 'tab'
                ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/30 text-sky-800 dark:text-sky-200 ring-1 ring-sky-500 font-medium'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold flex items-center gap-1.5 text-xs">
                <Pin className="h-3.5 w-3.5" />内嵌窗口（原生选项卡）
              </span>
              {currentSettings.zoteroWindowMode === 'tab' && (
                <Check className="w-3.5 h-3.5 text-sky-600" />
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
              直接嵌入在 Zotero 主界面顶部标签栏，与文库、PDF 标签并列切换，体验紧凑一体化（推荐）。
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              handleSaveSettings({ zoteroWindowMode: 'window' });
              setZoteroPref('windowMode', 'window');
            }}
            className={`p-3 rounded-xl border text-left transition-all ${
              currentSettings.zoteroWindowMode === 'window'
                ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/30 text-sky-800 dark:text-sky-200 ring-1 ring-sky-500 font-medium'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold flex items-center gap-1.5 text-xs">
                <AppWindow className="h-3.5 w-3.5" />独立窗口（独立应用浮窗）
              </span>
              {currentSettings.zoteroWindowMode === 'window' && (
                <Check className="w-3.5 h-3.5 text-sky-600" />
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
              开辟独立的桌面级窗口，适合多显示器、双屏对照研读或需要超大独立画布的深度构思场景。
            </p>
          </button>
        </div>

        {isZoteroEnvironment() && (
          <div className="mt-2 flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500">
              当前环境已连接 Zotero 10，设置会同步至 Zotero 的 MindFlow 设置面板。
            </span>
            <button
              type="button"
              onClick={() => requestZoteroWindowMode(currentSettings.zoteroWindowMode === 'tab' ? 'window' : 'tab')}
              className="px-2.5 py-1 text-[11px] font-medium bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              <span>{currentSettings.zoteroWindowMode === 'tab' ? '在新独立窗口中打开' : '切回内嵌选项卡'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="h-px bg-slate-200 dark:border-slate-800" />

      {/* 2. Extraction & Parsing Rules */}
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
          <BookOpen className="h-4 w-4" />文献导入与导图生成偏好
        </h3>
        <div className="space-y-2.5">
          <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">自动提取文献核心摘要 (Abstract)</div>
              <div className="text-[10px] text-slate-400">导入论文时生成独立的二级摘要分支，并完整记录至节点备注</div>
            </div>
            <input
              type="checkbox"
              checked={currentSettings.zoteroIncludeAbstract}
              onChange={(e) => {
                handleSaveSettings({ zoteroIncludeAbstract: e.target.checked });
                setZoteroPref('includeAbstract', e.target.checked);
              }}
              className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">自动提取 PDF 划线高亮批注与笔记 (Annotations)</div>
              <div className="text-[10px] text-slate-400">读取 Zotero 内置阅读器的高亮标注、页码与批注内容，生成研读子项</div>
            </div>
            <input
              type="checkbox"
              checked={currentSettings.zoteroIncludeAnnotations}
              onChange={(e) => {
                handleSaveSettings({ zoteroIncludeAnnotations: e.target.checked });
                setZoteroPref('includeAnnotations', e.target.checked);
              }}
              className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">自动提取文献关键词为标签 (Tags)</div>
              <div className="text-[10px] text-slate-400">将论文在 Zotero 中的标签转为导图节点标签徽标</div>
            </div>
            <input
              type="checkbox"
              checked={currentSettings.zoteroIncludeTags}
              onChange={(e) => {
                handleSaveSettings({ zoteroIncludeTags: e.target.checked });
                setZoteroPref('includeTags', e.target.checked);
              }}
              className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
            />
          </label>
        </div>
      </div>

      <div className="h-px bg-slate-200 dark:border-slate-800" />

      {/* 3. Zotero System Setting Notice */}
      <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 rounded-xl space-y-1.5 text-[11px] text-sky-800 dark:text-sky-200">
        <div className="font-bold flex items-center gap-1.5">
          <GraduationCap className="w-4 h-4 text-sky-600" />
          <span>Zotero 系统级偏好设置已注册</span>
        </div>
        <p className="leading-relaxed text-sky-700 dark:text-sky-300">
          在 Zotero 顶栏菜单中点击 <strong>“编辑” → “设置”</strong>（或使用快捷键 <kbd className="font-mono bg-sky-100 dark:bg-sky-900 px-1 rounded">Ctrl+,</kbd>），在左侧设置列表中可直接找到 <strong>MindFlow</strong> 专属控制面板，进行系统级规则配置。
        </p>
      </div>
    </div>
  );
};
