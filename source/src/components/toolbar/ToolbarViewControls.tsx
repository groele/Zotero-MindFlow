import {
  Layout, Palette, ChevronDown, Check, Command, Inbox, Sparkles,
  Layers, Expand, GitBranch, ListTree, ListTree as ListTreeIcon,
  Maximize2, Search as SearchIcon, Presentation,
} from 'lucide-react';
import { THEMES } from '../../core/theme/themes';
import type { ThemeColors } from '../../core/model/types';
import type { ToolbarGroupProps } from './ToolbarConfig';

export const ToolbarViewControls = ({ ctx }: ToolbarGroupProps) => {
  const {
    buttons, isLayoutMenuOpen, setIsLayoutMenuOpen, setIsThemeMenuOpen, setIsExportMenuOpen,
    currentLayout, onLayoutChange, isThemeMenuOpen, onThemeChange, currentThemeId,
    onOpenCommandPalette, isInboxOpen, onToggleInbox, onOpenTemplates, toolbarTemplatesPlacement,
    onCollapseByLevel, isLevelMenuOpen, setIsLevelMenuOpen, isOutlineOpen, onToggleOutline,
    onToggleZen, onOpenSearch, onStartPresentation, toolbarPresentationPlacement,
  } = ctx;

  return (
    <>
      {/* Layout dropdown */}
      {buttons.layout && (
        <div className="relative">
          <button data-mindflow-popup-trigger="layout" aria-haspopup="menu" aria-expanded={isLayoutMenuOpen}
            onClick={() => {
              setIsLayoutMenuOpen(!isLayoutMenuOpen);
              setIsThemeMenuOpen(false);
              setIsExportMenuOpen(false);
            }}
            title="切换导图布局结构"
            className="flex items-center gap-1 p-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Layout className="w-4 h-4 text-slate-500" />
            <span className="hidden md:inline">
              {currentLayout === 'mindmap' ? '思维导图' : currentLayout === 'logic-right' ? '逻辑图' : '组织架构'}
            </span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {isLayoutMenuOpen && (
            <div data-mindflow-popup="layout" className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
              <button
                onClick={() => { onLayoutChange('mindmap'); setIsLayoutMenuOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 ${currentLayout === 'mindmap' ? 'text-blue-600 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}
              >
                <span>思维导图 (左右)</span>
                {currentLayout === 'mindmap' && <Check className="w-3 h-3" />}
              </button>
              <button
                onClick={() => { onLayoutChange('logic-right'); setIsLayoutMenuOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 ${currentLayout === 'logic-right' ? 'text-blue-600 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}
              >
                <span>逻辑图 (单向右)</span>
                {currentLayout === 'logic-right' && <Check className="w-3 h-3" />}
              </button>
              <button
                onClick={() => { onLayoutChange('org-down'); setIsLayoutMenuOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 ${currentLayout === 'org-down' ? 'text-blue-600 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}
              >
                <span>组织架构 (向下)</span>
                {currentLayout === 'org-down' && <Check className="w-3 h-3" />}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Theme dropdown */}
      {buttons.theme && (
        <div className="relative">
          <button data-mindflow-popup-trigger="theme" aria-haspopup="menu" aria-expanded={isThemeMenuOpen}
            onClick={() => {
              setIsThemeMenuOpen(!isThemeMenuOpen);
              setIsLayoutMenuOpen(false);
              setIsExportMenuOpen(false);
            }}
            title="选择设计主题"
            className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Palette className="w-4 h-4 text-slate-500" />
          </button>

          {isThemeMenuOpen && (
            <div data-mindflow-popup="theme" className="absolute right-0 mt-1 w-52 max-h-80 overflow-y-auto bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 py-1.5 z-50">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                选择设计主题
              </div>
              {Object.values(THEMES).map((thm: ThemeColors) => (
                <button
                  key={thm.id}
                  onClick={() => { onThemeChange(thm.id); setIsThemeMenuOpen(false); }}
                  className="w-full px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: thm.rootBg }} />
                    <span>{thm.name}</span>
                  </div>
                  {currentThemeId === thm.id && <Check className="w-3 h-3 text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Command Palette button */}
      {onOpenCommandPalette && (
        <button
          onClick={onOpenCommandPalette}
          title="全局命令面板与搜索 (Ctrl+K)"
          className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
        >
          <Command className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="hidden xl:inline text-[11px]">命令</span>
          <kbd className="hidden lg:inline text-[10px] text-slate-400 bg-white dark:bg-slate-700 px-1 rounded border border-slate-200 dark:border-slate-600">{/Mac/i.test(navigator.platform) ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
      )}

      {/* Inbox button */}
      {buttons.inbox && onToggleInbox && (
        <button
          onClick={onToggleInbox}
          title="灵感与网页收集箱 (Inbox)"
          className={`p-1.5 rounded-lg transition-colors ${
            isInboxOpen
              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Inbox className="w-4 h-4" />
        </button>
      )}

      {/* Templates button */}
      {buttons.templates && onOpenTemplates && toolbarTemplatesPlacement === 'toolbar' && (
        <button
          onClick={onOpenTemplates}
          title="模版库 (SWOT/读书笔记/敏捷规划)"
          className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Sparkles className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </button>
      )}

      {/* Branch Level Fold / Expand menu */}
      {onCollapseByLevel && (
        <div className="relative">
          <button data-mindflow-popup-trigger="level" aria-haspopup="menu" aria-expanded={isLevelMenuOpen}
            onClick={() => {
              setIsLevelMenuOpen(!isLevelMenuOpen);
              setIsExportMenuOpen(false);
              setIsThemeMenuOpen(false);
              setIsLayoutMenuOpen(false);
            }}
            title="分支层级折叠与展开"
            className={`p-1.5 rounded-lg transition-colors ${isLevelMenuOpen ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Layers className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
          {isLevelMenuOpen && (
            <div data-mindflow-popup="level" className="absolute left-0 mt-1 w-44 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 py-1.5 z-50">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                视图层级折叠
              </div>
              <button
                onClick={() => { onCollapseByLevel(99); setIsLevelMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-between"
              >
                <span className="flex items-center gap-2"><Expand className="w-3.5 h-3.5" />展开全部节点</span>
                <kbd className="text-[10px] font-mono text-slate-400">Alt+0</kbd>
              </button>
              <button
                onClick={() => { onCollapseByLevel(3); setIsLevelMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-between"
              >
                <span className="flex items-center gap-2"><GitBranch className="w-3.5 h-3.5" />展开至 3 级分支</span>
                <kbd className="text-[10px] font-mono text-slate-400">Alt+3</kbd>
              </button>
              <button
                onClick={() => { onCollapseByLevel(2); setIsLevelMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-between"
              >
                <span className="flex items-center gap-2"><GitBranch className="w-3.5 h-3.5" />展开至 2 级分支</span>
                <kbd className="text-[10px] font-mono text-slate-400">Alt+2</kbd>
              </button>
              <button
                onClick={() => { onCollapseByLevel(1); setIsLevelMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-between"
              >
                <span className="flex items-center gap-2"><ListTreeIcon className="w-3.5 h-3.5" />仅显示 1 级主干</span>
                <kbd className="text-[10px] font-mono text-slate-400">Alt+1</kbd>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Outline view toggle */}
      {buttons.outline && (
        <button
          onClick={onToggleOutline}
          title="切换大纲模式"
          className={`p-1.5 rounded-lg transition-colors ${isOutlineOpen ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <ListTree className="w-4 h-4" />
        </button>
      )}

      {/* Zen Mode toggle */}
      {buttons.zen && onToggleZen && (
        <button
          onClick={onToggleZen}
          title="开启禅模式 (Zen Focus Mode)"
          className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Maximize2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </button>
      )}

      {/* In-canvas Search */}
      {onOpenSearch && (
        <button
          onClick={onOpenSearch}
          title="在导图中搜索 (Ctrl+F)"
          className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <SearchIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </button>
      )}

      {/* Presentation Mode */}
      {onStartPresentation && toolbarPresentationPlacement === 'toolbar' && (
        <button
          onClick={onStartPresentation}
          title="全屏路演/演示模式 (Presentation Mode)"
          className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Presentation className="w-4 h-4" />
        </button>
      )}
    </>
  );
};
