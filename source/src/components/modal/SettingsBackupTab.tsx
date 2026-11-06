import { HardDrive, Check, Download, Upload } from 'lucide-react';
import { formatSize } from './settingsModalUtils';
import type { SettingsModalContext } from './useSettingsModal';

export const SettingsBackupTab = ({ ctx }: { ctx: SettingsModalContext }) => {
  const {
    currentSettings, handleSaveSettings, quota, backupNotice, backupBusy,
    handleExportLocalWorkspace, backupFileInputRef, handleImportLocalWorkspace,
  } = ctx;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
          版本快照策略
        </h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">编辑时自动生成快照</div>
              <div className="text-[10px] text-slate-400">在您专注创作时后台定时创建版本，防手误丢失</div>
            </div>
            <input
              type="checkbox"
              checked={currentSettings.autoSnapshotEnabled}
              onChange={(e) => handleSaveSettings({ autoSnapshotEnabled: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                自动快照间隔
              </label>
              <select
                value={currentSettings.autoSnapshotIntervalMinutes}
                onChange={(e) => handleSaveSettings({ autoSnapshotIntervalMinutes: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none"
              >
                <option value={5}>每 5 分钟</option>
                <option value={10}>每 10 分钟 (推荐)</option>
                <option value={30}>每 30 分钟</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                单文档最多保留快照数
              </label>
              <select
                value={currentSettings.maxSnapshotsPerDoc}
                onChange={(e) => handleSaveSettings({ maxSnapshotsPerDoc: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none"
              >
                <option value={10}>最近 10 个</option>
                <option value={20}>最近 20 个 (标准)</option>
                <option value={50}>最近 50 个 (大容量)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-slate-200 dark:border-slate-800" />

      {/* Storage Quota */}
      {quota && (
        <div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
            本地存储配额
          </h3>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1 font-medium">
                <HardDrive className="w-3.5 h-3.5 text-blue-500" /> Zotero 本地工作区存储使用量
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {formatSize(quota.usedBytes)} / {formatSize(quota.maxBytes)} ({quota.percent}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.max(quota.percent, 3)}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Local Full Workspace Backup */}
      <div>
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
          全量工作区打包
        </h3>
        {backupNotice && (
          <div className="mb-2 p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300 text-[11px] flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            <span>{backupNotice}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={backupBusy} onClick={handleExportLocalWorkspace}
            className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" /> 导出全部导图与快照
          </button>
          <button
            disabled={backupBusy} onClick={() => backupFileInputRef.current?.click()}
            className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-purple-600" /> 从文件还原工作区
          </button>
          <input
            ref={backupFileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportLocalWorkspace}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};
