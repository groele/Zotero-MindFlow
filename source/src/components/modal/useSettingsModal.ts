import React, { useState, useEffect, useRef } from 'react';
import { isZoteroEnvironment, setZoteroPref } from '../../services/zotero/zoteroBridge';
import { AppSettings, WebDAVConfig } from '../../core/model/settingsTypes';
import { SettingsService, SettingsPatch } from '../../services/storage/settingsService';
import { WebDAVService, WebDAVSyncResult, RemoteBackupVersion } from '../../services/sync/webdavService';
import { BackupService, StorageQuotaInfo, MAX_BACKUP_BYTES } from '../../services/storage/backupService';
import type { SettingsTab, SettingsModalProps } from './settingsModalUtils';

export const useSettingsModal = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onRestoreWorkspace,
  onFlushCurrentDocument,
}: SettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('interface');
  const [currentSettings, setCurrentSettings] = useState<AppSettings>(settings);
  const [showPassword, setShowPassword] = useState(false);

  // WebDAV test and sync states
  const [testingWebDAV, setTestingWebDAV] = useState(false);
  const [testResult, setTestResult] = useState<WebDAVSyncResult | null>(null);
  const [syncingWebDAV, setSyncingWebDAV] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ success: boolean; message: string } | null>(null);
  const [remoteVersions, setRemoteVersions] = useState<RemoteBackupVersion[]>([]);
  const [listingVersions, setListingVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState('');

  // Backup states
  const [quota, setQuota] = useState<StorageQuotaInfo | null>(null);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const backupBusyRef = useRef(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentSettings(settings);
  }, [settings]);

  useEffect(() => {
    let disposed = false;
    if (isOpen) {
      void BackupService.getStorageQuota().then(value => { if (!disposed) setQuota(value); }).catch(error => { if (!disposed) setBackupNotice(`存储读取失败：${error?.message || error}`); });
      setTestResult(null);
      setSyncNotice(null);
      setRemoteVersions([]);
      setSelectedVersion('');
      setBackupNotice(null);
    }
    return () => { disposed = true; };
  }, [isOpen]);

  const handleSaveSettings = async (patch: SettingsPatch) => {
    try {
      const updated = await SettingsService.updateSettings(patch);
      setCurrentSettings(updated);
      onUpdateSettings(updated);
      if (isZoteroEnvironment()) {
        if (patch.aiMaxPdfPages !== undefined) setZoteroPref('aiMaxPdfPages', patch.aiMaxPdfPages);
      }
    } catch (error: any) {
      window.alert(`设置保存失败：${error?.message || error}`);
    }
  };

  const handleWebDAVFieldChange = <K extends keyof WebDAVConfig>(field: K, value: WebDAVConfig[K]) => {
    const newWebDAV = {
      [field]: value,
    };
    handleSaveSettings({ webdav: newWebDAV });
  };

  const handleAutoSyncChange = async (enabled: boolean) => {
    if (enabled) {
      try {
        const granted = await WebDAVService.requestServerPermission(currentSettings.webdav.serverUrl);
        if (!granted) {
          setSyncNotice({ success: false, message: '未获得该 WebDAV 服务器的访问权限，自动备份尚未开启。' });
          return;
        }
      } catch (error: any) {
        setSyncNotice({ success: false, message: error.message || 'WebDAV 地址无效，自动备份尚未开启。' });
        return;
      }
    }
    handleWebDAVFieldChange('autoSyncOnSave', enabled);
  };

  const handleApplyPreset = (preset: 'jianguoyun' | 'nextcloud' | 'synology') => {
    if (preset === 'jianguoyun') {
      handleSaveSettings({
        webdav: {
          enabled: true,
          serverUrl: 'https://dav.jianguoyun.com/dav/',
          basePath: '/MindFlow/',
        },
      });
    } else if (preset === 'nextcloud') {
      handleSaveSettings({
        webdav: {
          enabled: true,
          serverUrl: 'https://your-domain.com/remote.php/dav/files/USERNAME/',
          basePath: '/MindFlow/',
        },
      });
    } else if (preset === 'synology') {
      handleSaveSettings({
        webdav: {
          enabled: true,
          serverUrl: 'https://your-nas:5006/home/',
          basePath: '/MindFlow/',
        },
      });
    }
  };

  const handleTestWebDAV = async () => {
    setTestingWebDAV(true);
    setTestResult(null);
    try {
      const granted = await WebDAVService.requestServerPermission(currentSettings.webdav.serverUrl);
      if (!granted) {
        setTestResult({ success: false, message: '未获得该 WebDAV 服务器的访问权限，未发送任何数据。' });
        return;
      }
      const res = await WebDAVService.testConnection(currentSettings.webdav);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || '网络连接失败' });
    } finally {
      setTestingWebDAV(false);
    }
  };

  const handleUploadToWebDAV = async () => {
    if (backupBusyRef.current) return;
    backupBusyRef.current = true;
    setBackupBusy(true);
    setSyncingWebDAV(true);
    setSyncNotice(null);
    try {
      if (onFlushCurrentDocument && !(await onFlushCurrentDocument())) return;
      const granted = await WebDAVService.requestServerPermission(currentSettings.webdav.serverUrl);
      if (!granted) {
        setSyncNotice({ success: false, message: '未获得该 WebDAV 服务器的访问权限，未上传数据。' });
        return;
      }
      const backupData = await BackupService.getFullWorkspaceData();
      const res = await WebDAVService.uploadBackup(currentSettings.webdav, backupData);
      setSyncNotice({ success: res.success, message: res.message });
      if (res.success) {
        handleWebDAVFieldChange('lastSyncTime', Date.now());
        handleWebDAVFieldChange('lastSyncStatus', 'success');
        handleWebDAVFieldChange('lastSyncMessage', res.message);
      }
    } catch (err: any) {
      setSyncNotice({ success: false, message: err.message || '上传异常' });
    } finally {
      setSyncingWebDAV(false);
      backupBusyRef.current = false;
      setBackupBusy(false);
    }
  };

  const handleListRemoteVersions = async () => {
    if (backupBusyRef.current) return;
    backupBusyRef.current = true;
    setBackupBusy(true);
    setListingVersions(true);
    setSyncNotice(null);
    try {
      const granted = await WebDAVService.requestServerPermission(currentSettings.webdav.serverUrl);
      if (!granted) throw new Error('未获得该 WebDAV 服务器的访问权限');
      const versions = await WebDAVService.listBackupVersions(currentSettings.webdav);
      setRemoteVersions(versions);
      setSelectedVersion(previous => previous && !versions.some(version => version.fileName === previous) ? '' : previous);
      setSyncNotice({ success: true, message: versions.length ? `找到 ${versions.length} 个历史版本。` : '未找到历史版本；仍可尝试恢复最新备份。' });
    } catch (error: any) {
      setSyncNotice({ success: false, message: error.message || '无法读取历史版本' });
    } finally {
      setListingVersions(false);
      backupBusyRef.current = false;
      setBackupBusy(false);
    }
  };

  const handleDownloadFromWebDAV = async () => {
    if (backupBusyRef.current) return;
    backupBusyRef.current = true;
    setBackupBusy(true);
    const versionLabel = selectedVersion || '最新备份';
    setSyncingWebDAV(true);
    setSyncNotice(null);
    try {
      const granted = await WebDAVService.requestServerPermission(currentSettings.webdav.serverUrl);
      if (!granted) {
        setSyncNotice({ success: false, message: '未获得该 WebDAV 服务器的访问权限，未下载或导入数据。' });
        return;
      }
      const res = await WebDAVService.downloadBackup(currentSettings.webdav, selectedVersion || undefined);
      if (res.success && res.data) {
        const preview = await BackupService.previewFullWorkspaceData(res.data);
        if (!window.confirm(`云端「${versionLabel}」：\n${BackupService.describeRestorePreview(preview)}`)) return;
        if (!(await onRestoreWorkspace(res.data))) return;
        setSyncNotice({ success: true, message: res.message });

      } else {
        setSyncNotice({ success: false, message: res.message });
      }
    } catch (err: any) {
      setSyncNotice({ success: false, message: err.message || '下载异常' });
    } finally {
      setSyncingWebDAV(false);
      backupBusyRef.current = false;
      setBackupBusy(false);
    }
  };

  const runLocalBackup = async (operation: () => Promise<void>) => {
    if (backupBusyRef.current) return;
    backupBusyRef.current = true;
    setBackupBusy(true);
    setBackupNotice(null);
    try { await operation(); }
    catch (error: any) { setBackupNotice(`备份操作失败：${error?.message || error}`); }
    finally { backupBusyRef.current = false; setBackupBusy(false); }
  };

  const handleExportLocalWorkspace = async () => {
    await runLocalBackup(async () => {
      if (onFlushCurrentDocument && !(await onFlushCurrentDocument())) return;
      await BackupService.exportFullWorkspaceBackup();
      setBackupNotice('工作区全量备份已导出！');
    });
  };

  const handleImportLocalWorkspace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await runLocalBackup(async () => {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('备份文件超过 20 MB 安全导入上限');
      const text = await file.text();
      const preview = await BackupService.previewFullWorkspaceBackup(text);
      if (!window.confirm(BackupService.describeRestorePreview(preview))) return;
      if (!(await onRestoreWorkspace(text))) return;
      setBackupNotice('工作区数据恢复成功！');

    });
  };

  const handleResetAllSettings = async () => {
    if (window.confirm('确定要将所有设置恢复为出厂默认值吗？')) {
      const def = await SettingsService.resetSettings();
      setCurrentSettings(def);
      onUpdateSettings(def);
    }
  };

  return {
    isOpen,
    onClose,
    activeTab, setActiveTab,
    currentSettings, setCurrentSettings,
    showPassword, setShowPassword,
    testingWebDAV, testResult,
    syncingWebDAV, syncNotice,
    remoteVersions, listingVersions, selectedVersion, setSelectedVersion,
    quota, backupNotice, backupBusy, backupFileInputRef,
    handleSaveSettings,
    handleWebDAVFieldChange,
    handleAutoSyncChange,
    handleApplyPreset,
    handleTestWebDAV,
    handleUploadToWebDAV,
    handleListRemoteVersions,
    handleDownloadFromWebDAV,
    handleExportLocalWorkspace,
    handleImportLocalWorkspace,
    handleResetAllSettings,
  };
};

export type SettingsModalContext = ReturnType<typeof useSettingsModal>;

export interface SettingsTabProps {
  ctx: SettingsModalContext;
}
