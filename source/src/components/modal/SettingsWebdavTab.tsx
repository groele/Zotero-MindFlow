import { Check, AlertCircle, Eye, EyeOff, Loader2, Upload, Download, RefreshCw } from 'lucide-react';
import type { RemoteBackupVersion } from '../../services/sync/webdavService';
import type { SettingsModalContext } from './useSettingsModal';

export const SettingsWebdavTab = ({ ctx }: { ctx: SettingsModalContext }) => {
  const {
    currentSettings, handleWebDAVFieldChange, handleApplyPreset, handleAutoSyncChange,
    setShowPassword, showPassword, testResult, syncNotice, handleTestWebDAV, testingWebDAV,
    handleUploadToWebDAV, backupBusy, syncingWebDAV, handleDownloadFromWebDAV,
    handleListRemoteVersions, listingVersions, selectedVersion, setSelectedVersion, remoteVersions,
  } = ctx;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            WebDAV 云端同步与灾备
          </h3>
          <p className="text-[11px] text-slate-400">
            支持坚果云、Nextcloud、群晖 Synology 等标准 WebDAV 网盘
          </p>
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={currentSettings.webdav.enabled}
            onChange={(e) => handleWebDAVFieldChange('enabled', e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
          />
          <span className="text-xs font-semibold">启用同步</span>
        </label>
      </div>

      {/* Quick Presets */}
      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          快捷预设服务商模板
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => handleApplyPreset('jianguoyun')}
            className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 rounded-lg text-[11px] font-medium"
          >
            坚果云 (Jianguoyun)
          </button>
          <button
            onClick={() => handleApplyPreset('nextcloud')}
            className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 rounded-lg text-[11px] font-medium"
          >
            Nextcloud / ownCloud
          </button>
          <button
            onClick={() => handleApplyPreset('synology')}
            className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 rounded-lg text-[11px] font-medium"
          >
            群晖 NAS (WebDAV Server)
          </button>
        </div>
      </div>

      {/* Config Form */}
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            WebDAV 服务器地址 (Server URL)
          </label>
          <input
            type="text"
            placeholder="https://dav.jianguoyun.com/dav/"
            value={currentSettings.webdav.serverUrl}
            onChange={(e) => handleWebDAVFieldChange('serverUrl', e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              远端同步目录 (Remote Directory)
            </label>
            <input
              type="text"
              placeholder="/MindFlow/"
              value={currentSettings.webdav.basePath}
              onChange={(e) => handleWebDAVFieldChange('basePath', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              用户名 / 邮箱
            </label>
            <input
              type="text"
              placeholder="your-email@example.com"
              value={currentSettings.webdav.username}
              onChange={(e) => handleWebDAVFieldChange('username', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            密码 / 应用专属授权密码 (App Password)
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="坚果云等请使用应用生成的专属密码"
              value={currentSettings.webdav.password}
              onChange={(e) => handleWebDAVFieldChange('password', e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
            连接凭据保存在宿主存储中；宿主环境不提供应用层加密。MindFlow 仅允许 HTTPS，且不会把凭据写进导出备份。
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={currentSettings.webdav.autoSyncOnSave}
            onChange={(e) => handleAutoSyncChange(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
          />
          <span className="text-[11px]">文档编辑保存后自动备份至云端。首次启用时仅申请当前 HTTPS 服务器权限。</span>
        </label>
      </div>

      {/* Test Feedback Notice */}
      {testResult && (
        <div
          className={`p-2.5 rounded-xl text-[11px] flex items-start gap-2 ${
            testResult.success
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
        >
          {testResult.success ? <Check className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
          <div>{testResult.message}</div>
        </div>
      )}

      {/* Sync Notice */}
      {syncNotice && (
        <div
          className={`p-2.5 rounded-xl text-[11px] flex items-start gap-2 ${
            syncNotice.success
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
        >
          {syncNotice.success ? <Check className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
          <div>{syncNotice.message}</div>
        </div>
      )}

      {/* WebDAV Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleTestWebDAV}
          disabled={testingWebDAV}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          {testingWebDAV ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          <span>测试连接</span>
        </button>

        <button
          onClick={handleUploadToWebDAV}
          disabled={backupBusy || !currentSettings.webdav.serverUrl}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          {syncingWebDAV ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          <span>立即备份上传</span>
        </button>

        <button
          onClick={handleDownloadFromWebDAV}
          disabled={backupBusy || !currentSettings.webdav.serverUrl}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>恢复所选备份</span>
        </button>
      </div>
      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={handleListRemoteVersions}
          disabled={backupBusy || !currentSettings.webdav.serverUrl}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg text-xs font-semibold disabled:opacity-50"
        >
          {listingVersions ? '读取中…' : '查看云端历史版本'}
        </button>
        <select
          aria-label="选择云端备份版本"
          value={selectedVersion}
          onChange={(event) => setSelectedVersion(event.target.value)}
          disabled={backupBusy}
          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
        >
          <option value="">最新备份</option>
          {remoteVersions.map((version: RemoteBackupVersion) => (
            <option key={version.fileName} value={version.fileName}>
              {new Date(version.createdAt).toLocaleString('zh-CN')} · {version.fileName}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-slate-500">每次上传先生成独立历史文件，再更新“最新备份”；云端历史文件需由您在服务器管理空间。</p>
      </div>
    </div>
  );
};
