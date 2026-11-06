import { Check, HardDrive, Download, Upload, History, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { formatSize, formatDate } from './LeftWorkbenchUtils';
import type { LeftWorkbenchGroupProps } from './LeftWorkbenchTypes';

export const LeftWorkbenchBackup = ({ ctx }: LeftWorkbenchGroupProps) => {
  const {
    activeTab, backupNotice, quota, operationBusy, handleExportWorkspace,
    backupFileRef, handleImportWorkspace, snapshots, handleCreateSnapshot,
    handleRestoreSnapshot, handleDeleteSnapshot,
  } = ctx;

  return (
    <>
      {/* TAB 4: BACKUP & SNAPSHOTS */}
      {activeTab === 'backup' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4 text-xs">
          {backupNotice && (
            <div className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300 text-[11px] flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>{backupNotice}</span>
            </div>
          )}

          {/* Quota */}
          {quota && (
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1"><HardDrive className="w-3 h-3 text-slate-500" /> 数据占用估算</span>
                <span>{formatSize(quota.usedBytes)} · {formatSize(quota.maxBytes)} 参考线</span>
              </div>
              <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${Math.max(quota.percent, 2)}%` }} />
              </div>
            </div>
          )}

          {/* Full Workspace Actions */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Download className="w-3.5 h-3.5 text-slate-500" /> 全量工作区备份
            </label>
            <p className="text-[10px] text-slate-400">将全部导图、收集箱与快照打包备份为 JSON：</p>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                disabled={operationBusy}
                onClick={handleExportWorkspace}
                className="py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-1"
              >
                <Download className="w-3 h-3" /> 导出备份
              </button>
              <button
                disabled={operationBusy}
                onClick={() => backupFileRef.current?.click()}
                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg font-semibold flex items-center justify-center gap-1"
              >
                <Upload className="w-3 h-3 text-slate-500" /> 还原备份
              </button>
              <input ref={backupFileRef} type="file" accept=".json" onChange={handleImportWorkspace} className="hidden" />
            </div>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800" />

          {/* Document Snapshots */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-slate-500" /> 版本快照历史
              </label>
              <button
                disabled={operationBusy}
                onClick={handleCreateSnapshot}
                className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 rounded text-[10px] font-semibold flex items-center gap-0.5"
              >
                <Plus className="w-2.5 h-2.5" /> 生成快照
              </button>
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {snapshots.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-[11px]">暂无快照记录</div>
              ) : (
                snapshots.map((s) => (
                  <div key={s.id} className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700/80 flex items-center justify-between group">
                    <div className="min-w-0 flex-1 mr-1">
                      <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">{formatDate(s.timestamp)}</div>
                      <div className="text-[10px] text-slate-400">{s.nodeCount} 个主题节点</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button disabled={operationBusy} onClick={() => handleRestoreSnapshot(s.id)} title="还原此快照" className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <button disabled={operationBusy} onClick={(e) => handleDeleteSnapshot(s.id, e)} title="删除快照" className="p-1 text-slate-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
