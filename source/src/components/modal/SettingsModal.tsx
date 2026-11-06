import React from 'react';
import {
  X, Sliders, Cloud, ShieldCheck, Settings, Info,
  Sparkles, GraduationCap, ExternalLink, Bot
} from 'lucide-react';
import { isZoteroEnvironment, openZoteroPreferences } from '../../services/zotero/zoteroBridge';
import type { SettingsModalProps } from './settingsModalUtils';
import { useSettingsModal } from './useSettingsModal';
import { SettingsInterfaceTab } from './SettingsInterfaceTab';
import { SettingsWebdavTab } from './SettingsWebdavTab';
import { SettingsBackupTab } from './SettingsBackupTab';
import { SettingsEditingTab } from './SettingsEditingTab';
import { SettingsZoteroTab } from './SettingsZoteroTab';
import { SettingsLicenseTab } from './SettingsLicenseTab';
import { SettingsAiTab } from './SettingsAiTab';
import { SettingsAboutTab } from './SettingsAboutTab';

export const SettingsModal: React.FC<SettingsModalProps> = (props) => {
  const { isOpen, onClose } = props;
  const ctx = useSettingsModal(props);
  const { activeTab, setActiveTab } = ctx;
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[560px] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">系统设置与偏好</h2>
              <p className="text-[11px] text-slate-400">自定义工具栏、数据备份、WebDAV 云同步与高级偏好</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isZoteroEnvironment() && (
          <div className="bg-sky-50 dark:bg-sky-950/40 border-b border-sky-200 dark:border-sky-800 px-4 py-2.5 flex items-center justify-between text-xs text-sky-800 dark:text-sky-200 shrink-0">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>当前处于 Zotero 插件环境，MindFlow 设置已统一集中在 Zotero 原生设置页中。</span>
            </div>
            <button
              onClick={() => {
                openZoteroPreferences();
                onClose();
              }}
              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-md font-medium text-[11px] transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span>打开 Zotero 插件设置页</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Modal Body: Left Tab Rail + Right Form Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Vertical Navigation */}
          <div className="w-44 border-r border-slate-200 dark:border-slate-800 p-2 space-y-1 bg-slate-50/60 dark:bg-slate-950/40">
            <button
              onClick={() => setActiveTab('interface')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'interface'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>界面与工具栏</span>
            </button>

            <button
              onClick={() => setActiveTab('webdav')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'webdav'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>WebDAV 云同步</span>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'backup'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>数据备份与安全</span>
            </button>

            <button
              onClick={() => setActiveTab('editing')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'editing'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>编辑偏好与默认</span>
            </button>

            <button
              onClick={() => setActiveTab('zotero')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'zotero'
                  ? 'bg-sky-600 text-white shadow-xs font-semibold'
                  : 'text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Zotero 伴读联动</span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'ai'
                  ? 'bg-purple-600 text-white shadow-xs font-semibold'
                  : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI 模型配置</span>
            </button>

            <button
              onClick={() => setActiveTab('license')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'license'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs font-semibold'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>全功能免费</span>
              </div>
              <span className="text-[9px] px-1 bg-emerald-500 text-white rounded font-bold">100% 免费</span>
            </button>

            <button
              onClick={() => setActiveTab('about')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'about'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>关于与隐私</span>
            </button>
          </div>

          {/* Right Tab Content */}
          <div className="flex-1 overflow-y-auto p-5 text-xs text-slate-700 dark:text-slate-300">
            {activeTab === 'interface' && <SettingsInterfaceTab ctx={ctx} />}
            {activeTab === 'webdav' && <SettingsWebdavTab ctx={ctx} />}
            {activeTab === 'backup' && <SettingsBackupTab ctx={ctx} />}
            {activeTab === 'editing' && <SettingsEditingTab ctx={ctx} />}
            {activeTab === 'zotero' && <SettingsZoteroTab ctx={ctx} />}
            {activeTab === 'ai' && <SettingsAiTab ctx={ctx} />}
            {activeTab === 'license' && <SettingsLicenseTab />}
            {activeTab === 'about' && <SettingsAboutTab ctx={ctx} />}
          </div>
        </div>
      </div>
    </div>
  );
};
